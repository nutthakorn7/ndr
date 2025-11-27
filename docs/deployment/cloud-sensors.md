# Cloud Sensor Packaging (AWS / Azure / GCP)

Sprint 1 now includes turnkey assets for each major cloud so customers can deploy Zeek/Suricata collectors right next to their SPAN/TAP sources.

## 1. Build Images with Packer

| Cloud | Template | Notes |
| ----- | -------- | ----- |
| AWS | `infra/packer/aws-sensor.pkr.hcl` | Builds an AMI with Docker, Zeek + Suricata unit files |
| Azure | `infra/packer/azure-sensor.pkr.hcl` | Produces a managed image in the subscription/resource group you specify |
| GCP | `infra/packer/gcp-sensor.pkr.hcl` | Creates an image family ready for Packet Mirroring collectors |

Example AWS build:

```bash
cd infra/packer
packer init aws-sensor.pkr.hcl
AWS_PROFILE=prod packer build -var "aws_region=us-east-1" aws-sensor.pkr.hcl
```

Azure/GCP builds rely on the usual environment variables (`AZURE_SUBSCRIPTION_ID`, `AZURE_CLIENT_ID`, etc. / `GOOGLE_PROJECT`, `GOOGLE_APPLICATION_CREDENTIALS`). Each template bakes the sensor-agent, Zeek, Suricata, and base config to `/opt/ndr` with services enabled at boot.

## 2. Provision Collectors with Terraform

- **AWS** – `infra/terraform/aws-sensor` launches the AMI inside a subnet + security group and optionally wires AWS VPC Traffic Mirroring to the instance. Provide the Packer AMI ID plus NLB/ENI references for mirroring.
- **Azure** – `infra/terraform/azure-sensor` stands up a VM from the managed image, NIC/NSG/public IP (optional), and an Azure Virtual Network TAP target so mirrored NICs can feed the collector.
- **GCP** – `infra/terraform/gcp-sensor` creates a Compute Engine instance from the image family and enables VPC Packet Mirroring targeting the sensor to capture flows from specified subnets/VMs.

Each module ships with a README detailing required variables and sample `terraform apply` invocations.

## 3. Wire Traffic Sources

- **AWS** – Attach the provided `aws_ec2_traffic_mirror_session` to ENIs from workloads to mirror, or supply your own plumbing if you already operate Traffic Mirroring.
- **Azure** – Use `az network nic vtap-config create` (or Terraform in your VNet module) with the `virtual_network_tap_id` output to stream packets from regulator NICs.
- **GCP** – Adjust `mirrored_subnetworks` / `mirrored_instances` in the module to scope which traffic hits the sensor.

## 4. Configure Controller Enrollment

After deployment, SSH or Session Manager into each sensor host to set real controller endpoints/credentials under `/opt/ndr/config/sensor.env`, then restart the `ndr-zeek` and `ndr-suricata` services:

```bash
sudo systemctl restart ndr-zeek.service ndr-suricata.service
```

Once the controller heartbeat shows green you can request PCAPs directly from the dashboard.
