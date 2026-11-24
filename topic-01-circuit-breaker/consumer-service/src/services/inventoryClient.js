const axios = require('axios');
const CircuitBreaker = require('opossum');
const circuitConfig = require('../config/circuitConfig');

const UPSTREAM_BASE_URL = process.env.UPSTREAM_BASE_URL || 'http://localhost:4000';

/**
 * Performs the raw HTTP call to the upstream inventory service.
 * @param {string} sku - Product Stock Keeping Unit identifier
 */
async function callUpstreamInventory(sku) {
  const response = await axios.get(
    `${UPSTREAM_BASE_URL}/api/inventory/${encodeURIComponent(sku)}`,
    { timeout: circuitConfig.timeout }
  );
  return response.data;
}

// Instantiate Opossum Circuit Breaker around the remote call
const inventoryBreaker = new CircuitBreaker(callUpstreamInventory, circuitConfig);

// Register deterministic fallback executed when breaker is OPEN or call fails
inventoryBreaker.fallback((sku, err) => {
  const isCircuitOpen = err && err.code === 'EOPENBREAKER';
  return {
    sku,
    name: 'Unavailable (Cached/Fallback Estimate)',
    stock: null,
    degraded: true,
    source: isCircuitOpen ? 'circuit-breaker-short-circuit' : 'circuit-breaker-fallback',
    reason: err ? err.message : 'Downstream dependency degraded',
    timestamp: new Date().toISOString()
  };
});

// Lifecycle event listeners for structured observability
inventoryBreaker.on('open', () => {
  console.error('[CIRCUIT-BREAKER] STATE -> OPEN: Failure threshold exceeded. Short-circuiting requests.');
});

inventoryBreaker.on('halfOpen', () => {
  console.warn('[CIRCUIT-BREAKER] STATE -> HALF-OPEN: Reset timeout elapsed. Allowing trial probe.');
});

inventoryBreaker.on('close', () => {
  console.info('[CIRCUIT-BREAKER] STATE -> CLOSED: Upstream healthy. Normal traffic resumed.');
});

inventoryBreaker.on('reject', () => {
  console.warn('[CIRCUIT-BREAKER] REJECTED: Fast-failing request while circuit is OPEN.');
});

function getBreakerState() {
  if (inventoryBreaker.opened) return 'OPEN';
  if (inventoryBreaker.halfOpen) return 'HALF-OPEN';
  return 'CLOSED';
}

module.exports = {
  inventoryBreaker,
  getBreakerState
};
