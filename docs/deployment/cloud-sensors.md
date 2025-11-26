# Cloud Sensor Deployment

This guide complements the on-prem instructions with AWS-specific packaging examples. Similar patterns apply to Azure VTAP or GCP Packet Mirroring.

## 1. Build an AMI with Packer
```bash
cd infra/packer
packer init aws-sensor.pkr.hcl
packer build -var aws_region=us-east-1 -var ami_name=ndr-sensor aws-sensor.pkr.hcl
```
The template installs Docker, copies a placeholder `/opt/ndr/config/sensor.env`, and creates systemd units that run the Zeek and Suricata containers. Customize `sensor.env` during provisioning or via cloud-init/user data.

## 2. Deploy with Terraform (AWS)
Use the sample in `infra/terraform/aws-sensor/` to launch the AMI and configure VPC Traffic Mirroring:
```bash
cd infra/terraform/aws-sensor
terraform init
terraform apply \
  -var sensor_ami_id=ami-XXXXXXXX \
  -var subnet_id=subnet-XXXX \
  -var vpc_id=vpc-XXXX \
  -var source_eni_id=eni-XXXX \
  -var nlb_arn=arn:aws:elasticloadbalancing:... \
  -var controller_cidr_blocks='["10.0.0.0/16"]'
```
The module provisions:
- Security group allowing SSH and controller access
- EC2 sensor instance using your AMI
- Traffic mirror target/filter/session pointing mirrored traffic to the sensor

## 3. Configure Sensor Environment
After the instance boots, update `/opt/ndr/config/sensor.env` with your Kafka/controller details and restart services:
```bash
ssh ubuntu@<sensor-ip>
sudo vi /opt/ndr/config/sensor.env
sudo systemctl restart ndr-zeek ndr-suricata
```
Automate this step using cloud-init, SSM, or your preferred configuration tool.

## Azure & GCP Notes
- **Azure**: Use VTAP to mirror VNets to a NIC attached to the sensor VM. Create an Azure image (Managed Image) with the same Docker/services setup (Packer can build for Azure as well).
- **GCP**: Packet Mirroring mirrors to a target instance; ensure the sensor instance has sufficient NIC throughput.

## Certificates & Controller
Use `/certificates/request` endpoint for TLS enrollment once the sensor is registered. Store the enrollment token securely (SSM Parameter Store or Secrets Manager).

## Monitoring
Sensors report heartbeats to the controller at `CONTROLLER_URL`. Add CloudWatch alarms/metrics around CPU, disk, and network throughput to ensure sensors keep pace with mirrored traffic.
