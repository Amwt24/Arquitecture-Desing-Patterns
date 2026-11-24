/**
 * Lambda Handler — simulates an AWS Lambda function that processes
 * S3-triggered events (image resize, data processing, etc.)
 *
 * In production: deployed to AWS Lambda, triggered via API Gateway or S3 events
 * Locally: wrapped in Express to simulate the Lambda runtime environment
 */

// Lambda execution context simulator
const FUNCTION_TIMEOUT_MS = Number(process.env.FUNCTION_TIMEOUT_MS) || 15000;
const MEMORY_LIMIT_MB = Number(process.env.MEMORY_LIMIT_MB) || 512;

/**
 * Simulates the AWS Lambda handler function signature:
 * handler(event, context) => Promise<result>
 */
async function handler(event, context) {
  const startTime = Date.now();

  // Simulate memory and timeout constraints
  const timeoutTimer = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Task timed out after ' + FUNCTION_TIMEOUT_MS + 'ms')),
      FUNCTION_TIMEOUT_MS)
  );

  const work = async () => {
    // Simulate business logic: data transformation
    const { action, payload } = event;

    switch (action) {
      case 'PROCESS_ORDER': {
        await new Promise(r => setTimeout(r, 50)); // simulate async DB write
        return {
          orderId: `ORD-${Date.now()}`,
          status: 'PROCESSED',
          items: payload?.items || [],
          processedAt: new Date().toISOString()
        };
      }
      case 'RESIZE_IMAGE': {
        await new Promise(r => setTimeout(r, 100)); // simulate image processing
        return {
          originalKey: payload?.key || 'unknown',
          resizedKey: `resized/${payload?.key || 'image.jpg'}`,
          dimensions: '800x600',
          processedAt: new Date().toISOString()
        };
      }
      case 'SEND_NOTIFICATION': {
        await new Promise(r => setTimeout(r, 30));
        return {
          messageId: `msg-${Date.now()}`,
          recipient: payload?.email || 'user@example.com',
          status: 'SENT',
          sentAt: new Date().toISOString()
        };
      }
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  };

  const result = await Promise.race([work(), timeoutTimer]);
  const durationMs = Date.now() - startTime;

  return {
    statusCode: 200,
    result,
    lambdaContext: {
      functionName: context.functionName,
      requestId: context.awsRequestId,
      remainingTimeMs: FUNCTION_TIMEOUT_MS - durationMs,
      memoryLimitMB: MEMORY_LIMIT_MB,
      executionDurationMs: durationMs
    }
  };
}

module.exports = { handler };
