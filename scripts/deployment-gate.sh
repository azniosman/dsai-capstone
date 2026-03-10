#!/bin/bash
# Production Deployment Gate Script
# This script must pass before any production deployment
# Usage: ./scripts/deployment-gate.sh
#
# Prerequisites:
#   1. Generate JWT token: node scripts/generate-jwt-secrets.js --token
#   2. Export token: export PROD_JWT_TOKEN="eyJhbG..."
#   3. Or set in environment: PROD_JWT_TOKEN=...

set -e

# Configuration
API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:8000}"
JWT_TOKEN="${PROD_JWT_TOKEN:-}"
TIMEOUT=300  # 5 minutes timeout for checks

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=============================================="
echo "  Production Deployment Gate"
echo "=============================================="
echo ""

# Function to make authenticated API calls
api_call() {
    local endpoint=$1
    if [ -n "$JWT_TOKEN" ]; then
        curl -s -H "Authorization: Bearer $JWT_TOKEN" "${API_URL}${endpoint}"
    else
        curl -s "${API_URL}${endpoint}"
    fi
}

# Function to check result
check_result() {
    local name=$1
    local condition=$2
    local value=$3
    
    if eval "$condition"; then
        echo -e "${GREEN}✓${NC} $name: PASSED"
        return 0
    else
        echo -e "${RED}✗${NC} $name: FAILED ($value)"
        return 1
    fi
}

FAILED=0
WARNINGS=0

# 1. Quick Health Check
echo "1. Running quick health check..."
HEALTH_CHECK=$(api_call "/api/production-assurance/deployment/quick-check")
HEALTHY=$(echo "$HEALTH_CHECK" | python3 -c "import sys,json; print(json.load(sys.stdin).get('healthy', False))")

if [ "$HEALTHY" = "True" ]; then
    echo -e "${GREEN}✓${NC} System health check: PASSED"
else
    echo -e "${RED}✗${NC} System health check: FAILED"
    FAILED=$((FAILED + 1))
fi
echo ""

# 2. Get Audit Readiness
echo "2. Checking production readiness..."
AUDIT=$(api_call "/api/production-assurance/audit/readiness")
SCORE=$(echo "$AUDIT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('overallScore', 0))")
STATUS=$(echo "$AUDIT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status', 'UNKNOWN'))")
BLOCKERS=$(echo "$AUDIT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('criticalBlockers', 999))")

if [ "$SCORE" -ge 80 ]; then
    echo -e "${GREEN}✓${NC} Readiness score ($SCORE/100): PASSED"
elif [ "$SCORE" -ge 60 ]; then
    echo -e "${YELLOW}⚠${NC} Readiness score ($SCORE/100): WARNING (proceed with caution)"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${RED}✗${NC} Readiness score ($SCORE/100): FAILED (minimum 60 required)"
    FAILED=$((FAILED + 1))
fi

if [ "$BLOCKERS" -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Critical blockers ($BLOCKERS): PASSED"
else
    echo -e "${RED}✗${NC} Critical blockers ($BLOCKERS): FAILED (must be 0)"
    FAILED=$((FAILED + 1))
fi
echo ""

# 3. RAG Pipeline Health
echo "3. Checking RAG pipeline health..."
RAG=$(api_call "/api/production-assurance/rag/health")
RAG_STATUS=$(echo "$RAG" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status', 'unknown'))")
EMBEDDING=$(echo "$RAG" | python3 -c "import sys,json; print(json.load(sys.stdin).get('embeddingService', False))")
VECTOR=$(echo "$RAG" | python3 -c "import sys,json; print(json.load(sys.stdin).get('vectorSearch', False))")

if [ "$RAG_STATUS" = "healthy" ]; then
    echo -e "${GREEN}✓${NC} RAG pipeline status: PASSED"
else
    echo -e "${YELLOW}⚠${NC} RAG pipeline status: WARNING ($RAG_STATUS)"
    WARNINGS=$((WARNINGS + 1))
fi

if [ "$EMBEDDING" = "True" ] && [ "$VECTOR" = "True" ]; then
    echo -e "${GREEN}✓${NC} RAG components: PASSED"
else
    echo -e "${RED}✗${NC} RAG components: FAILED (embedding=$EMBEDDING, vector=$VECTOR)"
    FAILED=$((FAILED + 1))
fi
echo ""

# 4. System Services Health
echo "4. Checking system services..."
SYSTEM_HEALTH=$(api_call "/api/production-assurance/health")
UNHEALTHY_SERVICES=$(echo "$SYSTEM_HEALTH" | python3 -c "
import sys,json
health = json.load(sys.stdin)
unhealthy = [s['name'] for s in health.get('services', []) if s.get('status') == 'UNHEALTHY']
print(','.join(unhealthy) if unhealthy else '')
")

if [ -z "$UNHEALTHY_SERVICES" ]; then
    echo -e "${GREEN}✓${NC} All services healthy: PASSED"
else
    echo -e "${RED}✗${NC} Unhealthy services: $UNHEALTHY_SERVICES"
    FAILED=$((FAILED + 1))
fi
echo ""

# 5. Security Scan
echo "5. Running security scan..."
SECURITY=$(api_call "/api/production-assurance/security/scan")
SECURITY_SCORE=$(echo "$SECURITY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('score', 0))")

if [ "$SECURITY_SCORE" -ge 80 ]; then
    echo -e "${GREEN}✓${NC} Security score ($SECURITY_SCORE/100): PASSED"
elif [ "$SECURITY_SCORE" -ge 60 ]; then
    echo -e "${YELLOW}⚠${NC} Security score ($SECURITY_SCORE/100): WARNING"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${RED}✗${NC} Security score ($SECURITY_SCORE/100): FAILED"
    FAILED=$((FAILED + 1))
fi
echo ""

# Summary
echo "=============================================="
echo "  Deployment Gate Summary"
echo "=============================================="
echo ""

if [ $FAILED -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ ALL CHECKS PASSED${NC}"
    echo ""
    echo "System is ready for production deployment."
    exit 0
elif [ $FAILED -eq 0 ]; then
    echo -e "${YELLOW}⚠ PASSED WITH WARNINGS${NC}"
    echo ""
    echo "System can be deployed but $WARNINGS warning(s) should be reviewed."
    exit 0
else
    echo -e "${RED}✗ DEPLOYMENT BLOCKED${NC}"
    echo ""
    echo "$FAILED critical check(s) failed. Deployment cannot proceed."
    echo ""
    echo "To resolve:"
    echo "1. Review the failed checks above"
    echo "2. Fix the underlying issues"
    echo "3. Re-run this script"
    exit 1
fi
