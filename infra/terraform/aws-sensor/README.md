# AWS Sensor Terraform Example

This module demonstrates how to deploy the Packer-built sensor AMI alongside VPC Traffic Mirroring components.

## Usage
```hcl
module "ndr_sensor" {
  source          = "./infra/terraform/aws-sensor"
  sensor_ami_id   = "ami-1234567890abcdef0"
  subnet_id       = "subnet-abc"
  vpc_id          = "vpc-abc"
  source_eni_id   = "eni-abc"           # ENI whose traffic you want to mirror
  nlb_arn         = "arn:aws:elasticloadbalancing:..."  # Target for traffic mirroring
  controller_cidr_blocks = ["10.0.0.0/16"]
  ssh_cidr_blocks        = ["0.0.0.0/0"]
  default_tags = {
    Environment = "lab"
  }
}
```

Consult AWS docs for creating ENIs, NLBs, and IAM roles. This module intentionally leaves those out to keep the example minimal.
