variable "project_name" {}
variable "environment" {}
variable "vpc_id" {}
variable "subnet_ids" {
  type = list(string)
}
variable "security_group_ids" {
  type = list(string)
}
variable "target_group_arns" {
  type = map(string)
}
variable "efs_id" {}
variable "db_endpoint" {}
variable "aws_region" {}

resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-${var.environment}-cluster"

  tags = {
    Name = "${var.project_name}-${var.environment}-cluster"
  }
}

resource "aws_iam_role" "ecs_execution_role" {
  name = "${var.project_name}-${var.environment}-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Backend Task Definition
resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.project_name}-${var.environment}-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn

  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = "dsai-capstone-backend:latest" # Placeholder
      essential = true
      portMappings = [
        {
          containerPort = 8000
          hostPort      = 8000
        }
      ]
      environment = [
        { name = "DATABASE_URL", value = "postgresql://capstone:changeme@${var.db_endpoint}/capstone" }, # Sensitive
        { name = "SENTENCE_TRANSFORMER_MODEL", value = "all-MiniLM-L6-v2" }
      ]
       logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/${var.project_name}-${var.environment}-backend"
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "backend"
        }
      }
    }
  ])
}

# Frontend Task Definition
resource "aws_ecs_task_definition" "frontend" {
  family                   = "${var.project_name}-${var.environment}-frontend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn

  container_definitions = jsonencode([
    {
      name      = "frontend"
      image     = "dsai-capstone-frontend:latest" # Placeholder
      essential = true
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
        }
      ]
      environment = [
        { name = "NEXT_PUBLIC_API_URL", value = "/api" } # ALB handles routing
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/${var.project_name}-${var.environment}-frontend"
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "frontend"
        }
      }
    }
  ])
}

# n8n Task Definition
resource "aws_ecs_task_definition" "n8n" {
  family                   = "${var.project_name}-${var.environment}-n8n"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn

  volume {
    name = "n8n-storage"
    efs_volume_configuration {
      file_system_id = var.efs_id
    }
  }

  container_definitions = jsonencode([
    {
      name      = "n8n"
      image     = "n8nio/n8n:latest"
      essential = true
      portMappings = [
        {
          containerPort = 5678
          hostPort      = 5678
        }
      ]
      mountPoints = [
        {
          sourceVolume  = "n8n-storage"
          containerPath = "/home/node/.n8n"
        }
      ]
      environment = [
        { name = "DB_TYPE", value = "postgresdb" },
        { name = "DB_POSTGRESDB_HOST", value = var.db_endpoint },
        { name = "DB_POSTGRESDB_PORT", value = "5432" },
        { name = "DB_POSTGRESDB_DATABASE", value = "n8n" },
        { name = "DB_POSTGRESDB_USER", value = "capstone" }, # Sensitive
        { name = "DB_POSTGRESDB_PASSWORD", value = "changeme" }, # Sensitive
        { name = "N8N_BASIC_AUTH_ACTIVE", value = "true" },
        { name = "N8N_BASIC_AUTH_USER", value = "admin" },
        { name = "N8N_BASIC_AUTH_PASSWORD", value = "changeme" } # Sensitive
      ]
    }
  ])
}

# Services
resource "aws_ecs_service" "backend" {
  name            = "${var.project_name}-${var.environment}-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = var.security_group_ids
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.target_group_arns["backend"]
    container_name   = "backend"
    container_port   = 8000
  }
}

resource "aws_ecs_service" "frontend" {
  name            = "${var.project_name}-${var.environment}-frontend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = var.security_group_ids
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.target_group_arns["frontend"]
    container_name   = "frontend"
    container_port   = 3000
  }
}

resource "aws_ecs_service" "n8n" {
  name            = "${var.project_name}-${var.environment}-n8n"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.n8n.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = var.security_group_ids
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.target_group_arns["n8n"]
    container_name   = "n8n"
    container_port   = 5678
  }
}

# CloudWatch Logs
resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${var.project_name}-${var.environment}-backend"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "frontend" {
  name              = "/ecs/${var.project_name}-${var.environment}-frontend"
  retention_in_days = 7
}
