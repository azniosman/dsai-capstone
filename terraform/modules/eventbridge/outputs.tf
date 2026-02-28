output "dlq_arn" {
  description = "ARN of the automation SQS Dead Letter Queue."
  value       = aws_sqs_queue.automation_dlq.arn
}

output "dlq_url" {
  description = "URL of the automation SQS Dead Letter Queue."
  value       = aws_sqs_queue.automation_dlq.id
}

output "alerts_topic_arn" {
  description = "ARN of the SNS topic for CloudWatch automation alerts."
  value       = aws_sns_topic.alerts.arn
}

output "ssg_sync_function_arn" {
  description = "ARN of the SSG sync automation Lambda."
  value       = aws_lambda_function.automation["ssg-sync"].arn
}

output "cache_cleanup_function_arn" {
  description = "ARN of the cache cleanup automation Lambda."
  value       = aws_lambda_function.automation["cache-cleanup"].arn
}

output "warmup_function_arn" {
  description = "ARN of the Lambda warm-up automation Lambda."
  value       = aws_lambda_function.automation["warmup"].arn
}
