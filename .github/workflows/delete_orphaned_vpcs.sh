#!/bin/bash
# Cleanup orphaned VPCs from previous failed deployments
# This script deletes VPCs tagged with skillbridge-*-vpc except for the current environment

set -euo pipefail

PROJECT_NAME="${PROJECT_NAME:-skillbridge}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
AWS_REGION="${AWS_REGION:-us-east-1}"

echo "=== Cleanup: Delete orphaned VPCs ==="

# Get VPC quota
VPC_QUOTA=$(aws ec2 describe-account-attributes \
  --attribute-names vpc --query 'AccountAttributes[0].AttributeValues[0].AttributeValue' \
  --output text 2>/dev/null || echo "5")

VPC_COUNT=$(aws ec2 describe-vpcs \
  --query 'Vpcs[].VpcId' --output text 2>/dev/null | wc -w | tr -d ' ')
echo "  VPC quota: $VPC_QUOTA, current VPCs: $VPC_COUNT"

# Get all VPCs with the project tag pattern
VPC_IDS=$(aws ec2 describe-vpcs \
  --filters "Name=tag:Name,Values=${PROJECT_NAME}-*-vpc" \
  --query 'Vpcs[].VpcId' --output text 2>/dev/null || true)

if [ -z "$VPC_IDS" ]; then
  echo "  No orphaned VPCs found"
else
  echo "$VPC_IDS" | while read -r VPC_ID; do
    [ -z "$VPC_ID" ] && continue
    [ "$VPC_ID" = "None" ] && continue

    VPC_NAME=$(aws ec2 describe-vpcs --region "$AWS_REGION" --vpc-ids "$VPC_ID" \
      --query 'Vpcs[0].Tags[?Key==`Name`].Value[0]' --output text 2>/dev/null) || true

    # Skip if no name tag
    [ -z "$VPC_NAME" ] && continue

    # Skip current environment's VPC - it will be handled by Terraform
    if [ "$VPC_NAME" = "${PROJECT_NAME}-${ENVIRONMENT}-vpc" ]; then
      echo "  Skipping current environment VPC: $VPC_ID ($VPC_NAME)"
      continue
    fi

    # Only delete VPCs that match the pattern ${PROJECT_NAME}-*-vpc
    if [[ "$VPC_NAME" =~ ^${PROJECT_NAME}-.*-vpc$ ]]; then
      echo "  Deleting orphaned VPC: $VPC_ID ($VPC_NAME)"

      # Get and delete any attached internet gateways
      IGWS=$(aws ec2 describe-internet-gateways --region "$AWS_REGION" \
        --filters "Name=attachment.vpc-id,Values=$VPC_ID" \
        --query 'InternetGateways[].InternetGatewayId' \
        --output text 2>/dev/null || true)
      for IGW in $IGWS; do
        [ -z "$IGW" ] && continue
        echo "    Detaching and deleting IGW: $IGW"
        aws ec2 detach-internet-gateway --region "$AWS_REGION" \
          --internet-gateway-id "$IGW" --vpc-id "$VPC_ID" 2>/dev/null || true
        aws ec2 delete-internet-gateway --region "$AWS_REGION" \
          --internet-gateway-id "$IGW" 2>/dev/null || true
      done

      # Delete route tables (non-main)
      RTS=$(aws ec2 describe-route-tables --region "$AWS_REGION" \
        --filters "Name=vpc-id,Values=$VPC_ID" \
        --query 'RouteTables[?Associations[0].Main != `true`].RouteTableId' \
        --output text 2>/dev/null || true)
      for RT in $RTS; do
        [ -z "$RT" ] && continue
        echo "    Deleting route table: $RT"
        aws ec2 delete-route-table --region "$AWS_REGION" \
          --route-table-id "$RT" 2>/dev/null || true
      done

      # Delete subnets
      SUBNETS=$(aws ec2 describe-subnets --region "$AWS_REGION" \
        --filters "Name=vpc-id,Values=$VPC_ID" \
        --query 'Subnets[].SubnetId' \
        --output text 2>/dev/null || true)
      for SUBNET in $SUBNETS; do
        [ -z "$SUBNET" ] && continue
        echo "    Deleting subnet: $SUBNET"
        aws ec2 delete-subnet --region "$AWS_REGION" \
          --subnet-id "$SUBNET" 2>/dev/null || true
      done

      # Delete security groups (non-default)
      SGS=$(aws ec2 describe-security-groups --region "$AWS_REGION" \
        --filters "Name=vpc-id,Values=$VPC_ID" \
        --query 'SecurityGroups[?groupName != `default`].groupId' \
        --output text 2>/dev/null || true)
      for SG in $SGS; do
        [ -z "$SG" ] && continue
        echo "    Deleting security group: $SG"
        aws ec2 delete-security-group --region "$AWS_REGION" \
          --group-id "$SG" 2>/dev/null || true
      done

      # Delete NAT gateways
      NATS=$(aws ec2 describe-nat-gateways --region "$AWS_REGION" \
        --filter "Name=vpc-id,Values=$VPC_ID" \
        --query 'NatGateways[].NatGatewayId' \
        --output text 2>/dev/null || true)
      for NAT in $NATS; do
        [ -z "$NAT" ] && continue
        echo "    Deleting NAT gateway: $NAT"
        aws ec2 delete-nat-gateway --region "$AWS_REGION" \
          --nat-gateway-id "$NAT" 2>/dev/null || true
      done

      # Delete VPC (must be empty at this point)
      echo "    Deleting VPC: $VPC_ID"
      aws ec2 delete-vpc --region "$AWS_REGION" --vpc-id "$VPC_ID" 2>/dev/null || true
      echo "  Deleted orphaned VPC: $VPC_ID"
    fi
  done
fi

# Check VPC count after cleanup
VPC_COUNT_AFTER=$(aws ec2 describe-vpcs \
  --query 'Vpcs[].VpcId' --output text 2>/dev/null | wc -w | tr -d ' ')
echo "  VPCs after cleanup: $VPC_COUNT_AFTER/$VPC_QUOTA"
