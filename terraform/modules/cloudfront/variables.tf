variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "s3_bucket_id" {
  type        = string
  description = "S3 bucket name (used to create the bucket policy)"
}

variable "s3_bucket_arn" {
  type        = string
  description = "S3 bucket ARN (used in bucket policy resource condition)"
}

variable "s3_bucket_domain_name" {
  type        = string
  description = "S3 bucket regional domain name for CloudFront origin"
}

variable "api_gateway_url" {
  type        = string
  description = "API Gateway invoke URL (https://id.execute-api.region.amazonaws.com)"
}
