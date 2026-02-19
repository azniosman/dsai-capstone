output "opensearch_endpoint" {
  description = "OpenSearch domain endpoint (without https://)"
  value       = aws_opensearch_domain.main.endpoint
}

output "opensearch_domain_name" {
  value = aws_opensearch_domain.main.domain_name
}

output "opensearch_arn" {
  value = aws_opensearch_domain.main.arn
}
