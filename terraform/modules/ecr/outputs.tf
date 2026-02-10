output "repository_url" {
  description = "URL of the ECR repository"
  value       = aws_ecr_repository.backend.repository_url
}

output "repository_arn" {
  description = "ARN of the ECR repository"
  value       = aws_ecr_repository.backend.arn
}

output "registry_id" {
  description = "Registry ID of the ECR repository"
  value       = aws_ecr_repository.backend.registry_id
}
