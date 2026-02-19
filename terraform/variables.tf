variable "aws_region" {
  description = "AWS Region to deploy to"
  default     = "ap-southeast-1"
}

variable "project_name" {
  description = "Project name"
  default     = "skillbridge"
}

variable "environment" {
  description = "Environment (dev, prod)"
  default     = "dev"
}

variable "db_password" {
  description = "Master password for Aurora DB"
  sensitive   = true
}

variable "bedrock_model_id" {
  description = "Bedrock Model ID"
  default     = "anthropic.claude-3-5-sonnet-20240620-v1:0"
}
