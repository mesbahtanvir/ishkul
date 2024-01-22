# Policy to allow sending emails via SES
resource "aws_iam_policy" "ses_send_policy" {
  name        = "SES-Send-Email-Policy"
  description = "Policy for sending emails via SES"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ],
        Effect   = "Allow",
        Resource = "*"
      }
    ]
  })
}
