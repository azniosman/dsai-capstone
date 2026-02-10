output "backend_log_group_name" {
  description = "CloudWatch log group name for backend"
  value       = aws_cloudwatch_log_group.backend.name
}

output "backend_log_group_arn" {
  description = "CloudWatch log group ARN for backend"
  value       = aws_cloudwatch_log_group.backend.arn
}
