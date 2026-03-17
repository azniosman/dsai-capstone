# Production Assurance API Reference

## Base URL
```
http://localhost:8000/api/production-assurance
```

## Authentication
All endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## Architecture Analysis

### Get Architecture Map
```http
GET /architecture
```

**Response:**
```json
{
  "services": [...],
  "apis": [...],
  "databases": [...],
  "aiIntegrations": [...],
  "backgroundJobs": [...],
  "securityModules": [...],
  "externalDependencies": [...],
  "configuration": [...],
  "discoveredAt": "2026-03-10T06:00:00.000Z"
}
```

### Run Architecture Analysis
```http
POST /architecture/analyze
```

---

## Codebase Audit

### Get Last Audit Result
```http
GET /codebase/audit
```

### Run Codebase Audit
```http
POST /codebase/audit
```

---

## Security Scanning

### Get Security Score
```http
GET /security/scan
```

**Response:**
```json
{
  "score": 92
}
```

### Run Full Security Scan
```http
POST /security/scan
```

**Response:**
```json
{
  "scannedAt": "2026-03-10T06:00:00.000Z",
  "score": 92,
  "status": "READY"
}
```

---

## Data Integrity

### Get Integrity Score
```http
GET /data/integrity
```

**Response:**
```json
{
  "score": 75
}
```

### Run Data Validation
```http
POST /data/integrity/validate
```

---

## RAG Pipeline

### Get RAG Health Status
```http
GET /rag/health
```

**Response:**
```json
{
  "status": "healthy",
  "embeddingService": true,
  "vectorSearch": true,
  "crossEncoder": true,
  "feedbackLoop": true,
  "avgLatencyMs": 150,
  "errorRate": 0.02,
  "lastCheck": "2026-03-10T06:00:00.000Z"
}
```

### Run RAG Verification
```http
POST /rag/verify
```

### Verify Embedding Generation
```http
POST /rag/verify/embedding?query=test
```

### Verify Vector Search
```http
POST /rag/verify/vector-search
```

---

## Execution Tracing

### Get Recent Failed Traces
```http
GET /traces?limit=50
```

### Get Trace Statistics
```http
GET /traces/stats?hours=24
```

**Response:**
```json
{
  "total": 150,
  "completed": 145,
  "failed": 5,
  "avgDurationMs": 234,
  "byType": {
    "RAG_PIPELINE": {
      "total": 50,
      "failed": 2,
      "avgDurationMs": 345
    },
    "EMBEDDING": {
      "total": 100,
      "failed": 3,
      "avgDurationMs": 123
    }
  }
}
```

### Get Specific Trace
```http
GET /traces/:traceId
```

---

## Self-Healing

### Get Recovery History
```http
GET /recovery/history?limit=50
```

### Get Recovery Statistics
```http
GET /recovery/stats?hours=24
```

### Trigger Manual Recovery
```http
POST /recovery/trigger?type=SERVICE_RESTART&description=Manual+restart&service=backend
```

**Recovery Types:**
- `SERVICE_RESTART`
- `PIPELINE_RETRY`
- `DATA_REPROCESS`
- `VECTOR_INDEX_REBUILD`
- `TASK_RESCHEDULE`
- `CACHE_CLEAR`
- `EMBEDDING_REGENERATE`

---

## Load Testing

### Get Default Test Configuration
```http
GET /load-test/default-config
```

**Response:**
```json
{
  "concurrentUsers": 50,
  "requestsPerUser": 20,
  "rampUpSeconds": 30,
  "durationSeconds": 120,
  "scenarios": [...]
}
```

### Run Load Test
```http
POST /load-test/run?users=50&duration=120
```

**Response:**
```json
{
  "testId": "loadtest-1234567890",
  "startTime": "2026-03-10T06:00:00.000Z",
  "endTime": "2026-03-10T06:02:00.000Z",
  "totalRequests": 1000,
  "successfulRequests": 980,
  "failedRequests": 20,
  "avgLatencyMs": 145,
  "p95LatencyMs": 234,
  "p99LatencyMs": 456,
  "requestsPerSecond": 83,
  "errorRate": 2.0,
  "resourceUsage": {...},
  "byScenario": {...},
  "recommendations": [...]
}
```

### Quick Performance Check
```http
GET /load-test/quick-check
```

**Response:**
```json
{
  "status": "healthy",
  "avgLatencyMs": 12,
  "recommendations": []
}
```

---

## Observability

### Get System Health
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "services": [
    {
      "name": "database",
      "status": "HEALTHY",
      "lastCheck": "2026-03-10T06:00:00.000Z"
    }
  ],
  "metrics": [...],
  "alerts": [...],
  "lastUpdated": "2026-03-10T06:00:00.000Z"
}
```

### Get Service Health
```http
GET /health/services
```

### Get Active Alerts
```http
GET /health/alerts
```

### Acknowledge Alert
```http
POST /health/alerts/:alertId/acknowledge
```

### Get Metric History
```http
GET /metrics/:name/history?limit=50
```

---

## Deployment Safety

### Get Deployment Status
```http
GET /deployment/status
```

### Run Pre-Deployment Validation
```http
POST /deployment/validate
```

**Response:**
```json
{
  "validatedAt": "2026-03-10T06:00:00.000Z",
  "checks": [...],
  "allPassed": true,
  "canDeploy": true,
  "blockers": [],
  "warnings": []
}
```

### Quick Health Check
```http
GET /deployment/quick-check
```

**Response:**
```json
{
  "healthy": true,
  "issues": []
}
```

---

## Continuous Audit

### Get Last Audit Result
```http
GET /audit/last
```

### Run Audit
```http
POST /audit/run
```

### Get Audit History
```http
GET /audit/history?limit=10
```

### Get Readiness Summary
```http
GET /audit/readiness
```

**Response:**
```json
{
  "isReady": false,
  "overallScore": 83,
  "status": "CRITICAL_ISSUES",
  "criticalBlockers": 8,
  "lastAudit": "2026-03-10T06:00:00.000Z"
}
```

---

## Full Report

### Generate Full Production Readiness Report
```http
POST /report/generate
```

**Response:**
```json
{
  "generatedAt": "2026-03-10T06:00:00.000Z",
  "architecture": {...},
  "security": {...},
  "dataIntegrity": {...},
  "ragPipeline": {...},
  "audit": {...},
  "overallReadiness": 83,
  "canDeployToProduction": false
}
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "timestamp": "2026-03-10T06:00:00.000Z",
  "path": "/api/production-assurance/...",
  "detail": "Internal server error"
}
```

---

## Rate Limiting

All endpoints are subject to rate limiting:
- **Limit:** 60 requests per minute
- **Header:** `X-RateLimit-Remaining`

---

## Example Usage

### cURL Examples

```bash
# Get system health
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/production-assurance/health

# Run security scan
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/production-assurance/security/scan

# Get readiness summary
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/production-assurance/audit/readiness

# Trigger recovery
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/production-assurance/recovery/trigger?type=SERVICE_RESTART&description=Manual+restart"
```

### JavaScript/TypeScript Examples

```typescript
import api from '@/lib/api-client';

// Get system health
const health = await api.get('/api/production-assurance/health');
console.log(health.data);

// Run deployment validation
const validation = await api.post('/api/production-assurance/deployment/validate');
if (validation.data.canDeploy) {
  console.log('Ready for deployment');
} else {
  console.log('Blockers:', validation.data.blockers);
}

// Get trace statistics
const stats = await api.get('/api/production-assurance/traces/stats?hours=24');
console.log(`Total traces: ${stats.data.total}`);
console.log(`Failed: ${stats.data.failed}`);
```
