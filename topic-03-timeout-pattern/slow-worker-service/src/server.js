require('dotenv').config();
const express = require('express');

const app = express();
const PORT = Number(process.env.PORT) || 4002;

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

app.get('/api/work', (req, res) => {
  const delayMs = Math.min(Math.max(Number(req.query.delayMs) || 200, 0), 30000);
  let clientAborted = false;

  // Detect if upstream caller closes TCP connection due to timeout
  req.on('close', () => {
    if (!res.writableEnded) {
      clientAborted = true;
      console.warn(`[WORKER] Caller closed TCP socket early during ${delayMs}ms task.`);
    }
  });

  console.log(`[WORKER] Starting task with simulated processing time=${delayMs}ms`);

  const timer = setTimeout(() => {
    if (clientAborted) return;
    console.log(`[WORKER] Completed task in ${delayMs}ms`);
    res.status(200).json({
      status: 'COMPLETED',
      processingTimeMs: delayMs,
      timestamp: new Date().toISOString()
    });
  }, delayMs);

  req.on('close', () => clearTimeout(timer));
});

app.listen(PORT, () => {
  console.log(`[WORKER] Slow worker service listening on port ${PORT}`);
});
