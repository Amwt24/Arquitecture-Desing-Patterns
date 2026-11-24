require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT) || 3010;
const PRIVATE_SERVICE_URL = process.env.PRIVATE_SERVICE_URL || 'http://private-service:4010';

// Simulated IAM-style authorized users (in AWS: IAM roles + EC2 Instance Connect / SSM Session Manager)
const AUTHORIZED_USERS = new Set(
  (process.env.AUTHORIZED_USERS || 'admin,devops-lead,sre-oncall').split(',')
);

// Session registry (in production: AWS SSM Session Manager / CloudTrail)
const activeSessions = new Map();
const auditLog = [];

function logAudit(event) {
  const entry = { ...event, timestamp: new Date().toISOString(), sessionId: event.sessionId };
  auditLog.push(entry);
  console.log(`[BASTION-AUDIT] ${JSON.stringify(entry)}`);
}

// === AUTHENTICATION / AUTHORIZATION MIDDLEWARE ===
function authenticate(req, res, next) {
  const user = req.headers['x-bastion-user'];
  const sessionId = req.headers['x-bastion-session'];

  if (!user || !AUTHORIZED_USERS.has(user)) {
    logAudit({ event: 'AUTH_DENIED', user: user || 'unknown', reason: 'User not in authorized list' });
    return res.status(401).json({
      error: 'Unauthorized: user not in Bastion access list',
      hint: `Authorized users: ${[...AUTHORIZED_USERS].join(', ')}`
    });
  }

  if (sessionId && !activeSessions.has(sessionId)) {
    logAudit({ event: 'SESSION_INVALID', user, sessionId });
    return res.status(403).json({ error: 'Invalid or expired session' });
  }

  req.bastionUser = user;
  req.bastionSession = sessionId;
  next();
}

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    role: 'bastion-host',
    publiclyAccessible: true,
    privateServiceReachable: true
  });
});

// === SESSION MANAGEMENT (simulates EC2 Instance Connect / SSM Session Manager) ===
app.post('/bastion/session/create', (req, res) => {
  const user = req.headers['x-bastion-user'];

  if (!user || !AUTHORIZED_USERS.has(user)) {
    logAudit({ event: 'SESSION_CREATE_DENIED', user: user || 'unknown' });
    return res.status(401).json({ error: 'Unauthorized: cannot create session' });
  }

  const sessionId = uuidv4();
  const sessionData = {
    sessionId,
    user,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour TTL
    sourceIp: req.headers['x-forwarded-for'] || req.socket.remoteAddress
  };

  activeSessions.set(sessionId, sessionData);
  logAudit({ event: 'SESSION_CREATED', user, sessionId });

  return res.status(201).json({
    message: 'Bastion session created. Use X-Bastion-Session header for privileged commands.',
    ...sessionData
  });
});

app.delete('/bastion/session/:sessionId', authenticate, (req, res) => {
  const { sessionId } = req.params;
  activeSessions.delete(sessionId);
  logAudit({ event: 'SESSION_TERMINATED', user: req.bastionUser, sessionId });
  res.status(200).json({ message: 'Session terminated', sessionId });
});

// === SECURE TUNNEL: proxy commands to private resources ===
app.all('/bastion/tunnel/*', authenticate, async (req, res) => {
  const privatePath = req.params[0];
  const user = req.bastionUser;

  logAudit({ event: 'TUNNEL_REQUEST', user, path: privatePath, method: req.method });

  // Rate limiting simulation (Bastion Hosts must have strict access controls)
  const sessionData = activeSessions.get(req.bastionSession);
  if (!sessionData) {
    return res.status(403).json({ error: 'Valid session required for tunnel access' });
  }

  try {
    const targetUrl = `${PRIVATE_SERVICE_URL}/${privatePath}`;
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: {
        'X-Bastion-Forwarded': 'true',
        'X-Bastion-User': user,
        'X-Bastion-Session': req.bastionSession
      },
      timeout: 10000
    });

    logAudit({ event: 'TUNNEL_SUCCESS', user, path: privatePath, status: response.status });
    return res.status(response.status).json({
      tunnelMeta: { bastionUser: user, privatePath, forwardedViaBastion: true },
      data: response.data
    });
  } catch (err) {
    const status = err.response ? err.response.status : 502;
    logAudit({ event: 'TUNNEL_ERROR', user, path: privatePath, status });
    return res.status(status).json({ error: err.message });
  }
});

// Active sessions
app.get('/bastion/sessions', (req, res) => {
  const user = req.headers['x-bastion-user'];
  if (!user || !AUTHORIZED_USERS.has(user)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.status(200).json({ activeSessions: [...activeSessions.values()] });
});

// Audit log
app.get('/bastion/audit', (req, res) => {
  const user = req.headers['x-bastion-user'];
  if (!user || !AUTHORIZED_USERS.has(user)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.status(200).json({ totalEvents: auditLog.length, events: auditLog.slice(-100) });
});

app.listen(PORT, () => {
  console.log(`[BASTION] Bastion Host service listening on port ${PORT} (PUBLIC-FACING)`);
  console.log(`[BASTION] Authorized users: ${[...AUTHORIZED_USERS].join(', ')}`);
  console.log(`[BASTION] Private service URL: ${PRIVATE_SERVICE_URL}`);
});
