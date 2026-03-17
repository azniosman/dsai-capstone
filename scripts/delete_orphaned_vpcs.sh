#!/bin/bash
set -euo pipefail

VPC_IDS=(
  "vpc-0ddd46543a355bb6f"
  "vpc-00de3a8666108dd62"
  "vpc-08c107a0a70311adb"
  "vpc-047e05aa0176458a9"
)

for VPC_ID in "${VPC_IDS[@]}"; do
  echo "=== Deleting $VPC_ID ==="
  
  # Get and delete any attached internet gateways
  IGWS=$(aws ec2 describe-internet-gateways --region us-east-1 --filters "Name=attachment.vpc-id,Values=$VPC_ID" --query 'InternetGateways[].InternetGatewayId' --output text 2>/dev/null || true)
  for IGW in $IGWS; do
    [ -z "$IGW" ] && continue
    echo "  Detaching and deleting IGW: $IGW"
    aws ec2 detach-internet-gateway --region us-east-1 --internet-gateway-id "$IGW" --vpc-id "$VPC_ID" 2>/dev/null || true
    aws ec2 delete-internet-gateway --region us-east-1 --internet-gateway-id "$IGW" 2>/dev/null || true
  done
  
  # Delete route tables (non-main)
  RTS=$(aws ec2 describe-route-tables --region us-east-1 --filters "Name=vpc-id,Values=$VPC_ID" --query 'RouteTables[?Associations[0].Main != `true`].RouteTableId' --output text 2>/dev/null || true)
  for RT in $RTS; do
    [ -z "$RT" ] && continue
    echo "  Deleting route table: $RT"
    aws ec2 delete-route-table --region us-east-1 --route-table-id "$RT" 2>/dev/null || true
  done
  
  # Delete subnets
  SUBNETS=$(aws ec2 describe-subnets --region us-east-1 --filters "Name=vpc-id,Values=$VPC_ID" --query 'Subnets[].SubnetId' --output text 2>/dev/null || true)
  for SUBNET in $SUBNETS; do
    [ -z "$SUBNET" ] && continue
    echo "  Deleting subnet: $SUBNET"
    aws ec2 delete-subnet --region us-east-1 --subnet-id "$SUBNET" 2>/dev/null || true
  done
  
  # Delete security groups (non-default)
  SGS=$(aws ec2 describe-security-groups --region us-east-1 --filters "Name=vpc-id,Values=$VPC_ID" --query 'SecurityGroups[?groupName != `default`].groupId' --output text 2>/dev/null || true)
  for SG in $SGS; do
    [ -z "$SG" ] && continue
    echo "  Deleting security group: $SG"
    aws ec2 delete-security-group --region us-east-1 --group-id "$SG" 2>/dev/null || true
  done
  
  # Delete NAT gateways
  NATS=$(aws ec2 describe-nat-gateways --region us-east-1 --filter "Name=vpc-id,Values=$VPC_ID" --query 'NatGateways[].NatGatewayId' --output text 2>/dev/null || true)
  for NAT in $NATS; do
    [ -z "$NAT" ] && continue
    echo "  Deleting NAT gateway: $NAT"
    aws ec2 delete-nat-gateway --region us-east-1 --nat-gateway-id "$NAT" 2>/dev/null || true
  done
  
  # Delete VPC
  echo "  Deleting VPC: $VPC_ID"
  aws ec2 delete-vpc --region us-east-1 --vpc-id "$VPC_ID" 2>/dev/null || true
done

echo "=== VPC cleanup complete ==="
aws ec2 describe-vpcs --region us-east-1 --query 'Vpcs[].VpcId' --output text
