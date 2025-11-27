variable "project_id" {
  type = string
}

variable "region" {
  type    = string
  default = "us-central1"
}

variable "zone" {
  type    = string
  default = "us-central1-a"
}

variable "sensor_image" {
  description = "Image (family/self_link) created by Packer"
  type        = string
}

variable "sensor_name" {
  type    = string
  default = "ndr-gcp-sensor"
}

variable "machine_type" {
  type    = string
  default = "n2-standard-4"
}

variable "subnetwork" {
  type = string
}

variable "assign_public_ip" {
  type    = bool
  default = false
}

variable "service_account_email" {
  type    = string
  default = null
}

variable "startup_script" {
  description = "Optional startup script override"
  type        = string
  default     = ""
}

variable "instance_tags" {
  type    = list(string)
  default = []
}

variable "enable_packet_mirroring" {
  type    = bool
  default = true
}

variable "vpc_network" {
  description = "Self link of the VPC network"
  type        = string
}

variable "mirrored_subnetworks" {
  description = "List of subnetwork self links to mirror"
  type        = list(string)
  default     = []
}

variable "mirrored_instances" {
  description = "List of instance self links to mirror"
  type        = list(string)
  default     = []
}
