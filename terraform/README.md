# Terraform Infrastructure

This folder provisions the full AWS stack for this project using Terraform:

- S3 static website bucket (frontend)
- S3 auth bucket (credentials records)
- S3 data bucket (user data)
- Lambda functions (`auth-handler.mjs`, `data-handler.mjs`)
- API Gateway HTTP API routes
- IAM role and policies
- Static file upload to frontend bucket

## State Backend

Terraform state is configured to use S3 backend:

- Bucket: `vs-terraform-workspace`
- Region: `us-east-1`
- Key: `mentimeter/prod/terraform.tfstate`

## Prerequisites

1. Terraform >= 1.5
2. AWS credentials configured (`aws configure`)
3. Install lambda dependencies:

```bash
cd ../aws/lambda
npm install
```

## Deploy

```bash
cd ../../terraform
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars with your bucket names + allowed origins + secret
terraform init
terraform plan
terraform apply
```

After apply, copy `api_base_url` output and set it in `../app-config.js`:

```js
window.APP_CONFIG = {
  API_BASE_URL: "<api_base_url_from_terraform_output>"
};
```

## Re-deploy after code changes

- Frontend files (`.html/.css/.js`) are uploaded by Terraform on `apply`.
- Lambda code is re-zipped and updated on `apply`.

Run:

```bash
terraform apply
```
