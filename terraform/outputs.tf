output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "nat_gateway_ip" {
  description = "Public IP of the NAT Gateway (Lambda egress IP for allow-listing)"
  value       = module.vpc.nat_gateway_ip
}

output "ecr_backend_url" {
  description = "ECR repository URL — push your backend image here before applying Lambda"
  value       = module.ecr.backend_repo_url
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint (private, accessible only from within VPC)"
  value       = module.rds.db_endpoint
}

output "db_secret_arn" {
  description = "Secrets Manager ARN containing DB credentials"
  value       = module.rds.db_secret_arn
}

output "lambda_function_name" {
  description = "Lambda function name (use for manual invocations and log queries)"
  value       = module.lambda_backend.lambda_function_name
}

output "api_endpoint" {
  description = "API Gateway HTTP endpoint (backend API base URL)"
  value       = module.api_gateway.api_endpoint
}

output "s3_bucket_name" {
  description = "S3 bucket name — deploy frontend build artifacts here"
  value       = module.s3_frontend.bucket_id
}

output "cloudfront_domain" {
  description = "CloudFront domain name"
  value       = module.cloudfront.cloudfront_domain_name
}

output "cloudfront_id" {
  description = "CloudFront distribution ID (needed for cache invalidation)"
  value       = module.cloudfront.cloudfront_id
}

output "frontend_url" {
  description = "Frontend application URL (HTTPS via CloudFront)"
  value       = "https://${module.cloudfront.cloudfront_domain_name}"
}

output "opensearch_endpoint" {
  description = "OpenSearch endpoint (empty if enable_opensearch = false)"
  value       = var.enable_opensearch ? "https://${module.opensearch[0].opensearch_endpoint}" : "disabled"
}

output "deploy_summary" {
  description = "Quick deployment summary"
  value = {
    frontend = "https://${module.cloudfront.cloudfront_domain_name}"
    api      = module.api_gateway.api_endpoint
    ecr      = module.ecr.backend_repo_url
    s3       = module.s3_frontend.bucket_id
  }
}
