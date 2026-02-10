output "db_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.this.endpoint
}

output "db_name" {
  description = "Database name"
  value       = aws_db_instance.this.db_name
}

output "db_username" {
  description = "Database master username"
  value       = aws_db_instance.this.username
}

output "db_password" {
  description = "Database master password"
  value       = random_password.db_password.result
  sensitive   = true
}

output "db_port" {
  description = "Database port"
  value       = aws_db_instance.this.port
}

output "db_instance_id" {
  description = "RDS instance identifier"
  value       = aws_db_instance.this.id
}
