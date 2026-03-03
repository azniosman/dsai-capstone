output "zone_id" {
  value = aws_route53_zone.main.zone_id
}

output "name_servers" {
  value = aws_route53_zone.main.name_servers
}

output "acm_certificate_arn" {
  description = "Validated ACM certificate ready for CloudFront"
  value       = aws_acm_certificate_validation.cert_validation.certificate_arn
}
