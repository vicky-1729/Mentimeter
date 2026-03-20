# Mentimeter Architecture Flow

## System Overview

```mermaid
graph TB
    User["👤 User Browser"]
    
    subgraph Frontend["Frontend Layer (S3 - us-east-1)"]
        Login["📝 login.html<br/>signup.html"]
        Landing["🏠 navbar.html<br/>enterprise.html<br/>explorefeatures.html"]
        Assets["🎨 CSS & JS<br/>auth-service.js<br/>data-service.js<br/>app-config.js"]
    end
    
    subgraph Static["Static Website Hosting"]
        S3Web["☁️ S3 Website Endpoint<br/>mentimeter-vicky-central<br/>s3-website-us-east-1"]
    end
    
    subgraph API["API Gateway Layer"]
        Gateway["🔌 HTTP API<br/>dau6eefcj6.execute-api<br/>us-east-1"]
        Routes["📍 Routes:<br/>POST /auth/signup<br/>POST /auth/login<br/>GET /data/me<br/>POST /data/me"]
    end
    
    subgraph Lambda["Lambda Functions (Node.js 20.x)"]
        AuthLambda["🔐 auth-handler.mjs<br/>Password Hashing<br/>Token Generation<br/>User Registration"]
        DataLambda["📊 data-handler.mjs<br/>Token Validation<br/>User Data Sync<br/>Data Retrieval"]
    end
    
    subgraph Storage["Data Storage (S3 - us-east-1)"]
        Bucket["💾 Unified S3 Bucket<br/>mentimeter-vicky-central"]
        Frontend_Prefix["📁 frontend/<br/>Static files"]
        Auth_Prefix["🔑 auth/<br/>users/*.json"]
        Data_Prefix["📦 data/<br/>user-data/*.json"]
    end
    
    subgraph Config["Configuration"]
        TF["📋 Terraform IaC<br/>infrastructure as Code<br/>Remote State: S3"]
    end
    
    User -->|Visits| S3Web
    S3Web -->|Serves| Login
    S3Web -->|Serves| Landing
    S3Web -->|Serves| Assets
    
    Assets -->|API Calls| Gateway
    Gateway -->|Routes| Routes
    Routes -->|Signup/Login| AuthLambda
    Routes -->|Get/Save Data| DataLambda
    
    AuthLambda -->|Read/Write| Bucket
    DataLambda -->|Read/Write| Bucket
    
    Bucket -->|Contains| Frontend_Prefix
    Bucket -->|Contains| Auth_Prefix
    Bucket -->|Contains| Data_Prefix
    
    TF -->|Manages| API
    TF -->|Manages| Lambda
    TF -->|Manages| Storage
```

---

## Authentication Flow

```mermaid
sequenceDiagram
    participant User as User Form
    participant Service as auth-service.js
    participant Gateway as API Gateway
    participant Lambda as auth-handler Lambda
    participant S3 as S3 auth/ bucket
    
    User->>Service: POST signup/login credentials
    Service->>Gateway: POST /auth/signup or /auth/login
    Gateway->>Lambda: Invoke handler
    Lambda->>S3: Check if user exists
    S3-->>Lambda: User JSON or 404
    
    alt Signup
        Lambda->>Lambda: Hash password with scrypt
        Lambda->>S3: Store user + salt + hash
        S3-->>Lambda: Confirm write
    else Login
        Lambda->>Lambda: Verify password hash
    end
    
    Lambda->>Lambda: Generate HMAC-SHA256 token
    Lambda-->>Gateway: Return token + user info
    Gateway-->>Service: API response
    Service->>Browser: Store token in localStorage
    Browser-->>User: Redirect to dashboard
```

---

## Data Persistence Flow

```mermaid
sequenceDiagram
    participant User as User Action
    participant Service as data-service.js
    participant Gateway as API Gateway
    participant Lambda as data-handler Lambda
    participant S3 as S3 data/ bucket
    
    User->>Service: Save poll response / user data
    Service->>Gateway: POST /data/me with Bearer token
    Gateway->>Lambda: Invoke with Authorization header
    Lambda->>Lambda: Validate token signature & expiry
    
    alt Token Valid
        Lambda->>Lambda: Extract email from token
        Lambda->>S3: Write JSON to data/{email}.json
        S3-->>Lambda: Confirm write
        Lambda-->>Gateway: 200 OK + success
    else Token Invalid/Expired
        Lambda-->>Gateway: 401 Unauthorized
    end
    
    Gateway-->>Service: Response
    Service-->>User: Confirm save / show error
```

---

## Storage Organization

```
mentimeter-vicky-central-20260321/
├── frontend/              ← Static site files
│   ├── login.html
│   ├── signup.html
│   ├── navbar.html
│   ├── enterprise.html
│   ├── explorefeatures.html
│   ├── *.css files
│   └── *.js files
│
├── auth/                  ← User credentials
│   └── users/
│       ├── user1@email.json
│       └── userN@email.json
│
└── data/                  ← User poll data
    └── user-data/
        ├── user1@email.json
        └── userN@email.json
```

---

## API Endpoints

| Endpoint | Method | Purpose | Authentication |
|----------|--------|---------|-----------------|
| `/auth/signup` | POST | Create new user | None |
| `/auth/login` | POST | Authenticate user | None |
| `/data/me` | GET | Fetch user data | Bearer token required |
| `/data/me` | POST | Save user data | Bearer token required |

---

## Security Features

🔐 **Password Hashing**: Scrypt with random salt (16 bytes)  
🔑 **Token Security**: HMAC-SHA256 signed, 8-hour expiry  
✅ **Token Validation**: Signature verification on every request  
🛡️ **Data Isolation**: Each user's data stored by email key  
⚙️ **IAM Least Privilege**: Lambda only accesses auth/* & data/* prefixes  
📍 **CORS Configured**: Localhost + S3 domain whitelisted  

---

## Terraform Infrastructure

```mermaid
graph LR
    TF["Terraform"]
    
    TF -->|Creates| S3["S3 Unified Bucket"]
    TF -->|Creates| APIGW["API Gateway HTTP API"]
    TF -->|Deploys| LAM1["Lambda: auth-handler"]
    TF -->|Deploys| LAM2["Lambda: data-handler"]
    TF -->|Sets up| IAM["IAM Role & Policy"]
    TF -->|Manages| STATE["Remote State<br/>S3 Backend"]
    
    style TF fill:#bbdefb
    style STATE fill:#fff9c4
```

---

## Region & Endpoints

| Resource | Region | Endpoint |
|----------|--------|----------|
| S3 Bucket | us-east-1 | mentimeter-vicky-central-20260321 |
| Static Site | us-east-1 | mentimeter-vicky-central-20260321.s3-website-us-east-1.amazonaws.com |
| API Gateway | us-east-1 | https://dau6eefcj6.execute-api.us-east-1.amazonaws.com/prod |
| Terraform State | us-east-1 | vs-terraform-workspace (S3 backend) |

---

**Status:** 🟢 Production Ready  
**Created:** March 21, 2026
