FROM python:3.12-slim

WORKDIR /app

# System dependencies for OpenCV and MediaPipe
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libgles2 \
    libegl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# Install inference-only Python dependencies.
# Training dependencies are intentionally kept out of the runtime image.
COPY requirements.inference.txt .
RUN pip install --no-cache-dir -r requirements.inference.txt

# Copy inference code and model artifacts
COPY inference/ ./inference/
COPY models/ ./models/

EXPOSE 8001

CMD ["uvicorn", "inference.main:app", "--host", "0.0.0.0", "--port", "8001"]
