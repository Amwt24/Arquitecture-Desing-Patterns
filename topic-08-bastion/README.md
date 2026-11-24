# Topic 08 — Bastion Host

## What is it?
A **Bastion Host** (Jump Server) is a hardened, publicly accessible EC2 instance that provides the **only authorized entry point** into a private subnet. Administrators connect through the Bastion to reach private resources (RDS, internal servers) without exposing them to the Internet.

## Architecture
```
[Internet / Admin]
       ↓
[Bastion Host :3010] ← Public Subnet (10.0.1.0/24), Elastic IP
       ↓  (authenticated tunnel via IAM/SSM Session)
[Private Service :4010] ← Private Subnet (10.0.2.0/24), NO public access
       └─ [RDS / EC2 / Internal Resources]

Private subnet uses Docker internal: true (no external routing)
```

## AWS Equivalents
- **Bastion EC2 Instance**: Public subnet, Security Group allows SSH from known IPs only
- **AWS SSM Session Manager**: Modern Bastion alternative (no open SSH port required)
- **EC2 Instance Connect**: Temporary SSH key injection via IAM
- **Private Subnet**: No Internet Gateway route, only NAT Gateway for outbound

## Quick Start
```bash
docker compose up --build -d
```

## Tests

### Step 1: Unauthorized access attempt
```bash
curl -s http://localhost:3010/bastion/tunnel/servers
# Expected: 401 Unauthorized
```

### Step 2: Create authorized session
```bash
SESSION=$(curl -s -X POST http://localhost:3010/bastion/session/create \
  -H "X-Bastion-User: admin" | python -c "import sys,json; print(json.load(sys.stdin)['sessionId'])")
echo "Session ID: $SESSION"
```

### Step 3: Access private resource via tunnel
```bash
curl -s http://localhost:3010/bastion/tunnel/servers \
  -H "X-Bastion-User: admin" \
  -H "X-Bastion-Session: $SESSION"

curl -s http://localhost:3010/bastion/tunnel/secrets \
  -H "X-Bastion-User: admin" \
  -H "X-Bastion-Session: $SESSION"
```

### Step 4: Direct access to private service is blocked (network isolation)
```bash
# Private service is NOT exposed on host - no port binding
# docker network: internal=true means no host routing
```

### Step 5: View audit log
```bash
curl -s http://localhost:3010/bastion/audit -H "X-Bastion-User: admin"
```

### Step 6: Unauthorized user attempt
```bash
curl -s -X POST http://localhost:3010/bastion/session/create \
  -H "X-Bastion-User: hacker"
# Expected: 401 Unauthorized
```
