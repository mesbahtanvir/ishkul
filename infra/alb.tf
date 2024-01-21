resource "aws_lb" "ishkul_web_alb" {
  name               = "ishkul-web-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = [aws_subnet.public_1.id, aws_subnet.public_2.id]

  enable_deletion_protection = false

  access_logs {
    bucket  = aws_s3_bucket.ishkul_lb_logs.bucket
    prefix  = "log"
    enabled = true
  }

  depends_on = [
    aws_s3_bucket_policy.lb_log_policy,
  ]
}

resource "aws_lb" "ishkul_api_alb" {
  name               = "ishkul-api-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = [aws_subnet.public_1.id, aws_subnet.public_2.id]

  enable_deletion_protection = false

  access_logs {
    bucket  = aws_s3_bucket.ishkul_lb_logs.bucket
    prefix  = "log"
    enabled = true
  }

  depends_on = [
    aws_s3_bucket_policy.lb_log_policy,
  ]
}

resource "aws_lb" "ishkul_app_alb" {
  name               = "ishkul-app-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = [aws_subnet.public_1.id, aws_subnet.public_2.id]

  enable_deletion_protection = false

  access_logs {
    bucket  = aws_s3_bucket.ishkul_lb_logs.bucket
    prefix  = "log"
    enabled = true
  }

  depends_on = [
    aws_s3_bucket_policy.lb_log_policy,
  ]
}

resource "aws_lb_listener" "ishkul_https_web_listener" {
  load_balancer_arn = aws_lb.ishkul_web_alb.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.ishkul_cert.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.ishkul_web_tg.arn
  }
}

resource "aws_lb_listener" "ishkul_https_api_listener" {
  load_balancer_arn = aws_lb.ishkul_api_alb.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.ishkul_cert.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.ishkul_api_tg.arn
  }
}

resource "aws_lb_listener" "ishkul_https_app_listener" {
  load_balancer_arn = aws_lb.ishkul_app_alb.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.ishkul_cert.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.ishkul_app_tg.arn
  }
}

resource "aws_lb_listener" "http_web_redirection" {
  load_balancer_arn = aws_lb.ishkul_web_alb.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = 443
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "http_api_redirection" {
  load_balancer_arn = aws_lb.ishkul_api_alb.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = 443
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "http_app_redirection" {
  load_balancer_arn = aws_lb.ishkul_app_alb.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = 443
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_target_group" "ishkul_web_tg" {
  name       = "ishkul-web-tg"
  port       = 80
  protocol   = "HTTP"
  vpc_id     = aws_vpc.main.id
  slow_start = 0

  health_check {
    enabled             = true
    port                = 80
    interval            = 30
    path                = "/"
    protocol            = "HTTP"
    matcher             = "200"
    healthy_threshold   = 3
    unhealthy_threshold = 3
  }
}

resource "aws_lb_target_group" "ishkul_api_tg" {
  name       = "ishkul-api-tg"
  port       = 8080
  protocol   = "HTTP"
  vpc_id     = aws_vpc.main.id
  slow_start = 0

  health_check {
    enabled             = true
    port                = 8080
    interval            = 30
    path                = "/health"
    protocol            = "HTTP"
    matcher             = "200"
    healthy_threshold   = 3
    unhealthy_threshold = 3
  }
}

resource "aws_lb_target_group" "ishkul_app_tg" {
  name       = "ishkul-app-tg"
  port       = 3000
  protocol   = "HTTP"
  vpc_id     = aws_vpc.main.id
  slow_start = 0

  health_check {
    enabled             = true
    port                = 3000
    interval            = 30
    path                = "/"
    protocol            = "HTTP"
    matcher             = "200"
    healthy_threshold   = 3
    unhealthy_threshold = 3
  }
}

resource "aws_lb_target_group_attachment" "web_tg_attachment" {
  target_group_arn = aws_lb_target_group.ishkul_web_tg.arn
  target_id        = aws_instance.ishkul_ec2.id
  port             = 80
}

resource "aws_lb_target_group_attachment" "api_tg_attachment" {
  target_group_arn = aws_lb_target_group.ishkul_api_tg.arn
  target_id        = aws_instance.ishkul_ec2.id
  port             = 8080
}

resource "aws_lb_target_group_attachment" "app_tg_attachment" {
  target_group_arn = aws_lb_target_group.ishkul_app_tg.arn
  target_id        = aws_instance.ishkul_ec2.id
  port             = 3000
}

output "web_load_balancer_dns" {
  value = aws_lb.ishkul_web_alb.dns_name
}

output "api_load_balancer_dns" {
  value = aws_lb.ishkul_api_alb.dns_name
}

output "web_app_load_balancer_dns" {
  value = aws_lb.ishkul_app_alb.dns_name
}
