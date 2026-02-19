variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "db_secret_arn" {
  type        = string
  description = "Secrets Manager ARN for DB credentials (scoped in IAM policy)"
}

variable "enable_opensearch" {
  type    = bool
  default = false
}
