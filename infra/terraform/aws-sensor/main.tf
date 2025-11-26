terraform {
  required_version = ">= 1.3.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

resource "aws_security_group" "sensor" {
  name        = "ndr-sensor-sg"
  description = "Allow controller + Kafka + SSH"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.ssh_cidr_blocks
  }

  ingress {
    from_port   = 8084
    to_port     = 8084
    protocol    = "tcp"
    cidr_blocks = var.controller_cidr_blocks
    description = "Sensor-controller"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "sensor" {
  ami                    = var.sensor_ami_id
  instance_type          = var.instance_type
  subnet_id              = var.subnet_id
  associate_public_ip_address = var.assign_public_ip
  vpc_security_group_ids = [aws_security_group.sensor.id]
  iam_instance_profile   = var.instance_profile

  tags = merge(var.default_tags, {
    Name = var.sensor_name
  })
}

# Example VPC Traffic Mirroring plumbing (optional)
resource "aws_ec2_traffic_mirror_target" "sensor" {
  network_load_balancer_arn = var.nlb_arn
  description               = "NDR sensor target"
}

resource "aws_ec2_traffic_mirror_filter" "default" {
  description = "Allow all traffic"

  network_services = ["amazon-dns"]

  rule {
    rule_number = 1
    action      = "accept"
    destination_cidr_block = "0.0.0.0/0"
    source_cidr_block      = "0.0.0.0/0"
    protocol               = -1
  }
}

resource "aws_ec2_traffic_mirror_session" "sensor" {
  network_interface_id = var.source_eni_id
  traffic_mirror_target_id = aws_ec2_traffic_mirror_target.sensor.id
  traffic_mirror_filter_id = aws_ec2_traffic_mirror_filter.default.id
  session_number = 1
  description    = "Mirror to NDR sensor"
}

output "sensor_instance_id" {
  value = aws_instance.sensor.id
}
