variable "azure_subscription_id" {
  type    = string
  default = env("AZURE_SUBSCRIPTION_ID")
}

variable "azure_client_id" {
  type    = string
  default = env("AZURE_CLIENT_ID")
}

variable "azure_client_secret" {
  type    = string
  sensitive = true
  default = env("AZURE_CLIENT_SECRET")
}

variable "azure_tenant_id" {
  type    = string
  default = env("AZURE_TENANT_ID")
}

variable "azure_location" {
  type    = string
  default = "eastus"
}

variable "managed_image_name" {
  type    = string
  default = "ndr-sensor-azure"
}

variable "managed_image_resource_group" {
  type    = string
  default = "ndr-images"
}

source "azure-arm" "sensor" {
  subscription_id                   = var.azure_subscription_id
  client_id                         = var.azure_client_id
  client_secret                     = var.azure_client_secret
  tenant_id                         = var.azure_tenant_id
  location                          = var.azure_location
  vm_size                           = "Standard_D4s_v5"
  managed_image_name                = "${var.managed_image_name}-${formatdate("YYYYMMDDhhmmss", timestamp())}"
  managed_image_resource_group_name = var.managed_image_resource_group
  os_type                           = "Linux"
  image_publisher                   = "Canonical"
  image_offer                       = "0001-com-ubuntu-server-jammy"
  image_sku                         = "22_04-lts"
  azure_tags = {
    Application = "ndr"
    Role        = "sensor"
  }
}

build {
  name    = "ndr-azure-sensor"
  sources = ["source.azure-arm.sensor"]

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
      "sudo chown azureuser:azureuser /opt/ndr -R"
    ]
  }

  provisioner "shell" {
    inline = [
      "cat <<'SCRIPT' | sudo tee /opt/ndr/config/sensor.env >/dev/null",
      "SENSOR_ID=azure-placeholder",
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
