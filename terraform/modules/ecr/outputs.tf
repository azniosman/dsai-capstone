output "backend_repo_url" {
  description = "ECR repository URL for the backend Lambda container image"
  value       = aws_ecr_repository.backend.repository_url
}

output "backend_repo_arn" {
  value = aws_ecr_repository.backend.arn
}

output "backend_repo_name" {
  value = aws_ecr_repository.backend.name
}
