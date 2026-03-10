# Production Assurance System - Operational Runbooks

## Table of Contents
1. [System Startup](#system-startup)
2. [System Shutdown](#system-shutdown)
3. [Database Recovery](#database-recovery)
4. [Backup Restoration](#backup-restoration)
5. [AI Pipeline Recovery](#ai-pipeline-recovery)
6. [Service Restart Procedures](#service-restart-procedures)
7. [Incident Response](#incident-response)

---

## System Startup

### Pre-Startup Checklist

- [ ] Verify all environment variables are set
- [ ] Confirm database is accessible
- [ ] Verify secrets are loaded from Secrets Manager
- [ ] Check disk space availability

### Startup Procedure

```bash
# 1. Start database
docker compose up -d db

# 2. Wait for database to be healthy
docker compose ps db  # Wait for "healthy" status

# 3. Start backend
docker compose up -d backend

# 4. Verify backend health
curl http://localhost:8000/api/production-assurance/deployment/quick-check

# 5. Start frontend
docker compose up -d frontend

# 6. Verify full system health
curl http://localhost:8000/api/production-assurance/health
```

### Post-Startup Verification

```bash
# Check production readiness
curl http://localhost:8000/api/production-assurance/audit/readiness

# Verify RAG pipeline
curl http://localhost:8000/api/production-assurance/rag/health

# Check for any active alerts
curl http://localhost:8000/api/production-assurance/health/alerts
```

---

## System Shutdown

### Graceful Shutdown Procedure

```bash
# 1. Stop accepting new traffic (if behind load balancer)
# 2. Wait for in-flight requests to complete (30 seconds)
# 3. Stop services in reverse dependency order

docker compose stop frontend
docker compose stop backend
docker compose stop n8n
docker compose stop db

# Or for complete removal:
docker compose down
```

### Emergency Shutdown

```bash
# Immediate stop (may lose in-flight requests)
docker compose kill

# Clean up resources
docker compose down -v  # WARNING: Removes volumes
```

---

## Database Recovery

### Database Connection Issues

```bash
# 1. Check database status
docker compose ps db

# 2. View database logs
docker logs dsai-capstone-db-1

# 3. Test connection
docker exec dsai-capstone-db-1 pg_isready -U capstone

# 4. Restart database
docker compose restart db
```

### Data Corruption Recovery

```bash
# 1. Stop application to prevent further writes
docker compose stop backend frontend

# 2. Create backup of current state
docker exec dsai-capstone-db-1 pg_dump -U capstone capstone > backup_$(date +%Y%m%d_%H%M%S).sql

# 3. Run integrity checks
docker exec -it dsai-capstone-db-1 psql -U capstone -d capstone -c "SELECT * FROM pg_stat_database;"

# 4. Check for corrupted tables
docker exec -it dsai-capstone-db-1 psql -U capstone -d capstone -c "
  SELECT schemaname, tablename 
  FROM pg_tables 
  WHERE schemaname = 'public';
"

# 5. Run VACUUM ANALYZE
docker exec -it dsai-capstone-db-1 psql -U capstone -d capstone -c "VACUUM ANALYZE;"
```

### pgvector Index Recovery

```bash
# Rebuild HNSW index for embeddings
docker exec -it dsai-capstone-db-1 psql -U capstone -d capstone -c "
  REINDEX INDEX CONCURRENTLY document_chunk_embedding_idx;
"

# Or drop and recreate:
docker exec -it dsai-capstone-db-1 psql -U capstone -d capstone -c "
  DROP INDEX IF EXISTS document_chunk_embedding_idx;
  CREATE INDEX document_chunk_embedding_idx 
  ON document_chunk 
  USING hnsw (embedding vector_cosine_ops);
"
```

---

## Backup Restoration

### Restore from PostgreSQL Dump

```bash
# 1. Stop application
docker compose stop backend frontend

# 2. Drop and recreate database
docker exec -it dsai-capstone-db-1 psql -U capstone -c "DROP DATABASE IF EXISTS capstone;"
docker exec -it dsai-capstone-db-1 psql -U capstone -c "CREATE DATABASE capstone;"

# 3. Restore from backup
cat backup_YYYYMMDD_HHMMSS.sql | docker exec -i dsai-capstone-db-1 psql -U capstone -d capstone

# 4. Run schema migrations
cd nestjs-backend
npx mikro-orm migration:up

# 5. Restart application
docker compose start backend frontend
```

### Verify Restoration

```bash
# Check record counts
docker exec -it dsai-capstone-db-1 psql -U capstone -d capstone -c "
  SELECT 
    (SELECT COUNT(*) FROM \"user\") as users,
    (SELECT COUNT(*) FROM user_profile) as profiles,
    (SELECT COUNT(*) FROM document_chunk) as chunks,
    (SELECT COUNT(*) FROM skill) as skills;
"
```

---

## AI Pipeline Recovery

### Embedding Service Issues

```bash
# 1. Check embedding service health
curl http://localhost:8000/api/production-assurance/rag/verify/embedding?query=test

# 2. Verify model is loaded
docker logs dsai-capstone-backend-1 | grep -i "embedding"

# 3. If model failed to load, restart backend
docker compose restart backend

# 4. Regenerate missing embeddings
curl -X POST http://localhost:8000/api/internal/embeddings/backfill \
  -H "X-Internal-Token: $INTERNAL_AUTOMATION_TOKEN"
```

### RAG Pipeline Issues

```bash
# 1. Check RAG health
curl http://localhost:8000/api/production-assurance/rag/health

# 2. Verify vector search
curl -X POST http://localhost:8000/api/production-assurance/rag/verify/vector-search

# 3. Check for failed traces
curl "http://localhost:8000/api/production-assurance/traces?limit=20"

# 4. Trigger recovery if needed
curl -X POST "http://localhost:8000/api/production-assurance/recovery/trigger?type=VECTOR_INDEX_REBUILD&description=Manual+vector+index+rebuild"
```

### LLM Provider Failures

```bash
# Check current LLM configuration
docker exec dsai-capstone-backend-1 env | grep -E "LLM|GROQ|ANTHROPIC|GEMINI"

# The system automatically fails over: Groq -> Claude -> Gemini
# Check which provider is being used in logs
docker logs dsai-capstone-backend-1 | grep -i "ENGINE:"
```

---

## Service Restart Procedures

### Restart Individual Service

```bash
# Backend
docker compose restart backend

# Frontend
docker compose restart frontend

# Database (use with caution)
docker compose restart db

# n8n automation
docker compose restart n8n
```

### Full Stack Restart

```bash
# Graceful restart
docker compose restart

# Or complete rebuild
docker compose down
docker compose build
docker compose up -d
```

### Verify Service Health After Restart

```bash
# Wait for services to be ready
sleep 30

# Check health endpoint
curl http://localhost:8000/api/production-assurance/health

# Run deployment validation
curl -X POST http://localhost:8000/api/production-assurance/deployment/validate
```

---

## Incident Response

### Security Incident

1. **Immediate Actions:**
   ```bash
   # Rotate compromised credentials
   # Update secrets in AWS Secrets Manager
   
   # Force token invalidation
   docker exec dsai-capstone-backend-1 redis-cli FLUSHDB  # If using Redis
   
   # Enable enhanced logging
   docker exec dsai-capstone-backend-1 env LOG_LEVEL=debug
   ```

2. **Investigation:**
   ```bash
   # Pull recent logs
   docker logs --tail 1000 dsai-capstone-backend-1 > incident_logs.txt
   
   # Check audit findings
   curl http://localhost:8000/api/production-assurance/audit/last
   ```

3. **Recovery:**
   - Reset affected user credentials
   - Review and revoke compromised tokens
   - Update security configurations
   - Run full security scan

### Performance Degradation

1. **Diagnosis:**
   ```bash
   # Check system metrics
   curl http://localhost:8000/api/production-assurance/health
   
   # Check recent load test results
   curl http://localhost:8000/api/production-assurance/load-test/quick-check
   
   # Check for slow queries
   docker exec -it dsai-capstone-db-1 psql -U capstone -d capstone -c "
     SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
     FROM pg_stat_activity 
     WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
   "
   ```

2. **Mitigation:**
   - Scale horizontally if possible
   - Clear caches
   - Kill long-running queries
   - Enable query optimization

### Data Pipeline Failure

1. **Identify Failed Pipeline:**
   ```bash
   # Check recovery history
   curl http://localhost:8000/api/production-assurance/recovery/history?limit=10
   
   # Check execution traces
   curl "http://localhost:8000/api/production-assurance/traces/stats?hours=24"
   ```

2. **Recovery:**
   ```bash
   # Trigger manual recovery
   curl -X POST "http://localhost:8000/api/production-assurance/recovery/trigger?type=DATA_REPROCESS&description=Manual+data+reprocessing"
   
   # Or re-run specific sync job
   curl -X POST http://localhost:8000/api/internal/sync/ssg/courses \
     -H "X-Internal-Token: $INTERNAL_AUTOMATION_TOKEN"
   ```

---

## Monitoring Commands

### Quick Health Check
```bash
curl http://localhost:8000/api/production-assurance/deployment/quick-check
```

### Full System Status
```bash
curl http://localhost:8000/api/production-assurance/health | jq .
```

### Production Readiness Score
```bash
curl http://localhost:8000/api/production-assurance/audit/readiness | jq .
```

### Active Alerts
```bash
curl http://localhost:8000/api/production-assurance/health/alerts | jq .
```

### Recent Audit Findings
```bash
curl http://localhost:8000/api/production-assurance/audit/last | jq .
```

---

## Contact and Escalation

### On-Call Escalation
1. Primary: Check system logs and runbooks
2. Secondary: Contact DevOps team
3. Tertiary: Escalate to platform engineering

### Incident Documentation
- Log all incidents in the incident tracking system
- Update runbooks with new learnings
- Create post-mortem for P0/P1 incidents
