# Define the bucket policy as a JSON string
data "aws_iam_policy_document" "alb_log_s3_bucket_policy" {
  statement {
    effect = "Allow"
    principals {
      # https://tinyurl.com/accesss-log-account
      identifiers = [
        "arn:aws:iam::114774131450:root", # ap-southeast-1 --> Singapore    
      ]
      type = "AWS"
    }
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:ListBucket"
    ]
    resources = [
      "${aws_s3_bucket.ishkul_lb_logs.arn}",
      "${aws_s3_bucket.ishkul_lb_logs.arn}/*"
    ]
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}
