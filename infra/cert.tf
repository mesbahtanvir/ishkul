resource "aws_acm_certificate" "ishkul_cert" {
  domain_name       = "*.ishkul.org"
  validation_method = "DNS"

  tags = {
    Environment = "production"
  }

  lifecycle {
    create_before_destroy = true
  }
}


locals {
  validation_records = {
    for dvo in aws_acm_certificate.ishkul_cert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }
}

output "acm_certificate_validation_dns_records" {
  value = {
    for dvo in aws_acm_certificate.ishkul_cert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }
}
