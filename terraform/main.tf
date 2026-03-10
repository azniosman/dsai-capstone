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

# Auto-detect AWS account ID if not provided
data "aws_caller_identity" "current" {}

locals {
  account_id = var.aws_account_id != "" ? var.aws_account_id : data.aws_caller_identity.current.account_id
}

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

# 2b. S3 Uploads bucket — resume PDFs and voice Transcribe staging
# Referenced in the IAM policy and needed by resume-upload + voice Lambdas.
# Include account ID in bucket name to ensure global uniqueness (S3 bucket names
# are shared across all AWS accounts).
resource "random_id" "uploads_suffix" {
  byte_length = 4
}

resource "aws_s3_bucket" "uploads" {
  bucket        = "${var.project_name}-${var.environment}-uploads-${random_id.uploads_suffix.hex}-${local.account_id}"
  force_destroy = true

  tags = { Name = "${var.project_name}-${var.environment}-uploads" }
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
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
  enable_sagemaker  = var.enable_sagemaker
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
  db_secret_arn             = module.rds.db_secret_arn
  db_host                   = module.rds.db_address
  db_name                   = "skillbridge"
  db_username               = var.db_username
  groq_api_key              = var.groq_api_key
  groq_model                = var.groq_model
  anthropic_api_key         = var.anthropic_api_key
  gemini_api_key            = var.gemini_api_key
  secret_key                = var.secret_key
  refresh_token_secret      = var.refresh_token_secret
  internal_automation_token = var.internal_automation_token
  opensearch_url            = var.enable_opensearch ? "https://${module.opensearch[0].opensearch_endpoint}" : ""
  voice_transcribe_bucket   = aws_s3_bucket.uploads.id
  cors_allowed_origins      = var.cors_allowed_origins

  depends_on = [module.rds, module.iam, aws_s3_bucket.uploads]
}

# 11. WebSocket API — voice coaching (conditional)
module "websocket" {
  count  = var.enable_websocket ? 1 : 0
  source = "./modules/websocket"

  project_name               = var.project_name
  environment                = var.environment
  voice_lambda_arn           = module.lambda_backend.voice_lambda_arn
  voice_lambda_function_name = module.lambda_backend.voice_lambda_function_name

  depends_on = [module.lambda_backend]
}

# 12. SageMaker Serverless — sentence-transformers (conditional)
module "sagemaker" {
  count  = var.enable_sagemaker ? 1 : 0
  source = "./modules/sagemaker"

  project_name       = var.project_name
  environment        = var.environment
  aws_region         = var.aws_region
  sagemaker_role_arn = module.iam.sagemaker_role_arn

  depends_on = [module.iam]
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

# 9. Optional Custom DNS — Route 53 zone + ACM certificate (us-east-1 required for CloudFront)
# NOTE: The CloudFront alias Route 53 records are created AFTER the cloudfront module
# (see aws_route53_record.cf_alias_* below) to avoid a circular dependency.
module "dns" {
  count  = var.enable_custom_domain && var.custom_domain != "" ? 1 : 0
  source = "./modules/dns"

  project_name = var.project_name
  environment  = var.environment
  domain_name  = var.custom_domain
}

# 10. CloudFront — optional CDN distribution (attaches ACM cert when custom domain is enabled)
module "cloudfront" {
  count  = var.enable_cloudfront ? 1 : 0
  source = "./modules/cloudfront"

  project_name          = var.project_name
  environment           = var.environment
  s3_bucket_id          = module.s3_frontend.bucket_id
  s3_bucket_arn         = module.s3_frontend.bucket_arn
  s3_bucket_domain_name = module.s3_frontend.bucket_regional_domain_name
  api_gateway_url       = module.api_gateway.api_endpoint

  acm_certificate_arn   = var.enable_custom_domain && var.custom_domain != "" ? module.dns[0].acm_certificate_arn : ""
  custom_domain_aliases = var.enable_custom_domain && var.custom_domain != "" ? [var.custom_domain, "www.${var.custom_domain}"] : []
}

# 10b. Route 53 → CloudFront alias records (apex + www, A + AAAA)
# Created after both module.dns and module.cloudfront to avoid a dependency cycle.
# CloudFront's global Route 53 hosted zone ID is the fixed constant Z2FDTNDATAQYW2.
resource "aws_route53_record" "cf_alias_root_a" {
  count           = var.enable_custom_domain && var.custom_domain != "" && var.enable_cloudfront ? 1 : 0
  allow_overwrite = true
  zone_id         = module.dns[0].zone_id
  name            = var.custom_domain
  type            = "A"

  alias {
    name                   = module.cloudfront[0].cloudfront_domain_name
    zone_id                = "Z2FDTNDATAQYW2"
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "cf_alias_root_aaaa" {
  count           = var.enable_custom_domain && var.custom_domain != "" && var.enable_cloudfront ? 1 : 0
  allow_overwrite = true
  zone_id         = module.dns[0].zone_id
  name            = var.custom_domain
  type            = "AAAA"

  alias {
    name                   = module.cloudfront[0].cloudfront_domain_name
    zone_id                = "Z2FDTNDATAQYW2"
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "cf_alias_www_a" {
  count           = var.enable_custom_domain && var.custom_domain != "" && var.enable_cloudfront ? 1 : 0
  allow_overwrite = true
  zone_id         = module.dns[0].zone_id
  name            = "www.${var.custom_domain}"
  type            = "A"

  alias {
    name                   = module.cloudfront[0].cloudfront_domain_name
    zone_id                = "Z2FDTNDATAQYW2"
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "cf_alias_www_aaaa" {
  count           = var.enable_custom_domain && var.custom_domain != "" && var.enable_cloudfront ? 1 : 0
  allow_overwrite = true
  zone_id         = module.dns[0].zone_id
  name            = "www.${var.custom_domain}"
  type            = "AAAA"

  alias {
    name                   = module.cloudfront[0].cloudfront_domain_name
    zone_id                = "Z2FDTNDATAQYW2"
    evaluate_target_health = false
  }
}

# 10c. Route 53 → S3 website alias records (apex + www, A only)
# Used when custom_domain is set but CloudFront is disabled.
# S3 static website endpoints only support HTTP; HTTPS requires CloudFront.
# Route 53 A alias records must point to the S3 website endpoint (not the regional bucket domain).
resource "aws_route53_record" "s3_alias_root_a" {
  count           = var.enable_custom_domain && var.custom_domain != "" && !var.enable_cloudfront ? 1 : 0
  allow_overwrite = true
  zone_id         = module.dns[0].zone_id
  name            = var.custom_domain
  type            = "A"

  alias {
    name                   = module.s3_frontend.website_endpoint
    zone_id                = module.s3_frontend.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "s3_alias_www_a" {
  count           = var.enable_custom_domain && var.custom_domain != "" && !var.enable_cloudfront ? 1 : 0
  allow_overwrite = true
  zone_id         = module.dns[0].zone_id
  name            = "www.${var.custom_domain}"
  type            = "A"

  alias {
    name                   = module.s3_frontend.website_endpoint
    zone_id                = module.s3_frontend.hosted_zone_id
    evaluate_target_health = false
  }
}

# 11. OpenSearch — optional, single-node t3.small.search for hybrid vector search
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

# 13. EventBridge Automation Layer ─────────────────────────────────────────────
# Scheduled automation: SSG sync, cache cleanup, recommendation pre-computation,
# embedding backfill, market insights aggregation, and Lambda keep-alive pings.
# Marginal cost: ~$3.40/month (effectively within AWS Free Tier at demo scale).

resource "aws_secretsmanager_secret" "internal_token" {
  name                    = "${var.project_name}/internal-token"
  description             = "X-Internal-Token shared secret for EventBridge Lambda-to-Lambda automation"
  recovery_window_in_days = 0 # Immediate deletion for dev/capstone use

  tags = {
    Name        = "${var.project_name}-${var.environment}-internal-token"
    Project     = var.project_name
    Environment = var.environment
    Component   = "eventbridge-automation"
  }
}

resource "aws_secretsmanager_secret_version" "internal_token" {
  secret_id     = aws_secretsmanager_secret.internal_token.id
  secret_string = jsonencode({ token = var.internal_automation_token })
}

module "eventbridge" {
  source = "./modules/eventbridge"

  project_name               = var.project_name
  environment                = var.environment
  aws_region                 = var.aws_region
  backend_function_name      = module.lambda_backend.lambda_function_name
  lambda_image_uri           = var.lambda_image_uri != "" ? var.lambda_image_uri : "${module.ecr.backend_repo_url}:latest"
  automation_lambda_role_arn = module.iam.automation_lambda_role_arn
  scheduler_role_arn         = module.iam.scheduler_role_arn
  internal_token_secret_arn  = aws_secretsmanager_secret.internal_token.arn
  ops_email                  = var.ops_email
  enable_warmup              = var.enable_warmup

  depends_on = [module.lambda_backend, module.iam]
}
