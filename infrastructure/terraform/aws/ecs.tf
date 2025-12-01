resource "aws_ecs_cluster" "ndr_cluster" {
  name = "ndr-cluster"
}

# IAM Role for Task Execution
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "ndr-ecs-task-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# UI Service
resource "aws_ecs_task_definition" "ui" {
  family                   = "ndr-ui"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn

  container_definitions = jsonencode([
    {
      name  = "ui"
      image = "ndr-ui:latest" # Replace with ECR URI in real deployment
      portMappings = [
        {
          containerPort = 80
          hostPort      = 80
        }
      ]
    }
  ])
}

resource "aws_ecs_service" "ui" {
  name            = "ndr-ui-service"
  cluster         = aws_ecs_cluster.ndr_cluster.id
  task_definition = aws_ecs_task_definition.ui.arn
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [aws_subnet.public_1.id, aws_subnet.public_2.id]
    security_groups  = [aws_security_group.ndr_sg.id]
    assign_public_ip = true
  }
  desired_count = 1
}

# Dashboard API Service
resource "aws_ecs_task_definition" "dashboard_api" {
  family                   = "ndr-dashboard-api"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn

  container_definitions = jsonencode([
    {
      name  = "dashboard-api"
      image = "ndr-dashboard-api:latest"
      portMappings = [
        {
          containerPort = 8081
          hostPort      = 8081
        }
      ]
      environment = [
        { name = "PORT", value = "8081" },
        # In real deployment, these URLs would be Service Discovery endpoints
        { name = "DATABASE_URL", value = "postgresql://postgres:postgres@postgres:5432/security_analytics" } 
      ]
    }
  ])
}

resource "aws_ecs_service" "dashboard_api" {
  name            = "ndr-dashboard-api-service"
  cluster         = aws_ecs_cluster.ndr_cluster.id
  task_definition = aws_ecs_task_definition.dashboard_api.arn
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [aws_subnet.public_1.id, aws_subnet.public_2.id]
    security_groups  = [aws_security_group.ndr_sg.id]
    assign_public_ip = true
  }
  desired_count = 1
}

# AI Service
resource "aws_ecs_task_definition" "ai_service" {
  family                   = "ndr-ai-service"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512" # More CPU for ML
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn

  container_definitions = jsonencode([
    {
      name  = "ai-service"
      image = "ndr-ai-service:latest"
      portMappings = [
        {
          containerPort = 8090
          hostPort      = 8090
        }
      ]
    }
  ])
}

resource "aws_ecs_service" "ai_service" {
  name            = "ndr-ai-service"
  cluster         = aws_ecs_cluster.ndr_cluster.id
  task_definition = aws_ecs_task_definition.ai_service.arn
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [aws_subnet.public_1.id, aws_subnet.public_2.id]
    security_groups  = [aws_security_group.ndr_sg.id]
    assign_public_ip = true
  }
  desired_count = 1
}

# Rust Sensor (Fargate for prototype simplicity)
resource "aws_ecs_task_definition" "rust_sensor" {
  family                   = "ndr-rust-sensor"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn

  container_definitions = jsonencode([
    {
      name  = "rust-sensor"
      image = "ndr-rust-sensor:latest"
      environment = [
        { name = "RUST_LOG", value = "info" }
      ]
    }
  ])
}

resource "aws_ecs_service" "rust_sensor" {
  name            = "ndr-rust-sensor"
  cluster         = aws_ecs_cluster.ndr_cluster.id
  task_definition = aws_ecs_task_definition.rust_sensor.arn
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [aws_subnet.public_1.id, aws_subnet.public_2.id]
    security_groups  = [aws_security_group.ndr_sg.id]
    assign_public_ip = true
  }
  desired_count = 1
}
