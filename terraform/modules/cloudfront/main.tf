locals {
  s3_origin_id  = "S3-${var.s3_bucket_id}"
  api_origin_id = "APIGW-${var.project_name}-${var.environment}"
  # Strip "https://" prefix to get the domain name for CloudFront origin
  api_domain = replace(var.api_gateway_url, "https://", "")
}

# ── Origin Access Control (OAC) — modern replacement for OAI ─────────────────

resource "aws_cloudfront_origin_access_control" "web" {
  name                              = "${var.project_name}-${var.environment}-oac"
  description                       = "OAC for SkillBridge S3 frontend"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ── CloudFront Distribution ───────────────────────────────────────────────────

resource "aws_cloudfront_distribution" "web" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  comment             = "${var.project_name}-${var.environment}"
  price_class         = "PriceClass_100" # US + EU edges only (cheapest)

  # Origin 1: S3 (frontend static files, served via OAC)
  origin {
    domain_name              = var.s3_bucket_domain_name
    origin_id                = local.s3_origin_id
    origin_access_control_id = aws_cloudfront_origin_access_control.web.id
  }

  # Origin 2: API Gateway (backend API)
  origin {
    domain_name = local.api_domain
    origin_id   = local.api_origin_id

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Default cache behavior → S3 (SPA frontend)
  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = local.s3_origin_id
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    # AWS managed: CachingOptimized
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
    # AWS managed: CORS-S3Origin
    origin_request_policy_id = "88a5eaf4-2fd4-4709-b370-b4c650ea3fcf"
  }

  # /api/* → API Gateway (no caching; forward all headers)
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.api_origin_id

    viewer_protocol_policy = "redirect-to-https"
    compress               = false

    # AWS managed: CachingDisabled
    cache_policy_id = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
    # AWS managed: AllViewerExceptHostHeader
    origin_request_policy_id = "b689b0a8-53d0-40ab-baf2-68738e2966ac"
  }

  # SPA routing: redirect 403/404 from S3 to index.html (client-side routing)
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true # Free *.cloudfront.net cert
  }

  tags = { Name = "${var.project_name}-${var.environment}-cf" }
}

# ── S3 Bucket Policy — allow CloudFront OAC to GetObject ─────────────────────
# Created here (not in s3_frontend) because we need the distribution ARN.

resource "aws_s3_bucket_policy" "web" {
  bucket = var.s3_bucket_id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontOAC"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${var.s3_bucket_arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.web.arn
        }
      }
    }]
  })
}
