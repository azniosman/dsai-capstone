# =============================================================================
# EventBridge Automation Module
# Manages all scheduled automation for the SkillBridge platform:
#   - 6 automation Lambda functions (reuse backend ECR image)
#   - 8 EventBridge Scheduler rules
#   - SQS Dead Letter Queue
#   - SNS alert topic + email subscription
#   - 6 CloudWatch Alarms
# =============================================================================

# Resolve the current AWS account ID so it can be used in source_arn values.
# Using a wildcard "*" for account ID is rejected by AWS provider >= v5.60.
data "aws_caller_identity" "current" {}

# ─── SQS Dead Letter Queue ───────────────────────────────────────────────────

resource "aws_sqs_queue" "automation_dlq" {
  name                       = "${var.project_name}-${var.environment}-automation-dlq"
  message_retention_seconds  = 1209600 # 14 days
  visibility_timeout_seconds = 900     # 15 minutes

  tags = {
    Name        = "${var.project_name}-${var.environment}-automation-dlq"
    Project     = var.project_name
    Environment = var.environment
    Component   = "eventbridge-automation"
  }
}

resource "aws_sqs_queue_policy" "automation_dlq" {
  queue_url = aws_sqs_queue.automation_dlq.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { Service = "scheduler.amazonaws.com" }
        Action    = "sqs:SendMessage"
        Resource  = aws_sqs_queue.automation_dlq.arn
      }
    ]
  })
}

# ─── SNS Alert Topic ─────────────────────────────────────────────────────────

resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-${var.environment}-automation-alerts"

  tags = {
    Name        = "${var.project_name}-${var.environment}-automation-alerts"
    Project     = var.project_name
    Environment = var.environment
    Component   = "eventbridge-automation"
  }
}

resource "aws_sns_topic_subscription" "ops_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.ops_email
}

# ─── Automation Lambda Functions ─────────────────────────────────────────────

locals {
  automation_lambdas = {
    ssg-sync = {
      handler              = "lambdas.automation.ssg_sync.handler"
      memory               = 256
      timeout              = 300
      reserved_concurrency = -1 # Unreserved — dev/capstone account has low concurrency budget
    }
    cache-cleanup = {
      handler              = "lambdas.automation.cache_cleanup.handler"
      memory               = 128
      timeout              = 60
      reserved_concurrency = -1
    }
    recommendation-refresh = {
      handler              = "lambdas.automation.recommendation_refresh.handler"
      memory               = 512
      timeout              = 600
      reserved_concurrency = -1
    }
    embedding-backfill = {
      handler              = "lambdas.automation.embedding_backfill.handler"
      memory               = 512
      timeout              = 600
      reserved_concurrency = -1
    }
    market-insights = {
      handler              = "lambdas.automation.market_insights.handler"
      memory               = 256
      timeout              = 120
      reserved_concurrency = -1
    }
    warmup = {
      handler              = "lambdas.automation.lambda_warmup.handler"
      memory               = 128
      timeout              = 30
      reserved_concurrency = -1
    }
  }
}

resource "aws_lambda_function" "automation" {
  for_each = local.automation_lambdas

  function_name = "${var.project_name}-${var.environment}-${each.key}"
  role          = var.automation_lambda_role_arn
  image_uri     = var.lambda_image_uri
  package_type  = "Image"

  image_config {
    command = [each.value.handler]
  }

  memory_size = each.value.memory
  timeout     = each.value.timeout

  reserved_concurrent_executions = each.value.reserved_concurrency

  environment {
    variables = {
      BACKEND_FUNCTION_NAME     = var.backend_function_name
      INTERNAL_TOKEN_SECRET_ARN = var.internal_token_secret_arn
      LOG_LEVEL                 = "INFO"
    }
  }

  dead_letter_config {
    target_arn = aws_sqs_queue.automation_dlq.arn
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-automation-${each.key}"
    Project     = var.project_name
    Environment = var.environment
    Component   = "eventbridge-automation"
  }
}

# Allow EventBridge Scheduler to invoke each automation Lambda
resource "aws_lambda_permission" "scheduler_invoke" {
  for_each = local.automation_lambdas

  statement_id  = "AllowEventBridgeScheduler"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.automation[each.key].function_name
  principal     = "scheduler.amazonaws.com"
  source_arn    = "arn:aws:scheduler:${var.aws_region}:${data.aws_caller_identity.current.account_id}:schedule/*"
}

# ─── EventBridge Scheduler Rules ─────────────────────────────────────────────

# Rule 1: SSG Course Sync — daily 01:00 UTC
resource "aws_scheduler_schedule" "ssg_course_sync" {
  name       = "${var.project_name}-${var.environment}-ssg-course-sync"
  group_name = "default"

  flexible_time_window { mode = "OFF" }
  schedule_expression          = "cron(0 1 * * ? *)"
  schedule_expression_timezone = "UTC"

  target {
    arn      = aws_lambda_function.automation["ssg-sync"].arn
    role_arn = var.scheduler_role_arn
    input = jsonencode({
      task     = "sync_courses"
      endpoint = "/internal/sync/ssg/courses"
      method   = "POST"
    })

    retry_policy {
      maximum_retry_attempts       = 3
      maximum_event_age_in_seconds = 86400
    }

    dead_letter_config {
      arn = aws_sqs_queue.automation_dlq.arn
    }
  }
}

# Rule 2: SSG Job Role Sync — daily 01:30 UTC (after course sync)
resource "aws_scheduler_schedule" "ssg_jobrole_sync" {
  name       = "${var.project_name}-${var.environment}-ssg-jobrole-sync"
  group_name = "default"

  flexible_time_window { mode = "OFF" }
  schedule_expression          = "cron(30 1 * * ? *)"
  schedule_expression_timezone = "UTC"

  target {
    arn      = aws_lambda_function.automation["ssg-sync"].arn
    role_arn = var.scheduler_role_arn
    input = jsonencode({
      task     = "sync_jobroles"
      endpoint = "/internal/sync/ssg/jobroles"
      method   = "POST"
    })

    retry_policy {
      maximum_retry_attempts       = 3
      maximum_event_age_in_seconds = 86400
    }

    dead_letter_config {
      arn = aws_sqs_queue.automation_dlq.arn
    }
  }
}

# Rule 3: Recommendation Pre-Computation — daily 02:00 UTC
resource "aws_scheduler_schedule" "recommendation_precompute" {
  name       = "${var.project_name}-${var.environment}-recommendation-precompute"
  group_name = "default"

  flexible_time_window { mode = "OFF" }
  schedule_expression          = "cron(0 2 * * ? *)"
  schedule_expression_timezone = "UTC"

  target {
    arn      = aws_lambda_function.automation["recommendation-refresh"].arn
    role_arn = var.scheduler_role_arn
    input = jsonencode({
      task       = "precompute_scores"
      endpoint   = "/internal/recommendations/precompute"
      method     = "POST"
      batch_size = 50
    })

    retry_policy {
      maximum_retry_attempts       = 3
      maximum_event_age_in_seconds = 86400
    }

    dead_letter_config {
      arn = aws_sqs_queue.automation_dlq.arn
    }
  }
}

# Rule 4: LLM Rationale Pre-Generation — daily 02:30 UTC
resource "aws_scheduler_schedule" "recommendation_rationale_pregen" {
  name       = "${var.project_name}-${var.environment}-rationale-pregen"
  group_name = "default"

  flexible_time_window { mode = "OFF" }
  schedule_expression          = "cron(30 2 * * ? *)"
  schedule_expression_timezone = "UTC"

  target {
    arn      = aws_lambda_function.automation["recommendation-refresh"].arn
    role_arn = var.scheduler_role_arn
    input = jsonencode({
      task     = "pregen_rationale"
      endpoint = "/internal/recommendations/rationale-pregen"
      method   = "POST"
    })

    retry_policy {
      maximum_retry_attempts       = 2
      maximum_event_age_in_seconds = 86400
    }

    dead_letter_config {
      arn = aws_sqs_queue.automation_dlq.arn
    }
  }
}

# Rule 5: Cache Cleanup — daily 03:00 UTC
resource "aws_scheduler_schedule" "cache_cleanup" {
  name       = "${var.project_name}-${var.environment}-cleanup-expired-cache"
  group_name = "default"

  flexible_time_window { mode = "OFF" }
  schedule_expression          = "cron(0 3 * * ? *)"
  schedule_expression_timezone = "UTC"

  target {
    arn      = aws_lambda_function.automation["cache-cleanup"].arn
    role_arn = var.scheduler_role_arn
    input = jsonencode({
      task     = "cleanup_ssg_cache"
      endpoint = "/internal/cache/cleanup"
      method   = "POST"
    })

    retry_policy {
      maximum_retry_attempts       = 2
      maximum_event_age_in_seconds = 3600
    }

    dead_letter_config {
      arn = aws_sqs_queue.automation_dlq.arn
    }
  }
}

# Rule 6: Market Insights Aggregation — daily 04:00 UTC
resource "aws_scheduler_schedule" "market_insights" {
  name       = "${var.project_name}-${var.environment}-market-insights-aggregation"
  group_name = "default"

  flexible_time_window { mode = "OFF" }
  schedule_expression          = "cron(0 4 * * ? *)"
  schedule_expression_timezone = "UTC"

  target {
    arn      = aws_lambda_function.automation["market-insights"].arn
    role_arn = var.scheduler_role_arn
    input = jsonencode({
      task     = "aggregate_market_insights"
      endpoint = "/internal/analytics/aggregate"
      method   = "POST"
    })

    retry_policy {
      maximum_retry_attempts       = 2
      maximum_event_age_in_seconds = 86400
    }

    dead_letter_config {
      arn = aws_sqs_queue.automation_dlq.arn
    }
  }
}

# Rule 7: Embedding Backfill — every 6 hours
# DISABLED: The NestJS handler for /internal/embeddings/backfill does not yet
# exist (Phase 2). Re-enable by setting state = "ENABLED" once the handler is
# implemented in nestjs-backend/src/internal/internal.controller.ts.
resource "aws_scheduler_schedule" "embedding_backfill" {
  name       = "${var.project_name}-${var.environment}-embedding-backfill"
  group_name = "default"
  state      = "DISABLED"

  flexible_time_window { mode = "OFF" }
  schedule_expression          = "rate(6 hours)"
  schedule_expression_timezone = "UTC"

  target {
    arn      = aws_lambda_function.automation["embedding-backfill"].arn
    role_arn = var.scheduler_role_arn
    input = jsonencode({
      task     = "backfill_embeddings"
      endpoint = "/internal/embeddings/backfill"
      method   = "POST"
      limit    = 100
    })

    retry_policy {
      maximum_retry_attempts       = 3
      maximum_event_age_in_seconds = 21600
    }

    dead_letter_config {
      arn = aws_sqs_queue.automation_dlq.arn
    }
  }
}

# Rule 8: Lambda Warm-Up Ping — every 5 minutes (conditional on enable_warmup)
resource "aws_scheduler_schedule" "lambda_warmup" {
  count = var.enable_warmup ? 1 : 0

  name       = "${var.project_name}-${var.environment}-lambda-warmup-ping"
  group_name = "default"

  flexible_time_window { mode = "OFF" }
  schedule_expression = "rate(5 minutes)"

  target {
    arn      = aws_lambda_function.automation["warmup"].arn
    role_arn = var.scheduler_role_arn
    input = jsonencode({
      task             = "warmup_ping"
      backend_function = var.backend_function_name
    })

    retry_policy {
      maximum_retry_attempts = 0
    }
  }
}

# ─── CloudWatch Alarms ───────────────────────────────────────────────────────

# Alarm 1: DLQ depth — any message in DLQ means a task failed all retries
resource "aws_cloudwatch_metric_alarm" "dlq_depth" {
  alarm_name          = "${var.project_name}-${var.environment}-automation-dlq-depth"
  alarm_description   = "An automation task failed all retries and landed in the DLQ"
  namespace           = "AWS/SQS"
  metric_name         = "ApproximateNumberOfMessagesVisible"
  dimensions          = { QueueName = aws_sqs_queue.automation_dlq.name }
  statistic           = "Maximum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
}

# Alarm 2: Lambda warm-up latency > 3 seconds (cold start indicator)
resource "aws_cloudwatch_metric_alarm" "warmup_latency" {
  count = var.enable_warmup ? 1 : 0

  alarm_name          = "${var.project_name}-${var.environment}-warmup-latency-high"
  alarm_description   = "NestJS Lambda cold start detected (warmup latency > 3000ms)"
  namespace           = "SkillBridgeAutomation"
  metric_name         = "WarmupLatencyMs"
  statistic           = "Maximum"
  period              = 300
  evaluation_periods  = 2
  threshold           = 3000
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
}

# Alarm 3: SSG sync Lambda errors
resource "aws_cloudwatch_metric_alarm" "ssg_sync_errors" {
  alarm_name          = "${var.project_name}-${var.environment}-ssg-sync-errors"
  alarm_description   = "SSG course/job-role sync Lambda returned an error"
  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  dimensions          = { FunctionName = aws_lambda_function.automation["ssg-sync"].function_name }
  statistic           = "Sum"
  period              = 86400
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
}

# Alarm 4: Recommendation refresh Lambda errors
resource "aws_cloudwatch_metric_alarm" "recommendation_errors" {
  alarm_name          = "${var.project_name}-${var.environment}-recommendation-errors"
  alarm_description   = "Recommendation pre-computation Lambda returned an error"
  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  dimensions          = { FunctionName = aws_lambda_function.automation["recommendation-refresh"].function_name }
  statistic           = "Sum"
  period              = 86400
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
}

# Alarm 5: Cache cleanup returning 0 rows for 3 consecutive days
resource "aws_cloudwatch_metric_alarm" "cache_cleanup_zero" {
  alarm_name          = "${var.project_name}-${var.environment}-cache-cleanup-zero"
  alarm_description   = "Cache cleanup deleted 0 rows for 3+ days — cleanup may not be running"
  namespace           = "SkillBridgeAutomation"
  metric_name         = "CacheRowsDeleted"
  statistic           = "Sum"
  period              = 86400
  evaluation_periods  = 3
  threshold           = 1
  comparison_operator = "LessThanThreshold"
  treat_missing_data  = "breaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
}

# Alarm 6: Embedding backfill errors
resource "aws_cloudwatch_metric_alarm" "embedding_errors" {
  alarm_name          = "${var.project_name}-${var.environment}-embedding-errors"
  alarm_description   = "Embedding backfill Lambda returned errors"
  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  dimensions          = { FunctionName = aws_lambda_function.automation["embedding-backfill"].function_name }
  statistic           = "Sum"
  period              = 86400
  evaluation_periods  = 1
  threshold           = 3
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
}
