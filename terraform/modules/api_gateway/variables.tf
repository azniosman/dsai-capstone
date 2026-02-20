variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "lambda_invoke_arn" {
  type = string
}

variable "lambda_function_name" {
  type = string
}

variable "allowed_origins" {
  type        = list(string)
  default     = ["*"]
  description = "CORS allowed origins. Restrict to CloudFront domain in production."
}
