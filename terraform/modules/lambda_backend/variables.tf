variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "lambda_image_uri" {
  type        = string
  description = "ECR image URI (account.dkr.ecr.region.amazonaws.com/repo:tag)"
}

variable "lambda_role_arn" {
  type = string
}

variable "subnet_ids" {
  type = list(string)
}

variable "security_group_ids" {
  type = list(string)
}

variable "memory_size" {
  type    = number
  default = 1024
}

variable "timeout" {
  type    = number
  default = 29
}

variable "db_secret_arn" {
  type = string
}

variable "db_host" {
  type = string
}

variable "db_name" {
  type    = string
  default = "skillbridge"
}

variable "db_username" {
  type    = string
  default = "skillbridge"
}

variable "groq_api_key" {
  type      = string
  default   = ""
  sensitive = true
}

variable "groq_model" {
  type    = string
  default = "llama-3.3-70b-versatile"
}

variable "anthropic_api_key" {
  type      = string
  default   = ""
  sensitive = true
}

variable "gemini_api_key" {
  type      = string
  default   = ""
  sensitive = true
}

variable "secret_key" {
  type      = string
  sensitive = true
}

variable "refresh_token_secret" {
  type      = string
  sensitive = true
}

variable "internal_automation_token" {
  type      = string
  sensitive = true
}

variable "opensearch_url" {
  type    = string
  default = ""
}

variable "voice_transcribe_bucket" {
  type        = string
  default     = ""
  description = "S3 bucket name for Transcribe staging (voice pipeline)"
}

variable "cors_allowed_origins" {
  type        = string
  default     = "[\"http://localhost:3000\",\"http://localhost:5173\"]"
  description = "JSON array of CORS allowed origins"
}
