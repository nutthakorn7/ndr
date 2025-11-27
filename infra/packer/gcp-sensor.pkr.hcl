variable "gcp_project_id" {
  type    = string
  default = env("GOOGLE_PROJECT")
}

variable "gcp_zone" {
  type    = string
  default = "us-central1-a"
}

variable "image_name" {
  type    = string
  default = "ndr-sensor-gcp"
}

source "googlecompute" "sensor" {
  project_id      = var.gcp_project_id
  zone            = var.gcp_zone
  machine_type    = "n2-standard-4"
  source_image_family = "ubuntu-2204-lts"
  image_name      = "${var.image_name}-${formatdate("YYYYMMDDhhmmss", timestamp())}"
  image_family    = var.image_name
  disk_size       = 50
  disk_type       = "pd-ssd"
  network         = "default"
  subnetwork      = "default"
  tags            = ["ndr-sensor"]
}

build {
  name    = "ndr-gcp-sensor"
  sources = ["source.googlecompute.sensor"]

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
      "sudo chown $(whoami):$(whoami) /opt/ndr -R"
    ]
  }

  provisioner "shell" {
    inline = [
      "cat <<'SCRIPT' | sudo tee /opt/ndr/config/sensor.env >/dev/null",
      "SENSOR_ID=gcp-placeholder",
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
