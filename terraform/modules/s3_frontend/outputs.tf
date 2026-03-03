output "bucket_id" {
  description = "S3 bucket name — deploy frontend build artifacts here"
  value       = aws_s3_bucket.web.id
}

output "bucket_arn" {
  value = aws_s3_bucket.web.arn
}

output "bucket_regional_domain_name" {
  description = "Regional domain name used as CloudFront S3 origin"
  value       = aws_s3_bucket.web.bucket_regional_domain_name
}

output "website_endpoint" {
  description = "S3 static website endpoint (HTTP; only populated when enable_public_access=true)"
  value       = var.enable_public_access ? aws_s3_bucket_website_configuration.web[0].website_endpoint : ""
}

output "hosted_zone_id" {
  description = "Route 53 hosted zone ID for this bucket's region — used for alias records pointing to the S3 website endpoint"
  value       = aws_s3_bucket.web.hosted_zone_id
}
