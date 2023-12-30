# ishkul

ishkul.org

# Development cycle

Any changes in web / backend
Run
`./cmd/tag-and-push-image.sh`

Log in to ec2

sudo docker-compose pull
sudo docker-compose up -d --build

Any changes in infra
Run
`terraform validate`
`terraform plan`
`terraform apply`
