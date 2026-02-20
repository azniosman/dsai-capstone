"""RAG (Retrieval-Augmented Generation) service using pgvector + Titan Embed + Bedrock.

Flow:
  store_embedding()  → generates Titan embedding → persists Embedding row
  similarity_search() → pgvector <-> operator → returns nearest rows
  rag_query()        → embed query → search → build context → Bedrock response
"""

import json
import logging
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import text

from app.config import settings
from app.ml.embeddings import generate_titan_embedding
from app.models.embedding import Embedding

logger = logging.getLogger(__name__)

_bedrock_client = None


def _get_bedrock_client():
    global _bedrock_client
    if _bedrock_client is None:
        import boto3
        _bedrock_client = boto3.client("bedrock-runtime", region_name=settings.aws_region)
    return _bedrock_client


def store_embedding(
    db: Session,
    text_content: str,
    text_type: str,
    profile_id: Optional[int] = None,
    user_id: Optional[int] = None,
    metadata: Optional[dict] = None,
) -> Embedding:
    """Generate a Titan embedding and persist it.  Returns the saved Embedding row."""
    vector = generate_titan_embedding(text_content)
    row = Embedding(
        user_id=user_id,
        profile_id=profile_id,
        text_type=text_type,
        embedding=vector,
        source_text=text_content[:4000],
        meta=metadata or {},
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def similarity_search(
    db: Session,
    query_embedding: list[float],
    text_type: Optional[str] = None,
    profile_id: Optional[int] = None,
    user_id: Optional[int] = None,
    limit: int = 5,
) -> list[Embedding]:
    """Return the <limit> most similar Embedding rows using pgvector cosine distance.

    NOTE: The <-> operator requires PostgreSQL + pgvector.  This will raise on
    SQLite (used in unit tests) — mock this function in pytest fixtures.
    """
    vector_literal = "[" + ",".join(str(v) for v in query_embedding) + "]"

    filters = ["1=1"]
    params: dict = {"limit": limit, "vec": vector_literal}

    if text_type:
        filters.append("text_type = :text_type")
        params["text_type"] = text_type
    if profile_id is not None:
        filters.append("profile_id = :profile_id")
        params["profile_id"] = profile_id
    if user_id is not None:
        filters.append("user_id = :user_id")
        params["user_id"] = user_id

    where_clause = " AND ".join(filters)
    sql = text(
        f"SELECT id FROM embeddings WHERE {where_clause} "
        f"ORDER BY embedding <-> CAST(:vec AS vector) LIMIT :limit"
    )
    rows = db.execute(sql, params).fetchall()
    ids = [r[0] for r in rows]
    if not ids:
        return []
    return db.query(Embedding).filter(Embedding.id.in_(ids)).all()


def rag_query(
    db: Session,
    query: str,
    profile_id: Optional[int] = None,
    user_id: Optional[int] = None,
) -> dict:
    """End-to-end RAG: embed → retrieve → generate via Bedrock.

    Returns {answer, sources, engine}.
    """
    # 1. Embed the user query
    query_embedding = generate_titan_embedding(query)

    # 2. Retrieve similar chunks
    results = similarity_search(
        db,
        query_embedding=query_embedding,
        profile_id=profile_id,
        user_id=user_id,
        limit=5,
    )

    # 3. Build retrieval context
    context_parts = [r.source_text for r in results if r.source_text]
    context = "\n\n---\n\n".join(context_parts) if context_parts else "No relevant context found."

    # 4. Prompt assembly
    system_prompt = (
        "You are SkillBridge AI, a career intelligence assistant for Singapore SCTP learners. "
        "Use the retrieved context below to answer the user's question accurately and concisely. "
        "If the context doesn't contain enough information, say so honestly."
    )
    user_message = f"Context:\n{context}\n\nQuestion: {query}"

    # 5. Invoke Bedrock (Claude)
    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 1024,
        "system": system_prompt,
        "messages": [{"role": "user", "content": user_message}],
    })

    client = _get_bedrock_client()
    response = client.invoke_model(
        modelId=settings.bedrock_model_id,
        body=body,
        contentType="application/json",
        accept="application/json",
    )
    result = json.loads(response["body"].read())
    answer = result["content"][0]["text"] if result.get("content") else "No answer generated."

    return {
        "answer": answer,
        "sources": [r.id for r in results],
        "engine": "bedrock-rag",
    }
