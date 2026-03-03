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
# NOTE: We iterate over statically-known domain names (not domain_validation_options)
# to avoid the "for_each keys unknown until apply" error that occurs when the ACM
# certificate doesn't yet exist in state. The map KEYS must be known at plan time;
# the VALUES (CNAME name/record/type) may be unknown and are computed after apply.

resource "aws_route53_record" "cert_validation" {
  for_each = toset([var.domain_name, "www.${var.domain_name}"])

  allow_overwrite = true
  name = [for dvo in aws_acm_certificate.cert.domain_validation_options :
  dvo.resource_record_name if dvo.domain_name == each.key][0]
  records = [[for dvo in aws_acm_certificate.cert.domain_validation_options :
  dvo.resource_record_value if dvo.domain_name == each.key][0]]
  ttl = 60
  type = [for dvo in aws_acm_certificate.cert.domain_validation_options :
  dvo.resource_record_type if dvo.domain_name == each.key][0]
  zone_id = aws_route53_zone.main.zone_id
}

resource "aws_acm_certificate_validation" "cert_validation" {
  certificate_arn         = aws_acm_certificate.cert.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}
