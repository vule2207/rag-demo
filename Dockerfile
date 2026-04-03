# Use python 3.11-slim for compatibility with RAG libraries
FROM python:3.11-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /build

# Install necessary build tools and development libraries
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libmagic-dev \
    libheif-dev \
    gcc

# Install dependencies into a temporary directory for copying to the final stage
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --upgrade pip && \
    pip install --prefix=/install -r requirements.txt


# Stage 2: Runtime
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV NLTK_DATA=/usr/local/share/nltk_data
# Ensure scripts in .local/bin are executable if they exist
ENV PATH="/home/raguser/.local/bin:${PATH}"

WORKDIR /app

# Install runtime dependencies only
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-vie \
    libmagic1 \
    libheif1 \
    libgl1 \
    libglib2.0-0 \
    patchelf \
    && rm -rf /var/lib/apt/lists/*

# Copy installed python packages from the builder stage
COPY --from=builder /install /usr/local

# Xóa cờ 'executable stack' của onnxruntime để tránh lỗi Invalid argument trên kernel mới
RUN patchelf --clear-execstack /usr/local/lib/python3.11/site-packages/onnxruntime/capi/*.so || true

# Create a non-privileged user to run the application for enhanced security
RUN useradd -m raguser && \
    mkdir -p /usr/local/share/nltk_data && \
    chown -R raguser:raguser /app /usr/local/share/nltk_data

USER raguser

# Download NLTK data during image build to avoid runtime delays
RUN python -m nltk.downloader -d /usr/local/share/nltk_data punkt punkt_tab averaged_perceptron_tagger averaged_perceptron_tagger_eng

# Copy project code into the container with appropriate ownership
COPY --chown=raguser:raguser . .

# Default command to start the application
CMD ["python", "main.py"]