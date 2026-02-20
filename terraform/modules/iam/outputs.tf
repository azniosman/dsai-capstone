output "lambda_role_arn" {
  description = "IAM role ARN for the Lambda execution role"
  value       = aws_iam_role.lambda_exec.arn
}

output "lambda_role_name" {
  value = aws_iam_role.lambda_exec.name
}

output "sagemaker_role_arn" {
  description = "SageMaker execution role ARN (empty when enable_sagemaker = false)"
  value       = var.enable_sagemaker ? aws_iam_role.sagemaker_execution[0].arn : ""
}
