resource "random_id" "bucket_suffix" {
  byte_length = 4
}

resource "aws_s3_bucket" "web" {
  bucket        = "${var.project_name}-${var.environment}-web-${random_id.bucket_suffix.hex}"
  force_destroy = true # Allows clean terraform destroy

  tags = { Name = "${var.project_name}-${var.environment}-web" }
}

resource "aws_s3_bucket_public_access_block" "web" {
  bucket = aws_s3_bucket.web.id

  # Lock down when CloudFront is serving the bucket; open when using S3 website
  block_public_acls       = !var.enable_public_access
  block_public_policy     = !var.enable_public_access
  ignore_public_acls      = !var.enable_public_access
  restrict_public_buckets = !var.enable_public_access
}

resource "aws_s3_bucket_server_side_encryption_configuration" "web" {
  bucket = aws_s3_bucket.web.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# S3 static website hosting — used when CloudFront is disabled
resource "aws_s3_bucket_website_configuration" "web" {
  count  = var.enable_public_access ? 1 : 0
  bucket = aws_s3_bucket.web.id

  index_document { suffix = "index.html" }
  error_document { key = "index.html" } # SPA 404 fallback
}

# Public-read bucket policy — only created when CloudFront is disabled
resource "aws_s3_bucket_policy" "public_read" {
  count  = var.enable_public_access ? 1 : 0
  bucket = aws_s3_bucket.web.id

  depends_on = [aws_s3_bucket_public_access_block.web]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "PublicReadGetObject"
      Effect    = "Allow"
      Principal = "*"
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.web.arn}/*"
    }]
  })
}

# Note: When CloudFront IS enabled, the bucket policy granting CloudFront OAC
# access is created in the cloudfront module (needs the OAC ARN).
