# =============================================================================
# SkillBridge — Serverless Capstone Demo Stack
# Region:       us-east-1
# Architecture: Lambda (container) + RDS PostgreSQL + S3/CloudFront + Bedrock
#
# Estimated monthly cost breakdown:
#   NAT Gateway (single-AZ):  ~$32
#   RDS db.t4g.micro:         ~$13
#   ECR storage:               ~$0.10
#   Lambda / API GW / S3 / CF: Free-tier / near-zero at demo scale
#   OpenSearch (if enabled):  +~$26
#   TOTAL (base):             ~$45/month
#
# Cost tip: destroy the NAT Gateway when not running demos:
#   terraform destroy -target module.vpc.aws_nat_gateway.main
# =============================================================================

# 1. VPC — public + private subnets across 2 AZs, single NAT Gateway
module "vpc" {
  source = "./modules/vpc"

  project_name = var.project_name
  environment  = var.environment
  aws_region   = var.aws_region
  cidr_block   = "10.0.0.0/16"
}

# 2. Security Groups — scoped per service (Lambda → RDS, Lambda → OpenSearch)
module "security_groups" {
  source = "./modules/security_groups"

  project_name = var.project_name
  environment  = var.environment
  vpc_id       = module.vpc.vpc_id
  vpc_cidr     = module.vpc.vpc_cidr_block
}

# 3. ECR — container registry for the Lambda backend image
module "ecr" {
  source = "./modules/ecr"

  project_name = var.project_name
  environment  = var.environment
}

# 4. RDS PostgreSQL — db.t4g.micro in private subnet, credentials in Secrets Manager
module "rds" {
  source = "./modules/rds"

  project_name       = var.project_name
  environment        = var.environment
  aws_region         = var.aws_region
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnets
  security_group_ids = [module.security_groups.rds_sg_id]
  db_username        = var.db_username
  db_password        = var.db_password
}

# 5. IAM — least-privilege role for Lambda (Bedrock, Transcribe, Polly, Secrets Manager)
module "iam" {
  source = "./modules/iam"

  project_name      = var.project_name
  environment       = var.environment
  aws_region        = var.aws_region
  db_secret_arn     = module.rds.db_secret_arn
  enable_opensearch = var.enable_opensearch
}

# 6. Lambda Backend — container image from ECR, runs in VPC private subnets
module "lambda_backend" {
  source = "./modules/lambda_backend"

  project_name       = var.project_name
  environment        = var.environment
  aws_region         = var.aws_region
  lambda_role_arn    = module.iam.lambda_role_arn
  subnet_ids         = module.vpc.private_subnets
  security_group_ids = [module.security_groups.lambda_sg_id]
  memory_size        = var.lambda_memory_mb
  timeout            = var.lambda_timeout_seconds

  # Image URI: use explicit override or default to ECR repo:latest
  lambda_image_uri = var.lambda_image_uri != "" ? var.lambda_image_uri : "${module.ecr.backend_repo_url}:latest"

  # Application configuration
  db_secret_arn    = module.rds.db_secret_arn
  db_host          = module.rds.db_address
  db_name          = "skillbridge"
  db_username      = var.db_username
  bedrock_model_id = var.bedrock_model_id
  gemini_api_key   = var.gemini_api_key
  secret_key       = var.secret_key
  opensearch_url   = var.enable_opensearch ? "https://${module.opensearch[0].opensearch_endpoint}" : ""

  depends_on = [module.rds, module.iam]
}

# 7. API Gateway — HTTP API (v2) with CORS, throttling, and CloudWatch logging
module "api_gateway" {
  source = "./modules/api_gateway"

  project_name         = var.project_name
  environment          = var.environment
  lambda_invoke_arn    = module.lambda_backend.lambda_invoke_arn
  lambda_function_name = module.lambda_backend.lambda_function_name
}

# 8. S3 Frontend — private if CloudFront is enabled; public website if not
module "s3_frontend" {
  source = "./modules/s3_frontend"

  project_name         = var.project_name
  environment          = var.environment
  enable_public_access = !var.enable_cloudfront
}

# 9. CloudFront — optional (requires AWS account verification for new accounts)
module "cloudfront" {
  count  = var.enable_cloudfront ? 1 : 0
  source = "./modules/cloudfront"

  project_name          = var.project_name
  environment           = var.environment
  s3_bucket_id          = module.s3_frontend.bucket_id
  s3_bucket_arn         = module.s3_frontend.bucket_arn
  s3_bucket_domain_name = module.s3_frontend.bucket_regional_domain_name
  api_gateway_url       = module.api_gateway.api_endpoint
}

# 10. OpenSearch — optional, single-node t3.small.search for hybrid vector search
module "opensearch" {
  count  = var.enable_opensearch ? 1 : 0
  source = "./modules/opensearch"

  project_name       = var.project_name
  environment        = var.environment
  aws_region         = var.aws_region
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = [module.vpc.private_subnets[0]]
  security_group_ids = [module.security_groups.opensearch_sg_id]
}
