resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

# --- Database Credentials ---

resource "aws_secretsmanager_secret" "db_credentials" {
  name = "${var.project_name}/${var.environment}/db-credentials"
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password
    host     = var.db_endpoint
    dbname   = var.db_name
    port     = "5432"
  })
}

# --- JWT Secret ---

resource "aws_secretsmanager_secret" "jwt_secret" {
  name = "${var.project_name}/${var.environment}/jwt-secret"
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id = aws_secretsmanager_secret.jwt_secret.id
  secret_string = jsonencode({
    secret_key = random_password.jwt_secret.result
  })
}

# --- SSM Parameters (non-sensitive config) ---

resource "aws_ssm_parameter" "sentence_transformer_model" {
  name  = "/${var.project_name}/${var.environment}/sentence-transformer-model"
  type  = "String"
  value = "all-MiniLM-L6-v2"
}

resource "aws_ssm_parameter" "backend_port" {
  name  = "/${var.project_name}/${var.environment}/backend-port"
  type  = "String"
  value = "8000"
}
