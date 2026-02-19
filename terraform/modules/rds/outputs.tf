output "db_endpoint" {
  description = "RDS endpoint (host:port)"
  value       = aws_db_instance.main.endpoint
}

output "db_address" {
  description = "RDS hostname (without port)"
  value       = aws_db_instance.main.address
}

output "db_port" {
  value = aws_db_instance.main.port
}

output "db_name" {
  value = aws_db_instance.main.db_name
}

output "db_secret_arn" {
  description = "Secrets Manager ARN for DB credentials (pass to Lambda)"
  value       = aws_secretsmanager_secret.db_credentials.arn
}

output "db_secret_name" {
  value = aws_secretsmanager_secret.db_credentials.name
}
