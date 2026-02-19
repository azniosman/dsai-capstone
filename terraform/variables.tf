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

variable "bedrock_model_id" {
  description = "Amazon Bedrock model ID for AI Coach"
  type        = string
  default     = "anthropic.claude-3-5-sonnet-20241022-v2:0"
}

variable "gemini_api_key" {
  description = "Google Gemini API key (optional LLM fallback)"
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
  type    = string
  default = ""
}

variable "enable_opensearch" {
  description = "Enable OpenSearch domain for hybrid vector+keyword search (adds ~$26/month)"
  type        = bool
  default     = false
}

variable "lambda_memory_mb" {
  description = "Lambda memory in MB (higher = faster cold start for ML models)"
  type        = number
  default     = 1024
}

variable "lambda_timeout_seconds" {
  description = "Lambda timeout in seconds (capped at 29 by API Gateway)"
  type        = number
  default     = 29
}
