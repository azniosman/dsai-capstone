# ── Route 53 Hosted Zone ──────────────────────────────────────────────────────

resource "aws_route53_zone" "main" {
  name = var.domain_name
  tags = { Name = "${var.project_name}-${var.environment}-zone" }
}

# ── ACM Certificate (us-east-1) ───────────────────────────────────────────────
# CloudFront requires ACM certificates to be in us-east-1.
# The root provider must target us-east-1 (set via AWS_REGION env var in CI).

resource "aws_acm_certificate" "cert" {
  domain_name               = var.domain_name
  subject_alternative_names = ["www.${var.domain_name}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = { Name = "${var.project_name}-${var.environment}-cert" }
}

# ── DNS Validation Records ────────────────────────────────────────────────────

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.cert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.main.zone_id
}

resource "aws_acm_certificate_validation" "cert_validation" {
  certificate_arn         = aws_acm_certificate.cert.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}
