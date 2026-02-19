output "db_endpoint" {
  description = "Aurora cluster writer endpoint (host:port)"
  value       = "${aws_rds_cluster.main.endpoint}:5432"
}

output "db_address" {
  description = "Aurora cluster writer hostname (without port)"
  value       = aws_rds_cluster.main.endpoint
}

output "db_port" {
  value = 5432
}

output "db_name" {
  value = aws_rds_cluster.main.database_name
}

output "db_secret_arn" {
  description = "Secrets Manager ARN for DB credentials (pass to Lambda)"
  value       = aws_secretsmanager_secret.db_credentials.arn
}

output "db_secret_name" {
  value = aws_secretsmanager_secret.db_credentials.name
}
