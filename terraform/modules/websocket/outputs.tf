output "websocket_endpoint" {
  description = "WebSocket API endpoint (wss://...)"
  value       = "${aws_apigatewayv2_api.voice_ws.api_endpoint}/${var.environment}"
}

output "websocket_api_id" {
  value = aws_apigatewayv2_api.voice_ws.id
}
