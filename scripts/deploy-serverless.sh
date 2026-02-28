#!/bin/bash
# ============================================================================
# SkillBridge Serverless Deployment Script
#
# Orchestrates the full serverless capstone stack deployment:
#   1. Terraform: create ECR repository
#   2. Docker: build and push Lambda container image
#   3. Terraform: deploy full infrastructure (Lambda, RDS, API GW, CF)
#   4. Frontend: build Next.js and sync to S3
#   5. CloudFront: invalidate cache
#   6. EventBridge: verify automation schedules and run smoke tests
#
# Usage (from project root):
#   export TF_VAR_db_password="your-secure-password"
#   export TF_VAR_secret_key="$(openssl rand -hex 32)"
#   export TF_VAR_internal_automation_token="$(python3 -c 'import secrets; print(secrets.token_hex(32))')"
#   ./scripts/deploy-serverless.sh [dev|prod]
#
# Prerequisites:
#   - AWS CLI configured with appropriate credentials/role
#   - Docker running
#   - Terraform >= 1.5 installed
#   - Node.js + npm installed (for frontend build)
#   - Python 3.12+ installed (for token generation)
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
for var in TF_VAR_db_password TF_VAR_secret_key TF_VAR_internal_automation_token; do
  if [[ -z "${!var:-}" ]]; then
    echo "ERROR: $var must be set"
    case "$var" in
      TF_VAR_db_password)
        echo "  export TF_VAR_db_password='$(openssl rand -base64 24)'"
        ;;
      TF_VAR_secret_key)
        echo "  export TF_VAR_secret_key=\$(openssl rand -hex 32)"
        ;;
      TF_VAR_internal_automation_token)
        echo "  export TF_VAR_internal_automation_token=\$(python3 -c 'import secrets; print(secrets.token_hex(32))')"
        ;;
    esac
    exit 1
  fi
done

# ── Step 1: Create ECR repository (required before Docker push) ───────────────
echo ""
echo "Step 1/6 — Creating ECR repository..."
cd "${TF_DIR}"
terraform init -upgrade -input=false
terraform apply -target=module.ecr \
  -var="aws_region=${AWS_REGION}" \
  -var="environment=${ENV}" \
  -auto-approve

# ── Step 2: Build and push Lambda container image ─────────────────────────────
echo ""
echo "Step 2/6 — Building and pushing Lambda image..."
cd "$(dirname "$0")/.."
bash scripts/build_and_push.sh "${ENV}" "${AWS_REGION}"

# ── Step 3: Deploy full Terraform stack ───────────────────────────────────────
echo ""
echo "Step 3/6 — Deploying full infrastructure (including EventBridge)..."
cd "${TF_DIR}"
terraform apply \
  -var="aws_region=${AWS_REGION}" \
  -var="environment=${ENV}" \
  -var="lambda_image_uri=${ECR_URL}:latest" \
  -auto-approve

# ── Capture Terraform outputs (gracefully handle disabled features) ───────────
API_URL=$(terraform output -raw api_endpoint 2>/dev/null || echo "")
S3_BUCKET=$(terraform output -raw s3_bucket_name 2>/dev/null || echo "")

# CloudFront and WebSocket are optional — don't fail if disabled
CF_DOMAIN=$(terraform output -raw cloudfront_domain 2>/dev/null || echo "")
CF_ID=$(terraform output -raw cloudfront_id 2>/dev/null || echo "")
WS_URL=$(terraform output -raw websocket_endpoint 2>/dev/null || echo "")

# EventBridge automation resources
BACKEND_FUNCTION="${PROJECT_NAME}-${ENV}-backend"
WARMUP_FUNCTION="${PROJECT_NAME}-${ENV}-warmup"
CLEANUP_FUNCTION="${PROJECT_NAME}-${ENV}-cache-cleanup"
SSG_SYNC_FUNCTION="${PROJECT_NAME}-${ENV}-ssg-sync"

echo ""
echo "Terraform outputs:"
echo "  API endpoint:  ${API_URL}"
[[ -n "${CF_DOMAIN}" ]] && echo "  Frontend URL:  https://${CF_DOMAIN}"
[[ -n "${WS_URL}"    ]] && echo "  WebSocket:     ${WS_URL}"
echo "  S3 bucket:     ${S3_BUCKET}"

# ── Step 4: Build and deploy frontend ─────────────────────────────────────────
echo ""
echo "Step 4/6 — Building frontend..."
cd "$(dirname "$0")/../frontend"

cat > .env.production.local <<EOF
NEXT_PUBLIC_API_URL=${API_URL}
NEXT_PUBLIC_APP_URL=${CF_DOMAIN:+https://${CF_DOMAIN}}
NEXT_PUBLIC_VOICE_WS_URL=${WS_URL}
EOF

npm install --prefer-offline
NEXT_OUTPUT=export NEXT_PUBLIC_API_URL="${API_URL}" NEXT_PUBLIC_VOICE_WS_URL="${WS_URL}" npm run build

echo ""
echo "Step 4/6 — Uploading frontend to S3..."
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
echo "Step 5/6 — Invalidating CloudFront cache..."
if [[ -n "${CF_ID}" ]]; then
  aws cloudfront create-invalidation \
    --distribution-id "${CF_ID}" \
    --paths "/*" \
    --region "us-east-1"  # CloudFront API is global, always us-east-1
  echo "  Invalidation created for distribution: ${CF_ID}"
else
  echo "  CloudFront not enabled — skipping invalidation"
fi

# ── Step 6: EventBridge smoke tests ───────────────────────────────────────────
echo ""
echo "Step 6/6 — Verifying EventBridge automation layer..."

# 6a. List all automation schedules created in this environment
SCHEDULE_COUNT=$(aws scheduler list-schedules \
  --region "${AWS_REGION}" \
  --query "length(Schedules[?contains(Name, '${PROJECT_NAME}-${ENV}')])" \
  --output text 2>/dev/null || echo "0")
echo "  EventBridge schedules active: ${SCHEDULE_COUNT}"

# 6b. Health check — ping NestJS Lambda directly
echo "  Pinging backend Lambda health endpoint..."
HEALTH_RESPONSE=$(aws lambda invoke \
  --function-name "${BACKEND_FUNCTION}" \
  --region "${AWS_REGION}" \
  --payload '{"httpMethod":"GET","path":"/internal/health","headers":{},"body":"","isBase64Encoded":false}' \
  --cli-binary-format raw-in-base64-out \
  /tmp/health_response.json \
  --query 'StatusCode' \
  --output text 2>/dev/null || echo "error")

if [[ "${HEALTH_RESPONSE}" == "200" ]]; then
  echo "  ✓ Backend Lambda health check: OK"
else
  echo "  ⚠ Backend Lambda health check returned status: ${HEALTH_RESPONSE}"
fi

# 6c. Smoke test — trigger cache cleanup Lambda
echo "  Running cache cleanup smoke test..."
CLEANUP_RESULT=$(aws lambda invoke \
  --function-name "${CLEANUP_FUNCTION}" \
  --region "${AWS_REGION}" \
  --payload '{"task":"cleanup_ssg_cache","endpoint":"/internal/cache/cleanup","method":"POST"}' \
  --cli-binary-format raw-in-base64-out \
  /tmp/cleanup_response.json \
  --query 'StatusCode' \
  --output text 2>/dev/null || echo "error")

if [[ "${CLEANUP_RESULT}" == "200" ]]; then
  DELETED=$(python3 -c "import json; d=json.load(open('/tmp/cleanup_response.json')); print(json.loads(d.get('body','{}') if isinstance(d,dict) else '{}').get('deleted', 'N/A'))" 2>/dev/null || echo "N/A")
  echo "  ✓ Cache cleanup: OK (deleted=${DELETED} expired rows)"
else
  echo "  ⚠ Cache cleanup returned status: ${CLEANUP_RESULT} (check CloudWatch logs)"
fi

# 6d. Smoke test — trigger SSG course sync
echo "  Running SSG course sync smoke test..."
SSG_RESULT=$(aws lambda invoke \
  --function-name "${SSG_SYNC_FUNCTION}" \
  --region "${AWS_REGION}" \
  --payload '{"task":"sync_courses","endpoint":"/internal/sync/ssg/courses","method":"POST"}' \
  --cli-binary-format raw-in-base64-out \
  /tmp/ssg_response.json \
  --query 'StatusCode' \
  --output text 2>/dev/null || echo "error")

if [[ "${SSG_RESULT}" == "200" ]]; then
  SYNCED=$(python3 -c "import json; d=json.load(open('/tmp/ssg_response.json')); print(json.loads(d.get('body','{}') if isinstance(d,dict) else '{}').get('synced', 'N/A'))" 2>/dev/null || echo "N/A")
  echo "  ✓ SSG course sync: OK (synced=${SYNCED} items)"
else
  echo "  ⚠ SSG course sync returned status: ${SSG_RESULT} (check CloudWatch logs)"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "========================================================"
echo "  ✓ Deployment complete!"
[[ -n "${CF_DOMAIN}" ]] && echo "  Frontend: https://${CF_DOMAIN}" || echo "  Frontend: s3://${S3_BUCKET}"
echo "  API:      ${API_URL}"
echo "  EventBridge schedules: ${SCHEDULE_COUNT} active"
echo "========================================================"
echo ""
echo "Useful commands after deployment:"
echo ""
echo "  Check automation logs (last 30 min):"
echo "    aws logs tail /aws/lambda/${CLEANUP_FUNCTION} --since 30m"
echo "    aws logs tail /aws/lambda/${SSG_SYNC_FUNCTION} --since 30m"
echo ""
echo "  Manually trigger an automation task:"
echo "    aws lambda invoke --function-name ${CLEANUP_FUNCTION} \\"
echo "      --payload '{\"task\":\"cleanup_ssg_cache\"}' /tmp/out.json && cat /tmp/out.json"
echo ""
echo "  View DLQ depth (failed tasks):"
echo "    aws sqs get-queue-attributes \\"
echo "      --queue-url \$(aws sqs get-queue-url --queue-name ${PROJECT_NAME}-${ENV}-automation-dlq --query QueueUrl --output text) \\"
echo "      --attribute-names ApproximateNumberOfMessages"
echo ""
echo "To destroy the full stack (stop all costs):"
echo "  cd terraform && terraform destroy -auto-approve"
echo ""
echo "To destroy ONLY the EventBridge automation layer (keep app running):"
echo "  cd terraform && terraform destroy -target=module.eventbridge \\"
echo "    -target=aws_secretsmanager_secret.internal_token -auto-approve"
echo ""
echo "To pause NAT Gateway costs only (~\$32/month savings when idle):"
echo "  cd terraform && terraform destroy -target='module.vpc.aws_nat_gateway.main'"
