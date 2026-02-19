output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnets" {
  value = aws_subnet.public[*].id
}

output "private_subnets" {
  value = aws_subnet.private[*].id
}

output "vpc_cidr_block" {
  value = aws_vpc.main.cidr_block
}

output "nat_gateway_ip" {
  value       = aws_eip.nat.public_ip
  description = "Public IP of NAT Gateway — Lambda egress IP for SG allow-lists"
}
