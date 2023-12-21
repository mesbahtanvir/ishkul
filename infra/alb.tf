resource "aws_lb" "ishkul_alb" {
  name               = "ishkul-alb"
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

resource "aws_lb_listener" "ishkul_listener" {
  load_balancer_arn = aws_lb.ishkul_alb.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.ishkul_tg.arn
  }
}

resource "aws_lb_target_group" "ishkul_tg" {
  name     = "ishkul-tg"
  port     = 80
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

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

resource "aws_lb_target_group_attachment" "tg_attachment" {
  target_group_arn = aws_lb_target_group.ishkul_tg.arn
  target_id        = aws_instance.ishkul_ec2.id
}

output "load_balancer_dns" {
  value = aws_lb.ishkul_alb.dns_name
}

