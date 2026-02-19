variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "subnet_ids" {
  type        = list(string)
  description = "Single subnet for single-node cluster (cost-optimised)"
}

variable "security_group_ids" {
  type = list(string)
}

variable "aws_region" {
  type = string
}

variable "instance_type" {
  type        = string
  default     = "t3.small.search"
  description = "t3.small.search is the cheapest supported type (~$26/month)"
}
