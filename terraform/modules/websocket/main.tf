# ── WebSocket API Gateway (voice coaching) ────────────────────────────────────

resource "aws_apigatewayv2_api" "voice_ws" {
  name                       = "${var.project_name}-${var.environment}-voice-ws"
  protocol_type              = "WEBSOCKET"
  route_selection_expression = "$request.body.action"

  tags = { Name = "${var.project_name}-${var.environment}-voice-ws" }
}

resource "aws_apigatewayv2_stage" "voice_ws" {
  api_id      = aws_apigatewayv2_api.voice_ws.id
  name        = var.environment
  auto_deploy = true

  tags = { Name = "${var.project_name}-${var.environment}-voice-ws-stage" }
}

# Integration — CONVERT_TO_BINARY is required for binary audio frames
resource "aws_apigatewayv2_integration" "voice" {
  api_id                    = aws_apigatewayv2_api.voice_ws.id
  integration_type          = "AWS_PROXY"
  integration_uri           = var.voice_lambda_arn
  content_handling_strategy = "CONVERT_TO_BINARY"
}

# Routes: $connect, $disconnect, $default
resource "aws_apigatewayv2_route" "connect" {
  api_id    = aws_apigatewayv2_api.voice_ws.id
  route_key = "$connect"
  target    = "integrations/${aws_apigatewayv2_integration.voice.id}"
}

resource "aws_apigatewayv2_route" "disconnect" {
  api_id    = aws_apigatewayv2_api.voice_ws.id
  route_key = "$disconnect"
  target    = "integrations/${aws_apigatewayv2_integration.voice.id}"
}

resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.voice_ws.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.voice.id}"
}

# Lambda permission for API Gateway to invoke the voice function
resource "aws_lambda_permission" "voice_ws" {
  statement_id  = "AllowVoiceWSInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.voice_lambda_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.voice_ws.execution_arn}/*/*"
}
