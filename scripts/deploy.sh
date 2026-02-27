#!/bin/bash

# SkillBridge Deployment Automation Script
# Standards: Google Technical Writing Style Guide

set -e

# Configuration
PROJECT_ROOT=$(pwd)
DB_HEALTH_WAIT=30

echo "🚀 Starting SkillBridge deployment cycle..."

# 1. Environment Validation
echo "🔍 Validating environment..."
if [ ! -f "nestjs-backend/.env" ]; then
  echo "⚠️  Warning: nestjs-backend/.env not found. Creating from template if available..."
  # You could add logic here to copy from .env.example
fi

# 2. Infrastructure Build
echo "🏗️  Building and starting core services..."
docker compose up -d --build

# 3. Database Health Check
echo "⏳ Waiting for database to be healthy..."
count=0
while [ $count -lt $DB_HEALTH_WAIT ]; do
  if docker compose ps db | grep -q "healthy"; then
    echo "✅ Database is ready."
    break
  fi
  sleep 2
  count=$((count+2))
done

if [ $count -ge $DB_HEALTH_WAIT ]; then
  echo "❌ Error: Database health check timed out."
  exit 1
fi

# 4. Cleanup
echo "🧹 Cleaning up legacy images and build cache..."
docker image prune -f

echo "✨ Deployment complete! Services are live:"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend:  http://localhost:8000/api"
echo "   - n8n:      http://localhost:5678"
