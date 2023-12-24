resource "aws_wafv2_web_acl" "rate_limit_500_per_5_min" {
  name  = "example-acl"
  scope = "REGIONAL"
  default_action {
    allow {}
  }
  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "example"
    sampled_requests_enabled   = true
  }

  rule {
    name     = "RateLimitRule"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 500
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRule"
      sampled_requests_enabled   = true
    }
  }
}

resource "aws_wafv2_web_acl_association" "api_domain_limit" {
  resource_arn = aws_lb.ishkul_api_alb.arn
  web_acl_arn  = aws_wafv2_web_acl.rate_limit_500_per_5_min.arn
}

resource "aws_wafv2_web_acl_association" "web_domain_limit" {
  resource_arn = aws_lb.ishkul_web_alb.arn
  web_acl_arn  = aws_wafv2_web_acl.rate_limit_500_per_5_min.arn
}
