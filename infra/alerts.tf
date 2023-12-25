resource "aws_cloudwatch_metric_alarm" "web_http_5xx_alarm" {
  alarm_name          = "web-http-5xx-alarm"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "HTTPCode_ELB_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "This metric monitors for HTTP 5XX errors from ALB"
  actions_enabled     = true
  dimensions = {
    LoadBalancer = aws_lb.ishkul_web_alb.arn
  }
  alarm_actions = [aws_sns_topic.pagerduty_alert.arn]
}

resource "aws_cloudwatch_metric_alarm" "api_http_5xx_alarm" {
  alarm_name          = "api-http-5xx-alarm"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "HTTPCode_ELB_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "This metric monitors for HTTP 5XX errors from ALB"
  actions_enabled     = true
  dimensions = {
    LoadBalancer = aws_lb.ishkul_api_alb.arn
  }
  alarm_actions = [aws_sns_topic.pagerduty_alert.arn]
}

resource "aws_cloudwatch_metric_alarm" "api_http_4xx_alarm" {
  alarm_name          = "api-http-4xx-alarm"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "HTTPCode_ELB_4XX_Count" # Updated metric name for 4XX errors
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5" # Adjust the threshold as needed
  alarm_description   = "This metric monitors for HTTP 4XX errors from ALB"
  actions_enabled     = true
  dimensions = {
    LoadBalancer = aws_lb.ishkul_api_alb.arn
  }
  alarm_actions = [aws_sns_topic.pagerduty_alert.arn]
}

resource "aws_cloudwatch_metric_alarm" "web_http_4xx_alarm" {
  alarm_name          = "api-http-4xx-alarm"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "HTTPCode_ELB_4XX_Count" # Updated metric name for 4XX errors
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5" # Adjust the threshold as needed
  alarm_description   = "This metric monitors for HTTP 4XX errors from ALB"
  actions_enabled     = true
  dimensions = {
    LoadBalancer = aws_lb.ishkul_web_alb.arn
  }
  alarm_actions = [aws_sns_topic.pagerduty_alert.arn]
}

resource "aws_cloudwatch_metric_alarm" "api_high_qps_alarm" {
  alarm_name          = "high-qps-alarm"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "RequestsPerSecond"  # Replace with the actual metric name
  namespace           = "AWS/ApplicationELB" # Replace with the appropriate namespace
  period              = 60                   # Adjust the period as needed (e.g., 60 seconds)
  statistic           = "SampleCount"
  threshold           = 100 # Set your threshold for "high" QPS
  alarm_description   = "This alarm triggers when QPS is high"
  actions_enabled     = true

  dimensions = {
    LoadBalancer = aws_lb.ishkul_api_alb.arn # Replace with the ARN of your ELB or relevant resource
  }

  alarm_actions = [aws_sns_topic.pagerduty_alert.arn]
}

resource "aws_cloudwatch_metric_alarm" "web_high_qps_alarm" {
  alarm_name          = "high-qps-alarm"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "RequestsPerSecond"  # Replace with the actual metric name
  namespace           = "AWS/ApplicationELB" # Replace with the appropriate namespace
  period              = 60                   # Adjust the period as needed (e.g., 60 seconds)
  statistic           = "SampleCount"
  threshold           = 100 # Set your threshold for "high" QPS
  alarm_description   = "This alarm triggers when QPS is high"
  actions_enabled     = true

  dimensions = {
    LoadBalancer = aws_lb.ishkul_web_alb.arn # Replace with the ARN of your ELB or relevant resource
  }

  alarm_actions = [aws_sns_topic.pagerduty_alert.arn]
}

resource "aws_sns_topic" "pagerduty_alert" {
  name = "pagerduty-alert"
}

resource "aws_sns_topic_subscription" "pagerduty_subscription" {
  topic_arn = aws_sns_topic.pagerduty_alert.arn
  protocol  = "https" // or "http" if your endpoint is not SSL secured
  endpoint  = "https://events.eu.pagerduty.com/integration/${var.pagerduty_key}/enqueue"
}
