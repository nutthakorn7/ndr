resource "aws_db_subnet_group" "ndr_db_subnet_group" {
  name       = "ndr-db-subnet-group"
  subnet_ids = [aws_subnet.public_1.id, aws_subnet.public_2.id]

  tags = {
    Name = "ndr-db-subnet-group"
  }
}

resource "aws_db_instance" "postgres" {
  identifier             = "ndr-postgres"
  allocated_storage      = 20
  db_name                = "security_analytics"
  engine                 = "postgres"
  engine_version         = "15.4"
  instance_class         = "db.t3.micro"
  username               = "postgres"
  password               = "postgres_password_change_me" # Use Secrets Manager in production
  parameter_group_name   = "default.postgres15"
  skip_final_snapshot    = true
  publicly_accessible    = false # Internal only
  vpc_security_group_ids = [aws_security_group.ndr_sg.id]
  db_subnet_group_name   = aws_db_subnet_group.ndr_db_subnet_group.name

  tags = {
    Name = "ndr-postgres"
  }
}
