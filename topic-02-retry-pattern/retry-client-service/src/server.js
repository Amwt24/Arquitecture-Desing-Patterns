require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const { createRetryingClient } = require('./utils/retryHttpClient');

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT) || 3001;
const PAYMENT_API_URL = process.env.PAYMENT_API_URL || 'http://localhost:4001';

const paymentClient = createRetryingClient({
  baseURL: PAYMENT_API_URL,
  maxRetries: Number(process.env.MAX_RETRIES) || 3,
  baseDelayMs: Number(process.env.BASE_DELAY_MS) || 200,
  maxDelayMs: Number(process.env.MAX_DELAY_MS) || 5000
});

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// Endpoint demonstrating transient fault recovery with Idempotency-Key
app.post('/api/execute-payment', async (req, res) => {
  const { amount = 100, currency = 'USD', simulateTransientFailures = 2 } = req.body;
  const idempotencyKey = req.header('Idempotency-Key') || crypto.randomUUID();
  const requestConfig = {
    headers: { 'Idempotency-Key': idempotencyKey }
  };

  try {
    const response = await paymentClient.post(
      '/api/v1/charges',
      { amount, currency, simulateTransientFailures },
      requestConfig
    );

    return res.status(200).json({
      outcome: 'SUCCESS',
      idempotencyKey,
      totalAttempts: (requestConfig._retryCount || 0) + 1,
      retryHistory: requestConfig._attemptLogs || [],
      receipt: response.data
    });
  } catch (err) {
    const httpStatus = err.response ? err.response.status : 502;
    return res.status(httpStatus).json({
      outcome: 'FAILED',
      idempotencyKey,
      totalAttempts: (requestConfig._retryCount || 0) + 1,
      retryHistory: err.attemptLogs || [],
      error: err.response ? err.response.data : err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`[RETRY-CLIENT] Service listening on port ${PORT}`);
});
