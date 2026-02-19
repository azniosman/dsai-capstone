resource "random_id" "bucket_suffix" {
  byte_length = 4
}

resource "aws_s3_bucket" "web" {
  bucket        = "${var.project_name}-${var.environment}-web-${random_id.bucket_suffix.hex}"
  force_destroy = true # Allows clean terraform destroy

  tags = { Name = "${var.project_name}-${var.environment}-web" }
}

# Block all public access — CloudFront OAC serves files via signed requests
resource "aws_s3_bucket_public_access_block" "web" {
  bucket = aws_s3_bucket.web.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "web" {
  bucket = aws_s3_bucket.web.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Note: The bucket policy granting CloudFront OAC access is created
# in the cloudfront module (which has the OAC ARN needed for the condition).
