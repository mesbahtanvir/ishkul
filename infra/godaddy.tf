provider "godaddy" {
  key    = var.godaddy_api_key
  secret = var.godaddy_api_secret
}

resource "godaddy_domain_record" "ishkul_org" {
  domain = "ishkul.org"

  record  {
    type = "A"
    name = "@"
    data = "Parked"
    ttl = 600
  }
  record  {
    type = "CNAME"
    name = "_domainconnect"
    data = "_domainconnect.gd.domaincontrol.com"
    ttl = 3600
  }
  record {
    type = "CNAME"
    name = "www"
    data = aws_lb.ishkul_alb.dns_name
    ttl  = 600
  }
}

