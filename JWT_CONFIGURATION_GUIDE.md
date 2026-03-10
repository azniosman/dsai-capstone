# JWT Token Configuration Guide

## Overview

This guide covers JWT token management for the SkillBridge Production Assurance System, including:
- Secret generation
- Token creation
- Token rotation
- Security best practices

---

## Quick Start

### Generate Production Secrets

```bash
# Generate new secrets and save to .env
node scripts/generate-jwt-secrets.js --save

# Or generate without saving (for manual configuration)
node scripts/generate-jwt-secrets.js
```

### Generate Admin Token

```bash
# Generate token for admin user
node scripts/generate-jwt-secrets.js --token --email admin@skillbridge.com

# Store the token for use in API calls
export PROD_JWT_TOKEN="eyJhbGci..."
```

### Test Token

```bash
# Test the token against the API
curl -H "Authorization: Bearer $PROD_JWT_TOKEN" \
  http://localhost:8000/api/production-assurance/health
```

---

## Secret Generation

### Using the Script (Recommended)

```bash
# Generate 256-bit secrets (128 hex characters)
node scripts/generate-jwt-secrets.js --save
```

This generates:
- `JWT_SECRET` - For signing access tokens
- `REFRESH_TOKEN_SECRET` - For signing refresh tokens
- `INTERNAL_AUTOMATION_TOKEN` - For internal service authentication

### Manual Generation

```bash
# Using OpenSSL
JWT_SECRET=$(openssl rand -hex 32)
REFRESH_TOKEN_SECRET=$(openssl rand -hex 32)
INTERNAL_AUTOMATION_TOKEN=$(openssl rand -hex 32)

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Minimum Requirements

| Secret | Minimum Length | Recommended |
|--------|---------------|-------------|
| JWT_SECRET | 32 chars (128 bits) | 64 chars (256 bits) |
| REFRESH_TOKEN_SECRET | 32 chars (128 bits) | 64 chars (256 bits) |
| INTERNAL_AUTOMATION_TOKEN | 32 chars (128 bits) | 64 chars (256 bits) |

---

## Token Lifecycle

### Access Tokens

- **Validity:** 24 hours (configurable)
- **Purpose:** API authentication
- **Storage:** Client-side (memory/localStorage)
- **Refresh:** Via refresh token or re-login

### Refresh Tokens

- **Validity:** 7 days (configurable)
- **Purpose:** Obtain new access tokens
- **Storage:** Secure HTTP-only cookie
- **Rotation:** On each use (recommended)

### Internal Automation Tokens

- **Validity:** Until rotated
- **Purpose:** Service-to-service authentication
- **Storage:** Environment variables / Secrets Manager
- **Rotation:** Every 90 days (recommended)

---

## Token Rotation

### Scheduled Rotation (Every 90 Days)

```bash
# Dry run first
./scripts/rotate-jwt-secrets.sh --dry-run

# Create backup and rotate
./scripts/rotate-jwt-secrets.sh --backup

# Force rotation (skip confirmation)
./scripts/rotate-jwt-secrets.sh --force --backup
```

### Emergency Rotation

If secrets are compromised:

1. **Rotate immediately:**
   ```bash
   ./scripts/rotate-jwt-secrets.sh --force --backup
   ```

2. **Restart all services:**
   ```bash
   docker compose restart backend
   ```

3. **Update secrets in:**
   - AWS Secrets Manager
   - CI/CD pipeline secrets
   - Load balancer configuration
   - Any automation scripts

4. **Notify users** that re-login is required

### Rotation Checklist

- [ ] Create backup of current secrets
- [ ] Generate new secrets
- [ ] Update .env file
- [ ] Update secrets manager
- [ ] Restart all services
- [ ] Update CI/CD secrets
- [ ] Test authentication
- [ ] Delete backup after verification
- [ ] Document rotation in change log

---

## Environment Configuration

### Development (.env)

```bash
JWT_SECRET=dev_secret_change_in_production
REFRESH_TOKEN_SECRET=dev_refresh_change_in_production
INTERNAL_AUTOMATION_TOKEN=dev_internal_change_in_production
```

### Production (.env.production)

```bash
# Copy template and update
cp .env.production.template .env.production

# Generate production secrets
node scripts/generate-jwt-secrets.js --save

# Or use secrets manager
export JWT_SECRET=$(aws secretsmanager get-secret-value --secret-id prod/jwt-secret --query SecretString --output text)
```

### Docker Compose

```yaml
services:
  backend:
    environment:
      JWT_SECRET: ${JWT_SECRET}
      REFRESH_TOKEN_SECRET: ${REFRESH_TOKEN_SECRET}
      INTERNAL_AUTOMATION_TOKEN: ${INTERNAL_AUTOMATION_TOKEN}
```

### Kubernetes Secrets

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: skillbridge-jwt-secrets
type: Opaque
stringData:
  JWT_SECRET: <base64-encoded-secret>
  REFRESH_TOKEN_SECRET: <base64-encoded-secret>
  INTERNAL_AUTOMATION_TOKEN: <base64-encoded-secret>
```

---

## AWS Secrets Manager Integration

### Store Secrets

```bash
# Store JWT secret
aws secretsmanager create-secret \
  --name prod/skillbridge/jwt-secret \
  --secret-string "$(node scripts/generate-jwt-secrets.js | grep JWT_SECRET | cut -d'=' -f2)"

# Store refresh token secret
aws secretsmanager create-secret \
  --name prod/skillbridge/refresh-secret \
  --secret-string "$(node scripts/generate-jwt-secrets.js | grep REFRESH | cut -d'=' -f2)"

# Store internal automation token
aws secretsmanager create-secret \
  --name prod/skillbridge/internal-token \
  --secret-string "$(node scripts/generate-jwt-secrets.js | grep INTERNAL | cut -d'=' -f2)"
```

### Retrieve in Lambda

```python
import boto3
import json

def get_secret(secret_name):
    client = boto3.client('secretsmanager')
    response = client.get_secret_value(SecretId=secret_name)
    return json.loads(response['SecretString'])

# Usage
secrets = get_secret('prod/skillbridge/jwt-secret')
jwt_secret = secrets['JWT_SECRET']
```

### Terraform Configuration

```hcl
resource "aws_secretsmanager_secret" "jwt_secret" {
  name = "prod/skillbridge/jwt-secret"
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id = aws_secretsmanager_secret.jwt_secret.id
  secret_string = var.jwt_secret
}

resource "aws_secretsmanager_secret_rotation" "jwt_secret" {
  secret_id = aws_secretsmanager_secret.jwt_secret.id
  rotation_lambda_arn = aws_lambda_function.secret_rotator.arn
  rotation_rules {
    automatically_after_days = 90
  }
}
```

---

## Security Best Practices

### Secret Storage

✅ **DO:**
- Use secrets managers (AWS Secrets Manager, HashiCorp Vault)
- Encrypt secrets at rest
- Use IAM roles for access control
- Rotate secrets regularly (90 days)
- Use different secrets per environment
- Audit secret access

❌ **DON'T:**
- Commit secrets to version control
- Share secrets via email/chat
- Use weak or predictable secrets
- Reuse secrets across environments
- Log secrets in application logs
- Store secrets in plain text

### Token Handling

✅ **DO:**
- Use HTTPS for all token transmission
- Set secure cookie flags (HttpOnly, Secure, SameSite)
- Implement token blacklisting for logout
- Validate token expiration
- Use short-lived access tokens
- Implement refresh token rotation

❌ **DON'T:**
- Store tokens in localStorage (XSS risk)
- Pass tokens in URL parameters
- Log tokens in application logs
- Use tokens longer than necessary
- Skip token validation

### Monitoring

Monitor for:
- Unusual token generation patterns
- Failed authentication attempts
- Token usage from unexpected IPs
- Expired token usage attempts
- Multiple concurrent sessions

---

## Troubleshooting

### Token Validation Fails

**Symptoms:** 401 Unauthorized errors

**Diagnosis:**
```bash
# Verify token
node scripts/generate-jwt-secrets.js --verify --token-value "eyJhbG..."

# Check secrets match
grep JWT_SECRET .env
docker exec dsai-capstone-backend-1 env | grep JWT_SECRET
```

**Resolution:**
1. Ensure secrets match between .env and running container
2. Restart backend service
3. Generate new token

### Secret Mismatch

**Symptoms:** Authentication works intermittently

**Diagnosis:**
```bash
# Check all instances have same secrets
docker exec dsai-capstone-backend-1 env | grep SECRET
```

**Resolution:**
1. Ensure all instances use same secrets
2. Use centralized secrets manager
3. Restart all instances

### Token Expiry Issues

**Symptoms:** Tokens expire too quickly

**Resolution:**
```bash
# Check token payload
node scripts/generate-jwt-secrets.js --verify --token-value "eyJhbG..."

# Adjust expiry in auth config if needed
```

---

## API Reference

### Generate Secrets

```bash
node scripts/generate-jwt-secrets.js [options]

Options:
  --save, -s          Save to .env file
  --token, -t         Generate admin token
  --email, -e         Email for token (default: admin@skillbridge.com)
  --verify, -v        Verify a token
  --token-value       Token to verify
  --help, -h          Show help
```

### Rotate Secrets

```bash
./scripts/rotate-jwt-secrets.sh [options]

Options:
  --dry-run           Show changes without applying
  --force             Skip confirmation
  --backup            Backup current secrets
  --help              Show help
```

---

## Compliance Notes

### SOC 2 Requirements

- ✅ Secrets encrypted at rest
- ✅ Access logging enabled
- ✅ Regular rotation (90 days)
- ✅ Separation of environments
- ✅ Audit trail maintained

### GDPR Considerations

- Tokens do not contain PII
- Token storage is transient
- Users can revoke tokens (logout)
- Token usage is logged for security

---

## Contact

For questions about JWT configuration:
- **DevOps Team:** devops@skillbridge.internal
- **Security Team:** security@skillbridge.internal
- **Documentation:** See OPERATIONS_TRAINING_GUIDE.md
