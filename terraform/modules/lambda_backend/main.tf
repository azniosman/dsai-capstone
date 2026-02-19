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

      # AI / LLM
      BEDROCK_MODEL_ID = var.bedrock_model_id
      GEMINI_API_KEY   = var.gemini_api_key
      GEMINI_MODEL     = "gemini-2.0-flash"

      # Auth
      SECRET_KEY                  = var.secret_key
      JWT_ALGORITHM               = "HS256"
      ACCESS_TOKEN_EXPIRE_MINUTES = "1440"

      # Search (OpenSearch — empty string disables it)
      OPENSEARCH_HOST = var.opensearch_url

      # ML models (pre-baked into image; offline mode required in private subnet)
      SENTENCE_TRANSFORMER_MODEL = "all-MiniLM-L6-v2"
      HF_HUB_OFFLINE             = "1"
      TRANSFORMERS_OFFLINE        = "1"

      LOG_LEVEL = "INFO"
    }
  }

  depends_on = [aws_cloudwatch_log_group.lambda]

  tags = { Name = "${var.project_name}-${var.environment}-api" }
}
