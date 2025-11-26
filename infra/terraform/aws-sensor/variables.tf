variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "sensor_ami_id" {
  description = "AMI ID built via Packer (aws-sensor.pkr.hcl)"
  type        = string
}

variable "instance_type" {
  type    = string
  default = "c6i.large"
}

variable "subnet_id" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "assign_public_ip" {
  type    = bool
  default = false
}

variable "instance_profile" {
  type    = string
  default = null
}

variable "sensor_name" {
  type    = string
  default = "ndr-sensor"
}

variable "ssh_cidr_blocks" {
  type    = list(string)
  default = ["0.0.0.0/0"]
}

variable "controller_cidr_blocks" {
  type    = list(string)
  default = ["0.0.0.0/0"]
}

variable "default_tags" {
  type    = map(string)
  default = {}
}

variable "nlb_arn" {
  description = "Optional NLB ARN acting as traffic mirror target"
  type        = string
  default     = null
}

variable "source_eni_id" {
  description = "ENI ID whose traffic will be mirrored"
  type        = string
  default     = null
}
