require('dotenv').config();
const express = require('express');
const os = require('os');

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT) || 4010;

// Private database simulation (in AWS: RDS in private subnet, no IGW route)
const privateDatabase = {
  servers: [
    { hostname: 'db-primary.internal', role: 'PRIMARY', engine: 'PostgreSQL 15', status: 'RUNNING' },
    { hostname: 'db-replica.internal', role: 'REPLICA', engine: 'PostgreSQL 15', status: 'RUNNING' }
  ],
  secrets: [
    { key: 'db_password', value: 'REDACTED', rotationSchedule: '90 days' },
    { key: 'api_signing_key', value: 'REDACTED', rotationSchedule: '30 days' }
  ]
};

// Require Bastion forwarding header — direct access rejected
function requireBastion(req, res, next) {
  if (!req.headers['x-bastion-forwarded']) {
    console.warn(`[PRIVATE-SVC] Direct access attempt from: ${req.socket.remoteAddress}`);
    return res.status(403).json({
      error: 'Direct access denied. This resource is in a private subnet.',
      hint: 'Access must be routed through the Bastion Host.',
      privateSubnet: 'vpc-private-subnet-10.0.2.0/24'
    });
  }
  console.log(`[PRIVATE-SVC] Authorized access via Bastion (user=${req.headers['x-bastion-user']})`);
  next();
}

app.get('/health', requireBastion, (req, res) => {
  res.status(200).json({
    status: 'healthy',
    location: 'private-subnet',
    hostname: os.hostname(),
    directlyAccessible: false,
    bastionRequired: true
  });
});

app.get('/servers', requireBastion, (req, res) => {
  res.status(200).json({
    privateSubnet: '10.0.2.0/24',
    accessedViaBastion: true,
    bastionUser: req.headers['x-bastion-user'],
    servers: privateDatabase.servers
  });
});

app.get('/secrets', requireBastion, (req, res) => {
  res.status(200).json({
    privateSubnet: '10.0.2.0/24',
    accessedViaBastion: true,
    bastionUser: req.headers['x-bastion-user'],
    secrets: privateDatabase.secrets.map(s => ({ key: s.key, rotationSchedule: s.rotationSchedule }))
  });
});

app.listen(PORT, () => {
  console.log(`[PRIVATE-SVC] Private service started on port ${PORT} (PRIVATE - no direct Internet access)`);
});
