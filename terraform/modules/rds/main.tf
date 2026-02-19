# Aurora Serverless v2 (PostgreSQL 16) — capstone-demo.md architecture.
# Cost: ~$0.12/ACU-hr * 0.5 ACU = ~$43/month at minimum capacity.
# To pause between demos (scale to near-zero):
#   aws rds modify-db-cluster --db-cluster-identifier <id> \
#     --serverlessv2-scaling-configuration MinCapacity=0,MaxCapacity=2

resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-${var.environment}-db-subnet"
  subnet_ids = var.subnet_ids

  tags = { Name = "${var.project_name}-${var.environment}-db-subnet-group" }
}

resource "aws_rds_cluster_parameter_group" "aurora_pg16" {
  name   = "${var.project_name}-${var.environment}-aurora-pg16"
  family = "aurora-postgresql16"

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name         = "log_min_duration_statement"
    value        = "1000"
    apply_method = "pending-reboot"
  }

  tags = { Name = "${var.project_name}-${var.environment}-aurora-params" }
}

resource "aws_rds_cluster" "main" {
  cluster_identifier = "${var.project_name}-${var.environment}-aurora"
  engine             = "aurora-postgresql"
  engine_version     = "16.4"
  database_name      = var.db_name
  master_username    = var.db_username
  master_password    = var.db_password

  db_subnet_group_name            = aws_db_subnet_group.main.name
  vpc_security_group_ids          = var.security_group_ids
  db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.aurora_pg16.name

  serverlessv2_scaling_configuration {
    min_capacity = 0.5 # Always-warm for demos (~$43/mo); set to 0 to pause
    max_capacity = 2   # Burst up to 2 ACU (4 GB RAM) for peak load
  }

  storage_encrypted       = true
  skip_final_snapshot     = true
  deletion_protection     = false
  backup_retention_period = 1

  tags = { Name = "${var.project_name}-${var.environment}-aurora" }
}

resource "aws_rds_cluster_instance" "main" {
  identifier         = "${var.project_name}-${var.environment}-aurora-1"
  cluster_identifier = aws_rds_cluster.main.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.main.engine
  engine_version     = aws_rds_cluster.main.engine_version

  tags = { Name = "${var.project_name}-${var.environment}-aurora-instance" }
}

resource "aws_secretsmanager_secret" "db_credentials" {
  name                    = "${var.project_name}/${var.environment}/db-credentials"
  recovery_window_in_days = 0 # Immediate deletion on terraform destroy (demo)

  tags = { Name = "${var.project_name}-${var.environment}-db-secret" }
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id

  secret_string = jsonencode({
    username = aws_rds_cluster.main.master_username
    password = var.db_password
    engine   = "aurora-postgresql"
    host     = aws_rds_cluster.main.endpoint
    port     = 5432
    dbname   = aws_rds_cluster.main.database_name
    url = format(
      "postgresql://%s:%s@%s:5432/%s",
      aws_rds_cluster.main.master_username,
      var.db_password,
      aws_rds_cluster.main.endpoint,
      aws_rds_cluster.main.database_name
    )
  })
}
