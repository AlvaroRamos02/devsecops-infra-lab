# ═══════════════════════════════════════════════════════════════
# SecureShift - Universal Dockerfile
# Supports: Python, Node.js, and other common languages
# ═══════════════════════════════════════════════════════════════

# ══════════════ Python App ══════════════
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY app/*/requirements.txt ./requirements.txt 2>/dev/null || \
    COPY app/requirements.txt ./requirements.txt 2>/dev/null || \
    echo "# No requirements.txt found" > ./requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt 2>/dev/null || true

# Copy application code (excluding venv)
COPY app/ .

# Default command (override as needed)
CMD ["python", "--version"]

# ══════════════ Notes ══════════════
# This Dockerfile is intentionally generic to allow Trivy 
# to scan Python dependencies. For production, customize
# the CMD and add your specific entrypoint.
