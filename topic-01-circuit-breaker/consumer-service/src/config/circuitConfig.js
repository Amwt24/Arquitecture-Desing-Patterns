module.exports = {
  // Maximum time (ms) to wait for upstream before marking call as failed
  timeout: Number(process.env.CB_TIMEOUT_MS) || 2000,
  // Percentage of failures within rolling window required to trip the breaker
  errorThresholdPercentage: Number(process.env.CB_ERROR_THRESHOLD_PCT) || 50,
  // Cooldown duration (ms) in OPEN state before transitioning to HALF-OPEN
  resetTimeout: Number(process.env.CB_RESET_TIMEOUT_MS) || 10000,
  // Minimum request count before error percentage is evaluated
  volumeThreshold: Number(process.env.CB_VOLUME_THRESHOLD) || 4,
  // Rolling statistical window duration (ms) and bucket granularity
  rollingCountTimeout: 10000,
  rollingCountBuckets: 10,
  // Do NOT trip the circuit breaker on client-side HTTP 4xx errors
  errorFilter: (err) => {
    if (err.response && err.response.status >= 400 && err.response.status < 500) {
      return true; // Returning true tells Opossum to ignore this error for circuit stats
    }
    return false;
  }
};
