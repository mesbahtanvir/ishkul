resource "aws_wafv2_web_acl" "rate_limit_500_per_5_min" {
  name  = "rate-limit-acl"
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
    name     = "AllowSpecificIP"
    priority = 0 // Ensure this has the highest priority

    action {
      allow {}
    }

    statement {
      ip_set_reference_statement {
        arn = aws_wafv2_ip_set.allowlist_ip_set.arn
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AllowSpecificIP"
      sampled_requests_enabled   = true
    }
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

resource "aws_wafv2_web_acl_association" "contributor_domain_limit" {
  resource_arn = aws_lb.ishkul_contributor_web_alb.arn
  web_acl_arn  = aws_wafv2_web_acl.rate_limit_500_per_5_min.arn
}


resource "aws_wafv2_ip_set" "allowlist_ip_set" {
  name               = "AllowlistIPSet"
  scope              = "REGIONAL"
  ip_address_version = "IPV4"
  addresses          = ["64.231.128.123/32"]
}

