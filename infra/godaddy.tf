provider "godaddy" {
  key    = var.godaddy_api_key
  secret = var.godaddy_api_secret
}

resource "godaddy_domain_record" "ishkul_org" {
  domain = "ishkul.org"

  record {
    type = "A"
    name = "@"
    data = "Parked"
    ttl  = 600
  }

  record {
    type = "CNAME"
    name = "_domainconnect"
    data = "_domainconnect.gd.domaincontrol.com"
    ttl  = 3600
  }

  record {
    type = "CNAME"
    name = "www"
    data = aws_lb.ishkul_alb.dns_name
    ttl  = 600
  }

  dynamic "record" {
    for_each = local.validation_records
    content {
      type = record.value["type"]
      name = replace(record.value["name"], ".ishkul.org.", "")
      data = replace(record.value["record"], "acm-validations.aws.", "acm-validations.aws")
      ttl  = 600
    }
  }

  depends_on = [
    aws_acm_certificate.ishkul_cert
  ]

}

