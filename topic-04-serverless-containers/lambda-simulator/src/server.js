require('dotenv').config();
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { handler } = require('./handler');

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT) || 3003;

// Simulate Lambda cold start tracking
let isColdStart = true;

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

/**
 * Simulates the Lambda + API Gateway invocation path:
 * POST /invoke → builds Lambda event + context → runs handler → returns response
 */
app.post('/invoke', async (req, res) => {
  const awsRequestId = uuidv4();
  const coldStart = isColdStart;
  isColdStart = false; // Subsequent calls are warm starts

  // Build Lambda execution context (mirrors AWS Lambda context object)
  const context = {
    functionName: process.env.FUNCTION_NAME || 'ArchPatterns-DataProcessor',
    functionVersion: '$LATEST',
    awsRequestId,
    invokedFunctionArn: `arn:aws:lambda:us-east-1:123456789012:function:ArchPatterns-DataProcessor`,
    memoryLimitInMB: process.env.MEMORY_LIMIT_MB || '512',
    logGroupName: '/aws/lambda/ArchPatterns-DataProcessor',
    coldStart
  };

  // Build Lambda event (mirrors API Gateway proxy integration event)
  const event = {
    action: req.body.action || 'PROCESS_ORDER',
    payload: req.body.payload || {},
    httpMethod: req.method,
    path: req.path,
    headers: req.headers,
    requestContext: {
      requestId: awsRequestId,
      stage: 'local'
    }
  };

  console.log(`[LAMBDA] Invoking function (coldStart=${coldStart}, requestId=${awsRequestId})`);

  try {
    const response = await handler(event, context);
    console.log(`[LAMBDA] Success: requestId=${awsRequestId}, duration=${response.lambdaContext.executionDurationMs}ms`);
    return res.status(200).json(response);
  } catch (err) {
    console.error(`[LAMBDA] Error: requestId=${awsRequestId}, message=${err.message}`);
    return res.status(500).json({
      statusCode: 500,
      errorType: err.name || 'FunctionError',
      errorMessage: err.message,
      lambdaContext: { functionName: context.functionName, requestId: awsRequestId }
    });
  }
});

// List available actions
app.get('/actions', (req, res) => {
  res.json({
    availableActions: [
      { action: 'PROCESS_ORDER', payload: { items: ['item1', 'item2'] } },
      { action: 'RESIZE_IMAGE', payload: { key: 'uploads/photo.jpg' } },
      { action: 'SEND_NOTIFICATION', payload: { email: 'user@example.com' } }
    ]
  });
});

app.listen(PORT, () => {
  console.log(`[LAMBDA] Local Lambda simulator listening on port ${PORT}`);
});
