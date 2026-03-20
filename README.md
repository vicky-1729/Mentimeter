
# Mentimeter Static Clone (Professional AWS Setup)

This project is now prepared for a production-style architecture:

- Static frontend hosted on Amazon S3
- User signup/login handled by API Gateway + Lambda
- Credentials and user data stored in Amazon S3 objects

## Important Security Note

Saving credentials directly from browser to S3 is not secure.  
The safe pattern is:

1. Frontend on S3 (static hosting)
2. API Gateway endpoint
3. Lambda validates logic and hashes passwords
4. Lambda reads/writes S3

That is exactly what this repo now supports.

## Current Features

- Signup page integrated with backend API (`POST /auth/signup`)
- Login page integrated with backend API (`POST /auth/login`)
- Token-based session in browser localStorage
- User data endpoint integration (`GET /data/me`, `POST /data/me`)
- Last-visit sync from `navbar.html` to S3-backed data store

## Project Structure

- Frontend
	- `login.html`, `login.js`
	- `signup.html`, `signup.js`
	- `navbar.html`, `navbar.js`
	- `app-config.js` (API base URL)
	- `auth-service.js`, `data-service.js`
- Backend (AWS Lambda)
	- `aws/lambda/auth-handler.mjs`
	- `aws/lambda/data-handler.mjs`
	- `aws/lambda/package.json`

## Terraform Deployment (Recommended)

All AWS infrastructure is now managed from `terraform/`.

It provisions:

- S3 frontend bucket with static website hosting
- S3 auth and data buckets
- IAM role/policies
- Lambda functions for auth/data
- HTTP API Gateway routes + CORS
- Frontend static file upload (`.html`, `.css`, `.js`) to S3 bucket

### Deploy using Terraform

```bash
cd aws/lambda
npm install

cd ../../terraform
cp terraform.tfvars.example terraform.tfvars
# update bucket names, allowed_origins, auth_token_secret
terraform init
terraform plan
terraform apply
```

After apply, set `api_base_url` output value in `app-config.js`.

For detailed infra docs, see `terraform/README.md`.

## Local Development (Quick Check)

You can run static pages locally for UI checks, but auth/data API calls require deployed AWS endpoints.

## Tech Stack

- HTML
- CSS
- JavaScript
- AWS S3
- AWS Lambda
- API Gateway







