variable "project_name" {}
variable "environment" {}
variable "vpc_id" {}
variable "subnet_ids" { type = list(string) }
variable "security_group_ids" { type = list(string) }
variable "db_password" {}

resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-${var.environment}-db-subnet-group"
  subnet_ids = var.subnet_ids

  tags = {
    Name = "${var.project_name}-${var.environment}-db-subnet-group"
  }
}

resource "aws_rds_cluster" "postgresql" {
  cluster_identifier     = "${var.project_name}-${var.environment}-aurora-cluster"
  engine                 = "aurora-postgresql"
  engine_mode            = "provisioned"
  engine_version         = "16.1"
  database_name          = "capstone"
  master_username        = "capstone"
  master_password        = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = var.security_group_ids
  skip_final_snapshot    = true

  serverless_v2_scaling_configuration {
    min_capacity = 0.5
    max_capacity = 2.0
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-aurora-cluster"
  }
}

resource "aws_rds_cluster_instance" "writer" {
  cluster_identifier = aws_rds_cluster.postgresql.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.postgresql.engine
  engine_version     = aws_rds_cluster.postgresql.engine_version
}

# Store credentials in Secrets Manager (Best Practice)
resource "aws_secretsmanager_secret" "db_credentials" {
  name = "${var.project_name}/${var.environment}/db-credentials"
}

resource "aws_secretsmanager_secret_version" "db_credentials_version" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = aws_rds_cluster.postgresql.master_username
    password = aws_rds_cluster.postgresql.master_password
    engine   = "postgresql"
    host     = aws_rds_cluster.postgresql.endpoint
    port     = 5432
    dbname   = aws_rds_cluster.postgresql.database_name
  })
}

output "database_url_secret_arn" {
  value = aws_secretsmanager_secret.db_credentials.arn
}

output "db_endpoint" {
  value = aws_rds_cluster.postgresql.endpoint
}
