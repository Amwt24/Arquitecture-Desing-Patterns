require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = Number(process.env.PORT) || 3002;
const WORKER_URL = process.env.WORKER_URL || 'http://localhost:4002';
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS) || 1500;

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

app.get('/api/fetch-report', async (req, res) => {
  const requestedDelayMs = Number(req.query.delayMs) || 300;
  const startTime = Date.now();

  // Cooperative cancellation controller bound to strict deadline
  const abortController = new AbortController();
  const deadlineTimer = setTimeout(() => {
    abortController.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await axios.get(`${WORKER_URL}/api/work`, {
      params: { delayMs: requestedDelayMs },
      timeout: REQUEST_TIMEOUT_MS,
      signal: abortController.signal
    });

    const elapsedMs = Date.now() - startTime;
    return res.status(200).json({
      outcome: 'SUCCESS',
      configuredTimeoutMs: REQUEST_TIMEOUT_MS,
      elapsedMs,
      workerPayload: response.data
    });
  } catch (err) {
    const elapsedMs = Date.now() - startTime;
    const isTimeout = err.code === 'ECONNABORTED' || err.code === 'ERR_CANCELED' || err.name === 'CanceledError';

    console.error(`[TIMEOUT-CONSUMER] Request ${isTimeout ? 'TIMED OUT' : 'FAILED'} after ${elapsedMs}ms: ${err.message}`);

    return res.status(isTimeout ? 504 : 502).json({
      outcome: isTimeout ? 'TIMEOUT' : 'ERROR',
      configuredTimeoutMs: REQUEST_TIMEOUT_MS,
      elapsedMs,
      error: isTimeout
        ? `Gateway Timeout: upstream did not respond within ${REQUEST_TIMEOUT_MS}ms`
        : err.message
    });
  } finally {
    clearTimeout(deadlineTimer); // Prevent timer leak on fast success
  }
});

app.listen(PORT, () => {
  console.log(`[TIMEOUT-CONSUMER] Service listening on port ${PORT} (timeout=${REQUEST_TIMEOUT_MS}ms)`);
});
