#!/bin/bash

# DevSecOps Infra Lab - Unified Scanning Script
# Usage: ./scan.sh
# This script runs Semgrep (SAST) and Trivy (SCA) using Docker.

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}    DevSecOps Security Scanner 🛡️${NC}"
echo -e "${BLUE}=========================================${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}[ERROR] Docker is not installed or not in PATH.${NC}"
    exit 1
fi

# Directories
WORKSPACE=$(pwd)
REPORT_DIR="$WORKSPACE/dashboard/data"
mkdir -p "$REPORT_DIR"

echo -e "${YELLOW}[*] Preparing report directory: $REPORT_DIR${NC}"

# 1. SAST - Semgrep
echo -e "\n${YELLOW}[*] Running SAST (Semgrep)...${NC}"
docker run --rm \
    -v "$WORKSPACE":/src \
    returntocorp/semgrep semgrep scan \
    --config=auto \
    --json \
    --output "/src/dashboard/data/semgrep-report.json" \
    /src/app

if [ $? -eq 0 ]; then
    echo -e "${GREEN}[✔] SAST scan completed.${NC}"
else
    echo -e "${RED}[✘] SAST scan failed.${NC}"
fi

# 2. SCA - Trivy FS (Repo Dependencies)
echo -e "\n${YELLOW}[*] Running SCA FS (Trivy)...${NC}"
docker run --rm \
    -v "$WORKSPACE":/src \
    aquasec/trivy fs /src/app \
    --format json \
    --output "/src/dashboard/data/trivy-fs-report.json"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}[✔] SCA FS scan completed.${NC}"
else
    echo -e "${RED}[✘] SCA FS scan failed.${NC}"
fi

# 3. Docker Build & SCA Image
echo -e "\n${YELLOW}[*] Building Docker image for scanning...${NC}"
IMAGE_NAME="devsecops-lab:scan"
docker build -t $IMAGE_NAME .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}[✔] Build successful.${NC}"
    
    echo -e "${YELLOW}[*] Running SCA Image (Trivy)...${NC}"
    docker run --rm \
        -v /var/run/docker.sock:/var/run/docker.sock \
        -v "$WORKSPACE":/src \
        aquasec/trivy image $IMAGE_NAME \
        --format json \
        --output "/src/dashboard/data/trivy-image-report.json"
        
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}[✔] SCA Image scan completed.${NC}"
    else
        echo -e "${RED}[✘] SCA Image scan failed.${NC}"
    fi
else
    echo -e "${RED}[✘] Docker build failed. Skipping Image Scan.${NC}"
fi


echo -e "\n${BLUE}=========================================${NC}"
echo -e "${GREEN}All scans finished! Reports are in: dashboard/data/${NC}"
echo -e "${BLUE}To view dashboard:${NC}"
echo -e "  docker-compose up -d dashboard"
echo -e "  Open http://localhost:7890"
echo -e "${BLUE}=========================================${NC}"
