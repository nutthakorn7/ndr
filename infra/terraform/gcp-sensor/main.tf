terraform {
  required_version = ">= 1.3.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

resource "google_compute_address" "sensor" {
  name         = "${var.sensor_name}-ip"
  address_type = "EXTERNAL"
  region       = var.region
  count        = var.assign_public_ip ? 1 : 0
}

resource "google_compute_instance" "sensor" {
  name         = var.sensor_name
  machine_type = var.machine_type
  zone         = var.zone
  tags         = concat(["ndr-sensor"], var.instance_tags)

  boot_disk {
    initialize_params {
      image = var.sensor_image
      size  = 50
      type  = "pd-ssd"
    }
  }

  network_interface {
    subnetwork         = var.subnetwork
    subnetwork_project = var.project_id
    dynamic "access_config" {
      for_each = var.assign_public_ip ? [1] : []
      content {
        nat_ip = length(google_compute_address.sensor) > 0 ? google_compute_address.sensor[0].address : null
      }
    }
  }

  metadata = {
    enable-oslogin = "TRUE"
  }

  metadata_startup_script = var.startup_script

  service_account {
    email  = var.service_account_email
    scopes = ["https://www.googleapis.com/auth/cloud-platform"]
  }
}

resource "google_compute_packet_mirroring" "sensor" {
  count   = var.enable_packet_mirroring ? 1 : 0
  name    = "${var.sensor_name}-mirroring"
  project = var.project_id
  region  = var.region

  network {
    url = var.vpc_network
  }

  mirrored_resources {
    subnetworks = var.mirrored_subnetworks
    instances   = var.mirrored_instances
  }

  collector_ilb {
    url = google_compute_instance.sensor.self_link
  }

  filter {
    cidr_ranges = ["0.0.0.0/0"]
    ip_protocols = ["TCP", "UDP", "ICMP", "GRE"]
  }

  description = "Mirror VPC traffic to the NDR sensor"
}

output "sensor_instance_self_link" {
  value = google_compute_instance.sensor.self_link
}

output "packet_mirroring_id" {
  value = try(google_compute_packet_mirroring.sensor[0].id, null)
}
