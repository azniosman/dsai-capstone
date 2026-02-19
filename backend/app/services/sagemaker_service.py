import boto3
import json
import logging
from app.config import settings

logger = logging.getLogger(__name__)

class SageMakerService:
    def __init__(self):
        self.client = boto3.client('sagemaker-runtime', region_name=settings.aws_region)
        self.endpoint_name = getattr(settings, 'sagemaker_embedding_endpoint', None)

    def get_embeddings(self, texts: list[str]) -> list[list[float]]:
        """
        Invokes SageMaker Serverless Inference endpoint for embeddings.
        Expects endpoint to accept JSON: {"inputs": ["text1", "text2"]}
        And return JSON: {"embeddings": [[...], [...]]} or similar.
        """
        if not self.endpoint_name:
            logger.warning("No SageMaker endpoint configured. Falling back to local/other methods.")
            return []

        try:
            payload = json.dumps({"inputs": texts})
            response = self.client.invoke_endpoint(
                EndpointName=self.endpoint_name,
                ContentType='application/json',
                Body=payload
            )
            result = json.loads(response['Body'].read().decode())
            # Adjust response parsing based on your specific model container's output format
            # HuggingFace containers usually return a list of lists directly or inside a key
            return result.get('embeddings', result)
            
        except Exception as e:
            logger.error(f"SageMaker inference failed: {e}")
            raise e

sagemaker_service = SageMakerService()
