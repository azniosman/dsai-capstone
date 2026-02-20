variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "voice_lambda_arn" {
  type        = string
  description = "ARN of the voice coaching Lambda function"
}

variable "voice_lambda_function_name" {
  type        = string
  description = "Name of the voice coaching Lambda function (for permission)"
}
