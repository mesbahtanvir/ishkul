provider "godaddy" {
  key    = var.godaddy_api_key
  secret = var.godaddy_api_secret
}

resource "godaddy_domain_record" "ishkul_org" {
  domain = "ishkul.org"
  record {
    type = "CNAME"
    name = "www"
    data = aws_lb.ishkul_alb.dns_name
    ttl  = 600
  }
}

