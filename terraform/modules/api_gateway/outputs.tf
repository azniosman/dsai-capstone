output "api_id" {
  value = aws_apigatewayv2_api.http.id
}

output "api_endpoint" {
  description = "API Gateway invoke URL (e.g. https://abc123.execute-api.us-east-1.amazonaws.com)"
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "execution_arn" {
  value = aws_apigatewayv2_api.http.execution_arn
}
