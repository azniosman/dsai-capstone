data "aws_caller_identity" "current" {}

# ── Lambda Execution Role ─────────────────────────────────────────────────────

resource "aws_iam_role" "lambda_exec" {
  name = "${var.project_name}-${var.environment}-lambda-exec"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = { Name = "${var.project_name}-${var.environment}-lambda-role" }
}

# Managed policies
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_vpc_access" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# ── Custom Policy — least-privilege for SkillBridge ──────────────────────────

resource "aws_iam_policy" "skillbridge_lambda" {
  name        = "${var.project_name}-${var.environment}-lambda-policy"
  description = "SkillBridge Lambda permissions: Bedrock, Transcribe, Polly, Secrets Manager, SageMaker, S3, X-Ray"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "BedrockInvokeModel"
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream",
          "bedrock:ListFoundationModels",
        ]
        Resource = "*"
      },
      {
        Sid    = "TranscribeVoiceAI"
        Effect = "Allow"
        Action = [
          "transcribe:StartTranscriptionJob",
          "transcribe:GetTranscriptionJob",
          "transcribe:DeleteTranscriptionJob",
          "transcribe:ListTranscriptionJobs",
        ]
        Resource = "*"
      },
      {
        Sid    = "PollyVoiceSynth"
        Effect = "Allow"
        Action = [
          "polly:SynthesizeSpeech",
          "polly:DescribeVoices",
        ]
        Resource = "*"
      },
      {
        Sid    = "SecretsManagerDB"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret",
        ]
        Resource = var.db_secret_arn
      },
      {
        Sid    = "SageMakerEmbeddings"
        Effect = "Allow"
        Action = ["sagemaker:InvokeEndpoint"]
        Resource = format(
          "arn:aws:sagemaker:%s:%s:endpoint/*",
          var.aws_region,
          data.aws_caller_identity.current.account_id
        )
      },
      {
        Sid    = "S3ResumeUploads"
        Effect = "Allow"
        Action = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
        Resource = [
          "arn:aws:s3:::${var.project_name}-${var.environment}-uploads/*",
          "arn:aws:s3:::${var.project_name}-${var.environment}-web-*/*",
        ]
      },
      {
        Sid    = "Observability"
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData",
          "xray:PutTraceSegments",
          "xray:PutTelemetryRecords",
        ]
        Resource = "*"
      },
      {
        Sid    = "WebSocketManagement"
        Effect = "Allow"
        Action = ["execute-api:ManageConnections"]
        Resource = "arn:aws:execute-api:*:*:*/@connections/*"
      },
      {
        Sid    = "TranscribeS3Access"
        Effect = "Allow"
        Action = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"]
        Resource = "arn:aws:s3:::${var.project_name}-${var.environment}-uploads/voice-temp/*"
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "skillbridge_lambda" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.skillbridge_lambda.arn
}

# ── OpenSearch Policy (conditional) ──────────────────────────────────────────

resource "aws_iam_policy" "opensearch" {
  count       = var.enable_opensearch ? 1 : 0
  name        = "${var.project_name}-${var.environment}-opensearch-policy"
  description = "OpenSearch HTTP access for Lambda"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "OpenSearchAccess"
      Effect = "Allow"
      Action = [
        "es:ESHttpGet", "es:ESHttpPost",
        "es:ESHttpPut", "es:ESHttpDelete", "es:ESHttpHead",
      ]
      Resource = format(
        "arn:aws:es:%s:%s:domain/%s-%s/*",
        var.aws_region,
        data.aws_caller_identity.current.account_id,
        var.project_name,
        var.environment
      )
    }]
  })
}

resource "aws_iam_role_policy_attachment" "opensearch" {
  count      = var.enable_opensearch ? 1 : 0
  role       = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.opensearch[0].arn
}

# ── SageMaker Execution Role (conditional) ────────────────────────────────────

resource "aws_iam_role" "sagemaker_execution" {
  count = var.enable_sagemaker ? 1 : 0
  name  = "${var.project_name}-${var.environment}-sagemaker-exec"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "sagemaker.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = { Name = "${var.project_name}-${var.environment}-sagemaker-role" }
}

resource "aws_iam_role_policy_attachment" "sagemaker_full" {
  count      = var.enable_sagemaker ? 1 : 0
  role       = aws_iam_role.sagemaker_execution[0].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSageMakerFullAccess"
}
