# Cloud Architecture and Design Patterns — Local Implementation

> **Course**: Cloud Architecture and Distributed Systems  
> **Stack**: Node.js · Docker · Docker Compose · Nginx · AWS (simulated locally)

---

## 📋 Topics Covered

| # | Topic | Port(s) | Pattern Category |
|---|-------|---------|-----------------|
| 1 | [Circuit Breaker](./topic-01-circuit-breaker/) | 3000, 4000 | Resilience |
| 2 | [Retry Pattern](./topic-02-retry-pattern/) | 3001, 4001 | Resilience |
| 3 | [Timeout Pattern](./topic-03-timeout-pattern/) | 3002, 4002 | Resilience |
| 4 | [Serverless & Containers](./topic-04-serverless-containers/) | 3003, 3004 | Compute |
| 5 | [API Gateway + LB + Reverse Proxy](./topic-05-api-gateway-lb/) | 8080 | Ingress |
| 6 | [Hub-and-Spoke](./topic-06-hub-and-spoke/) | 3007 | Network Topology |
| 7 | [Lift-and-Shift Migration](./topic-07-lift-and-shift/) | 3008, 3009 | Migration |
| 8 | [Bastion Host](./topic-08-bastion/) | 3010 | Security |

---

## 🚀 Quick Start — Run All Topics

Each topic is an independent Docker Compose stack. Start them all:

```bash
# Topic 1 — Circuit Breaker
cd topic-01-circuit-breaker && docker compose up --build -d && cd ..

# Topic 2 — Retry Pattern
cd topic-02-retry-pattern && docker compose up --build -d && cd ..

# Topic 3 — Timeout Pattern
cd topic-03-timeout-pattern && docker compose up --build -d && cd ..

# Topic 4 — Serverless & Containers
cd topic-04-serverless-containers && docker compose up --build -d && cd ..

# Topic 5 — API Gateway, Load Balancer, Reverse Proxy
cd topic-05-api-gateway-lb && docker compose up --build -d && cd ..

# Topic 6 — Hub-and-Spoke
cd topic-06-hub-and-spoke && docker compose up --build -d && cd ..

# Topic 7 — Lift-and-Shift Migration
cd topic-07-lift-and-shift && docker compose up --build -d && cd ..

# Topic 8 — Bastion Host
cd topic-08-bastion && docker compose up --build -d && cd ..
```

---

## 🔬 Quick Smoke Test (all services)

```bash
# 1. Circuit Breaker
curl -s http://localhost:3000/api/orders/check/LAPTOP-01

# 2. Retry Pattern
curl -s -X POST http://localhost:3001/api/execute-payment \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "currency": "USD", "simulateTransientFailures": 2}'

# 3. Timeout Pattern
curl -s "http://localhost:3002/api/fetch-report?delayMs=400"
curl -s "http://localhost:3002/api/fetch-report?delayMs=4000"

# 4. Lambda Simulator
curl -s -X POST http://localhost:3003/invoke \
  -H "Content-Type: application/json" \
  -d '{"action": "PROCESS_ORDER", "payload": {"items": ["laptop"]}}'

# 4b. ECS Service
curl -s http://localhost:3004/health

# 5. API Gateway (Nginx)
curl -s http://localhost:8080/api/users
curl -s http://localhost:8080/api/products

# 6. Hub-and-Spoke
curl -s http://localhost:3007/route/spoke-a/employees
curl -s http://localhost:3007/route/spoke-b/invoices

# 7. Lift-and-Shift: On-Prem vs AWS EC2
curl -s http://localhost:3008/health
curl -s http://localhost:3009/health

# 8. Bastion Host
curl -s -X POST http://localhost:3010/bastion/session/create \
  -H "X-Bastion-User: admin"
```

---

## 🛑 Stop All Services

```bash
for dir in topic-01-circuit-breaker topic-02-retry-pattern topic-03-timeout-pattern \
            topic-04-serverless-containers topic-05-api-gateway-lb topic-06-hub-and-spoke \
            topic-07-lift-and-shift topic-08-bastion; do
  cd $dir && docker compose down && cd ..
done
```

---

## 📁 Project Structure

```
ArchitecturePatterns/
├── README.md                          ← This file
├── topic-01-circuit-breaker/
│   ├── docker-compose.yml
│   ├── upstream-service/              ← Fault-injectable dependency
│   └── consumer-service/             ← Opossum Circuit Breaker
├── topic-02-retry-pattern/
│   ├── docker-compose.yml
│   ├── flaky-payment-service/        ← Idempotent payment API
│   └── retry-client-service/         ← Axios + Full Jitter retries
├── topic-03-timeout-pattern/
│   ├── docker-compose.yml
│   ├── slow-worker-service/          ← Configurable delay
│   └── timeout-consumer-service/     ← AbortController + 504
├── topic-04-serverless-containers/
│   ├── docker-compose.yml
│   ├── lambda-simulator/             ← AWS Lambda handler simulation
│   └── ecs-service/                  ← ECS Fargate long-running task
├── topic-05-api-gateway-lb/
│   ├── docker-compose.yml
│   ├── nginx/nginx.conf              ← API Gateway + Load Balancer config
│   ├── service-a/                    ← User Service
│   └── service-b/                    ← Product Service
├── topic-06-hub-and-spoke/
│   ├── docker-compose.yml
│   ├── hub-service/                  ← Central routing + audit
│   ├── spoke-service-a/              ← HR System (private)
│   └── spoke-service-b/              ← Finance System (private)
├── topic-07-lift-and-shift/
│   ├── docker-compose.yml
│   └── legacy-app/                   ← Same code, on-prem vs AWS env
└── topic-08-bastion/
    ├── docker-compose.yml
    ├── bastion-service/              ← Public jump host + session mgmt
    └── private-service/              ← Private subnet resource (no public port)
```

---

## 🏗️ Architecture Principles Demonstrated

| Principle | Topics |
|-----------|--------|
| **Fault Isolation** | 1 (Circuit Breaker), 3 (Timeout) |
| **Self-Healing** | 1 (HALF-OPEN recovery), 2 (Automatic retry) |
| **Idempotency** | 2 (Idempotency-Key deduplication) |
| **Resource Protection** | 3 (AbortController), 1 (Fail-Fast) |
| **Event-Driven Compute** | 4 (Lambda cold/warm start simulation) |
| **Traffic Management** | 5 (Nginx routing + load balancing) |
| **Network Segmentation** | 6 (Hub-and-Spoke), 8 (Bastion + private subnet) |
| **Migration Strategy** | 7 (Rehosting without code changes) |
| **Zero-Trust Security** | 8 (Bastion sessions, audit logging) |

---

## 🔧 Prerequisites

- Docker Desktop (with Docker Compose v2)
- Node.js 20+ (for local development without Docker)
- curl (for testing)
