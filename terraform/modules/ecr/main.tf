# Backend ECR repository — stores the Lambda container image.
# The frontend is served from S3/CloudFront (no ECR needed for it).

resource "aws_ecr_repository" "backend" {
  name                 = "${var.project_name}-${var.environment}-backend"
  image_tag_mutability = "MUTABLE"
  force_delete         = true # Allow terraform destroy even with images present

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = { Name = "${var.project_name}-${var.environment}-backend" }
}

resource "aws_ecr_lifecycle_policy" "backend" {
  repository = aws_ecr_repository.backend.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 5 images, expire older ones"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 5
      }
      action = { type = "expire" }
    }]
  })
}
