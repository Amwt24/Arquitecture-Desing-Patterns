# Topic 01 — Circuit Breaker Pattern

## What is it?
A stateful proxy that monitors remote call failures and **automatically short-circuits** (stops forwarding) requests when a failure threshold is breached, preventing cascading failures across microservices.

## Architecture
```
[Client] → [Consumer Order Service :3000]
              └─ [Opossum Circuit Breaker]
                    ├─ CLOSED  → [Upstream Inventory Service :4000]
                    ├─ OPEN    → Immediate Fallback (< 2 ms)
                    └─ HALF-OPEN → Probe request → CLOSED or OPEN
```

## Quick Start
```bash
docker compose up --build -d
docker compose logs -f
```

## Test Scenarios

### 1. Healthy (CLOSED)
```bash
curl -s http://localhost:3000/api/orders/check/LAPTOP-01
```

### 2. Inject Fault → Trip Breaker (OPEN)
```bash
curl -s -X POST http://localhost:4000/admin/mode -H "Content-Type: application/json" -d '{"mode":"failing"}'
# Send 5 requests
for i in 1 2 3 4 5; do curl -s http://localhost:3000/api/orders/check/LAPTOP-01; echo ""; done
```

### 3. Recovery (HALF-OPEN → CLOSED)
```bash
curl -s -X POST http://localhost:4000/admin/mode -H "Content-Type: application/json" -d '{"mode":"healthy"}'
# Wait 11 seconds for resetTimeout, then probe
curl -s http://localhost:3000/api/orders/check/LAPTOP-01
```

### 4. Circuit Telemetry
```bash
curl -s http://localhost:3000/api/circuit/status
```

## Expected Outputs
- **CLOSED**: `"circuitState": "CLOSED"`, `"source": "upstream-live"`, stock value returned
- **OPEN**: `"circuitState": "OPEN"`, `"source": "circuit-breaker-short-circuit"`, `latencyMs < 5`
- **HALF-OPEN → CLOSED**: State transition logs in Docker output
