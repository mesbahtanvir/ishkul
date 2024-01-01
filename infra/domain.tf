
resource "aws_ses_domain_identity" "ishkul_org" {
  domain = "ishkul.org"  # Replace with your domain name
}

resource "aws_ses_domain_dkim" "ishkul_org_dkim" {
  domain = aws_ses_domain_identity.ishkul_org.domain
}

resource "aws_route53_zone" "ishkul_org_" {
  name = "ishkul.org."  # Replace with your domain name
}

resource "aws_route53_record" "ishkul_org_verification" {
  zone_id = aws_route53_zone.ishkul_org_.zone_id
  name    = aws_ses_domain_identity.ishkul_org.domain
  type    = "TXT"
  ttl     = "300"
  records = [aws_ses_domain_identity.ishkul_org.verification_token]
}

resource "aws_route53_record" "ishkul_org_dkim" {
  for_each = toset(aws_ses_domain_dkim.ishkul_org_dkim.dkim_tokens)

  zone_id = aws_route53_zone.ishkul_org_.zone_id
  name    = "aws._domainkey.${each.key}"
  type    = "CNAME"
  ttl     = "300"
  records = [each.value]
}

output "ishkul_org_verification" {
  value = { for dkim_record in aws_route53_record.ishkul_org_dkim : dkim_record.name => {
      cname  = dkim_record.type
      name   = dkim_record.name
      value  = join("", dkim_record.records)
    }
  }
}

# Configure your GoDaddy DNS manually with the values provided by the above Terraform resources.