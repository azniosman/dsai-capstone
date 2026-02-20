# ── SageMaker Serverless Inference — sentence-transformers/all-MiniLM-L6-v2 ──
# Only deployed when enable_sagemaker = true in root module.

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

# HuggingFace PyTorch inference image for sentence-transformers
locals {
  hf_image = "763104351884.dkr.ecr.${data.aws_region.current.name}.amazonaws.com/huggingface-pytorch-inference:1.13.1-transformers4.26.0-cpu-py39-ubuntu20.04"
}

resource "aws_sagemaker_model" "minilm" {
  name               = "${var.project_name}-${var.environment}-minilm"
  execution_role_arn = var.sagemaker_role_arn

  primary_container {
    image = local.hf_image
    environment = {
      HF_MODEL_ID      = "sentence-transformers/all-MiniLM-L6-v2"
      HF_TASK          = "feature-extraction"
      SAGEMAKER_REGION = data.aws_region.current.name
    }
  }

  tags = { Name = "${var.project_name}-${var.environment}-minilm" }
}

resource "aws_sagemaker_endpoint_configuration" "minilm" {
  name = "${var.project_name}-${var.environment}-minilm-config"

  production_variants {
    variant_name = "AllTraffic"
    model_name   = aws_sagemaker_model.minilm.name

    serverless_config {
      memory_size_in_mb = 2048
      max_concurrency   = 5
    }
  }

  tags = { Name = "${var.project_name}-${var.environment}-minilm-config" }
}

resource "aws_sagemaker_endpoint" "minilm" {
  name                 = "${var.project_name}-${var.environment}-minilm"
  endpoint_config_name = aws_sagemaker_endpoint_configuration.minilm.name

  tags = { Name = "${var.project_name}-${var.environment}-minilm" }
}
