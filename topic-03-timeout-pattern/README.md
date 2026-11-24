# Topic 03 — Timeout Pattern

## What is it?
Establishes a **strict upper time limit** on remote calls. If a downstream service does not respond within the deadline, the caller aborts the socket and returns HTTP 504, freeing resources immediately.

## Architecture
```
[Client] → [Timeout Consumer Service :3002]
              └─ AbortController (1500ms deadline)
                    └─ Axios GET + signal
                          └─ [Slow Worker Service :4002]
                                (configurable delay via ?delayMs=N)
```

## Quick Start
```bash
docker compose up --build -d
```

## Test Scenarios

### 1. Fast response (within timeout)
```bash
curl -s "http://localhost:3002/api/fetch-report?delayMs=400"
# Expected: 200 OK, outcome: SUCCESS, elapsedMs ~400
```

### 2. Slow response (exceeds 1500ms timeout)
```bash
curl -s "http://localhost:3002/api/fetch-report?delayMs=4000"
# Expected: 504 Gateway Timeout, outcome: TIMEOUT, elapsedMs ~1500
```

### 3. At the boundary
```bash
curl -s "http://localhost:3002/api/fetch-report?delayMs=1499"
curl -s "http://localhost:3002/api/fetch-report?delayMs=1501"
```
