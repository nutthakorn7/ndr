# GCP NDR Sensor Deployment

Terraform to launch the Packer-built sensor image in GCP and optionally enable VPC Packet Mirroring so mirrored sources stream packets to the collector.

## Prerequisites

- Image created with `infra/packer/gcp-sensor.pkr.hcl` (family or self link).
- Existing VPC + subnetwork for the collector instance.
- Appropriate IAM permissions (compute admin + packet mirroring).

## Inputs

| Variable | Description |
| --- | --- |
| `project_id` | GCP project to deploy into |
| `sensor_image` | Image self link or family (e.g. `family/ndr-sensor-gcp`) |
| `subnetwork` | Subnetwork self link |
| `vpc_network` | Network self link whose traffic will be mirrored |
| `mirrored_subnetworks` / `mirrored_instances` | Sources to mirror |
| `service_account_email` | Optional SA for sensor workloads |

## Usage

```bash
cd infra/terraform/gcp-sensor
terraform init
terraform apply \
  -var "project_id=my-project" \
  -var "sensor_image=family/ndr-sensor-gcp" \
  -var "subnetwork=projects/my-project/regions/us-central1/subnetworks/sensor" \
  -var "vpc_network=projects/my-project/global/networks/production" \
  -var 'mirrored_subnetworks=["projects/my-project/regions/us-central1/subnetworks/app"]'
```

The output `packet_mirroring_id` confirms Packet Mirroring is active. Adjust the filter block or mirrored resources to scope flows per tenant/application.
