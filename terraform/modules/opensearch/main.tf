data "aws_caller_identity" "current" {}

resource "aws_opensearch_domain" "main" {
  domain_name    = "${var.project_name}-${var.environment}"
  engine_version = "OpenSearch_2.13"

  cluster_config {
    instance_type          = var.instance_type
    instance_count         = 1     # Single node — no redundancy for demo
    zone_awareness_enabled = false # Must be false for single-node
  }

  ebs_options {
    ebs_enabled = true
    volume_type = "gp3"
    volume_size = 20
    throughput  = 125
  }

  vpc_options {
    subnet_ids         = [var.subnet_ids[0]] # Single subnet for single node
    security_group_ids = var.security_group_ids
  }

  encrypt_at_rest {
    enabled = true
  }

  node_to_node_encryption {
    enabled = true
  }

  domain_endpoint_options {
    enforce_https       = true
    tls_security_policy = "Policy-Min-TLS-1-2-2019-07"
  }

  advanced_security_options {
    enabled                        = true
    internal_user_database_enabled = false # Use IAM auth via Lambda role
    master_user_options {
      # Grant full access to the AWS account root (Lambda role policy handles scoped access)
      master_user_arn = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
    }
  }

  access_policies = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root" }
      Action    = "es:*"
      Resource  = "arn:aws:es:${var.aws_region}:${data.aws_caller_identity.current.account_id}:domain/${var.project_name}-${var.environment}/*"
    }]
  })

  tags = { Name = "${var.project_name}-${var.environment}-opensearch" }
}
