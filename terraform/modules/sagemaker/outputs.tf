output "endpoint_name" {
  description = "SageMaker serverless endpoint name"
  value       = aws_sagemaker_endpoint.minilm.name
}

output "endpoint_arn" {
  description = "SageMaker serverless endpoint ARN"
  value       = aws_sagemaker_endpoint.minilm.arn
}
