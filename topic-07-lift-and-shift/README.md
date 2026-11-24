# Topic 07 — Lift-and-Shift Migration Strategy (On-Premises → AWS)

## What is it?
**Lift-and-Shift (Rehosting)** migrates applications from on-premises to AWS cloud **without code changes**. The same application binary runs in both environments; only infrastructure configuration differs.

## Migration Phases
```
[On-Premises Server]          [AWS EC2 Instance]
  Legacy ERP :3008    ──→      Legacy ERP :3009
  DEPLOYMENT_ENV=on-premises   DEPLOYMENT_ENV=aws-ec2
  Physical hardware            i-0a1b2c3d4e5f67890 (m5.large)
  Local network                VPC Private Subnet (us-east-1)
```

## Tools Used in Real AWS Migration
- **AWS Application Migration Service (MGN)**: Continuous replication from on-prem to EC2
- **VM Import/Export**: Convert VMware/Hyper-V images to AMIs
- **AWS DataSync**: Migrate file storage to EFS/S3
- **Route 53**: DNS cutover from on-prem IP to EC2 Elastic IP

## Quick Start
```bash
docker compose up --build -d
```

## Tests — Compare On-Premises vs AWS EC2

### On-Premises Deployment
```bash
curl -s http://localhost:3008/health
curl -s http://localhost:3008/customers
curl -s http://localhost:3008/migration/status
```

### AWS EC2 Deployment (same code, cloud environment)
```bash
curl -s http://localhost:3009/health
curl -s http://localhost:3009/customers
curl -s http://localhost:3009/migration/status
```

### Key difference: Health endpoint reveals deployment environment
- Port 3008: `"deploymentEnvironment": "on-premises"` with hostname/RAM info
- Port 3009: `"deploymentEnvironment": "aws-ec2"` with instanceId/instanceType/AMI
