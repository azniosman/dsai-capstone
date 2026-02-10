variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "ecs_cluster_name" {
  description = "ECS cluster name for alarms"
  type        = string
  default     = ""
}

variable "ecs_service_name" {
  description = "ECS service name for alarms"
  type        = string
  default     = ""
}

variable "alb_arn_suffix" {
  description = "ALB ARN suffix for alarms"
  type        = string
  default     = ""
}

variable "db_instance_id" {
  description = "RDS instance identifier for alarms"
  type        = string
  default     = ""
}

variable "log_retention_days" {
  type    = number
  default = 7
}
