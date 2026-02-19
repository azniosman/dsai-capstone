"""
OpenSearch Service — hybrid vector + keyword search for SkillBridge.

Provides semantic job matching (vector similarity) combined with BM25
keyword search for the best of both retrieval strategies.

Requires:
  - OPENSEARCH_HOST env var (set by Terraform Lambda module)
  - IAM role with es:ESHttp* permissions on the domain
  - opensearch-py package (add to requirements.txt if not present)

Falls back gracefully to an empty result set when OpenSearch is not
configured (enable_opensearch = false in Terraform).
"""

from __future__ import annotations

import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

_JOBS_INDEX = "job_roles"
_SKILLS_INDEX = "skills"


class OpenSearchService:
    """Hybrid search client wrapping the opensearch-py SDK."""

    def __init__(self) -> None:
        self._client = None
        self._host = os.environ.get("OPENSEARCH_HOST", "")

    def _get_client(self):
        """Lazy-init the OpenSearch client (avoids import errors when disabled)."""
        if self._client is not None:
            return self._client

        if not self._host:
            return None

        try:
            from opensearchpy import OpenSearch, RequestsHttpConnection, AWSV4SignerAuth
            import boto3

            region = os.environ.get("AWS_REGION_ID") or os.environ.get("AWS_DEFAULT_REGION", "us-east-1")
            credentials = boto3.Session().get_credentials()
            auth = AWSV4SignerAuth(credentials, region, "es")

            host = self._host.replace("https://", "").rstrip("/")
            self._client = OpenSearch(
                hosts=[{"host": host, "port": 443}],
                http_auth=auth,
                use_ssl=True,
                verify_certs=True,
                connection_class=RequestsHttpConnection,
                timeout=30,
            )
            logger.info("OpenSearch client initialised for host: %s", host)
            return self._client

        except ImportError:
            logger.warning("opensearch-py not installed — OpenSearch search disabled")
            return None
        except Exception as exc:
            logger.error("OpenSearch client init failed: %s", exc)
            return None

    # ── Index management ──────────────────────────────────────────────────────

    def ensure_jobs_index(self) -> bool:
        """Create the job_roles index with k-NN mapping if it doesn't exist."""
        client = self._get_client()
        if client is None:
            return False

        if client.indices.exists(index=_JOBS_INDEX):
            return True

        mapping = {
            "settings": {
                "index": {
                    "knn": True,
                    "knn.algo_param.ef_search": 100,
                }
            },
            "mappings": {
                "properties": {
                    "title": {"type": "text", "analyzer": "english"},
                    "description": {"type": "text", "analyzer": "english"},
                    "required_skills": {"type": "keyword"},
                    "salary_sgd_min": {"type": "integer"},
                    "salary_sgd_max": {"type": "integer"},
                    "embedding": {
                        "type": "knn_vector",
                        "dimension": 384,  # all-MiniLM-L6-v2 output size
                        "method": {
                            "name": "hnsw",
                            "space_type": "cosinesimil",
                            "engine": "faiss",
                        },
                    },
                }
            },
        }
        try:
            client.indices.create(index=_JOBS_INDEX, body=mapping)
            logger.info("Created OpenSearch index: %s", _JOBS_INDEX)
            return True
        except Exception as exc:
            logger.error("Failed to create index %s: %s", _JOBS_INDEX, exc)
            return False

    # ── Indexing ──────────────────────────────────────────────────────────────

    def index_job(self, job_id: str, job_data: dict, embedding: list[float]) -> bool:
        """Index a single job role with its vector embedding."""
        client = self._get_client()
        if client is None:
            return False
        try:
            doc = {**job_data, "embedding": embedding}
            client.index(index=_JOBS_INDEX, id=str(job_id), body=doc, refresh=False)
            return True
        except Exception as exc:
            logger.error("Failed to index job %s: %s", job_id, exc)
            return False

    # ── Search ────────────────────────────────────────────────────────────────

    def hybrid_search(
        self,
        query_text: str,
        query_embedding: list[float] | None = None,
        filters: dict[str, Any] | None = None,
        top_k: int = 10,
        keyword_weight: float = 0.4,
        vector_weight: float = 0.6,
    ) -> list[dict]:
        """Hybrid BM25 + k-NN search over job roles.

        Args:
            query_text:      Raw text query for BM25 matching.
            query_embedding: 384-dim embedding for vector similarity.
            filters:         Optional keyword filters (e.g. {"salary_sgd_min": 5000}).
            top_k:           Number of results to return.
            keyword_weight:  Weight for BM25 score (0–1).
            vector_weight:   Weight for vector similarity score (0–1).

        Returns:
            List of matching job dicts with a `_score` field.
        """
        client = self._get_client()
        if client is None:
            return []

        try:
            if query_embedding:
                # Hybrid query: combine BM25 and k-NN
                query = {
                    "query": {
                        "bool": {
                            "should": [
                                {
                                    "multi_match": {
                                        "query": query_text,
                                        "fields": ["title^2", "description", "required_skills"],
                                        "boost": keyword_weight,
                                    }
                                }
                            ],
                            "filter": self._build_filters(filters),
                        }
                    },
                    "knn": {
                        "embedding": {
                            "vector": query_embedding,
                            "k": top_k,
                            "boost": vector_weight,
                        }
                    },
                    "size": top_k,
                }
            else:
                # BM25-only query
                query = {
                    "query": {
                        "bool": {
                            "must": {
                                "multi_match": {
                                    "query": query_text,
                                    "fields": ["title^2", "description", "required_skills"],
                                }
                            },
                            "filter": self._build_filters(filters),
                        }
                    },
                    "size": top_k,
                }

            response = client.search(index=_JOBS_INDEX, body=query)
            hits = response.get("hits", {}).get("hits", [])
            return [
                {**hit["_source"], "_score": hit["_score"], "_id": hit["_id"]}
                for hit in hits
            ]

        except Exception as exc:
            logger.error("OpenSearch search error: %s", exc)
            return []

    def skill_autocomplete(self, prefix: str, limit: int = 10) -> list[str]:
        """Autocomplete skill names using prefix matching."""
        client = self._get_client()
        if client is None:
            return []
        try:
            query = {
                "query": {"prefix": {"name": {"value": prefix.lower()}}},
                "size": limit,
                "_source": ["name"],
            }
            response = client.search(index=_SKILLS_INDEX, body=query)
            return [hit["_source"]["name"] for hit in response["hits"]["hits"]]
        except Exception as exc:
            logger.error("Skill autocomplete error: %s", exc)
            return []

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _build_filters(self, filters: dict | None) -> list:
        if not filters:
            return []
        result = []
        for key, value in filters.items():
            if isinstance(value, dict):
                result.append({"range": {key: value}})
            else:
                result.append({"term": {key: value}})
        return result

    @property
    def is_available(self) -> bool:
        """True if OpenSearch is configured and reachable."""
        return bool(self._host) and self._get_client() is not None


# Module-level singleton
opensearch_service = OpenSearchService()
