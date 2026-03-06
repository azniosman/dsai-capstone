variable "aws_region" {
  description = "AWS Region to deploy to"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name used for resource naming (lowercase, no spaces)"
  type        = string
  default     = "skillbridge"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "db_username" {
  description = "RDS master username"
  type        = string
  default     = "skillbridge"
}

variable "db_password" {
  description = "RDS master password (min 16 chars; use env var TF_VAR_db_password)"
  type        = string
  sensitive   = true
}

variable "secret_key" {
  description = "JWT secret key for FastAPI backend (generate: openssl rand -hex 32)"
  type        = string
  sensitive   = true
}

variable "refresh_token_secret" {
  description = "Separate secret for signing refresh tokens (generate: openssl rand -hex 32)"
  type        = string
  sensitive   = true
}

variable "groq_api_key" {
  description = "Groq API key (primary LLM provider)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "groq_model" {
  description = "Groq model ID"
  type        = string
  default     = "llama-3.3-70b-versatile"
}

variable "anthropic_api_key" {
  description = "Anthropic API key (Claude fallback)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "gemini_api_key" {
  description = "Google Gemini API key (tertiary LLM fallback)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "lambda_image_uri" {
  description = <<-EOT
    ECR container image URI for the Lambda backend.
    Format: <account>.dkr.ecr.<region>.amazonaws.com/<repo>:<tag>
    Run scripts/deploy-serverless.sh to build and push before first apply.
  EOT
  type        = string
  default     = ""
}

variable "enable_opensearch" {
  description = "Enable OpenSearch domain for hybrid vector+keyword search (adds ~$26/month)"
  type        = bool
  default     = false
}

variable "enable_cloudfront" {
  description = "Enable CloudFront CDN. Requires AWS account verification for new accounts. When false, S3 static website hosting is used instead (HTTP only)."
  type        = bool
  default     = false
}

variable "enable_custom_domain" {
  description = "Provision Route 53 DNS zone and ACM certificates for custom domain mapping (requires CloudFront)."
  type        = bool
  default     = false
}

variable "custom_domain" {
  description = "The apex domain to attach (e.g., 'sklbr.co')"
  type        = string
  default     = ""
}

variable "lambda_memory_mb" {
  description = "Lambda memory in MB (higher = faster cold start for ML models)"
  type        = number
  default     = 3008
}

variable "lambda_timeout_seconds" {
  description = "Lambda timeout in seconds. API Gateway caps response at 29s, but higher values (120s) allow the Lambda INIT to complete on cold starts so the container stays warm for subsequent requests."
  type        = number
  default     = 120
}

variable "enable_sagemaker" {
  description = "Enable SageMaker Serverless endpoint for sentence-transformer embeddings (adds ~$0 idle cost, pay-per-use)"
  type        = bool
  default     = false
}

variable "enable_websocket" {
  description = "Enable WebSocket API Gateway for real-time voice coaching"
  type        = bool
  default     = true
}

# ── EventBridge Automation ────────────────────────────────────────────────────

variable "ops_email" {
  description = "Email to receive CloudWatch automation alarm notifications"
  type        = string
  default     = "ops@skillbridge.dev"
}

variable "internal_automation_token" {
  description = "Shared secret for X-Internal-Token header on internal automation endpoints. Generate: python3 -c \"import secrets; print(secrets.token_hex(32))\""
  type        = string
  sensitive   = true
}

variable "enable_warmup" {
  description = "Enable Lambda warm-up ping every 5 minutes (prevents cold starts during demos)"
  type        = bool
  default     = true
}

variable "cors_allowed_origins" {
  description = "JSON array of CORS allowed origins for the API Lambda (e.g. '[\"https://sklbr.co\"]')"
  type        = string
  default     = "[\"http://localhost:3000\",\"http://localhost:5173\"]"
}
