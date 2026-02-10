output "ecr_repository_url" {
  description = "ECR repository URL for backend image"
  value       = module.ecr.repository_url
}

output "alb_dns_name" {
  description = "ALB DNS name for backend API"
  value       = module.ecs.alb_dns_name
}

output "cloudfront_domain" {
  description = "CloudFront domain for frontend"
  value       = module.frontend.cloudfront_domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (for cache invalidation)"
  value       = module.frontend.cloudfront_distribution_id
}

output "s3_bucket_name" {
  description = "S3 bucket name for frontend assets"
  value       = module.frontend.s3_bucket_name
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = module.database.db_endpoint
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.ecs.cluster_name
}

output "ecs_service_name" {
  description = "ECS service name"
  value       = module.ecs.service_name
}

output "route53_nameservers" {
  description = "Route53 nameservers — set these at your domain registrar"
  value       = module.dns.nameservers
}

output "certificate_arn" {
  description = "ACM certificate ARN"
  value       = module.dns.certificate_arn
}
