# Optimized rag-engine Dockerfile (size < 1GB)

# ---------- Builder stage ----------
FROM python:3.11-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /build

# Install build‑time dependencies (only needed for compiling wheels)
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libmagic-dev \
        libheif-dev \
        gcc && \
    rm -rf /var/lib/apt/lists/*

# Install Python packages with cache mount
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --upgrade pip && \
    pip install --prefix=/install -r requirements.txt

# ---------- Runtime stage ----------
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    NLTK_DATA=/usr/local/share/nltk_data

WORKDIR /app

# Install only runtime system packages
RUN apt-get update && apt-get install -y --no-install-recommends \
        poppler-utils \
        tesseract-ocr \
        tesseract-ocr-eng \
        tesseract-ocr-vie \
        libmagic1 \
        libheif1 \
        libgl1 \
        libglib2.0-0 \
        patchelf && \
    rm -rf /var/lib/apt/lists/*

# Copy compiled Python packages from builder
COPY --from=builder /install /usr/local

# Patch ONNX Runtime and then remove patchelf (no longer needed)
RUN patchelf --clear-execstack /usr/local/lib/python3.11/site-packages/onnxruntime/capi/*.so || true && \
    apt-get purge -y patchelf && \
    rm -rf /var/lib/apt/lists/*

# Create non‑privileged user and set permissions
RUN useradd -m raguser && \
    mkdir -p /usr/local/share/nltk_data && \
    chown -R raguser:raguser /app /usr/local/share/nltk_data
USER raguser

# Pre‑download required NLTK data (small footprint)
RUN python -m nltk.downloader -d /usr/local/share/nltk_data punkt averaged_perceptron_tagger

# Copy application source (exclude heavy data via .dockerignore)
COPY --chown=raguser:raguser . .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]