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

variable "bedrock_model_id" {
  type    = string
  default = "anthropic.claude-3-5-sonnet-20241022-v2:0"
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

variable "opensearch_url" {
  type    = string
  default = ""
}
