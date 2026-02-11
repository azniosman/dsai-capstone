"""Sentence Transformer model wrapper for skill embeddings."""

import logging
import numpy as np
from sentence_transformers import SentenceTransformer

from app.config import settings

logger = logging.getLogger(__name__)

_model = None


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        logger.info("Loading Sentence Transformer model: %s", settings.sentence_transformer_model)
        _model = SentenceTransformer(settings.sentence_transformer_model)
        logger.info("Model loaded successfully")
    return _model


def warmup_model():
    """Pre-load the model and run a dummy encode to warm up."""
    model = get_model()
    model.encode(["warmup"], normalize_embeddings=True)
    logger.info("Model warmup complete")


def encode_texts(texts: list[str]) -> np.ndarray:
    model = get_model()
    return model.encode(texts, normalize_embeddings=True)


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b))
