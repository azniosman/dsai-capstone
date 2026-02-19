# ===== Base Image =====
FROM python:3.11-slim AS builder

# ===== Set environment variables =====
ENV PYTHONUNBUFFERED=1
ENV SENTENCE_TRANSFORMERS_HOME=/opt/models/sentence-transformers
ENV HF_HOME=/opt/models/huggingface
ENV HF_HUB_OFFLINE=1

# Create directories for models
RUN mkdir -p /opt/models/sentence-transformers /opt/models/huggingface

# ===== Install system dependencies =====
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ===== Install Python dependencies =====
RUN pip install --no-cache-dir --upgrade pip

# Copy requirements and install
COPY backend/requirements.txt .
# Pin numpy and scikit-learn for compatibility as identified earlier
RUN pip install --no-cache-dir "numpy<2.0.0" "scikit-learn==1.3.2" && \
    pip install --no-cache-dir -r requirements.txt

# Install specific spaCy version
RUN pip install --no-cache-dir spacy==3.7.0

# Install spaCy English model (matching version)
RUN pip install --no-cache-dir \
    https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.7.0/en_core_web_sm-3.7.0-py3-none-any.whl

# Verify spaCy model works
RUN python -c "import spacy; nlp = spacy.load('en_core_web_sm'); print('spaCy OK')"

# Install Sentence Transformers
RUN pip install --no-cache-dir sentence-transformers==2.2.2

# Pre-download Sentence Transformer model
RUN HF_HUB_OFFLINE=0 python -c "import os; os.environ['SENTENCE_TRANSFORMERS_HOME']='/opt/models/sentence-transformers'; from sentence_transformers import SentenceTransformer; m = SentenceTransformer('all-MiniLM-L6-v2'); print('ST OK')"

# ===== Final Stage =====
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1
ENV SENTENCE_TRANSFORMERS_HOME=/opt/models/sentence-transformers
ENV HF_HOME=/opt/models/huggingface
ENV HF_HUB_OFFLINE=1
ENV TRANSFORMERS_OFFLINE=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --from=builder /opt/models /opt/models

# Copy project files
COPY backend/ /app/
COPY data/seed/ /app/seed_data/

RUN useradd --create-home appuser
RUN chown -R appuser:appuser /app /opt/models
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=300s --retries=5 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
