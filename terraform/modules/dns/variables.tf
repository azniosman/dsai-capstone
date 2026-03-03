variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "domain_name" {
  description = "The primary custom domain name (e.g., sklbr.co)"
  type        = string
}

variable "cloudfront_domain_name" {
  description = "CloudFront distribution domain name to alias to"
  type        = string
  default     = ""
}

variable "cloudfront_hosted_zone_id" {
  description = "CloudFront Route 53 hosted zone ID (Z2FDTNDATAQYW2)"
  type        = string
  default     = "Z2FDTNDATAQYW2"
}
