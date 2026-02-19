output "lambda_sg_id" {
  description = "Security group ID for Lambda functions"
  value       = aws_security_group.lambda.id
}

output "rds_sg_id" {
  description = "Security group ID for RDS"
  value       = aws_security_group.rds.id
}

output "opensearch_sg_id" {
  description = "Security group ID for OpenSearch"
  value       = aws_security_group.opensearch.id
}

output "alb_sg_id" {
  description = "Security group ID for ALB (enterprise ECS path)"
  value       = aws_security_group.alb.id
}

output "ecs_tasks_sg_id" {
  description = "Security group ID for ECS tasks (enterprise path)"
  value       = aws_security_group.ecs_tasks.id
}

output "efs_sg_id" {
  description = "Security group ID for EFS (enterprise n8n path)"
  value       = aws_security_group.efs.id
}
