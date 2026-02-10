variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "db_name" {
  type = string
}

variable "db_username" {
  type = string
}

variable "subnet_id" {
  description = "Private subnet ID for RDS"
  type        = string
}

variable "security_group_id" {
  description = "Security group for RDS"
  type        = string
}

variable "vpc_id" {
  type = string
}
