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
  description = "CloudFront domain (or S3 website endpoint when CloudFront is disabled)"
  value       = var.enable_cloudfront ? module.cloudfront[0].cloudfront_domain_name : module.s3_frontend.website_endpoint
}

output "cloudfront_id" {
  description = "CloudFront distribution ID (empty when CloudFront is disabled)"
  value       = var.enable_cloudfront ? module.cloudfront[0].cloudfront_id : ""
}

output "frontend_url" {
  description = "Frontend application URL (custom domain > CloudFront > S3)"
  value       = (var.enable_custom_domain && var.custom_domain != "") ? "https://${var.custom_domain}" : var.enable_cloudfront ? "https://${module.cloudfront[0].cloudfront_domain_name}" : "http://${module.s3_frontend.website_endpoint}"
}

output "name_servers" {
  description = "Route 53 name servers — update your domain registrar NS records to these values"
  value       = (var.enable_custom_domain && var.custom_domain != "") ? module.dns[0].name_servers : []
}

output "opensearch_endpoint" {
  description = "OpenSearch endpoint (empty if enable_opensearch = false)"
  value       = var.enable_opensearch ? "https://${module.opensearch[0].opensearch_endpoint}" : "disabled"
}

output "websocket_endpoint" {
  description = "WebSocket API endpoint for voice coaching (wss://... or 'disabled')"
  value       = var.enable_websocket ? module.websocket[0].websocket_endpoint : "disabled"
}

output "sagemaker_endpoint_name" {
  description = "SageMaker serverless endpoint name (empty if enable_sagemaker = false)"
  value       = var.enable_sagemaker ? module.sagemaker[0].endpoint_name : "disabled"
}

output "deploy_summary" {
  description = "Quick deployment summary"
  value = {
    frontend      = (var.enable_custom_domain && var.custom_domain != "") ? "https://${var.custom_domain}" : var.enable_cloudfront ? "https://${module.cloudfront[0].cloudfront_domain_name}" : "http://${module.s3_frontend.website_endpoint}"
    api           = module.api_gateway.api_endpoint
    ecr           = module.ecr.backend_repo_url
    s3            = module.s3_frontend.bucket_id
    custom_domain = (var.enable_custom_domain && var.custom_domain != "") ? var.custom_domain : "disabled"
  }
}
