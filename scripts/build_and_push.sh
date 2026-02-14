#!/bin/bash
set -e

# Configuration
AWS_REGION="ap-southeast-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
PROJECT_NAME="skillbridge"
ENV="dev"

ECR_BACKEND="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${PROJECT_NAME}-${ENV}-backend"
ECR_FRONTEND="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${PROJECT_NAME}-${ENV}-frontend"

echo "Logging in to Amazon ECR..."
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

echo "Building Backend..."
docker build -t ${ECR_BACKEND}:latest -f backend/Dockerfile .
docker push ${ECR_BACKEND}:latest

echo "Building Frontend..."
docker build -t ${ECR_FRONTEND}:latest -f frontend/Dockerfile ./frontend
docker push ${ECR_FRONTEND}:latest

echo "Successfully built and pushed images!"
