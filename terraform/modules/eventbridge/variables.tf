variable "project_name" {
  description = "Project name prefix applied to all resource names."
  type        = string
}

variable "environment" {
  description = "Deployment environment (e.g. prod, dev, staging)."
  type        = string
}

variable "aws_region" {
  description = "AWS region for all resources."
  type        = string
  default     = "us-east-1"
}

variable "backend_function_name" {
  description = "Name of the NestJS backend Lambda function to invoke."
  type        = string
}

variable "lambda_image_uri" {
  description = "ECR image URI used for automation Lambda functions (reuses the backend image)."
  type        = string
}

variable "automation_lambda_role_arn" {
  description = "IAM role ARN for automation Lambda execution (least-privilege)."
  type        = string
}

variable "scheduler_role_arn" {
  description = "IAM role ARN for EventBridge Scheduler to invoke Lambda functions."
  type        = string
}

variable "internal_token_secret_arn" {
  description = "ARN of the Secrets Manager secret containing the X-Internal-Token."
  type        = string
}

variable "ops_email" {
  description = "Email address to subscribe to the CloudWatch alerts SNS topic."
  type        = string
  default     = "ops@skillbridge.dev"
}

variable "enable_warmup" {
  description = "Whether to enable the Lambda warm-up ping schedule."
  type        = bool
  default     = true
}
