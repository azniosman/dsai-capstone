# ── CloudWatch Log Group ──────────────────────────────────────────────────────
# Create before the Lambda to ensure logs are retained even after destroy.

resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}-api"
  retention_in_days = 14

  tags = { Name = "${var.project_name}-${var.environment}-lambda-logs" }
}

# ── Lambda Function (container image) ────────────────────────────────────────

resource "aws_lambda_function" "api" {
  function_name = "${var.project_name}-${var.environment}-api"
  role          = var.lambda_role_arn
  package_type  = "Image"
  image_uri     = var.lambda_image_uri
  timeout       = var.timeout
  memory_size   = var.memory_size
  architectures = ["x86_64"]
  # No positive reservation — account concurrency limit (10) equals the minimum
  # unreserved pool size, so reserved_concurrent_executions > 0 is disallowed.
  # Unused specialist Lambdas are disabled (= 0) to reduce competition.

  # Override the container CMD to point to the Mangum Lambda handler.
  # The Dockerfile.lambda uses public.ecr.aws/lambda/python:3.11 as base
  # which expects CMD in "module.function" format.
  image_config {
    command = ["lambda_handler.handler"]
  }

  vpc_config {
    subnet_ids         = var.subnet_ids
    security_group_ids = var.security_group_ids
  }

  environment {
    variables = {
      ENVIRONMENT   = var.environment
      AWS_REGION_ID = var.aws_region # Avoid collision with reserved AWS_REGION

      # Database — code reads credentials from Secrets Manager at cold start
      DB_SECRET_ARN = var.db_secret_arn
      POSTGRES_HOST = var.db_host
      POSTGRES_DB   = var.db_name
      POSTGRES_USER = var.db_username
      POSTGRES_PORT = "5432"

      # AI / LLM — provider chain: groq → claude → gemini
      PRIMARY_LLM   = "groq"
      SECONDARY_LLM = "claude"
      TERTIARY_LLM  = "gemini"

      GROQ_API_KEY   = var.groq_api_key
      GROQ_MODEL     = var.groq_model
      AI_TEMPERATURE = "0.3"
      AI_MAX_TOKENS  = "2048"

      ANTHROPIC_API_KEY = var.anthropic_api_key
      CLAUDE_MODEL      = "claude-3-5-sonnet-20241022"

      GEMINI_API_KEY = var.gemini_api_key
      GEMINI_MODEL   = "gemini-2.0-flash"

      # Auth — NestJS reads JWT_SECRET; SECRET_KEY kept for backward-compat
      JWT_SECRET                  = var.secret_key
      REFRESH_TOKEN_SECRET        = var.refresh_token_secret
      INTERNAL_AUTOMATION_TOKEN   = var.internal_automation_token
      SECRET_KEY                  = var.secret_key
      JWT_ALGORITHM               = "HS256"
      ACCESS_TOKEN_EXPIRE_MINUTES = "1440"

      # Search (OpenSearch — empty string disables it)
      OPENSEARCH_HOST = var.opensearch_url

      # CORS — JSON array of allowed origins; same-origin CloudFront requests don't need it,
      # but direct API Gateway access from localhost and other frontends does.
      CORS_ALLOWED_ORIGINS = var.cors_allowed_origins

      # ML models (pre-baked into image; offline mode required in private subnet)
      SENTENCE_TRANSFORMER_MODEL = "all-MiniLM-L6-v2"
      HF_HUB_OFFLINE             = "1"
      TRANSFORMERS_OFFLINE       = "1"

      LOG_LEVEL = "INFO"
    }
  }

  depends_on = [aws_cloudwatch_log_group.lambda]

  tags = { Name = "${var.project_name}-${var.environment}-api" }
}

# ── Specialist Lambda Functions (same image, different CMD) ───────────────────

locals {
  specialist_env = {
    ENVIRONMENT          = var.environment
    AWS_REGION_ID        = var.aws_region
    DB_SECRET_ARN        = var.db_secret_arn
    POSTGRES_HOST        = var.db_host
    POSTGRES_DB          = var.db_name
    POSTGRES_USER        = var.db_username
    POSTGRES_PORT        = "5432"
    GROQ_API_KEY         = var.groq_api_key
    GROQ_MODEL           = var.groq_model
    ANTHROPIC_API_KEY    = var.anthropic_api_key
    GEMINI_API_KEY       = var.gemini_api_key
    SECRET_KEY           = var.secret_key
    HF_HUB_OFFLINE       = "1"
    TRANSFORMERS_OFFLINE = "1"
    LOG_LEVEL            = "INFO"
  }
}

# 1. Voice Coaching — WebSocket route handler
resource "aws_cloudwatch_log_group" "voice" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}-voice"
  retention_in_days = 14
}

resource "aws_lambda_function" "voice" {
  function_name = "${var.project_name}-${var.environment}-voice"
  role          = var.lambda_role_arn
  package_type  = "Image"
  image_uri     = var.lambda_image_uri
  timeout       = 120
  memory_size   = 512
  architectures = ["x86_64"]
  # Voice coaching is not yet implemented — disable to free concurrency slots.
  reserved_concurrent_executions = 0

  image_config {
    command = ["lambdas.voice_coaching_handler.handler"]
  }

  vpc_config {
    subnet_ids         = var.subnet_ids
    security_group_ids = var.security_group_ids
  }

  environment {
    variables = merge(local.specialist_env, {
      VOICE_TRANSCRIBE_BUCKET = var.voice_transcribe_bucket
    })
  }

  depends_on = [aws_cloudwatch_log_group.voice]
  tags       = { Name = "${var.project_name}-${var.environment}-voice" }
}

# 2. RAG Query
resource "aws_cloudwatch_log_group" "rag_query" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}-rag-query"
  retention_in_days = 14
}

resource "aws_lambda_function" "rag_query" {
  function_name = "${var.project_name}-${var.environment}-rag-query"
  role          = var.lambda_role_arn
  package_type  = "Image"
  image_uri     = var.lambda_image_uri
  timeout       = 30
  memory_size   = 512
  architectures = ["x86_64"]
  # RAG is handled by the main API Lambda — disable specialist stub.
  reserved_concurrent_executions = 0

  image_config {
    command = ["lambdas.rag_query_handler.handler"]
  }

  vpc_config {
    subnet_ids         = var.subnet_ids
    security_group_ids = var.security_group_ids
  }

  environment { variables = local.specialist_env }

  depends_on = [aws_cloudwatch_log_group.rag_query]
  tags       = { Name = "${var.project_name}-${var.environment}-rag-query" }
}

# 3. Embedding Generator
resource "aws_cloudwatch_log_group" "embed_gen" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}-embed-gen"
  retention_in_days = 14
}

resource "aws_lambda_function" "embed_gen" {
  function_name = "${var.project_name}-${var.environment}-embed-gen"
  role          = var.lambda_role_arn
  package_type  = "Image"
  image_uri     = var.lambda_image_uri
  timeout       = 30
  memory_size   = 512
  architectures = ["x86_64"]
  # Embedding is handled by the main API Lambda — disable specialist stub.
  reserved_concurrent_executions = 0

  image_config {
    command = ["lambdas.embedding_generator.handler"]
  }

  vpc_config {
    subnet_ids         = var.subnet_ids
    security_group_ids = var.security_group_ids
  }

  environment { variables = local.specialist_env }

  depends_on = [aws_cloudwatch_log_group.embed_gen]
  tags       = { Name = "${var.project_name}-${var.environment}-embed-gen" }
}

# 4. Gap Analysis
resource "aws_cloudwatch_log_group" "gap_analysis" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}-gap-analysis"
  retention_in_days = 14
}

resource "aws_lambda_function" "gap_analysis" {
  function_name = "${var.project_name}-${var.environment}-gap-analysis"
  role          = var.lambda_role_arn
  package_type  = "Image"
  image_uri     = var.lambda_image_uri
  timeout       = 60
  memory_size   = 512
  architectures = ["x86_64"]
  # Gap analysis is handled by the main API Lambda — disable specialist stub.
  reserved_concurrent_executions = 0

  image_config {
    command = ["lambdas.gap_analysis_handler.handler"]
  }

  vpc_config {
    subnet_ids         = var.subnet_ids
    security_group_ids = var.security_group_ids
  }

  environment { variables = local.specialist_env }

  depends_on = [aws_cloudwatch_log_group.gap_analysis]
  tags       = { Name = "${var.project_name}-${var.environment}-gap-analysis" }
}

# 5. Resume Upload (S3 trigger, higher memory for PDF parsing)
resource "aws_cloudwatch_log_group" "resume_upload" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}-resume-upload"
  retention_in_days = 14
}

resource "aws_lambda_function" "resume_upload" {
  function_name = "${var.project_name}-${var.environment}-resume-upload"
  role          = var.lambda_role_arn
  package_type  = "Image"
  image_uri     = var.lambda_image_uri
  timeout       = 30
  memory_size   = 1024
  architectures = ["x86_64"]
  # Resume upload is handled by the main API Lambda — disable specialist stub.
  reserved_concurrent_executions = 0

  image_config {
    command = ["lambdas.resume_upload_handler.handler"]
  }

  vpc_config {
    subnet_ids         = var.subnet_ids
    security_group_ids = var.security_group_ids
  }

  environment { variables = local.specialist_env }

  depends_on = [aws_cloudwatch_log_group.resume_upload]
  tags       = { Name = "${var.project_name}-${var.environment}-resume-upload" }
}
