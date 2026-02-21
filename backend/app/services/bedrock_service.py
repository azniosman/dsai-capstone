import boto3
import json
import logging
from botocore.exceptions import ClientError
from app.config import settings

logger = logging.getLogger(__name__)

class BedrockService:
    def __init__(self):
        self.client = boto3.client(
            service_name='bedrock-runtime',
            region_name=getattr(settings, 'aws_region', 'us-east-1')
        )
        # Use configurable model ID from settings (defaults to Claude 3.5 Sonnet v2)
        self.model_id = getattr(
            settings, 'bedrock_model_id',
            "us.anthropic.claude-3-5-sonnet-20241022-v2:0"
        )

    def invoke_model(self, system_prompt: str, messages: list, temperature: float = 0.7) -> str:
        """
        Invokes Claude 3.5 Sonnet on AWS Bedrock.
        """
        # Format messages for Claude 3 API
        # Bedrock Claude 3 expects:
        # {
        #   "anthropic_version": "bedrock-2023-05-31",
        #   "max_tokens": 1000,
        #   "system": "...",
        #   "messages": [
        #     {"role": "user", "content": [{"type": "text", "text": "..."}]},
        #     {"role": "assistant", "content": [{"type": "text", "text": "..."}]}
        #   ]
        # }
        
        formatted_messages = []
        for msg in messages:
            role = msg.get("role")
            content = msg.get("content")
            # Map 'model' role to 'assistant' for Claude
            if role == "model":
                role = "assistant"
            
            formatted_messages.append({
                "role": role,
                "content": [{"type": "text", "text": content}]
            })

        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 2048,
            "system": system_prompt,
            "messages": formatted_messages,
            "temperature": temperature,
            "top_p": 0.9,
        })

        try:
            response = self.client.invoke_model(
                body=body,
                modelId=self.model_id,
                accept='application/json',
                contentType='application/json'
            )

            response_body = json.loads(response.get('body').read())
            # Extract text content from response
            # Response format: {"content": [{"type": "text", "text": "..."}], ...}
            output_text = response_body.get('content', [])[0].get('text', '')
            return output_text

        except ClientError as e:
            logger.error(f"Bedrock invocation failed: {e}")
            raise e

    def invoke_model_with_stream(self, system_prompt: str, messages: list, temperature: float = 0.7):
        """
        Invokes Claude 3.5 Sonnet on AWS Bedrock and returns a streaming generator.
        """
        formatted_messages = []
        for msg in messages:
            role = msg.get("role")
            content = msg.get("content")
            if role == "model":
                role = "assistant"
            
            formatted_messages.append({
                "role": role,
                "content": [{"type": "text", "text": content}]
            })

        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 2048,
            "system": system_prompt,
            "messages": formatted_messages,
            "temperature": temperature,
            "top_p": 0.9,
        })

        try:
            response = self.client.invoke_model_with_response_stream(
                body=body,
                modelId=self.model_id,
                accept='application/json',
                contentType='application/json'
            )

            for event in response.get('body'):
                chunk = json.loads(event.get('chunk').get('bytes').decode())
                if chunk['type'] == 'content_block_delta':
                    yield chunk['delta']['text']
                    
        except ClientError as e:
            logger.error(f"Bedrock streaming invocation failed: {e}")
            raise e

bedrock_service = BedrockService()
