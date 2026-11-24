# Topic 04 — Serverless Computing & Docker Containers (AWS Lambda + ECS)

## What is it?
- **AWS Lambda**: Event-driven FaaS (Function-as-a-Service). Code runs on demand, billed per invocation.
- **Amazon ECS (Fargate)**: Fully managed container orchestration. Long-running services without managing EC2 instances.

## Architecture
```
AWS API Gateway → AWS Lambda (3003) [Event-driven, stateless]
AWS ALB         → Amazon ECS/Fargate (3004) [Long-running, stateful sessions]
```

## Quick Start
```bash
docker compose up --build -d
```

## Lambda Simulator Tests

### Process an Order (cold start)
```bash
curl -s -X POST http://localhost:3003/invoke \
  -H "Content-Type: application/json" \
  -d '{"action": "PROCESS_ORDER", "payload": {"items": ["laptop", "mouse"]}}'
```

### Image Processing
```bash
curl -s -X POST http://localhost:3003/invoke \
  -H "Content-Type: application/json" \
  -d '{"action": "RESIZE_IMAGE", "payload": {"key": "uploads/photo.jpg"}}'
```

### Send Notification
```bash
curl -s -X POST http://localhost:3003/invoke \
  -H "Content-Type: application/json" \
  -d '{"action": "SEND_NOTIFICATION", "payload": {"email": "user@example.com"}}'
```

## ECS Service Tests

### Health check (ALB target group check)
```bash
curl -s http://localhost:3004/health
```

### Task metadata (ECS Task Metadata Endpoint v4 simulation)
```bash
curl -s http://localhost:3004/metadata
```

### Product catalog API
```bash
curl -s http://localhost:3004/api/products
curl -s "http://localhost:3004/api/products?category=compute"
curl -s http://localhost:3004/api/products/001
```

## AWS Deployment Notes
For real AWS deployment:
1. **Lambda**: `aws lambda create-function` or deploy via SAM/CDK
2. **ECS**: Build image → Push to ECR → Create Task Definition → Create Service
