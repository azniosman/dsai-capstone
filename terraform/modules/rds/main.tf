variable "project_name" {}
variable "environment" {}
variable "vpc_id" {}
variable "subnet_ids" {
  type = list(string)
}
variable "security_group_ids" {
  type = list(string)
}
variable "db_password" {
  sensitive = true
}

resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-${var.environment}-db-subnet-group"
  subnet_ids = var.subnet_ids

  tags = {
    Name = "${var.project_name}-${var.environment}-db-subnet-group"
  }
}

resource "aws_db_instance" "main" {
  identifier        = "${var.project_name}-${var.environment}-db"
  engine            = "postgres"
  engine_version    = "16.1"
  instance_class    = "db.t3.micro"
  allocated_storage = 20
  
  db_name  = "capstone"
  username = "capstone"
  password = var.db_password
  port     = 5432

  vpc_security_group_ids = var.security_group_ids
  db_subnet_group_name   = aws_db_subnet_group.main.name

  skip_final_snapshot = true # For dev/learning only
  publicly_accessible = false

  tags = {
    Name = "${var.project_name}-${var.environment}-db"
  }
}
