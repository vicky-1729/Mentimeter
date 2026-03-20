terraform {
  required_version = ">= 1.5.0"

  backend "s3" {
    bucket  = "vs-terraform-workspace"
    key     = "mentimeter/prod/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

locals {
  frontend_root = "${path.module}/.."
  static_files = concat(
    tolist(fileset(local.frontend_root, "*.html")),
    tolist(fileset(local.frontend_root, "*.css")),
    tolist(fileset(local.frontend_root, "*.js"))
  )

  content_types = {
    html = "text/html"
    css  = "text/css"
    js   = "application/javascript"
  }
}

resource "aws_s3_bucket" "unified" {
  bucket = var.unified_bucket_name

  tags = {
    Project = var.project_name
    Env     = var.environment
  }
}

resource "aws_s3_bucket_website_configuration" "unified" {
  bucket = aws_s3_bucket.unified.id

  index_document {
    suffix = "login.html"
  }

  error_document {
    key = "login.html"
  }
}

resource "aws_s3_bucket_ownership_controls" "unified" {
  bucket = aws_s3_bucket.unified.id

  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_public_access_block" "unified" {
  bucket = aws_s3_bucket.unified.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "unified" {
  bucket = aws_s3_bucket.unified.id

  depends_on = [aws_s3_bucket_public_access_block.unified]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowPublicRead"
        Effect    = "Allow"
        Principal = "*"
        Action    = ["s3:GetObject"]
        Resource  = "${aws_s3_bucket.unified.arn}/*"
      }
    ]
  })
}

resource "aws_s3_object" "frontend_assets" {
  for_each = toset(local.static_files)

  bucket       = aws_s3_bucket.unified.id
  key          = "frontend/${each.value}"
  source       = "${local.frontend_root}/${each.value}"
  etag         = filemd5("${local.frontend_root}/${each.value}")
  content_type = lookup(local.content_types, replace(regex("\\.[^.]+$", each.value), ".", ""), "application/octet-stream")

  depends_on = [aws_s3_bucket_policy.unified]
}

data "archive_file" "auth_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/../aws/lambda"
  output_path = "${path.module}/build/auth-lambda.zip"
}

data "archive_file" "data_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/../aws/lambda"
  output_path = "${path.module}/build/data-lambda.zip"
}

resource "aws_iam_role" "lambda_exec" {
  name = "${var.project_name}-${var.environment}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda_s3" {
  name = "${var.project_name}-${var.environment}-lambda-s3-policy"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:HeadObject"
        ]
        Resource = [
          "${aws_s3_bucket.unified.arn}/auth/*",
          "${aws_s3_bucket.unified.arn}/data/*"
        ]
      }
    ]
  })
}

resource "aws_lambda_function" "auth" {
  function_name = "${var.project_name}-${var.environment}-auth"
  role          = aws_iam_role.lambda_exec.arn
  handler       = "auth-handler.handler"
  runtime       = "nodejs20.x"
  timeout       = var.lambda_timeout_seconds
  memory_size   = var.lambda_memory_mb

  filename         = data.archive_file.auth_lambda.output_path
  source_code_hash = data.archive_file.auth_lambda.output_base64sha256

  environment {
    variables = {
      AUTH_BUCKET       = aws_s3_bucket.unified.id
      AUTH_BUCKET_PREFIX = "auth/"
      AUTH_TOKEN_SECRET = var.auth_token_secret
    }
  }
}

resource "aws_lambda_function" "data" {
  function_name = "${var.project_name}-${var.environment}-data"
  role          = aws_iam_role.lambda_exec.arn
  handler       = "data-handler.handler"
  runtime       = "nodejs20.x"
  timeout       = var.lambda_timeout_seconds
  memory_size   = var.lambda_memory_mb

  filename         = data.archive_file.data_lambda.output_path
  source_code_hash = data.archive_file.data_lambda.output_base64sha256

  environment {
    variables = {
      DATA_BUCKET       = aws_s3_bucket.unified.id
      DATA_BUCKET_PREFIX = "data/"
      AUTH_TOKEN_SECRET = var.auth_token_secret
    }
  }
}

resource "aws_apigatewayv2_api" "http" {
  name          = "${var.project_name}-${var.environment}-http-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = var.allowed_origins
    allow_methods = ["OPTIONS", "GET", "POST"]
    allow_headers = ["Content-Type", "Authorization"]
  }
}

resource "aws_apigatewayv2_integration" "auth" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.auth.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "data" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.data.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "signup" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "POST /auth/signup"
  target    = "integrations/${aws_apigatewayv2_integration.auth.id}"
}

resource "aws_apigatewayv2_route" "login" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "POST /auth/login"
  target    = "integrations/${aws_apigatewayv2_integration.auth.id}"
}

resource "aws_apigatewayv2_route" "get_data" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "GET /data/me"
  target    = "integrations/${aws_apigatewayv2_integration.data.id}"
}

resource "aws_apigatewayv2_route" "save_data" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "POST /data/me"
  target    = "integrations/${aws_apigatewayv2_integration.data.id}"
}

resource "aws_apigatewayv2_stage" "prod" {
  api_id      = aws_apigatewayv2_api.http.id
  name        = "prod"
  auto_deploy = true
}

resource "aws_lambda_permission" "allow_apigw_auth" {
  statement_id  = "AllowExecutionFromAPIGatewayAuth"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.auth.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_lambda_permission" "allow_apigw_data" {
  statement_id  = "AllowExecutionFromAPIGatewayData"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.data.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}
