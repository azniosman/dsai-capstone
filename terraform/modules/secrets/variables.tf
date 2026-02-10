variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "db_password" {
  description = "Database password to store"
  type        = string
  sensitive   = true
}

variable "db_username" {
  type = string
}

variable "db_endpoint" {
  type = string
}

variable "db_name" {
  type = string
}
