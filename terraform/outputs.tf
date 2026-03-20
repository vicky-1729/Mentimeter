output "unified_bucket_name" {
  value       = aws_s3_bucket.unified.id
  description = "Unified S3 bucket for frontend, auth, and data"
}

output "frontend_website_url" {
  value       = aws_s3_bucket_website_configuration.unified.website_endpoint
  description = "Public S3 website endpoint"
}

output "api_base_url" {
  value       = aws_apigatewayv2_stage.prod.invoke_url
  description = "API base URL for frontend app-config.js"
}
