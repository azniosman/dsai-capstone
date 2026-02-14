#!/bin/bash

# Deploy script for DSAI Capstone

set -e

echo "Starting deployment..."

# 1. Pull latest changes (if using git)
# git pull origin main

# 2. Build and start containers
echo "Building and starting containers..."
docker compose up -d --build

# 3. Prune unused images to save space
echo "Cleaning up..."
docker image prune -f

echo "Deployment complete!"
