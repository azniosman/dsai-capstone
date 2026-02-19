terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# 1. VPC (Networking)
module "vpc" {
  source = "./modules/vpc"

  project_name = var.project_name
  environment  = var.environment
  cidr_block   = "10.0.0.0/16"
}

# 2. Database (Aurora Serverless v2 + pgvector)
module "database" {
  source = "./modules/database"

  project_name       = var.project_name
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnets
  security_group_ids = [module.vpc.default_security_group_id] # Ideally create dedicated SG
  db_password        = var.db_password
}

# 3. Backend (Lambda + API Gateway)
module "backend" {
  source = "./modules/backend"

  project_name = var.project_name
  environment  = var.environment
  aws_region   = var.aws_region

  database_url     = module.database.database_url_secret_arn
  bedrock_model_id = var.bedrock_model_id

  # Lambda needs access to VPC for DB, but also NAT Gateway for Internet (Bedrock)
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnets
  security_group_ids = [module.vpc.default_security_group_id]
}

# 4. Frontend (S3 + CloudFront)
module "frontend" {
  source = "./modules/frontend"

  project_name = var.project_name
  environment  = var.environment
}
