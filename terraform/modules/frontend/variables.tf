variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "domain_name" {
  description = "Domain name for CloudFront (e.g. example.com)"
  type        = string
}

variable "certificate_arn" {
  description = "ACM certificate ARN in us-east-1 for CloudFront"
  type        = string
  default     = ""
}

variable "enable_https" {
  description = "Whether to enable custom domain + HTTPS (must be known at plan time)"
  type        = bool
  default     = false
}
