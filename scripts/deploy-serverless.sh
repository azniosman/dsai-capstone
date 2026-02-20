#!/bin/bash
# ============================================================================
# SkillBridge Serverless Deployment Script
#
# Orchestrates the full serverless capstone stack deployment:
#   1. Terraform: create ECR repository
#   2. Docker: build and push Lambda container image
#   3. Terraform: deploy remaining infrastructure (Lambda, RDS, API GW, CF)
#   4. Frontend: build Next.js and sync to S3
#   5. CloudFront: create invalidation for cache flush
#
# Usage (from project root):
#   export TF_VAR_db_password="your-secure-password"
#   export TF_VAR_secret_key="$(openssl rand -hex 32)"
#   ./scripts/deploy-serverless.sh [dev|prod]
#
# Prerequisites:
#   - AWS CLI configured with appropriate credentials/role
#   - Docker running
#   - Terraform >= 1.5 installed
#   - Node.js + npm installed (for frontend build)
# ============================================================================

set -euo pipefail

ENV="${1:-dev}"
AWS_REGION="${AWS_REGION:-us-east-1}"
PROJECT_NAME="skillbridge"
TF_DIR="$(cd "$(dirname "$0")/../terraform" && pwd)"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URL="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${PROJECT_NAME}-${ENV}-backend"

echo "========================================================"
echo "  SkillBridge Serverless Deploy — env=${ENV}"
echo "  Region: ${AWS_REGION} | Account: ${ACCOUNT_ID}"
echo "========================================================"

# ── Validate required env vars ────────────────────────────────────────────────
for var in TF_VAR_db_password TF_VAR_secret_key; do
  if [[ -z "${!var:-}" ]]; then
    echo "ERROR: $var must be set"
    echo "  export $var='...'"
    exit 1
  fi
done

# ── Step 1: Create ECR repository (required before Docker push) ───────────────
echo ""
echo "Step 1/5 — Creating ECR repository..."
cd "${TF_DIR}"
terraform init -upgrade -input=false
terraform apply -target=module.ecr \
  -var="aws_region=${AWS_REGION}" \
  -var="environment=${ENV}" \
  -auto-approve

# ── Step 2: Build and push Lambda container image ─────────────────────────────
echo ""
echo "Step 2/5 — Building and pushing Lambda image..."
cd "$(dirname "$0")/.."
bash scripts/build_and_push.sh "${ENV}" "${AWS_REGION}"

# ── Step 3: Deploy full Terraform stack ───────────────────────────────────────
echo ""
echo "Step 3/5 — Deploying full infrastructure..."
cd "${TF_DIR}"
terraform apply \
  -var="aws_region=${AWS_REGION}" \
  -var="environment=${ENV}" \
  -var="lambda_image_uri=${ECR_URL}:latest" \
  -auto-approve

# ── Capture outputs ───────────────────────────────────────────────────────────
API_URL=$(terraform output -raw api_endpoint)
CF_DOMAIN=$(terraform output -raw cloudfront_domain)
S3_BUCKET=$(terraform output -raw s3_bucket_name)
WS_URL=$(terraform output -raw websocket_endpoint)

echo ""
echo "Terraform outputs:"
echo "  API endpoint:  ${API_URL}"
echo "  Frontend URL:  https://${CF_DOMAIN}"
echo "  S3 bucket:     ${S3_BUCKET}"
echo "  WebSocket:     ${WS_URL}"

# ── Step 4: Build and deploy frontend ─────────────────────────────────────────
echo ""
echo "Step 4/5 — Building frontend..."
cd "$(dirname "$0")/../frontend"

cat > .env.production.local <<EOF
NEXT_PUBLIC_API_URL=${API_URL}
NEXT_PUBLIC_APP_URL=https://${CF_DOMAIN}
NEXT_PUBLIC_VOICE_WS_URL=${WS_URL}
EOF

npm install --prefer-offline
NEXT_OUTPUT=export NEXT_PUBLIC_API_URL="${API_URL}" NEXT_PUBLIC_VOICE_WS_URL="${WS_URL}" npm run build

echo ""
echo "Step 4/5 — Uploading frontend to S3..."
aws s3 sync out/ "s3://${S3_BUCKET}/" \
  --region "${AWS_REGION}" \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "*.html"

aws s3 sync out/ "s3://${S3_BUCKET}/" \
  --region "${AWS_REGION}" \
  --delete \
  --cache-control "no-cache, no-store, must-revalidate" \
  --include "*.html"

# ── Step 5: Invalidate CloudFront cache ───────────────────────────────────────
echo ""
echo "Step 5/5 — Invalidating CloudFront cache..."
CF_ID=$(cd "${TF_DIR}" && terraform output -raw cloudfront_id 2>/dev/null || echo "")
if [[ -n "${CF_ID}" ]]; then
  aws cloudfront create-invalidation \
    --distribution-id "${CF_ID}" \
    --paths "/*" \
    --region "us-east-1"  # CloudFront API is global, always us-east-1
  echo "  Invalidation created for distribution: ${CF_ID}"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "========================================================"
echo "  ✓ Deployment complete!"
echo "  Frontend: https://${CF_DOMAIN}"
echo "  API:      ${API_URL}"
echo "========================================================"
echo ""
echo "To destroy the stack (stop all costs):"
echo "  cd terraform && terraform destroy -auto-approve"
echo ""
echo "To pause NAT Gateway costs only (~\$32/month savings):"
echo "  cd terraform && terraform destroy -target='module.vpc.aws_nat_gateway.main'"
