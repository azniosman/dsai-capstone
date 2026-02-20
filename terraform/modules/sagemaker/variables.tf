variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "sagemaker_role_arn" {
  type        = string
  description = "IAM role ARN for SageMaker execution"
}
