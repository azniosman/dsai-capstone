terraform {
  required_version = ">= 1.5.0"

  # Partial backend config — bucket/key/region are passed via -backend-config
  # in CI (see .github/workflows/deploy-serverless.yml "Terraform Init" step).
  # For local development, run:
  #   terraform init \
  #     -backend-config="bucket=skillbridge-tfstate-<your-account-id>" \
  #     -backend-config="key=dev/terraform.tfstate" \
  #     -backend-config="region=us-east-1" \
  #     -backend-config="encrypt=true"
  backend "s3" {}

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}
