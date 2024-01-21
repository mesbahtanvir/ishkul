# Create an IAM role for the EC2 instance
resource "aws_iam_role" "ec2_ses_role" {
  name = "ec2-ses-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = "sts:AssumeRole",
        Effect = "Allow",
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

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
        Effect = "Allow",
        Resource = "*"
      }
    ]
  })
}

# Attach the policy to the role
resource "aws_iam_role_policy_attachment" "ses_policy_attachment" {
  role       = aws_iam_role.ec2_ses_role.name
  policy_arn = aws_iam_policy.ses_send_policy.arn
}
