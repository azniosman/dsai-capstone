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
        Sid      = "WebSocketManagement"
        Effect   = "Allow"
        Action   = ["execute-api:ManageConnections"]
        Resource = "arn:aws:execute-api:*:*:*/@connections/*"
      },
      {
        Sid      = "TranscribeS3Access"
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"]
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

# ── EventBridge Automation Lambda Role ───────────────────────────────────────
# Least-privilege role for the automation Lambda layer.
# Does NOT have VPC access — automation Lambdas invoke the backend via Lambda Invoke API.

resource "aws_iam_role" "automation_lambda" {
  name = "${var.project_name}-${var.environment}-automation-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = { Name = "${var.project_name}-${var.environment}-automation-lambda-role" }
}

resource "aws_iam_role_policy_attachment" "automation_lambda_basic" {
  role       = aws_iam_role.automation_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_policy" "automation_lambda" {
  name        = "${var.project_name}-${var.environment}-automation-lambda-policy"
  description = "Least-privilege policy for EventBridge automation Lambda functions"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "InvokeBackendLambda"
        Effect = "Allow"
        Action = ["lambda:InvokeFunction"]
        Resource = format(
          "arn:aws:lambda:%s:%s:function:%s-%s-backend",
          var.aws_region,
          data.aws_caller_identity.current.account_id,
          var.project_name,
          var.environment
        )
      },
      {
        Sid    = "SecretsManagerInternalToken"
        Effect = "Allow"
        Action = ["secretsmanager:GetSecretValue"]
        Resource = format(
          "arn:aws:secretsmanager:%s:%s:secret:%s/internal-token*",
          var.aws_region,
          data.aws_caller_identity.current.account_id,
          var.project_name
        )
      },
      {
        Sid      = "CloudWatchAutomationMetrics"
        Effect   = "Allow"
        Action   = ["cloudwatch:PutMetricData"]
        Resource = "*"
        Condition = {
          StringEquals = { "cloudwatch:namespace" = "SkillBridgeAutomation" }
        }
      },
      {
        Sid    = "SqsDlq"
        Effect = "Allow"
        Action = ["sqs:SendMessage"]
        Resource = format(
          "arn:aws:sqs:%s:%s:%s-%s-automation-dlq",
          var.aws_region,
          data.aws_caller_identity.current.account_id,
          var.project_name,
          var.environment
        )
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "automation_lambda" {
  role       = aws_iam_role.automation_lambda.name
  policy_arn = aws_iam_policy.automation_lambda.arn
}

# ── EventBridge Scheduler Role ────────────────────────────────────────────────
# Allows EventBridge Scheduler to invoke automation Lambda functions.

resource "aws_iam_role" "eventbridge_scheduler" {
  name = "${var.project_name}-${var.environment}-eventbridge-scheduler"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "scheduler.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = { Name = "${var.project_name}-${var.environment}-eventbridge-scheduler-role" }
}

resource "aws_iam_policy" "eventbridge_scheduler" {
  name        = "${var.project_name}-${var.environment}-eventbridge-scheduler-policy"
  description = "Allows EventBridge Scheduler to invoke automation Lambda functions"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "InvokeAutomationLambdas"
      Effect = "Allow"
      Action = ["lambda:InvokeFunction"]
      Resource = format(
        "arn:aws:lambda:%s:%s:function:%s-%s-*",
        var.aws_region,
        data.aws_caller_identity.current.account_id,
        var.project_name,
        var.environment
      )
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eventbridge_scheduler" {
  role       = aws_iam_role.eventbridge_scheduler.name
  policy_arn = aws_iam_policy.eventbridge_scheduler.arn
}

