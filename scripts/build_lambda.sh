#!/bin/bash
set -e

echo "Building Lambda Deployment Package..."

PROJECT_ROOT=$(pwd)
BACKEND_DIR="$PROJECT_ROOT/backend"
BUILD_DIR="$PROJECT_ROOT/build_lambda"
ZIP_FILE="$PROJECT_ROOT/terraform/function.zip"

# Clean up
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Install dependencies
echo "Installing dependencies..."
pip install -r "$BACKEND_DIR/requirements.txt" --target "$BUILD_DIR" --platform manylinux2014_x86_64 --implementation cp --python-version 3.11 --only-binary=:all: --upgrade

# Copy application code
echo "Copying application code..."
cp -r "$BACKEND_DIR/app" "$BUILD_DIR/"
cp "$BACKEND_DIR/lambda_handler.py" "$BUILD_DIR/"

# Zip it up
echo "Creating zip file..."
cd "$BUILD_DIR"
zip -r "$ZIP_FILE" .

echo "Done! Package at $ZIP_FILE"
