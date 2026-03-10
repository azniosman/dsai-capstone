#!/bin/bash
# terraform-cleanup.sh - Full cleanup of SkillBridge resources for a given environment
# Usage: ./terraform-cleanup.sh <environment> [aws-region]
# Example: ./terraform-cleanup.sh prod us-east-1

set -euo pipefail

PROJECT_NAME="${PROJECT_NAME:-skillbridge}"
ENVIRONMENT="${1:-}"
AWS_REGION="${2:-us-east-1}"

if [ -z "$ENVIRONMENT" ]; then
  echo "ERROR: Environment is required"
  echo "Usage: $0 <environment> [aws-region]"
  echo "Example: $0 prod us-east-1"
  exit 1
fi

if [ "$ENVIRONMENT" != "dev" ] && [ "$ENVIRONMENT" != "prod" ] && [ "$ENVIRONMENT" != "staging" ]; then
  echo "ERROR: Environment must be 'dev', 'prod', or 'staging'"
  exit 1
fi

echo "=== SkillBridge Full Cleanup for $ENVIRONMENT environment ==="
echo "  Project: $PROJECT_NAME"
echo "  Region: $AWS_REGION"
echo ""

# Verify AWS credentials
echo "=== Step 1: Verify AWS credentials ==="
aws sts get-caller-identity --region "$AWS_REGION" > /dev/null 2>&1
echo "  ✓ AWS credentials verified"
echo ""

# Step 2: Clean up S3 buckets
echo "=== Step 2: Clean up S3 buckets ==="
BUCKETS=$(aws s3api list-buckets --query "Buckets[?contains(Name, '${PROJECT_NAME}-${ENVIRONMENT}')].Name" --output text --region "$AWS_REGION" 2>/dev/null || true)
if [ -z "$BUCKETS" ]; then
  echo "  No buckets found for $PROJECT_NAME-$ENVIRONMENT"
else
  echo "$BUCKETS" | while read -r BUCKET; do
    [ -z "$BUCKET" ] && continue
    echo "  Deleting bucket: $BUCKET"
    # Remove all objects (including versions)
    aws s3 rm "s3://${BUCKET}" --recursive --region "$AWS_REGION" 2>/dev/null || true
    # Delete the bucket
    aws s3api delete-bucket --bucket "$BUCKET" --region "$AWS_REGION" 2>/dev/null || true
  done
fi
echo ""

# Step 3: Clean up VPCs
echo "=== Step 3: Clean up VPCs ==="
VPC_IDS=$(aws ec2 describe-vpcs --filters "Name=tag:Name,Values=${PROJECT_NAME}-${ENVIRONMENT}-vpc" --query 'Vpcs[].VpcId' --output text --region "$AWS_REGION" 2>/dev/null || true)
if [ -z "$VPC_IDS" ]; then
  echo "  No VPCs found for $PROJECT_NAME-$ENVIRONMENT"
else
  echo "$VPC_IDS" | while read -r VPC_ID; do
    [ -z "$VPC_ID" ] && continue
    echo "  Deleting VPC: $VPC_ID"

    # Delete NAT gateways (and their EIPs)
    NATS=$(aws ec2 describe-nat-gateways --filter "Name=vpc-id,Values=$VPC_ID" --query 'NatGateways[].NatGatewayId' --output text --region "$AWS_REGION" 2>/dev/null || true)
    for NAT in $NATS; do
      [ -z "$NAT" ] && continue
      echo "    Deleting NAT gateway: $NAT"
      aws ec2 delete-nat-gateway --nat-gateway-id "$NAT" --region "$AWS_REGION" 2>/dev/null || true
    done

    # Delete internet gateways
    IGWS=$(aws ec2 describe-internet-gateways --filters "Name=attachment.vpc-id,Values=$VPC_ID" --query 'InternetGateways[].InternetGatewayId' --output text --region "$AWS_REGION" 2>/dev/null || true)
    for IGW in $IGWS; do
      [ -z "$IGW" ] && continue
      echo "    Detaching and deleting IGW: $IGW"
      aws ec2 detach-internet-gateway --internet-gateway-id "$IGW" --vpc-id "$VPC_ID" --region "$AWS_REGION" 2>/dev/null || true
      aws ec2 delete-internet-gateway --internet-gateway-id "$IGW" --region "$AWS_REGION" 2>/dev/null || true
    done

    # Delete route tables (non-main)
    RTS=$(aws ec2 describe-route-tables --filters "Name=vpc-id,Values=$VPC_ID" --query 'RouteTables[?Associations[0].Main != `true`].RouteTableId' --output text --region "$AWS_REGION" 2>/dev/null || true)
    for RT in $RTS; do
      [ -z "$RT" ] && continue
      echo "    Deleting route table: $RT"
      aws ec2 delete-route-table --route-table-id "$RT" --region "$AWS_REGION" 2>/dev/null || true
    done

    # Delete subnets
    SUBNETS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query 'Subnets[].SubnetId' --output text --region "$AWS_REGION" 2>/dev/null || true)
    for SUBNET in $SUBNETS; do
      [ -z "$SUBNET" ] && continue
      echo "    Deleting subnet: $SUBNET"
      aws ec2 delete-subnet --subnet-id "$SUBNET" --region "$AWS_REGION" 2>/dev/null || true
    done

    # Delete security groups (non-default)
    SGS=$(aws ec2 describe-security-groups --filters "Name=vpc-id,Values=$VPC_ID" --query 'SecurityGroups[?groupName != `default`].groupId' --output text --region "$AWS_REGION" 2>/dev/null || true)
    for SG in $SGS; do
      [ -z "$SG" ] && continue
      echo "    Deleting security group: $SG"
      aws ec2 delete-security-group --group-id "$SG" --region "$AWS_REGION" 2>/dev/null || true
    done

    # Delete VPC
    echo "    Deleting VPC: $VPC_ID"
    aws ec2 delete-vpc --vpc-id "$VPC_ID" --region "$AWS_REGION" 2>/dev/null || true
  done
fi
echo ""

# Step 4: Clean up RDS resources
echo "=== Step 4: Clean up RDS resources ==="
DB_CLUSTER_IDS=$(aws rds describe-db-clusters --filters "Name=db-cluster-id,Values=${PROJECT_NAME}-${ENVIRONMENT}-*" --query 'DBClusters[].DBClusterIdentifier' --output text --region "$AWS_REGION" 2>/dev/null || true)
if [ -z "$DB_CLUSTER_IDS" ]; then
  echo "  No RDS clusters found for $PROJECT_NAME-$ENVIRONMENT"
else
  echo "$DB_CLUSTER_IDS" | while read -r CLUSTER_ID; do
    [ -z "$CLUSTER_ID" ] && continue
    echo "  Deleting RDS cluster: $CLUSTER_ID"
    aws rds delete-db-cluster --db-cluster-identifier "$CLUSTER_ID" --skip-final-snapshot --region "$AWS_REGION" 2>/dev/null || true
  done
fi

DB_INSTANCE_IDS=$(aws rds describe-db-instances --filters "Name=db-instance-id,Values=${PROJECT_NAME}-${ENVIRONMENT}-*" --query 'DBInstances[].DBInstanceIdentifier' --output text --region "$AWS_REGION" 2>/dev/null || true)
if [ -z "$DB_INSTANCE_IDS" ]; then
  echo "  No RDS instances found for $PROJECT_NAME-$ENVIRONMENT"
else
  echo "$DB_INSTANCE_IDS" | while read -r INSTANCE_ID; do
    [ -z "$INSTANCE_ID" ] && continue
    echo "  Deleting RDS instance: $INSTANCE_ID"
    aws rds delete-db-instance --db-instance-identifier "$INSTANCE_ID" --skip-final-snapshot --region "$AWS_REGION" 2>/dev/null || true
  done
fi

DB_PARAMETER_GROUPS=$(aws rds describe-db-parameter-groups --filters "Name=db-parameter-group-name,Values=${PROJECT_NAME}-${ENVIRONMENT}-*" --query 'DBParameterGroups[].DBParameterGroupName' --output text --region "$AWS_REGION" 2>/dev/null || true)
if [ -z "$DB_PARAMETER_GROUPS" ]; then
  echo "  No RDS parameter groups found for $PROJECT_NAME-$ENVIRONMENT"
else
  echo "$DB_PARAMETER_GROUPS" | while read -r PG_NAME; do
    [ -z "$PG_NAME" ] && continue
    echo "  Deleting RDS parameter group: $PG_NAME"
    aws rds delete-db-parameter-group --db-parameter-group-name "$PG_NAME" --region "$AWS_REGION" 2>/dev/null || true
  done
fi
echo ""

# Step 5: Clean up Secrets Manager
echo "=== Step 5: Clean up Secrets Manager ==="
SECRET_NAMES=$(aws secretsmanager list-secrets --filters "Key=name,Values=${PROJECT_NAME}/${ENVIRONMENT}/" --query 'SecretList[].Name' --output text --region "$AWS_REGION" 2>/dev/null || true)
if [ -z "$SECRET_NAMES" ]; then
  echo "  No secrets found for $PROJECT_NAME-$ENVIRONMENT"
else
  echo "$SECRET_NAMES" | while read -r SECRET_NAME; do
    [ -z "$SECRET_NAME" ] && continue
    echo "  Deleting secret: $SECRET_NAME"
    aws secretsmanager delete-secret --secret-id "$SECRET_NAME" --force-delete-without-recovery --region "$AWS_REGION" 2>/dev/null || true
  done
fi
echo ""

# Step 6: Clean up Lambda functions
echo "=== Step 6: Clean up Lambda functions ==="
LAMBDA_NAMES=$(aws lambda list-functions --query 'Functions[?contains(FunctionName, `${PROJECT_NAME}-${ENVIRONMENT}`)].FunctionName' --output text --region "$AWS_REGION" 2>/dev/null || true)
if [ -z "$LAMBDA_NAMES" ]; then
  echo "  No Lambda functions found for $PROJECT_NAME-$ENVIRONMENT"
else
  echo "$LAMBDA_NAMES" | while read -r LAMBDA_NAME; do
    [ -z "$LAMBDA_NAME" ] && continue
    echo "  Deleting Lambda: $LAMBDA_NAME"
    aws lambda delete-function --function-name "$LAMBDA_NAME" --region "$AWS_REGION" 2>/dev/null || true
  done
fi
echo ""

# Step 7: Clean up IAM roles
echo "=== Step 7: Clean up IAM roles ==="
ROLE_NAMES=$(aws iam list-roles --query 'Roles[?contains(RoleName, `${PROJECT_NAME}-${ENVIRONMENT}`)].RoleName' --output text --region "$AWS_REGION" 2>/dev/null || true)
if [ -z "$ROLE_NAMES" ]; then
  echo "  No IAM roles found for $PROJECT_NAME-$ENVIRONMENT"
else
  echo "$ROLE_NAMES" | while read -r ROLE_NAME; do
    [ -z "$ROLE_NAME" ] && continue
    echo "  Deleting IAM role: $ROLE_NAME"
    # Detach managed policies
    POLICIES=$(aws iam list-attached-role-policies --role-name "$ROLE_NAME" --query 'AttachedPolicies[].PolicyArn' --output text --region "$AWS_REGION" 2>/dev/null || true)
    for POLICY in $POLICIES; do
      [ -z "$POLICY" ] && continue
      aws iam detach-role-policy --role-name "$ROLE_NAME" --policy-arn "$POLICY" --region "$AWS_REGION" 2>/dev/null || true
    done
    # Delete inline policies
    INLINE_POLICIES=$(aws iam list-role-policies --role-name "$ROLE_NAME" --query 'PolicyNames[]' --output text --region "$AWS_REGION" 2>/dev/null || true)
    for POLICY in $INLINE_POLICIES; do
      [ -z "$POLICY" ] && continue
      aws iam delete-role-policy --role-name "$ROLE_NAME" --policy-name "$POLICY" --region "$AWS_REGION" 2>/dev/null || true
    done
    # Delete the role
    aws iam delete-role --role-name "$ROLE_NAME" --region "$AWS_REGION" 2>/dev/null || true
  done
fi
echo ""

# Step 8: Clean up CloudWatch log groups
echo "=== Step 8: Clean up CloudWatch log groups ==="
LOG_GROUPS=$(aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/${PROJECT_NAME}-${ENVIRONMENT}" --query 'logGroups[].logGroupName' --output text --region "$AWS_REGION" 2>/dev/null || true)
if [ -z "$LOG_GROUPS" ]; then
  echo "  No CloudWatch log groups found for $PROJECT_NAME-$ENVIRONMENT"
else
  echo "$LOG_GROUPS" | while read -r LOG_GROUP; do
    [ -z "$LOG_GROUP" ] && continue
    echo "  Deleting log group: $LOG_GROUP"
    aws logs delete-log-group --log-group-name "$LOG_GROUP" --region "$AWS_REGION" 2>/dev/null || true
  done
fi
echo ""

# Step 9: Clean up EventBridge rules
echo "=== Step 9: Clean up EventBridge rules ==="
RULE_NAMES=$(aws events list-rules --name-prefix "${PROJECT_NAME}-${ENVIRONMENT}" --query 'Rules[].Name' --output text --region "$AWS_REGION" 2>/dev/null || true)
if [ -z "$RULE_NAMES" ]; then
  echo "  No EventBridge rules found for $PROJECT_NAME-$ENVIRONMENT"
else
  echo "$RULE_NAMES" | while read -r RULE_NAME; do
    [ -z "$RULE_NAME" ] && continue
    echo "  Deleting EventBridge rule: $RULE_NAME"
    # Remove targets
    TARGETS=$(aws events list-targets-by-rule --rule "$RULE_NAME" --query 'Targets[].Id' --output text --region "$AWS_REGION" 2>/dev/null || true)
    for TARGET in $TARGETS; do
      [ -z "$TARGET" ] && continue
      aws events remove-targets --rule "$RULE_NAME" --ids "$TARGET" --region "$AWS_REGION" 2>/dev/null || true
    done
    # Delete the rule
    aws events delete-rule --name "$RULE_NAME" --region "$AWS_REGION" 2>/dev/null || true
  done
fi
echo ""

# Step 10: Clean up ECR repositories
echo "=== Step 10: Clean up ECR repositories ==="
REPO_NAMES=$(aws ecr describe-repositories --query 'repositories[?contains(repositoryName, `${PROJECT_NAME}-${ENVIRONMENT}`)].repositoryName' --output text --region "$AWS_REGION" 2>/dev/null || true)
if [ -z "$REPO_NAMES" ]; then
  echo "  No ECR repositories found for $PROJECT_NAME-$ENVIRONMENT"
else
  echo "$REPO_NAMES" | while read -r REPO_NAME; do
    [ -z "$REPO_NAME" ] && continue
    echo "  Deleting ECR repository: $REPO_NAME"
    # Delete all images first
    IMAGE_IDS=$(aws ecr list-images --repository-name "$REPO_NAME" --query 'imageIds[].imageDigest' --output text --region "$AWS_REGION" 2>/dev/null || true)
    for IMAGE in $IMAGE_IDS; do
      [ -z "$IMAGE" ] && continue
      aws ecr batch-delete-image --repository-name "$REPO_NAME" --image-ids "imageDigest=$IMAGE" --region "$AWS_REGION" 2>/dev/null || true
    done
    # Delete the repository
    aws ecr delete-repository --repository-name "$REPO_NAME" --force --region "$AWS_REGION" 2>/dev/null || true
  done
fi
echo ""

# Step 11: Clean up OpenSearch domains (if enabled)
echo "=== Step 11: Clean up OpenSearch domains ==="
DOMAIN_NAMES=$(aws opensearch list-domains --query 'DomainNames[?contains(@, `${PROJECT_NAME}-${ENVIRONMENT}`)]' --output text --region "$AWS_REGION" 2>/dev/null || true)
if [ -z "$DOMAIN_NAMES" ]; then
  echo "  No OpenSearch domains found for $PROJECT_NAME-$ENVIRONMENT"
else
  echo "$DOMAIN_NAMES" | while read -r DOMAIN_NAME; do
    [ -z "$DOMAIN_NAME" ] && continue
    echo "  Deleting OpenSearch domain: $DOMAIN_NAME"
    aws opensearch delete-domain --domain-name "$DOMAIN_NAME" --region "$AWS_REGION" 2>/dev/null || true
  done
fi
echo ""

# Step 12: Clean up API Gateway
echo "=== Step 12: Clean up API Gateway ==="
API_IDS=$(aws apigateway get-rest-apis --query 'items[?contains(name, `${PROJECT_NAME}-${ENVIRONMENT}`)].id' --output text --region "$AWS_REGION" 2>/dev/null || true)
if [ -z "$API_IDS" ]; then
  echo "  No API Gateway REST APIs found for $PROJECT_NAME-$ENVIRONMENT"
else
  echo "$API_IDS" | while read -r API_ID; do
    [ -z "$API_ID" ] && continue
    echo "  Deleting API Gateway: $API_ID"
    aws apigateway delete-rest-api --rest-api-id "$API_ID" --region "$AWS_REGION" 2>/dev/null || true
  done
fi

HTTP_API_IDS=$(aws apigatewayv2 get-apis --query 'Items[?contains(Name, `${PROJECT_NAME}-${ENVIRONMENT}`)].ApiId' --output text --region "$AWS_REGION" 2>/dev/null || true)
if [ -z "$HTTP_API_IDS" ]; then
  echo "  No API Gateway HTTP APIs found for $PROJECT_NAME-$ENVIRONMENT"
else
  echo "$HTTP_API_IDS" | while read -r API_ID; do
    [ -z "$API_ID" ] && continue
    echo "  Deleting HTTP API: $API_ID"
    aws apigatewayv2 delete-api --api-id "$API_ID" --region "$AWS_REGION" 2>/dev/null || true
  done
fi
echo ""

# Step 13: Clean up CloudFront distributions
echo "=== Step 13: Clean up CloudFront distributions ==="
DISTRIBUTION_IDS=$(aws cloudfront list-distributions --query 'DistributionList.Items[?contains(DomainName, `${PROJECT_NAME}-${ENVIRONMENT}`)].Id' --output text --region "$AWS_REGION" 2>/dev/null || true)
if [ -z "$DISTRIBUTION_IDS" ]; then
  echo "  No CloudFront distributions found for $PROJECT_NAME-$ENVIRONMENT"
else
  echo "$DISTRIBUTION_IDS" | while read -r DIST_ID; do
    [ -z "$DIST_ID" ] && continue
    echo "  Deleting CloudFront distribution: $DIST_ID"
    # Get ETag and disable distribution first
    CONFIG=$(aws cloudfront get-distribution-config --id "$DIST_ID" --query 'DistributionConfig' --output json --region "$AWS_REGION" 2>/dev/null || true)
    if [ -n "$CONFIG" ]; then
      ETAG=$(aws cloudfront get-distribution-config --id "$DIST_ID" --query 'ETag' --output text --region "$AWS_REGION" 2>/dev/null || true)
      UPDATED=$(echo "$CONFIG" | jq '.Enabled = false')
      aws cloudfront update-distribution --id "$DIST_ID" --distribution-config "$UPDATED" --if-match "$ETAG" --region "$AWS_REGION" 2>/dev/null || true
      # Wait for distribution to be disabled
      sleep 30
      aws cloudfront delete-distribution --id "$DIST_ID" --if-match "$ETAG" --region "$AWS_REGION" 2>/dev/null || true
    fi
  done
fi
echo ""

# Step 14: Clean up ACM certificates
echo "=== Step 14: Clean up ACM certificates ==="
CERT_ARNs=$(aws acm list-certificates --query 'CertificateSummaryList[?contains(CertificateArn, `${PROJECT_NAME}-${ENVIRONMENT}`)].CertificateArn' --output text --region "$AWS_REGION" 2>/dev/null || true)
if [ -z "$CERT_ARNs" ]; then
  echo "  No ACM certificates found for $PROJECT_NAME-$ENVIRONMENT"
else
  echo "$CERT_ARNs" | while read -r CERT_ARN; do
    [ -z "$CERT_ARN" ] && continue
    echo "  Deleting ACM certificate: $CERT_ARN"
    aws acm delete-certificate --certificate-arn "$CERT_ARN" --region "$AWS_REGION" 2>/dev/null || true
  done
fi
echo ""

# Step 15: Clean up Route 53 hosted zones
echo "=== Step 15: Clean up Route 53 hosted zones ==="
HOSTED_ZONE_IDS=$(aws route53 list-hosted-zones --query 'HostedZones[?contains(Name, `${PROJECT_NAME}-${ENVIRONMENT}`)].Id' --output text --region "$AWS_REGION" 2>/dev/null || true)
if [ -z "$HOSTED_ZONE_IDS" ]; then
  echo "  No Route 53 hosted zones found for $PROJECT_NAME-$ENVIRONMENT"
else
  echo "$HOSTED_ZONE_IDS" | while read -r ZONE_ID; do
    [ -z "$ZONE_ID" ] && continue
    ZONE_ID=$(echo "$ZONE_ID" | sed 's|/hostedzone/||')
    echo "  Deleting Route 53 hosted zone: $ZONE_ID"
    # Get all records and delete them
    RECORDS=$(aws route53 list-resource-record-sets --hosted-zone-id "$ZONE_ID" --query 'ResourceRecordSets[?Name != `@`].Name' --output text --region "$AWS_REGION" 2>/dev/null || true)
    for RECORD in $RECORDS; do
      [ -z "$RECORD" ] && continue
      aws route53 change-resource-record-sets --hosted-zone-id "$ZONE_ID" --change-batch '{"Changes":[{"Action":"DELETE","ResourceRecordSet":{"Name":"'"$RECORD"'","Type":"A"}}]}' --region "$AWS_REGION" 2>/dev/null || true
    done
    aws route53 delete-hosted-zone --id "$ZONE_ID" --region "$AWS_REGION" 2>/dev/null || true
  done
fi
echo ""

echo "=== Cleanup complete for $ENVIRONMENT environment ==="
echo ""
echo "Note: Some resources may take time to fully delete (e.g., VPCs, RDS snapshots)."
echo "Run this script again if resources remain."
