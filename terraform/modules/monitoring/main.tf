resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${var.project_name}-backend"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_metric_alarm" "ecs_unhealthy_tasks" {
  count = var.ecs_service_name != "" ? 1 : 0

  alarm_name          = "${var.project_name}-ecs-unhealthy-tasks"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "RunningTaskCount"
  namespace           = "ECS/ContainerInsights"
  period              = 300
  statistic           = "Average"
  threshold           = 1
  treat_missing_data  = "breaching"
  alarm_description   = "ECS running task count dropped below 1"

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = var.ecs_service_name
  }
}

resource "aws_cloudwatch_metric_alarm" "alb_5xx_rate" {
  count = var.alb_arn_suffix != "" ? 1 : 0

  alarm_name          = "${var.project_name}-alb-5xx-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_ELB_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  treat_missing_data  = "notBreaching"
  alarm_description   = "ALB 5xx error rate exceeded threshold"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_connections" {
  count = var.db_instance_id != "" ? 1 : 0

  alarm_name          = "${var.project_name}-rds-high-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 50
  alarm_description   = "RDS connection count exceeded threshold"

  dimensions = {
    DBInstanceIdentifier = var.db_instance_id
  }
}
