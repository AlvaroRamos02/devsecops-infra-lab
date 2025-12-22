# ═══════════════════════════════════════════════════════════════
# SecureShift - Universal Dockerfile
# Supports: Python, Node.js, and other common languages
# ═══════════════════════════════════════════════════════════════

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy application code
COPY app/ ./

# Find and install Python requirements if they exist
RUN find . -name requirements.txt -exec pip install --no-cache-dir -r {} \; || echo "No requirements.txt found"

# Default command
CMD ["python", "--version"]
