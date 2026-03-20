variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name prefix"
  type        = string
  default     = "mentimeter-clone"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "unified_bucket_name" {
  description = "S3 bucket name for all resources (frontend, auth, data)"
  type        = string
}

variable "frontend_index_document" {
  description = "S3 website index document"
  type        = string
  default     = "login.html"
}

variable "frontend_error_document" {
  description = "S3 website error document"
  type        = string
  default     = "login.html"
}

variable "allowed_origins" {
  description = "Allowed CORS origins for API Gateway"
  type        = list(string)
}

variable "auth_token_secret" {
  description = "Token signing secret used by both lambdas"
  type        = string
  sensitive   = true
}

variable "lambda_timeout_seconds" {
  description = "Lambda timeout in seconds"
  type        = number
  default     = 15
}

variable "lambda_memory_mb" {
  description = "Lambda memory in MB"
  type        = number
  default     = 256
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID for DNS"
  type        = string
}

variable "domain_name" {
  description = "Custom domain name (mentimeter.vsvicky.site)"
  type        = string
}
