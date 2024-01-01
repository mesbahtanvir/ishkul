# Some manual efforts

ishkul org domain has been created with GoDaddy, we need to setup dns propery to work with our service.

1. Route request to aws load balancer

   1. app.ishkul.org `contrib_web_load_balancer_dns = "ishkul-contributor-web-alb-158982329.ap-southeast-1.elb.amazonaws.com"`
   2. www.ishkul.org `web_load_balancer_dns = "ishkul-web-alb-729849842.ap-southeast-1.elb.amazonaws.com"`

2. Add certificate validation so that https works

   ```
   acm_certificate_validation_dns_records = {
        "*.ishkul.org" = {
            "name" = "_4b8b6a45de812ea3bde3a283e4d08cd4.ishkul.org."
            "record" = "_79ff3defe174577794e0eacaceaec3f5.mhbtsbpdnt.acm-validations.aws."
            "type" = "CNAME"
        }
   }
   ```

3. Setup verification for domain so that email can be sent through AWS Simple Email Service

   ```
   ishkul_org_verification = {
        "aws._domainkey.boksqal7p73nmwa3gbfebiajt3emkprq" = {
            "cname" = "CNAME"
            "name" = "aws._domainkey.boksqal7p73nmwa3gbfebiajt3emkprq"
            "value" = "boksqal7p73nmwa3gbfebiajt3emkprq"
        }
        "aws._domainkey.kz5ooqk6ttmh6m6jzrhyx2jjydxkiksb" = {
            "cname" = "CNAME"
            "name" = "aws._domainkey.kz5ooqk6ttmh6m6jzrhyx2jjydxkiksb"
            "value" = "kz5ooqk6ttmh6m6jzrhyx2jjydxkiksb"
        }
        "aws._domainkey.orpj4lazpvbjkn6taov6tct5gnjcaukr" = {
            "cname" = "CNAME"
            "name" = "aws._domainkey.orpj4lazpvbjkn6taov6tct5gnjcaukr"
            "value" = "orpj4lazpvbjkn6taov6tct5gnjcaukr"
        }
   }
   ```

Run terraform output to get all the latest updated value
