require('dotenv').config();
const express = require('express');
const os = require('os');

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT) || 3004;
const TASK_ID = process.env.TASK_ID || `ecs-task-${process.pid}`;
const startTime = Date.now();

// ECS-style container metadata simulation
const containerMetadata = {
  taskId: TASK_ID,
  cluster: process.env.CLUSTER_NAME || 'ArchPatterns-Cluster',
  taskDefinition: 'arch-patterns-service:1',
  launchType: 'FARGATE',
  cpu: process.env.TASK_CPU || '256',
  memory: process.env.TASK_MEMORY || '512',
  networkMode: 'awsvpc',
  region: 'us-east-1',
  startedAt: new Date(startTime).toISOString()
};

// In-memory "database" (ECS tasks can connect to RDS/DynamoDB)
const productCatalog = [
  { id: '001', name: 'Cloud Storage Plan', price: 9.99, category: 'storage' },
  { id: '002', name: 'Compute Instance M5', price: 49.99, category: 'compute' },
  { id: '003', name: 'Managed Database RDS', price: 29.99, category: 'database' }
];

// ECS health check endpoint (ALB target health check)
app.get('/health', (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  res.status(200).json({
    status: 'healthy',
    taskId: TASK_ID,
    uptimeSeconds,
    hostname: os.hostname(),
    memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
  });
});

// ECS metadata endpoint (simulates ECS Task Metadata Endpoint v4)
app.get('/metadata', (req, res) => {
  res.status(200).json({
    ...containerMetadata,
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    hostname: os.hostname()
  });
});

// Business API - Products listing
app.get('/api/products', (req, res) => {
  const { category } = req.query;
  const results = category
    ? productCatalog.filter(p => p.category === category)
    : productCatalog;

  console.log(`[ECS:${TASK_ID}] GET /api/products (category=${category || 'all'}) → ${results.length} items`);
  res.status(200).json({
    taskId: TASK_ID,
    hostname: os.hostname(),
    products: results,
    servedAt: new Date().toISOString()
  });
});

app.get('/api/products/:id', (req, res) => {
  const product = productCatalog.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  console.log(`[ECS:${TASK_ID}] GET /api/products/${req.params.id}`);
  res.status(200).json({ taskId: TASK_ID, hostname: os.hostname(), product });
});

app.listen(PORT, () => {
  console.log(`[ECS] Container service started (taskId=${TASK_ID}, port=${PORT})`);
  console.log(`[ECS] Simulates AWS ECS Fargate long-running container task`);
});
