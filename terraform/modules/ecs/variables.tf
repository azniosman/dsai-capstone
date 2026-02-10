variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "public_subnet_id" {
  type = string
}

variable "private_subnet_id" {
  type = string
}

variable "alb_security_group_id" {
  type = string
}

variable "public_route_table_id" {
  description = "Public route table ID for ALB second subnet"
  type        = string
}

variable "ecs_security_group_id" {
  type = string
}

variable "ecr_repository_url" {
  type = string
}

variable "cpu" {
  type    = number
  default = 2048
}

variable "memory" {
  type    = number
  default = 4096
}

variable "desired_count" {
  type    = number
  default = 1
}

variable "db_credentials_secret_arn" {
  type = string
}

variable "jwt_secret_arn" {
  type = string
}

variable "log_group_name" {
  type = string
}

variable "certificate_arn" {
  description = "ACM certificate ARN for HTTPS"
  type        = string
  default     = ""
}

variable "enable_https" {
  description = "Whether to enable HTTPS listeners (must be known at plan time)"
  type        = bool
  default     = false
}

variable "allowed_cors_origins" {
  type    = list(string)
  default = []
}
