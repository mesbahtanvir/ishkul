resource "aws_instance" "ishkul_ec2" {
  ami             = "ami-05f8c2ee58e71f8e6" # Replace with a valid AMI ID
  instance_type   = "t4g.small"
  key_name        = "ishkul"
  
  subnet_id       = aws_subnet.public_1.id
  vpc_security_group_ids = [aws_security_group.ec2_sg.id]

  provisioner "file" {
    source      = "./docker-compose.yml"
    destination = "/home/ubuntu/docker-compose.yml"
    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file("ishkul.pem")
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
      "sudo docker-compose up -d --build"
    ]
    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file("ishkul.pem")
      host        = aws_instance.ishkul_ec2.public_ip
    }
  }
}

output "ec2_public_ip" {
  value = aws_instance.ishkul_ec2.public_ip
}
