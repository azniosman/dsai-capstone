output "vpc_id" {
  value = module.vpc.vpc_id
}

output "database_endpoint" {
  value = module.database.db_endpoint
}

output "database_secret_arn" {
  value = module.database.database_url_secret_arn
}

output "api_endpoint" {
  value = module.backend.api_endpoint
}

output "web_bucket_name" {
  value = module.frontend.s3_bucket_name
}

output "cloudfront_domain" {
  value = module.frontend.cloudfront_domain_name
}
