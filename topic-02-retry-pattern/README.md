# Topic 02 — Retry Pattern

## What is it?
Transparently re-attempts failed remote operations using **Exponential Backoff + Full Jitter** to handle transient faults while preventing retry storms.

## Architecture
```
[Client] → [Retry Client Service :3001]
              └─ [Axios Retry Interceptor]
                    ├─ Error Classifier (503/429 → retry; 400 → halt)
                    ├─ Full Jitter: rand(0, min(cap, base × 2ⁿ))
                    └─ [Flaky Payment Service :4001]
                          └─ Idempotency-Key deduplication
```

## Quick Start
```bash
docker compose up --build -d
docker compose logs -f
```

## Test Scenarios

### 1. Transient Recovery (2 failures → success on attempt 3)
```bash
curl -s -X POST http://localhost:3001/api/execute-payment \
  -H "Content-Type: application/json" \
  -d '{"amount": 250, "currency": "USD", "simulateTransientFailures": 2}'
```

### 2. Permanent Error (no retry on HTTP 400)
```bash
curl -s -X POST http://localhost:3001/api/execute-payment \
  -H "Content-Type: application/json" \
  -d '{"amount": -50, "currency": "USD"}'
```

### 3. Budget Exhaustion (5 failures > 3 max retries)
```bash
curl -s -X POST http://localhost:3001/api/execute-payment \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "currency": "USD", "simulateTransientFailures": 5}'
```
