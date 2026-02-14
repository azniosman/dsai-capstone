variable "project_name" {}
variable "environment" {}
variable "vpc_id" {}

# ALB Security Group (Public)
resource "aws_security_group" "alb" {
  name        = "${var.project_name}-${var.environment}-alb-sg"
  description = "Allow inbound HTTP/HTTPS traffic"
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

  tags = {
    Name = "${var.project_name}-${var.environment}-alb-sg"
  }
}

# ECS Tasks Security Group (Private)
resource "aws_security_group" "ecs_tasks" {
  name        = "${var.project_name}-${var.environment}-ecs-tasks-sg"
  description = "Allow traffic from ALB"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Allow traffic from ALB on container ports"
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

  tags = {
    Name = "${var.project_name}-${var.environment}-ecs-tasks-sg"
  }
}

# RDS Security Group (Private)
resource "aws_security_group" "rds" {
  name        = "${var.project_name}-${var.environment}-rds-sg"
  description = "Allow traffic from ECS tasks"
  vpc_id      = var.vpc_id

  ingress {
    description     = "PostgreSQL from ECS"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-rds-sg"
  }
}

# EFS Security Group (Private)
resource "aws_security_group" "efs" {
  name        = "${var.project_name}-${var.environment}-efs-sg"
  description = "Allow NFS traffic from ECS tasks"
  vpc_id      = var.vpc_id

  ingress {
    description     = "NFS from ECS"
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-efs-sg"
  }
}
