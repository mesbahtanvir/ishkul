resource "aws_iam_policy" "s3_access" {
  name        = "s3_access_policy"
  description = "Policy to access specific S3 bucket"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ],
        Effect   = "Allow",
        Resource = [
          "${aws_s3_bucket.ishkul_storage.arn}/*",
          "${aws_s3_bucket.ishkul_storage.arn}"
        ]
      }
    ]
  })
}
