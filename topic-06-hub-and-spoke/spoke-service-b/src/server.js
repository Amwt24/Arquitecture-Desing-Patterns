require('dotenv').config();
const express = require('express');

const app = express();
app.use(express.json());
const PORT = Number(process.env.PORT) || 4008;

const invoices = [
  { id: 'INV-001', amount: 15000, currency: 'USD', status: 'PAID', dueDate: '2025-01-31' },
  { id: 'INV-002', amount: 8500, currency: 'USD', status: 'PENDING', dueDate: '2025-02-15' }
];

app.get('/health', (req, res) => res.status(200).json({ status: 'ok', spoke: 'spoke-b-finance' }));

const requireHub = (req, res, next) => {
  if (!req.headers['x-forwarded-from-hub']) {
    return res.status(403).json({ error: 'Direct access not allowed. Must route via Hub.' });
  }
  next();
};

app.get('/invoices', requireHub, (req, res) => {
  console.log(`[SPOKE-B] GET /invoices (via hub: ${req.headers['x-spoke-target']})`);
  res.status(200).json({ spoke: 'spoke-b-finance', invoices });
});

app.listen(PORT, () => console.log(`[SPOKE-B] Finance Service on port ${PORT}`));
