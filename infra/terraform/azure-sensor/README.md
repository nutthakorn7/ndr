# Azure NDR Sensor Deployment

Deploys a Zeek/Suricata NDR sensor VM from the Packer managed image plus an optional Virtual Network TAP target so mirrored interfaces can stream traffic to it.

## Prerequisites

- Managed image built via `infra/packer/azure-sensor.pkr.hcl` and published in the same subscription/resource group.
- Existing virtual network + subnet for the sensor NIC.
- Service principal or CLI login able to provision compute/network resources.

## Variables

Key inputs (see `variables.tf` for the full list):

| Name | Description |
| ---- | ----------- |
| `resource_group_name` | Resource group for the VM, NIC, NSG, public IP (if enabled) |
| `sensor_image_id` | Managed image ID output from Packer |
| `subnet_id` | Subnet where the sensor NIC lives |
| `admin_password` | Local admin password (strong/unique) |
| `enable_public_ip` | Attach a public IP for SSH/bootstrap (default `false`) |
| `enable_virtual_network_tap` | Create a Virtual Network TAP resource pointing at the sensor NIC |

## Usage

```bash
cd infra/terraform/azure-sensor
terraform init
terraform apply \
  -var "resource_group_name=ndr-prod-rg" \
  -var "sensor_image_id=/subscriptions/0000/resourceGroups/ndr-images/providers/Microsoft.Compute/images/ndr-sensor-azure-20241102" \
  -var "subnet_id=/subscriptions/0000/resourceGroups/ndr-net/providers/Microsoft.Network/virtualNetworks/ndr-vnet/subnets/sensor" \
  -var "admin_password=$(openssl rand -base64 20)" \
  -var "enable_public_ip=true"
```

The module outputs the VM ID, NIC ID, and optional Virtual Network TAP ID. Attach mirrored workloads manually:

```bash
# Example: enable mirroring on an existing NIC
az network nic vtap-config create \
  --name mirrored-nic-tap \
  --nic my-vm-nic \
  --tap ${virtual_network_tap_id}
```

This mirrors packets to the sensor collector without needing extra appliances.
