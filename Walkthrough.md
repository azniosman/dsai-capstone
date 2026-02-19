# Deployment Guide: Serverless Stack

This document provides detailed steps to deploy the SkillBridge Serverless Stack (Capstone Demo) using Terraform and AWS.

## Prerequisites

Ensure you have the following installed locally:

- **AWS CLI**: Configured with your credentials (`aws configure`).
- **Terraform** (>= 1.6.0): For infrastructure provisioning.
- **Python 3.11**: For building the backend Lambda package.
- **Node.js 20+**: For building the frontend.
- **Zip**: For packaging the Lambda function.

---

## 1. Backend Build & Deployment

### Step 1.1: Build Lambda Deployment Package

The backend code needs to be packaged (including dependencies) into a `.zip` file for AWS Lambda.

1.  Run the build script from the project root:
    ```bash
    chmod +x scripts/build_lambda.sh
    ./scripts/build_lambda.sh
    ```

    - **What this does**:
      - Installs Python dependencies from `backend/requirements.txt` into a temporary build directory.
      - Copies the application code from `backend/app`.
      - Creates a `terraform/function.zip` file.
    - **Output**: Verify that `terraform/function.zip` exists.

### Step 1.2: Provision Infrastructure with Terraform

1.  Navigate to the Terraform directory:

    ```bash
    cd terraform
    ```

2.  Initialize Terraform (downloads providers):

    ```bash
    terraform init
    ```

3.  Plan the deployment:
    - You will need to provide the `db_password` for the Aurora Serverless database.

    ```bash
    terraform plan -out=tfplan -var="db_password=YOUR_SECURE_PASSWORD"
    ```

    - Review the plan to ensure it's creating the expected resources (VPC, Aurora DB, Lambda, API Gateway, S3, CloudFront).

4.  Apply the infrastructure:

    ```bash
    terraform apply tfplan
    ```

    - **Note**: This process may take 15-20 minutes, especially for the Aurora Database cluster creation.

5.  **Save the Outputs**:
    After a successful apply, Terraform will output key values. Note these down:
    - `api_endpoint`: The URL of your backend API Gateway (e.g., `https://xyz.execute-api.ap-southeast-1.amazonaws.com/dev`).
    - `web_bucket_name`: The S3 bucket for frontend hosting.
    - `cloudfront_domain`: The CloudFront domain for your frontend.
    - `database_secret_arn`: ARN of the database secret (if needed for manual connection).

---

## 2. Frontend Build & Deployment

### Step 2.1: Configure Environment

1.  Navigate to the frontend directory:
    ```bash
    cd ../frontend
    ```
2.  Create/Update your `.env.local` or set environment variables for the build. You need the API Gateway URL from the Terraform output.
    ```bash
    # Example .env.local
    NEXT_PUBLIC_API_URL=https://<api_endpoint_from_terraform>
    ```

### Step 2.2: Build and Export

1.  Install dependencies:
    ```bash
    npm ci
    ```
2.  Build the Next.js application:
    ```bash
    npm run build
    ```

    - This generates a static export in the `out/` directory.

### Step 2.3: Deploy to S3

1.  Sync the `out/` directory to the S3 bucket created by Terraform:

    ```bash
    aws s3 sync out/ s3://<web_bucket_name_from_terraform> --delete
    ```

2.  (Optional but Recommended) Invalidate CloudFront Code:
    - If you are updating an existing deployment, invalidate the cache to see changes immediately.
    - _Note: You need the CloudFront Distribution ID, which can be found in the AWS Console or added to Terraform outputs._
    ```bash
    aws cloudfront create-invalidation --distribution-id <YOUR_DIST_ID> --paths "/*"
    ```

---

## 3. CI/CD Pipeline (GitHub Actions)

The repository includes a workflow `.github/workflows/deploy-serverless.yml` to automate this process.

### Configuration

To enable the pipeline, configure the following **Secrets** in your GitHub Repository settings:

| Secret Name          | Description                                                   |
| :------------------- | :------------------------------------------------------------ |
| `AWS_ROLE_TO_ASSUME` | The IAM Role ARN for GitHub Actions to authenticate via OIDC. |
| `DB_PASSWORD`        | The master password for the Aurora Database.                  |

### Workflow Triggers

- **Push to `main`**: Automatically triggers a deployment to the `dev` environment.
- **Manual Trigger**: You can manually run the workflow from the "Actions" tab.

### Pipeline Steps

The pipeline performs the exact steps above:

1.  **Backend**: Sets up Python, builds the Lambda zip.
2.  **Infrastructure**: Runs `terraform init`, `plan`, and `apply`.
3.  **Frontend**: Sets up Node.js, builds with the `API_ENDPOINT` from Terraform outputs, and syncs to S3.

---

## Troubleshooting

- **Lambda Timeout/Errors**: Check CloudWatch Logs for the Lambda function.
- **Database Connection**: Ensure the Lambda security group allows outbound access to the RDS security group (handled by Terraform module).
- **Frontend 404s**: Ensure CloudFront is configured to handle client-side routing (usually configured via `error_document` in S3 or CloudFront Functions).
