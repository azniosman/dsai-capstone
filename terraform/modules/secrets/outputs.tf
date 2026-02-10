output "db_credentials_secret_arn" {
  description = "ARN of the database credentials secret"
  value       = aws_secretsmanager_secret.db_credentials.arn
}

output "jwt_secret_arn" {
  description = "ARN of the JWT secret"
  value       = aws_secretsmanager_secret.jwt_secret.arn
}

output "ssm_parameter_arns" {
  description = "ARNs of SSM parameters"
  value = [
    aws_ssm_parameter.sentence_transformer_model.arn,
    aws_ssm_parameter.backend_port.arn,
  ]
}
