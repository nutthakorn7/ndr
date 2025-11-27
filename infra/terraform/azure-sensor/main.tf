terraform {
  required_version = ">= 1.3.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.100"
    }
  }
}

provider "azurerm" {
  features {}
}

resource "azurerm_network_interface" "sensor" {
  name                = "${var.sensor_name}-nic"
  resource_group_name = var.resource_group_name
  location            = var.location

  ip_configuration {
    name                          = "sensor-ipcfg"
    subnet_id                     = var.subnet_id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = var.enable_public_ip ? azurerm_public_ip.sensor[0].id : null
  }

  tags = var.tags
}

resource "azurerm_public_ip" "sensor" {
  count               = var.enable_public_ip ? 1 : 0
  name                = "${var.sensor_name}-pip"
  resource_group_name = var.resource_group_name
  location            = var.location
  allocation_method   = "Static"
  sku                 = "Standard"

  tags = var.tags
}

resource "azurerm_network_security_group" "sensor" {
  name                = "${var.sensor_name}-nsg"
  location            = var.location
  resource_group_name = var.resource_group_name

  security_rule {
    name                       = "ssh"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefixes    = var.ssh_cidrs
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "controller"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "8084"
    source_address_prefixes    = var.controller_cidrs
    destination_address_prefix = "*"
  }

  tags = var.tags
}

resource "azurerm_network_interface_security_group_association" "sensor" {
  network_interface_id      = azurerm_network_interface.sensor.id
  network_security_group_id = azurerm_network_security_group.sensor.id
}

resource "azurerm_linux_virtual_machine" "sensor" {
  name                = var.sensor_name
  location            = var.location
  resource_group_name = var.resource_group_name
  size                = var.vm_size
  admin_username      = var.admin_username
  network_interface_ids = [azurerm_network_interface.sensor.id]
  disable_password_authentication = false
  admin_password      = var.admin_password

  source_image_id = var.sensor_image_id

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
  }

  identity {
    type         = "SystemAssigned"
  }

  tags = var.tags
}

resource "azurerm_virtual_network_tap" "sensor" {
  count                         = var.enable_virtual_network_tap ? 1 : 0
  name                          = "${var.sensor_name}-tap"
  location                      = var.location
  resource_group_name           = var.resource_group_name
  destination_network_interface_id = azurerm_network_interface.sensor.id
  destination_port              = 1976

  tags = var.tags
}

# Outputs to wire mirrored sources manually or via automation
output "sensor_vm_id" {
  value = azurerm_linux_virtual_machine.sensor.id
}

output "sensor_nic_id" {
  value = azurerm_network_interface.sensor.id
}

output "virtual_network_tap_id" {
  value       = try(azurerm_virtual_network_tap.sensor[0].id, null)
  description = "Attach this tap to mirrored NICs via az network nic vtap-config commands"
}
