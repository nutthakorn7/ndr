resource "aws_opensearch_domain" "ndr_opensearch" {
  domain_name    = "ndr-opensearch"
  engine_version = "OpenSearch_2.11"

  cluster_config {
    instance_type = "t3.small.search"
    instance_count = 1
  }

  ebs_options {
    ebs_enabled = true
    volume_size = 10
  }

  vpc_options {
    subnet_ids         = [aws_subnet.public_1.id]
    security_group_ids = [aws_security_group.ndr_sg.id]
  }

  access_policies = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "es:*"
        Principal = "*"
        Effect = "Allow"
        Resource = "arn:aws:es:us-east-1:*:domain/ndr-opensearch/*"
      }
    ]
  })

  tags = {
    Domain = "ndr-opensearch"
  }
}
