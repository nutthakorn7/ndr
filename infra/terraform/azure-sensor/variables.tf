variable "resource_group_name" {
  type = string
}

variable "location" {
  type    = string
  default = "eastus"
}

variable "sensor_image_id" {
  description = "Managed image ID produced by Packer"
  type        = string
}

variable "sensor_name" {
  type    = string
  default = "ndr-azure-sensor"
}

variable "vm_size" {
  type    = string
  default = "Standard_D4s_v5"
}

variable "subnet_id" {
  type = string
}

variable "enable_public_ip" {
  type    = bool
  default = false
}

variable "admin_username" {
  type    = string
  default = "azureuser"
}

variable "admin_password" {
  type      = string
  sensitive = true
}

variable "ssh_cidrs" {
  type    = list(string)
  default = ["0.0.0.0/0"]
}

variable "controller_cidrs" {
  type    = list(string)
  default = ["0.0.0.0/0"]
}

variable "enable_virtual_network_tap" {
  type    = bool
  default = true
}

variable "tags" {
  type    = map(string)
  default = {}
}
