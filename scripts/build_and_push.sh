#!/bin/bash
# Build and push the Lambda backend container image to ECR.
# Run from the project root directory.
#
# Usage:
#   ./scripts/build_and_push.sh [dev|prod] [us-east-1]
#
# Requires: AWS CLI, Docker, appropriate IAM permissions for ECR

set -euo pipefail

ENV="${1:-dev}"
AWS_REGION="${2:-us-east-1}"
PROJECT_NAME="skillbridge"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_BACKEND="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${PROJECT_NAME}-${ENV}-backend"

echo "======================================================"
echo "  Building SkillBridge Lambda image for: ${ENV}"
echo "  ECR: ${ECR_BACKEND}"
echo "======================================================"

# Login to ECR
echo ""
echo "→ Authenticating with ECR..."
aws ecr get-login-password --region "${AWS_REGION}" | \
  docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# Build Lambda container image (Dockerfile.lambda uses project root as context)
echo ""
echo "→ Building Lambda container image..."
docker build \
  --platform linux/amd64 \
  -f backend/Dockerfile.lambda \
  -t "${ECR_BACKEND}:latest" \
  -t "${ECR_BACKEND}:$(git rev-parse --short HEAD 2>/dev/null || echo 'local')" \
  .

# Push to ECR
echo ""
echo "→ Pushing to ECR..."
docker push "${ECR_BACKEND}:latest"
docker push "${ECR_BACKEND}:$(git rev-parse --short HEAD 2>/dev/null || echo 'local')" 2>/dev/null || true

echo ""
echo "✓ Build and push complete!"
echo "  Image URI: ${ECR_BACKEND}:latest"
echo ""
echo "To update the Lambda function:"
echo "  aws lambda update-function-code \\"
echo "    --function-name ${PROJECT_NAME}-${ENV}-api \\"
echo "    --image-uri ${ECR_BACKEND}:latest \\"
echo "    --region ${AWS_REGION}"
