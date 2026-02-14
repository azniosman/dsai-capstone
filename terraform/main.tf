provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "SkillBridge"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# 1. VPC Module
module "vpc" {
  source = "./modules/vpc"
  
  project_name = var.project_name
  environment  = var.environment
  cidr_block   = "10.0.0.0/16"
}

# 2. Security Groups Module
module "security_groups" {
  source = "./modules/security_groups"
  
  project_name = var.project_name
  environment  = var.environment
  vpc_id       = module.vpc.vpc_id
}

# 3. Database (RDS) Module
module "rds" {
  source = "./modules/rds"
  
  project_name       = var.project_name
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnets
  security_group_ids = [module.security_groups.rds_sg_id]
  db_password        = var.db_password
}

# 4. Storage (EFS) Module
module "storage" {
  source = "./modules/storage"

  project_name       = var.project_name
  environment        = var.environment
  subnet_ids         = module.vpc.private_subnets
  security_group_ids = [module.security_groups.efs_sg_id]
}

# 5. Load Balancer (ALB) Module
module "alb" {
  source = "./modules/alb"

  project_name       = var.project_name
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.public_subnets
  security_group_ids = [module.security_groups.alb_sg_id]
}

# 6. ECR Module
module "ecr" {
  source = "./modules/ecr"

  project_name = var.project_name
  environment  = var.environment
}

# 7. compute (ECS) Module
module "ecs" {
  source = "./modules/ecs"

  project_name       = var.project_name
  environment        = var.environment
  aws_region         = var.aws_region
  
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnets
  security_group_ids = [module.security_groups.ecs_tasks_sg_id]
  
  target_group_arns  = module.alb.target_group_arns
  efs_id             = module.storage.efs_id
  db_endpoint        = module.rds.db_endpoint
}
