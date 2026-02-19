# Variables are in variables.tf. Outputs are in outputs.tf.

# ── Lambda Security Group ────────────────────────────────────────────────────
# Lambda has no inbound; egress reaches RDS and AWS APIs via NAT Gateway.

resource "aws_security_group" "lambda" {
  name        = "${var.project_name}-${var.environment}-lambda-sg"
  description = "Lambda functions - egress-only to RDS, AWS APIs, internet via NAT"
  vpc_id      = var.vpc_id

  egress {
    description = "Allow all outbound (NAT GW routes to Bedrock, CloudWatch, etc.)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project_name}-${var.environment}-lambda-sg" }
}

# ── RDS Security Group ────────────────────────────────────────────────────────
# Accepts PostgreSQL only from Lambda SG.

resource "aws_security_group" "rds" {
  name        = "${var.project_name}-${var.environment}-rds-sg"
  description = "RDS PostgreSQL — inbound only from Lambda SG"
  vpc_id      = var.vpc_id

  ingress {
    description     = "PostgreSQL from Lambda"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.lambda.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project_name}-${var.environment}-rds-sg" }
}

# ── OpenSearch Security Group ─────────────────────────────────────────────────
# Accepts HTTPS only from Lambda SG.

resource "aws_security_group" "opensearch" {
  name        = "${var.project_name}-${var.environment}-opensearch-sg"
  description = "OpenSearch — HTTPS inbound from Lambda SG only"
  vpc_id      = var.vpc_id

  ingress {
    description     = "HTTPS from Lambda"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.lambda.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project_name}-${var.environment}-opensearch-sg" }
}

# ── ALB Security Group (kept for enterprise ECS path) ────────────────────────

resource "aws_security_group" "alb" {
  name        = "${var.project_name}-${var.environment}-alb-sg"
  description = "ALB - HTTP/HTTPS from internet (enterprise ECS path)"
  vpc_id      = var.vpc_id

  ingress {
    description = "HTTP from Internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS from Internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project_name}-${var.environment}-alb-sg" }
}

# ── ECS Tasks Security Group (enterprise path) ────────────────────────────────

resource "aws_security_group" "ecs_tasks" {
  name        = "${var.project_name}-${var.environment}-ecs-tasks-sg"
  description = "ECS Fargate tasks — inbound from ALB (enterprise path)"
  vpc_id      = var.vpc_id

  ingress {
    description     = "All ports from ALB"
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project_name}-${var.environment}-ecs-tasks-sg" }
}

# ── EFS Security Group (enterprise n8n path) ──────────────────────────────────

resource "aws_security_group" "efs" {
  name        = "${var.project_name}-${var.environment}-efs-sg"
  description = "EFS — NFS from ECS tasks (enterprise path)"
  vpc_id      = var.vpc_id

  ingress {
    description     = "NFS from ECS tasks"
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  tags = { Name = "${var.project_name}-${var.environment}-efs-sg" }
}
