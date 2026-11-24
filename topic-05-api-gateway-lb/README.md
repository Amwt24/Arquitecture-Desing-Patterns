# Topic 05 — API Gateway, Load Balancer & Reverse Proxy

## What is it?
- **Reverse Proxy**: Nginx sits in front of backend services, hiding internal topology
- **Load Balancer**: Distributes traffic across multiple instances (round-robin upstream pool)
- **API Gateway**: Routes requests by URL path to different microservices, adds security headers and request IDs

## Architecture
```
[Client :8080]
     ↓
[Nginx API Gateway + Reverse Proxy]
     ├─ /api/users    → [Service A: Users :3005]
     └─ /api/products → [Service B: Products :3006]
```

## Quick Start
```bash
docker compose up --build -d
```

## Tests — All requests go through Nginx on port 8080

### Users API (routed to Service A)
```bash
curl -s http://localhost:8080/api/users
curl -s http://localhost:8080/api/users/1
```

### Products API (routed to Service B)
```bash
curl -s http://localhost:8080/api/products
curl -s http://localhost:8080/api/products/P001
```

### Gateway Health Check
```bash
curl -s http://localhost:8080/health
```

### Nginx Status (monitor connections)
```bash
curl -s http://localhost:8080/nginx-status
```

### Observe routing (check X-Request-ID header)
```bash
curl -sv http://localhost:8080/api/users 2>&1 | grep -E "X-Request-ID|< HTTP"
```
