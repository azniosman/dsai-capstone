variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "subnet_ids" {
  type        = list(string)
  description = "At least 2 subnets in different AZs (required by Aurora subnet group)"
}

variable "security_group_ids" {
  type = list(string)
}

variable "aws_region" {
  type = string
}

variable "db_username" {
  type    = string
  default = "skillbridge"
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "db_name" {
  type    = string
  default = "skillbridge"
}
