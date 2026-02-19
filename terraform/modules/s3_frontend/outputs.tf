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
