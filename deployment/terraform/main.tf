terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket         = "tagmytaxi-terraform-state"
    key            = "platform/terraform.tfstate"
    region         = "me-south-1"
    encrypt        = true
    dynamodb_table = "tagmytaxi-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region
}

# ── VPC ────────────────────────────────────────────────────────────────────────
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "tagmytaxi-${var.environment}"
  cidr = "10.0.0.0/16"

  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway   = true
  single_nat_gateway   = var.environment != "production"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = local.common_tags
}

# ── RDS PostgreSQL ─────────────────────────────────────────────────────────────
resource "aws_db_instance" "postgres" {
  identifier        = "tagmytaxi-${var.environment}"
  engine            = "postgres"
  engine_version    = "16"
  instance_class    = var.db_instance_class
  allocated_storage = 100
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = "tagmytaxi"
  username = "tagmytaxi"
  password = var.db_password

  multi_az               = var.environment == "production"
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  backup_retention_period = 14
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  deletion_protection = var.environment == "production"
  skip_final_snapshot = var.environment != "production"

  tags = local.common_tags
}

resource "aws_db_subnet_group" "main" {
  name       = "tagmytaxi-${var.environment}"
  subnet_ids = module.vpc.private_subnets
  tags       = local.common_tags
}

# ── ElastiCache Redis ──────────────────────────────────────────────────────────
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "tagmytaxi-${var.environment}"
  description          = "TagMyTaxi Redis cluster for ${var.environment}"
  node_type            = var.redis_node_type
  num_cache_clusters   = var.environment == "production" ? 3 : 1
  engine_version       = "7.2"
  port                 = 6379

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.redis_auth_token

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  tags = local.common_tags
}

resource "aws_elasticache_subnet_group" "main" {
  name       = "tagmytaxi-${var.environment}"
  subnet_ids = module.vpc.private_subnets
}

# ── ECS Fargate Cluster ────────────────────────────────────────────────────────
resource "aws_ecs_cluster" "main" {
  name = "tagmytaxi-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = local.common_tags
}

# ── ECR Repositories ───────────────────────────────────────────────────────────
resource "aws_ecr_repository" "api" {
  name                 = "tagmytaxi/api"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
  }

  tags = local.common_tags
}

resource "aws_ecr_repository" "web_app" {
  name                 = "tagmytaxi/web-app"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = local.common_tags
}

# ── Security Groups ────────────────────────────────────────────────────────────
resource "aws_security_group" "rds" {
  name_prefix = "tagmytaxi-rds-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  tags = merge(local.common_tags, { Name = "tagmytaxi-rds-${var.environment}" })
}

resource "aws_security_group" "redis" {
  name_prefix = "tagmytaxi-redis-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  tags = merge(local.common_tags, { Name = "tagmytaxi-redis-${var.environment}" })
}

resource "aws_security_group" "ecs_tasks" {
  name_prefix = "tagmytaxi-ecs-"
  vpc_id      = module.vpc.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, { Name = "tagmytaxi-ecs-${var.environment}" })
}

locals {
  common_tags = {
    Project     = "tagmytaxi"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}
