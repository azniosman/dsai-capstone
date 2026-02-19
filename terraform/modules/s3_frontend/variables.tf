variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "enable_public_access" {
  description = "When true, enables S3 static website hosting with public read access (used when CloudFront is disabled)"
  type        = bool
  default     = false
}
