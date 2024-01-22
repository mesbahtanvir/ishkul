resource "aws_s3_bucket" "ishkul_lb_logs" {
  bucket = "ishkul-lb-logs"
  lifecycle {
    prevent_destroy = false
  }
}

resource "aws_s3_bucket_policy" "lb_log_policy" {
  bucket     = aws_s3_bucket.ishkul_lb_logs.bucket
  policy     = data.aws_iam_policy_document.alb_log_s3_bucket_policy.json
  depends_on = [aws_s3_bucket.ishkul_lb_logs]
}

resource "aws_s3_bucket" "ishkul_storage" {
  bucket = "ishkul-storage"
  lifecycle {
    prevent_destroy = false
  }
}