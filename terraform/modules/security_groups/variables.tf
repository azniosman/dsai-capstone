variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "vpc_cidr" {
  type        = string
  description = "VPC CIDR block — used to restrict internal-only traffic rules"
}
