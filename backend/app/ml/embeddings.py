"""Sentence Transformer model wrapper for skill embeddings.

Also exposes generate_titan_embedding() for 1536-dim Titan Embed v1 via Bedrock,
used by the pgvector RAG pipeline. The local 384-dim path (encode_texts) is
untouched and continues to power FAISS recommendations.
"""

import json
import logging
import numpy as np
from sentence_transformers import SentenceTransformer

from app.config import settings

logger = logging.getLogger(__name__)

_model = None
_bedrock_client = None


def _get_bedrock_client():
    """Lazy-initialise Bedrock runtime client (shared across calls)."""
    global _bedrock_client
    if _bedrock_client is None:
        import boto3
        _bedrock_client = boto3.client("bedrock-runtime", region_name=settings.aws_region)
    return _bedrock_client


def generate_titan_embedding(text: str) -> list[float]:
    """Generate a 1536-dim embedding via Amazon Titan Embed Text v1 (Bedrock).

    Uses the existing Bedrock IAM permissions.  Raises on any error so callers
    can decide whether to swallow the exception (local dev) or propagate it.
    """
    client = _get_bedrock_client()
    body = json.dumps({"inputText": text[:8000]})  # Titan hard limit ~8 KB
    response = client.invoke_model(
        modelId=settings.titan_embed_model_id,
        body=body,
        contentType="application/json",
        accept="application/json",
    )
    result = json.loads(response["body"].read())
    return result["embedding"]


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        model_name = settings.sentence_transformer_model
        logger.info("Loading Sentence Transformer model: %s", model_name)
        _model = SentenceTransformer(model_name, device="cpu")
        logger.info("Model loaded successfully")
    return _model


def warmup_model():
    """Pre-load the model and run a dummy encode to warm up."""
    model = get_model()
    model.encode(["warmup"], normalize_embeddings=True)
    logger.info("Model warmup complete")


def encode_texts(texts: list[str]) -> np.ndarray:
    # 1. Try SageMaker Serverless if configured
    if hasattr(settings, 'sagemaker_embedding_endpoint') and settings.sagemaker_embedding_endpoint:
        try:
            from app.services.sagemaker_service import sagemaker_service
            embeddings = sagemaker_service.get_embeddings(texts)
            if embeddings:
                return np.array(embeddings)
        except Exception as e:
            logger.warning(f"SageMaker embedding failed, falling back to local: {e}")

    # 2. Fallback to local SentenceTransformer
    model = get_model()
    return model.encode(texts, normalize_embeddings=True)


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b))
