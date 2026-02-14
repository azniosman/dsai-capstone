output "dns_name" {
  value = aws_lb.main.dns_name
}

output "lb_arn" {
  value = aws_lb.main.arn
}

output "target_group_arns" {
  value = {
    frontend = aws_lb_target_group.frontend.arn
    backend  = aws_lb_target_group.backend.arn
    n8n      = aws_lb_target_group.n8n.arn
  }
}
