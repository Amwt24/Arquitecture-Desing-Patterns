require('dotenv').config();
const express = require('express');
const os = require('os');

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT) || 3005;
const INSTANCE_ID = process.env.INSTANCE_ID || `users-${os.hostname()}`;

const users = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'admin' },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'user' },
  { id: 3, name: 'Carol White', email: 'carol@example.com', role: 'user' }
];

app.get('/health', (req, res) => res.status(200).json({ status: 'ok', instance: INSTANCE_ID }));

app.get('/api/users', (req, res) => {
  console.log(`[SERVICE-A:${INSTANCE_ID}] GET /api/users (X-Request-ID: ${req.headers['x-request-id'] || 'none'})`);
  res.status(200).json({
    instance: INSTANCE_ID,
    hostname: os.hostname(),
    users,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/users/:id', (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found' });
  console.log(`[SERVICE-A:${INSTANCE_ID}] GET /api/users/${req.params.id}`);
  res.status(200).json({ instance: INSTANCE_ID, user });
});

app.listen(PORT, () => {
  console.log(`[SERVICE-A] User Service running on port ${PORT} (instance=${INSTANCE_ID})`);
});
