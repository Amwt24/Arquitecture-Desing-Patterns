const axios = require('axios');

const RETRIABLE_HTTP_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const RETRIABLE_NETWORK_CODES = new Set(['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EAI_AGAIN']);

/**
 * Computes Exponential Backoff with Full Jitter (AWS Architecture Blog formula):
 * sleep = random_between(0, min(capMs, baseMs * 2^attemptIndex))
 */
function calculateFullJitterDelay(attemptIndex, baseMs, capMs) {
  const exponentialCeiling = Math.min(capMs, baseMs * Math.pow(2, attemptIndex));
  return Math.floor(Math.random() * (exponentialCeiling + 1));
}

function isTransientError(error) {
  if (error.response) {
    return RETRIABLE_HTTP_STATUSES.has(error.response.status);
  }
  if (error.code) {
    return RETRIABLE_NETWORK_CODES.has(error.code);
  }
  return false;
}

/**
 * Creates a configured Axios instance with Exponential Backoff + Full Jitter.
 */
function createRetryingClient({ baseURL, maxRetries = 3, baseDelayMs = 200, maxDelayMs = 5000 }) {
  const client = axios.create({ baseURL, timeout: 5000 });

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const config = error.config;
      if (!config) return Promise.reject(error);

      config._retryCount = config._retryCount || 0;
      config._attemptLogs = config._attemptLogs || [];

      const status = error.response ? error.response.status : (error.code || 'UNKNOWN_ERROR');
      const transient = isTransientError(error);

      if (!transient || config._retryCount >= maxRetries) {
        config._attemptLogs.push({
          attempt: config._retryCount + 1,
          status,
          retried: false,
          reason: !transient ? 'Permanent/non-retriable error' : 'Max retry budget exhausted'
        });
        error.attemptLogs = config._attemptLogs;
        console.error(
          `[RETRY-CLIENT] Halting retries on attempt ${config._retryCount + 1}: status=${status}, transient=${transient}`
        );
        return Promise.reject(error);
      }

      const delayMs = calculateFullJitterDelay(config._retryCount, baseDelayMs, maxDelayMs);
      config._retryCount += 1;

      config._attemptLogs.push({
        attempt: config._retryCount,
        status,
        retried: true,
        backoffJitterMs: delayMs
      });

      console.warn(
        `[RETRY-CLIENT] Attempt ${config._retryCount} failed (status=${status}). ` +
        `Retrying in ${delayMs}ms (Full Jitter)...`
      );

      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return client(config);
    }
  );

  return client;
}

module.exports = { createRetryingClient, calculateFullJitterDelay };
