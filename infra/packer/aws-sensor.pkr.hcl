variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "ami_name" {
  type    = string
  default = "ndr-sensor-ami"
}

variable "source_ami_filter" {
  type = map(string)
  default = {
    owners      = "099720109477" # Canonical
    name        = "ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"
    virtualization_type = "hvm"
  }
}

source "amazon-ebs" "sensor" {
  region                  = var.aws_region
  ami_name                = "${var.ami_name}-${formatdate("YYYYMMDDhhmmss", timestamp())}"
  instance_type           = "t3.large"
  ssh_username            = "ubuntu"
  force_deregister        = true
  force_delete_snapshot   = true

  source_ami_filter {
    filters = {
      name                = var.source_ami_filter.name
      virtualization-type = var.source_ami_filter.virtualization_type
      root-device-type    = "ebs"
    }
    owners      = [var.source_ami_filter.owners]
    most_recent = true
  }

  launch_block_device_mappings {
    device_name           = "/dev/sda1"
    volume_size           = 40
    volume_type           = "gp3"
    delete_on_termination = true
  }
}

build {
  name    = "ndr-sensor"
  sources = ["source.amazon-ebs.sensor"]

  provisioner "shell" {
    inline = [
      "sudo apt-get update",
      "sudo apt-get install -y docker.io python3 python3-pip curl jq",
      "sudo systemctl enable docker"
    ]
  }

  provisioner "shell" {
    inline = [
      "sudo mkdir -p /opt/ndr /opt/ndr/config /opt/ndr/pcap",
      "sudo chown ubuntu:ubuntu /opt/ndr -R"
    ]
  }

  provisioner "shell" {
    inline = [
      "cat <<'SCRIPT' | sudo tee /opt/ndr/config/sensor.env >/dev/null",
      "SENSOR_ID=ami-placeholder",
      "TENANT_ID=default",
      "KAFKA_BROKERS=kafka.example.com:9092",
      "KAFKA_TOPIC=zeek-logs",
      "CONTROLLER_URL=https://controller.example.com",
      "SENSOR_COMMAND_SECRET=sensor-secret",
      "PCAP_RING_ENABLED=true",
      "PCAP_EXPORT_DIR=/opt/ndr/pcap",
      "SCRIPT"
    ]
  }

  provisioner "shell" {
    inline = [
      "cat <<'UNIT' | sudo tee /etc/systemd/system/ndr-zeek.service >/dev/null",
      "[Unit]",
      "Description=NDR Zeek Sensor",
      "After=docker.service",
      "Requires=docker.service",
      "[Service]",
      "EnvironmentFile=/opt/ndr/config/sensor.env",
      "ExecStart=/usr/bin/docker run --rm --network host --env-file /opt/ndr/config/sensor.env -v /opt/ndr/pcap:/pcap nutthakorn7/zeek-sensor:latest",
      "Restart=always",
      "[Install]",
      "WantedBy=multi-user.target",
      "UNIT"
    ]
  }

  provisioner "shell" {
    inline = [
      "cat <<'UNIT' | sudo tee /etc/systemd/system/ndr-suricata.service >/dev/null",
      "[Unit]",
      "Description=NDR Suricata Sensor",
      "After=docker.service",
      "Requires=docker.service",
      "[Service]",
      "EnvironmentFile=/opt/ndr/config/sensor.env",
      "ExecStart=/usr/bin/docker run --rm --network host --env-file /opt/ndr/config/sensor.env -v /opt/ndr/pcap:/pcap nutthakorn7/suricata-sensor:latest",
      "Restart=always",
      "[Install]",
      "WantedBy=multi-user.target",
      "UNIT"
    ]
  }

  provisioner "shell" {
    inline = [
      "sudo systemctl daemon-reload",
      "sudo systemctl enable ndr-zeek.service",
      "sudo systemctl enable ndr-suricata.service"
    ]
  }
}
