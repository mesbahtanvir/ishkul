resource "aws_instance" "ishkul_ec2" {
  ami           = "ami-05f8c2ee58e71f8e6" # Replace with a valid AMI ID
  instance_type = "t4g.medium"
  key_name      = "ishkul"

  # Associate the IAM role with the EC2 instance
  iam_instance_profile = aws_iam_instance_profile.ec2_profile.name

  subnet_id              = aws_subnet.public_1.id
  vpc_security_group_ids = [aws_security_group.ec2_sg.id]

  provisioner "file" {
    source      = "./docker-compose.yml"
    destination = "/home/ubuntu/docker-compose.yml"
    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file(var.key_path)
      host        = self.public_ip
    }
  }

  tags = {
    Name = "Ishkul EC2"
  }
}

resource "null_resource" "run_remote_exec" {
  triggers = {
    instance_id = aws_instance.ishkul_ec2.id
  }
  provisioner "remote-exec" {
    inline = [
      "sudo apt-get update",
      "sudo snap install docker",
      "sudo docker --version",
      "sudo docker-compose --version",

      "wget -qO- https://www.mongodb.org/static/pgp/server-7.0.asc | sudo tee /etc/apt/trusted.gpg.d/server-7.0.asc",
      "echo 'deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse' | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list",
      "sudo apt-get update",
      "sudo DEBIAN_FRONTEND=noninteractive apt-get install -y mongodb-mongosh",
      "echo ${var.docker_key} | sudo docker login -u ${var.docker_user} --password-stdin",
      "sudo docker-compose pull",
      "sudo docker-compose up -d --build"
    ]
    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file(var.key_path)
      host        = aws_instance.ishkul_ec2.public_ip
    }
  }
}


# ec2 needs to be able to send email and upload data to s3

resource "aws_iam_role" "ec2_role" {
  name = "ec2-role"
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

# Attached policy so that it can send message using ses
resource "aws_iam_role_policy_attachment" "ses_policy_attachment" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = aws_iam_policy.ses_send_policy.arn
}

# attache policy so that it read/write object to s3
resource "aws_iam_role_policy_attachment" "s3_access_attachment" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = aws_iam_policy.s3_access.arn
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "ec2-ses-instance-profile"
  role = aws_iam_role.ec2_role.name
}

output "ec2_public_ip" {
  value = aws_instance.ishkul_ec2.public_ip
}

