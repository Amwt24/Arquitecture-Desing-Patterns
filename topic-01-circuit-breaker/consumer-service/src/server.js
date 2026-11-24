require('dotenv').config();
const express = require('express');
const { inventoryBreaker, getBreakerState } = require('./services/inventoryClient');

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT) || 3000;

// Health check
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// Protected endpoint invoking the circuit-wrapped dependency
app.get('/api/orders/check/:sku', async (req, res) => {
  const { sku } = req.params;
  const startTime = Date.now();

  try {
    const inventoryData = await inventoryBreaker.fire(sku);
    const durationMs = Date.now() - startTime;

    return res.status(inventoryData.degraded ? 206 : 200).json({
      circuitState: getBreakerState(),
      latencyMs: durationMs,
      data: inventoryData
    });
  } catch (err) {
    const status = err.response ? err.response.status : 502;
    return res.status(status).json({
      circuitState: getBreakerState(),
      error: err.message
    });
  }
});

// Telemetry endpoint exposing circuit state and Opossum statistics
app.get('/api/circuit/status', (req, res) => {
  const stats = inventoryBreaker.stats;
  return res.status(200).json({
    state: getBreakerState(),
    metrics: {
      fires: stats.fires,
      successes: stats.successes,
      failures: stats.failures,
      timeouts: stats.timeouts,
      rejects: stats.rejects,
      fallbacks: stats.fallbacks
    }
  });
});

app.listen(PORT, () => {
  console.log(`[CONSUMER] Order service listening on port ${PORT}`);
});
