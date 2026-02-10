data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_subnet" "db_secondary" {
  vpc_id            = var.vpc_id
  cidr_block        = "10.0.3.0/24"
  availability_zone = data.aws_availability_zones.available.names[1]

  tags = {
    Name = "${var.project_name}-${var.environment}-db-secondary"
  }
}

resource "aws_db_subnet_group" "this" {
  name = "${var.project_name}-${var.environment}-db-subnet-group"
  subnet_ids = [
    var.subnet_id,
    aws_subnet.db_secondary.id,
  ]

  tags = {
    Name = "${var.project_name}-${var.environment}-db-subnet-group"
  }
}

resource "random_password" "db_password" {
  length  = 24
  special = false
}

resource "aws_db_instance" "this" {
  identifier = "${var.project_name}-${var.environment}-db"

  engine         = "postgres"
  engine_version = "16"
  instance_class = "db.t4g.micro"

  allocated_storage = 20
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db_password.result

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [var.security_group_id]

  multi_az            = false
  publicly_accessible = false

  skip_final_snapshot        = true
  backup_retention_period    = 7
  auto_minor_version_upgrade = true
  deletion_protection        = false

  tags = {
    Name = "${var.project_name}-${var.environment}-db"
  }
}
