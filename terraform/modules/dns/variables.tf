variable "domain_name" {
  description = "Root domain name (e.g. workd.my)"
  type        = string
}

variable "api_subdomain" {
  description = "API subdomain prefix (e.g. api)"
  type        = string
  default     = "api"
}

variable "alb_dns_name" {
  description = "ALB DNS name for the API backend"
  type        = string
}

variable "alb_zone_id" {
  description = "ALB canonical hosted zone ID"
  type        = string
}

variable "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  type        = string
}

variable "cloudfront_hosted_zone_id" {
  description = "CloudFront distribution hosted zone ID"
  type        = string
}
