import os
from mangum import Mangum
from app.main import app

# Wrap the FastAPI app with Mangum for AWS Lambda
# This adapter handles the translation between API Gateway events and ASGI
handler = Mangum(app, lifespan="off")

# Usage:
# Set the Lambda handler to: backend.lambda_handler.handler
