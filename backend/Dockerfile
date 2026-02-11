FROM python:3.11-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt
ENV PYTHONPATH=/install/lib/python3.11/site-packages
ENV PATH="/install/bin:$PATH"
RUN python -m spacy download en_core_web_sm

# Pre-download the Sentence Transformer model so it's cached in the image
# (ECS tasks in private subnets cannot download at runtime)
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /install /usr/local
# Copy the cached HuggingFace/Sentence Transformer model from builder
COPY --from=builder /root/.cache/huggingface /opt/models/huggingface

RUN useradd --create-home appuser
COPY --chown=appuser:appuser backend/ .
COPY --chown=appuser:appuser data/seed/ ./seed_data/

# Point all model caches to /opt/models and enable offline mode
ENV HF_HOME=/opt/models/huggingface
ENV HF_HUB_OFFLINE=1
ENV TRANSFORMERS_OFFLINE=1
ENV SENTENCE_TRANSFORMERS_HOME=/opt/models/huggingface

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=180s --retries=5 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
