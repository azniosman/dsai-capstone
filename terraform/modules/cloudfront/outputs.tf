output "cloudfront_domain_name" {
  description = "CloudFront distribution domain (use as frontend URL)"
  value       = aws_cloudfront_distribution.web.domain_name
}

output "cloudfront_id" {
  value = aws_cloudfront_distribution.web.id
}

output "cloudfront_arn" {
  value = aws_cloudfront_distribution.web.arn
}
