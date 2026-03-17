# Production Assurance System - Operations Team Training Guide

## Table of Contents

1. [System Overview](#system-overview)
2. [Daily Operations](#daily-operations)
3. [Monitoring and Alerts](#monitoring-and-alerts)
4. [Incident Response](#incident-response)
5. [Deployment Procedures](#deployment-procedures)
6. [Troubleshooting Guide](#troubleshooting-guide)
7. [Maintenance Tasks](#maintenance-tasks)

---

## System Overview

### What is the Production Assurance System?

The Production Assurance System is an autonomous self-auditing framework that continuously monitors the SkillBridge platform for:

- **Security vulnerabilities** - Authentication, authorization, secrets management
- **Data integrity issues** - Schema consistency, orphan records, embedding health
- **AI/ML pipeline health** - RAG retrieval, embedding generation, vector search
- **Service availability** - All backend services, database, external dependencies
- **Performance metrics** - Latency, throughput, error rates

### Key Components

| Component | Purpose | Check Frequency |
|-----------|---------|-----------------|
| Architecture Analyzer | Service discovery and dependency mapping | On startup |
| Security Scanner | Vulnerability detection | Every 6 hours |
| Data Integrity Validator | Database health checks | Every 6 hours |
| RAG Pipeline Verifier | AI pipeline monitoring | Every hour |
| Execution Trace Service | Distributed tracing | Continuous |
| Self-Healing Orchestrator | Automated recovery | Every 5 minutes |
| Observability Engine | Metrics collection | Every minute |
| Deployment Safety Gate | Pre-deployment validation | On demand |
| Continuous Audit | Overall readiness scoring | Every 6 hours |

---

## Daily Operations

### Morning Checklist

1. **Check System Health Dashboard**
   ```
   Navigate to: http://localhost:3000/observability
   Verify: Overall status is "healthy"
   ```

2. **Review Overnight Alerts**
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:8000/api/production-assurance/health/alerts
   ```

3. **Check Audit Readiness Score**
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:8000/api/production-assurance/audit/readiness
   ```
   - **Target:** Score ≥ 80
   - **Warning:** Score 60-79
   - **Critical:** Score < 60

4. **Review Critical Blockers**
   - If `criticalBlockers > 0`, investigate immediately

### End-of-Day Checklist

1. **Review Daily Metrics**
   - Check trace statistics for anomalies
   - Review recovery actions taken
   - Verify no degraded services

2. **Document Any Issues**
   - Log incidents in tracking system
   - Update runbooks if new issues discovered

---

## Monitoring and Alerts

### Accessing the Dashboard

**Frontend Dashboard:**
```
URL: http://localhost:3000/observability
Auto-refresh: Every 30 seconds
```

**Key Metrics to Watch:**

| Metric | Normal Range | Warning | Critical |
|--------|--------------|---------|----------|
| Readiness Score | 80-100 | 60-79 | < 60 |
| RAG Latency | < 200ms | 200-500ms | > 500ms |
| Error Rate | < 1% | 1-5% | > 5% |
| Critical Blockers | 0 | 1-2 | > 2 |

### Alert Severity Levels

| Severity | Response Time | Examples |
|----------|---------------|----------|
| **Critical** | Immediate | Service down, security breach, data corruption |
| **Warning** | Within 1 hour | High latency, elevated error rate |
| **Info** | Next business day | Configuration changes, routine maintenance |

### Acknowledging Alerts

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/production-assurance/health/alerts/ALERT_ID/acknowledge
```

---

## Incident Response

### Critical Incident Procedure

1. **Assess the Situation**
   ```bash
   # Get system health
   curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:8000/api/production-assurance/health
   
   # Get recent failures
   curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:8000/api/production-assurance/traces?limit=20"
   ```

2. **Check Self-Healing Actions**
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:8000/api/production-assurance/recovery/history?limit=10"
   ```

3. **Manual Recovery (if needed)**
   ```bash
   # Trigger service restart
   curl -X POST -H "Authorization: Bearer $TOKEN" \
     "http://localhost:8000/api/production-assurance/recovery/trigger?type=SERVICE_RESTART&description=Manual+restart+after+incident"
   
   # Trigger pipeline retry
   curl -X POST -H "Authorization: Bearer $TOKEN" \
     "http://localhost:8000/api/production-assurance/recovery/trigger?type=PIPELINE_RETRY&description=Retry+failed+pipeline"
   ```

4. **Escalate if Unresolved**
   - Contact DevOps team
   - Engage platform engineering for P0 incidents

### Common Incidents and Responses

| Incident | Symptoms | Response |
|----------|----------|----------|
| RAG Pipeline Failure | High latency, embedding errors | Check embedding service, verify pgvector extension |
| Database Issues | UNHEALTHY status, connection errors | Check DB container, verify connections |
| Security Scan Failures | Low security score | Review findings, rotate secrets if needed |
| Service Unhealthy | Service status UNHEALTHY | Trigger SERVICE_RESTART recovery |

---

## Deployment Procedures

### Pre-Deployment Checklist

1. **Run Deployment Gate Script**
   ```bash
   cd /path/to/repo
   ./scripts/deployment-gate.sh
   ```

2. **Verify All Checks Pass**
   - System health: PASSED
   - Readiness score: ≥ 80
   - Critical blockers: 0
   - RAG pipeline: healthy
   - All services: healthy
   - Security score: ≥ 80

3. **If Warnings Present**
   - Review warnings
   - Document acceptance if proceeding
   - Get approval from team lead

### Deployment Commands

```bash
# Full deployment with validation
./scripts/deploy.sh

# Skip terraform (code-only changes)
gh workflow run deploy-serverless.yml -f environment=prod -f skip_terraform=true

# Rollback if needed
git revert HEAD
./scripts/deploy.sh
```

### Post-Deployment Verification

1. **Wait 5 minutes** for services to stabilize
2. **Run deployment validation**
   ```bash
   curl -X POST -H "Authorization: Bearer $TOKEN" \
     http://localhost:8000/api/production-assurance/deployment/validate
   ```
3. **Monitor for 15 minutes** for any anomalies

---

## Troubleshooting Guide

### Problem: Readiness Score Low

**Symptoms:**
- Score < 60
- Status: CRITICAL_ISSUES

**Diagnosis:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/production-assurance/audit/readiness
```

**Resolution:**
1. Review `criticalBlockers` count
2. Check audit findings:
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:8000/api/production-assurance/audit/history?limit=1"
   ```
3. Address critical findings

### Problem: RAG Pipeline Unhealthy

**Symptoms:**
- RAG status: unhealthy or degraded
- High latency or error rate

**Diagnosis:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/production-assurance/rag/health
```

**Resolution:**
1. Check embedding service:
   - Verify model is loaded
   - Check memory usage
2. Check vector search:
   - Verify pgvector extension
   - Check HNSW index
3. Trigger recovery if needed:
   ```bash
   curl -X POST -H "Authorization: Bearer $TOKEN" \
     "http://localhost:8000/api/production-assurance/recovery/trigger?type=EMBEDDING_REGENERATE"
   ```

### Problem: Service Unhealthy

**Symptoms:**
- Service status: UNHEALTHY
- Connection errors

**Resolution:**
1. Check service logs:
   ```bash
   docker logs dsai-capstone-backend-1 --tail 100
   ```
2. Restart service:
   ```bash
   docker compose restart backend
   ```
3. Or trigger automated recovery:
   ```bash
   curl -X POST -H "Authorization: Bearer $TOKEN" \
     "http://localhost:8000/api/production-assurance/recovery/trigger?type=SERVICE_RESTART"
   ```

---

## Maintenance Tasks

### Weekly Tasks

1. **Review Audit History**
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:8000/api/production-assurance/audit/history?limit=10"
   ```

2. **Clean Up Old Traces**
   - Automatic cleanup runs daily
   - Manual cleanup if needed:
     ```sql
     DELETE FROM execution_traces WHERE createdAt < NOW() - INTERVAL '7 days';
     ```

3. **Review Recovery Actions**
   - Check for patterns in automated recoveries
   - Update thresholds if false positives

### Monthly Tasks

1. **Full Security Scan**
   ```bash
   curl -X POST -H "Authorization: Bearer $TOKEN" \
     http://localhost:8000/api/production-assurance/security/scan
   ```

2. **Load Test**
   ```bash
   curl -X POST -H "Authorization: Bearer $TOKEN" \
     "http://localhost:8000/api/production-assurance/load-test/run?users=100&duration=300"
   ```

3. **Update Runbooks**
   - Document new issues encountered
   - Update procedures based on learnings

### Quarterly Tasks

1. **Disaster Recovery Test**
   - Simulate service failure
   - Verify self-healing works
   - Test manual recovery procedures

2. **Threshold Review**
   - Review alert thresholds
   - Adjust based on actual performance data

3. **Training Refresh**
   - Review this guide with team
   - Practice incident response

---

## Quick Reference

### Important URLs

| Resource | URL |
|----------|-----|
| Observability Dashboard | http://localhost:3000/observability |
| API Base | http://localhost:8000/api/production-assurance |
| Health Check | /health |
| Audit Readiness | /audit/readiness |
| RAG Health | /rag/health |

### Important Commands

```bash
# Get JWT token
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@skillbridge.com&password=PASSWORD"

# Run deployment gate
./scripts/deployment-gate.sh

# Check system health
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/production-assurance/health

# Trigger recovery
curl -X POST -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/production-assurance/recovery/trigger?type=SERVICE_RESTART&description=Manual"
```

### Escalation Contacts

| Level | Contact | When to Escalate |
|-------|---------|------------------|
| L1 | On-call Engineer | Initial incident response |
| L2 | DevOps Team | Unresolved after 30 minutes |
| L3 | Platform Engineering | P0 incidents, security breaches |

---

## Appendix: API Quick Reference

See `PRODUCTION_ASSURANCE_API.md` for complete API documentation.

### Most Used Endpoints

```
GET  /health                          - System health status
GET  /audit/readiness                 - Production readiness score
GET  /rag/health                      - RAG pipeline health
POST /deployment/validate             - Pre-deployment validation
GET  /traces/stats?hours=24           - Trace statistics
POST /recovery/trigger?type=...       - Trigger recovery action
```
