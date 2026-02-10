locals {
  api_domain      = "${var.api_subdomain}.${var.domain_name}"
  frontend_domain = var.domain_name

  cors_origins = concat(
    ["https://${var.domain_name}"],
    var.allowed_cors_origins,
  )
}

# --- ECR ---
module "ecr" {
  source       = "./modules/ecr"
  project_name = var.project_name
}

# --- Monitoring (log groups needed before ECS) ---
module "monitoring" {
  source             = "./modules/monitoring"
  project_name       = var.project_name
  environment        = var.environment
  log_retention_days = 7
}

# --- Networking ---
module "networking" {
  source       = "./modules/networking"
  project_name = var.project_name
  environment  = var.environment
  aws_region   = var.aws_region
}

# --- Database ---
module "database" {
  source            = "./modules/database"
  project_name      = var.project_name
  environment       = var.environment
  db_name           = var.db_name
  db_username       = var.db_username
  subnet_id         = module.networking.private_subnet_id
  security_group_id = module.networking.rds_security_group_id
  vpc_id            = module.networking.vpc_id
}

# --- Secrets ---
module "secrets" {
  source       = "./modules/secrets"
  project_name = var.project_name
  environment  = var.environment
  db_password  = module.database.db_password
  db_username  = var.db_username
  db_endpoint  = module.database.db_endpoint
  db_name      = var.db_name
}

# --- ECS Backend ---
module "ecs" {
  source                    = "./modules/ecs"
  project_name              = var.project_name
  environment               = var.environment
  aws_region                = var.aws_region
  vpc_id                    = module.networking.vpc_id
  public_subnet_id          = module.networking.public_subnet_id
  private_subnet_id         = module.networking.private_subnet_id
  alb_security_group_id     = module.networking.alb_security_group_id
  public_route_table_id     = module.networking.public_route_table_id
  ecs_security_group_id     = module.networking.ecs_security_group_id
  ecr_repository_url        = module.ecr.repository_url
  cpu                       = var.backend_cpu
  memory                    = var.backend_memory
  desired_count             = var.backend_desired_count
  db_credentials_secret_arn = module.secrets.db_credentials_secret_arn
  jwt_secret_arn            = module.secrets.jwt_secret_arn
  log_group_name            = module.monitoring.backend_log_group_name
  allowed_cors_origins      = local.cors_origins
  certificate_arn           = module.dns.certificate_arn
  enable_https              = var.enable_https
}

# --- DNS & HTTPS ---
module "dns" {
  source        = "./modules/dns"
  domain_name   = var.domain_name
  api_subdomain = var.api_subdomain

  alb_dns_name              = module.ecs.alb_dns_name
  alb_zone_id               = module.ecs.alb_zone_id
  cloudfront_domain_name    = module.frontend.cloudfront_domain_name
  cloudfront_hosted_zone_id = module.frontend.cloudfront_hosted_zone_id
}

# --- Frontend ---
module "frontend" {
  source          = "./modules/frontend"
  project_name    = var.project_name
  environment     = var.environment
  domain_name     = local.frontend_domain
  certificate_arn = module.dns.certificate_arn
  enable_https    = var.enable_https
}
