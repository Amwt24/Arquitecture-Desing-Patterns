require('dotenv').config();
const express = require('express');

const app = express();
app.use(express.json());
const PORT = Number(process.env.PORT) || 4007;

const employees = [
  { id: 'E001', name: 'Alice Johnson', department: 'Engineering', salary: 95000 },
  { id: 'E002', name: 'Bob Smith', department: 'Marketing', salary: 75000 }
];

app.get('/health', (req, res) => res.status(200).json({ status: 'ok', spoke: 'spoke-a-hr' }));

// Verify request came through the hub
const requireHub = (req, res, next) => {
  if (!req.headers['x-forwarded-from-hub']) {
    return res.status(403).json({ error: 'Direct access not allowed. Must route via Hub.' });
  }
  next();
};

app.get('/employees', requireHub, (req, res) => {
  console.log(`[SPOKE-A] GET /employees (via hub: ${req.headers['x-spoke-target']})`);
  res.status(200).json({ spoke: 'spoke-a-hr', employees });
});

app.get('/employees/:id', requireHub, (req, res) => {
  const emp = employees.find(e => e.id === req.params.id);
  if (!emp) return res.status(404).json({ error: 'Employee not found' });
  res.status(200).json({ spoke: 'spoke-a-hr', employee: emp });
});

app.listen(PORT, () => console.log(`[SPOKE-A] HR Service on port ${PORT}`));
