variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-southeast-1"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "dsai-capstone"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "domain_name" {
  description = "Root domain name (e.g. example.com)"
  type        = string
}

variable "api_subdomain" {
  description = "API subdomain prefix"
  type        = string
  default     = "api"
}

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "capstone"
}

variable "db_username" {
  description = "PostgreSQL master username"
  type        = string
  default     = "capstone"
}

variable "backend_cpu" {
  description = "ECS task CPU units (1024 = 1 vCPU)"
  type        = number
  default     = 2048
}

variable "backend_memory" {
  description = "ECS task memory in MiB"
  type        = number
  default     = 4096
}

variable "backend_desired_count" {
  description = "Desired number of backend tasks"
  type        = number
  default     = 1
}

variable "allowed_cors_origins" {
  description = "Additional CORS origins to allow"
  type        = list(string)
  default     = []
}
