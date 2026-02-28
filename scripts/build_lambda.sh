#!/bin/bash
# =============================================================================
# build_lambda.sh — Build the SkillBridge Lambda container image locally.
#
# Performs a local Docker build from Dockerfile.lambda (project root) and
# tags the result as skillbridge-local:latest.  No ECR login or AWS
# credentials are required.  Use this as a dry-run to verify the build
# pipeline before running build_and_push.sh (which pushes to ECR).
#
# Usage (from project root):
#   ./scripts/build_lambda.sh
# =============================================================================

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IMAGE_TAG="skillbridge-local:latest"

echo "======================================================"
echo "  SkillBridge Lambda Image — local build dry-run"
echo "  Dockerfile: ${PROJECT_ROOT}/Dockerfile.lambda"
echo "  Tag:        ${IMAGE_TAG}"
echo "======================================================"

cd "${PROJECT_ROOT}"

echo ""
echo "→ Building Lambda container image (linux/amd64)..."
docker build \
  --platform linux/amd64 \
  --provenance=false \
  -f Dockerfile.lambda \
  -t "${IMAGE_TAG}" \
  .

IMAGE_SIZE=$(docker image inspect "${IMAGE_TAG}" \
  --format '{{.Size}}' 2>/dev/null || echo 0)
SIZE_MB=$(echo "scale=1; ${IMAGE_SIZE} / 1048576" | bc 2>/dev/null || echo "?")

echo ""
echo "✓ Build complete!"
echo "  Image: ${IMAGE_TAG}  (${SIZE_MB} MB uncompressed)"
echo ""
echo "To run the image locally (smoke-test the Lambda handler):"
echo "  docker run --rm -p 9000:8080 \\"
echo "    -e PORT=8000 \\"
echo "    ${IMAGE_TAG}"
echo ""
echo "To push this image to ECR, run:"
echo "  ./scripts/build_and_push.sh [dev|prod] [region]"
