output "lambda_function_name" {
  value = aws_lambda_function.api.function_name
}

output "lambda_function_arn" {
  value = aws_lambda_function.api.arn
}

output "lambda_invoke_arn" {
  description = "Invoke ARN used by API Gateway integration"
  value       = aws_lambda_function.api.invoke_arn
}
