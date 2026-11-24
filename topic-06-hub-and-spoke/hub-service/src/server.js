require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT) || 3007;

// Spoke service registry (in production: AWS Transit Gateway route tables / VPC peering)
const SPOKE_REGISTRY = {
  'spoke-a': { url: process.env.SPOKE_A_URL || 'http://spoke-service-a:4007', description: 'HR & Payroll System' },
  'spoke-b': { url: process.env.SPOKE_B_URL || 'http://spoke-service-b:4008', description: 'Finance & Accounting System' }
};

// Audit log (in production: AWS CloudWatch / centralized SIEM)
const auditLog = [];

function logAuditEvent(event) {
  const entry = { ...event, timestamp: new Date().toISOString() };
  auditLog.push(entry);
  console.log(`[HUB-AUDIT] ${JSON.stringify(entry)}`);
}

app.get('/health', (req, res) => res.status(200).json({ status: 'ok', role: 'hub' }));

// Hub routing: forward requests to spoke services (simulates Transit Gateway routing)
app.all('/route/:spoke/*', async (req, res) => {
  const { spoke } = req.params;
  const spoke_path = req.params[0];
  const spokeConfig = SPOKE_REGISTRY[spoke];

  if (!spokeConfig) {
    logAuditEvent({ event: 'ROUTE_DENIED', spoke, reason: 'Unknown spoke' });
    return res.status(404).json({ error: `Unknown spoke: ${spoke}`, availableSpokes: Object.keys(SPOKE_REGISTRY) });
  }

  // Central inspection/security policy enforcement (simulates AWS Network Firewall in Hub VPC)
  const forbiddenPaths = ['/admin', '/internal'];
  if (forbiddenPaths.some(p => spoke_path.startsWith(p))) {
    logAuditEvent({ event: 'ROUTE_BLOCKED', spoke, path: spoke_path, reason: 'Forbidden path' });
    return res.status(403).json({ error: 'Access denied: forbidden path', path: spoke_path });
  }

  logAuditEvent({ event: 'ROUTE_FORWARDED', spoke, path: spoke_path, method: req.method });

  try {
    const targetUrl = `${spokeConfig.url}/${spoke_path}`;
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: {
        'X-Forwarded-From-Hub': 'true',
        'X-Spoke-Target': spoke,
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });

    return res.status(response.status).json({
      routedViaHub: true,
      spoke,
      spokeDescription: spokeConfig.description,
      data: response.data
    });
  } catch (err) {
    const status = err.response ? err.response.status : 502;
    logAuditEvent({ event: 'ROUTE_ERROR', spoke, path: spoke_path, status });
    return res.status(status).json({ error: err.message, spoke });
  }
});

// View audit log
app.get('/hub/audit', (req, res) => {
  res.status(200).json({ totalEvents: auditLog.length, events: auditLog.slice(-50) });
});

// View spoke registry
app.get('/hub/spokes', (req, res) => {
  res.status(200).json({ spokes: SPOKE_REGISTRY });
});

app.listen(PORT, () => {
  console.log(`[HUB] Central hub service listening on port ${PORT}`);
  console.log(`[HUB] Registered spokes: ${Object.keys(SPOKE_REGISTRY).join(', ')}`);
});
