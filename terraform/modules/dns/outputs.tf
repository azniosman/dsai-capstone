output "certificate_arn" {
  description = "Validated ACM certificate ARN"
  value       = aws_acm_certificate_validation.main.certificate_arn
}

output "nameservers" {
  description = "Route53 nameservers — update these at your domain registrar"
  value       = aws_route53_zone.main.name_servers
}

output "zone_id" {
  description = "Route53 hosted zone ID"
  value       = aws_route53_zone.main.zone_id
}
