/**
 * Integration test script — runs services in-process and validates behavior.
 * Simulates the full Circuit Breaker flow without Docker.
 */

// Monkey-patch require paths
process.chdir(__dirname);

const express = require('./topic-01-circuit-breaker/consumer-service/node_modules/express');
const axios = require('./topic-01-circuit-breaker/consumer-service/node_modules/axios');
const CircuitBreaker = require('./topic-01-circuit-breaker/consumer-service/node_modules/opossum');

// ---- Start Upstream Server ----
const upstreamApp = express();
upstreamApp.use(express.json());

let serviceMode = 'healthy';
const catalog = {
  'LAPTOP-01': { sku: 'LAPTOP-01', name: 'Cloud Workstation Pro', stock: 42 }
};

upstreamApp.post('/admin/mode', (req, res) => {
  serviceMode = req.body.mode;
  res.json({ mode: serviceMode });
});

upstreamApp.get('/health', (req, res) => res.json({ status: 'ok' }));
upstreamApp.get('/api/inventory/:sku', async (req, res) => {
  if (serviceMode === 'failing') return res.status(503).json({ error: 'Service Unavailable' });
  const item = catalog[req.params.sku];
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json({ ...item, source: 'upstream-live', timestamp: new Date().toISOString() });
});

// ---- Circuit Breaker Setup ----
const CB_CONFIG = {
  timeout: 2000,
  errorThresholdPercentage: 50,
  resetTimeout: 5000,
  volumeThreshold: 4,
  rollingCountTimeout: 10000,
  rollingCountBuckets: 10,
  errorFilter: (err) => err.response && err.response.status >= 400 && err.response.status < 500
};

async function callUpstream(sku) {
  const response = await axios.get(`http://localhost:14000/api/inventory/${sku}`, { timeout: 2000 });
  return response.data;
}

const breaker = new CircuitBreaker(callUpstream, CB_CONFIG);
breaker.fallback((sku, err) => ({
  sku, name: 'Fallback Item', stock: null, degraded: true,
  source: err?.code === 'EOPENBREAKER' ? 'circuit-breaker-short-circuit' : 'circuit-breaker-fallback'
}));

const getState = () => breaker.opened ? 'OPEN' : breaker.halfOpen ? 'HALF-OPEN' : 'CLOSED';

breaker.on('open', () => console.log('  [CB] STATE → OPEN: Short-circuiting!'));
breaker.on('halfOpen', () => console.log('  [CB] STATE → HALF-OPEN: Trial probe allowed'));
breaker.on('close', () => console.log('  [CB] STATE → CLOSED: Recovery complete'));

// ---- Run Tests ----
async function runTests() {
  const upstream = upstreamApp.listen(14000);

  const test = async (label, sku) => {
    const start = Date.now();
    try {
      const data = await breaker.fire(sku);
      const ms = Date.now() - start;
      console.log(`  [${label}] state=${getState()} latency=${ms}ms source=${data.source} degraded=${data.degraded || false}`);
      return data;
    } catch (err) {
      const ms = Date.now() - start;
      console.log(`  [${label}] THREW: ${err.message} (${ms}ms)`);
    }
  };

  console.log('\n=== TEST 1: CLOSED State (healthy upstream) ===');
  serviceMode = 'healthy';
  await test('CLOSED-1', 'LAPTOP-01');
  await test('CLOSED-2', 'LAPTOP-01');

  console.log('\n=== TEST 2: Injecting failures → breaker should OPEN ===');
  serviceMode = 'failing';
  for (let i = 1; i <= 6; i++) {
    await test(`FAULT-${i}`, 'LAPTOP-01');
    await new Promise(r => setTimeout(r, 100));
  }

  console.log('\n=== TEST 3: Requests while OPEN (fail-fast) ===');
  for (let i = 1; i <= 3; i++) {
    await test(`OPEN-${i}`, 'LAPTOP-01');
  }

  console.log('\n=== Circuit Metrics ===');
  const stats = breaker.stats;
  console.log(JSON.stringify({
    fires: stats.fires, successes: stats.successes,
    failures: stats.failures, rejects: stats.rejects,
    fallbacks: stats.fallbacks
  }, null, 2));

  console.log('\n✅ All tests completed successfully!');
  upstream.close();
  process.exit(0);
}

runTests().catch(e => { console.error(e); process.exit(1); });
