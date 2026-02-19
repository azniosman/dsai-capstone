# Variables in variables.tf. Outputs in outputs.tf.

resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-${var.environment}-db-subnet"
  subnet_ids = var.subnet_ids

  tags = { Name = "${var.project_name}-${var.environment}-db-subnet-group" }
}

resource "aws_db_parameter_group" "postgres16" {
  name   = "${var.project_name}-${var.environment}-pg16"
  family = "postgres16"

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name         = "log_min_duration_statement"
    value        = "1000" # Log queries taking > 1 second
    apply_method = "immediate"
  }

  tags = { Name = "${var.project_name}-${var.environment}-pg16-params" }
}

resource "aws_db_instance" "main" {
  identifier     = "${var.project_name}-${var.environment}-db"
  engine         = "postgres"
  engine_version = "16"     # AWS selects latest 16.x minor version
  instance_class = var.instance_class
  db_name        = var.db_name
  username       = var.db_username
  password       = var.db_password
  port           = 5432

  allocated_storage     = var.allocated_storage_gb
  max_allocated_storage = 100 # Auto-scale storage up to 100 GB
  storage_type          = "gp3"
  storage_encrypted     = true

  vpc_security_group_ids = var.security_group_ids
  db_subnet_group_name   = aws_db_subnet_group.main.name
  parameter_group_name   = aws_db_parameter_group.postgres16.name

  publicly_accessible     = false # Private subnet only — Lambda accesses via VPC
  multi_az                = false # Single-AZ saves ~$13/month for demo
  backup_retention_period = 1     # 1-day backup (minimum; set 0 to disable)
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"

  skip_final_snapshot = true  # Allows clean destroy without a snapshot
  deletion_protection = false # Set true in production

  tags = { Name = "${var.project_name}-${var.environment}-postgres" }
}

# ── Secrets Manager — store DB credentials so Lambda never has the plain password ──

resource "aws_secretsmanager_secret" "db_credentials" {
  name                    = "${var.project_name}/${var.environment}/db-credentials"
  recovery_window_in_days = 0 # Immediate deletion on terraform destroy (demo)

  tags = { Name = "${var.project_name}-${var.environment}-db-secret" }
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id

  secret_string = jsonencode({
    username = aws_db_instance.main.username
    password = var.db_password
    engine   = "postgres"
    host     = aws_db_instance.main.address
    port     = 5432
    dbname   = aws_db_instance.main.db_name
    url = format(
      "postgresql://%s:%s@%s:5432/%s",
      aws_db_instance.main.username,
      var.db_password,
      aws_db_instance.main.address,
      aws_db_instance.main.db_name
    )
  })
}
