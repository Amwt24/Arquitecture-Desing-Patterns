# Topic 06 — Hub-and-Spoke Architecture

## What is it?
A centralized network topology where all inter-spoke communication passes through a central **Hub** (simulating AWS Transit Gateway). The Hub enforces security policies, logging, and routing. Spokes cannot communicate directly.

## Architecture
```
[Client]
   ↓
[Hub Service :3007] ← Central routing, audit, security policy
   ├─ /route/spoke-a/* → [Spoke A: HR Service :4007]   (isolated network)
   └─ /route/spoke-b/* → [Spoke B: Finance Service :4008] (isolated network)

Spokes REJECT direct access — all traffic must traverse the Hub
```

## Quick Start
```bash
docker compose up --build -d
```

## Tests

### Route to Spoke A (HR)
```bash
curl -s http://localhost:3007/route/spoke-a/employees
curl -s http://localhost:3007/route/spoke-a/employees/E001
```

### Route to Spoke B (Finance)
```bash
curl -s http://localhost:3007/route/spoke-b/invoices
```

### Direct access blocked (403)
```bash
curl -s http://localhost:4007/employees
# Expected: 403 Direct access not allowed. Must route via Hub.
```

### Security policy: blocked path
```bash
curl -s http://localhost:3007/route/spoke-a/admin/secret
# Expected: 403 Access denied: forbidden path
```

### View audit log
```bash
curl -s http://localhost:3007/hub/audit
```

### View spoke registry
```bash
curl -s http://localhost:3007/hub/spokes
```
