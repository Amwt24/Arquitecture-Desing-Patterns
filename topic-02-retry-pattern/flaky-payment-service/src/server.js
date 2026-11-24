require('dotenv').config();
const express = require('express');

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT) || 4001;

// In-memory stores for attempt tracking and idempotency deduplication
const attemptTracker = new Map();
const idempotencyStore = new Map();

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

app.post('/api/v1/charges', (req, res) => {
  const idempotencyKey = req.header('Idempotency-Key');
  const { amount, currency, simulateTransientFailures = 0 } = req.body;

  if (!idempotencyKey) {
    return res.status(400).json({ error: 'Missing required Idempotency-Key header' });
  }

  if (typeof amount !== 'number' || amount <= 0 || !currency) {
    console.warn(`[PAYMENT-API] Permanent 400 validation error for key=${idempotencyKey}`);
    return res.status(400).json({
      error: 'Invalid payload: amount must be a positive number and currency is required'
    });
  }

  // Return cached response if transaction was already committed
  if (idempotencyStore.has(idempotencyKey)) {
    console.info(`[PAYMENT-API] Idempotent replay for key=${idempotencyKey}`);
    return res.status(200).json({
      ...idempotencyStore.get(idempotencyKey),
      idempotentReplay: true
    });
  }

  const currentAttempt = (attemptTracker.get(idempotencyKey) || 0) + 1;
  attemptTracker.set(idempotencyKey, currentAttempt);

  // Simulate transient infrastructure failure for the first N attempts
  if (currentAttempt <= simulateTransientFailures) {
    console.warn(
      `[PAYMENT-API] Simulating 503 (Attempt ${currentAttempt}/${simulateTransientFailures + 1}) for key=${idempotencyKey}`
    );
    return res.status(503).json({
      error: 'Temporary upstream gateway saturation',
      attempt: currentAttempt
    });
  }

  const receipt = {
    transactionId: `txn_${Date.now()}`,
    idempotencyKey,
    amount,
    currency,
    status: 'SUCCEEDED',
    processedOnAttempt: currentAttempt,
    timestamp: new Date().toISOString()
  };

  idempotencyStore.set(idempotencyKey, receipt);
  console.log(`[PAYMENT-API] Charge committed on attempt ${currentAttempt} for key=${idempotencyKey}`);
  return res.status(201).json(receipt);
});

app.listen(PORT, () => {
  console.log(`[PAYMENT-API] Flaky payment service listening on port ${PORT}`);
});
