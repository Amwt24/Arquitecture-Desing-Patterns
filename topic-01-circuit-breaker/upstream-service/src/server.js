require('dotenv').config();
const express = require('express');

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT) || 4000;

// Operational modes: 'healthy' | 'failing' | 'slow'
let serviceMode = process.env.INITIAL_MODE || 'healthy';

const inventoryCatalog = {
  'LAPTOP-01': { sku: 'LAPTOP-01', name: 'Cloud Workstation Pro', stock: 42 },
  'SERVER-02': { sku: 'SERVER-02', name: 'Rackmount Node 2U', stock: 15 }
};

// Administrative endpoint to inject faults during testing
app.post('/admin/mode', (req, res) => {
  const { mode } = req.body;
  const allowedModes = ['healthy', 'failing', 'slow'];
  if (!allowedModes.includes(mode)) {
    return res.status(400).json({
      error: `Invalid mode. Allowed values: ${allowedModes.join(', ')}`
    });
  }
  serviceMode = mode;
  console.log(`[UPSTREAM] Operational mode switched to: ${serviceMode}`);
  return res.status(200).json({ status: 'updated', mode: serviceMode });
});

// Health check
app.get('/health', (req, res) => res.status(200).json({ status: 'ok', mode: serviceMode }));

// Simulated inventory endpoint
app.get('/api/inventory/:sku', async (req, res) => {
  const { sku } = req.params;

  if (serviceMode === 'failing') {
    console.warn(`[UPSTREAM] Simulating 503 Service Unavailable for SKU=${sku}`);
    return res.status(503).json({
      error: 'Upstream database connection pool exhausted',
      timestamp: new Date().toISOString()
    });
  }

  if (serviceMode === 'slow') {
    console.warn(`[UPSTREAM] Simulating 5000ms latency spike for SKU=${sku}`);
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  const item = inventoryCatalog[sku];
  if (!item) {
    return res.status(404).json({ error: `SKU ${sku} not found` });
  }

  console.log(`[UPSTREAM] Serving 200 OK for SKU=${sku}`);
  return res.status(200).json({
    ...item,
    source: 'upstream-live',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`[UPSTREAM] Inventory service listening on port ${PORT} (mode=${serviceMode})`);
});
