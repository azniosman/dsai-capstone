variable "project_name" {}
variable "environment" {}
variable "subnet_ids" {
  type = list(string)
}
variable "security_group_ids" {
  type = list(string)
}

resource "aws_efs_file_system" "main" {
  creation_token = "${var.project_name}-${var.environment}-efs"

  tags = {
    Name = "${var.project_name}-${var.environment}-efs"
  }
}

resource "aws_efs_mount_target" "main" {
  count           = length(var.subnet_ids)
  file_system_id  = aws_efs_file_system.main.id
  subnet_id       = var.subnet_ids[count.index]
  security_groups = var.security_group_ids
}
