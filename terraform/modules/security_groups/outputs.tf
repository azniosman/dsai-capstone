output "alb_sg_id" {
  value = aws_security_group.alb.id
}

output "ecs_tasks_sg_id" {
  value = aws_security_group.ecs_tasks.id
}

output "rds_sg_id" {
  value = aws_security_group.rds.id
}

output "efs_sg_id" {
  value = aws_security_group.efs.id
}
