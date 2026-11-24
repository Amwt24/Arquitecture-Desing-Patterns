require('dotenv').config();
const express = require('express');
const os = require('os');

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT) || 3008;

// Environment detection: simulates on-premises vs AWS EC2 deployment
const DEPLOYMENT_ENV = process.env.DEPLOYMENT_ENV || 'on-premises';
const EC2_INSTANCE_ID = process.env.EC2_INSTANCE_ID || null;
const EC2_INSTANCE_TYPE = process.env.EC2_INSTANCE_TYPE || null;
const AWS_REGION = process.env.AWS_REGION || null;
const AMI_ID = process.env.AMI_ID || null;

const startTime = Date.now();

// Legacy monolithic application data (all business logic in one process)
const legacyData = {
  customers: [
    { id: 1001, name: 'Acme Corp', tier: 'enterprise', contract: '2023-01-01' },
    { id: 1002, name: 'TechStartup Inc', tier: 'standard', contract: '2024-03-15' }
  ],
  inventory: [
    { sku: 'SKU-A100', name: 'Legacy ERP Module', version: '5.2.1', licenses: 50 },
    { sku: 'SKU-B200', name: 'On-Prem Database', version: '11.0', licenses: 10 }
  ],
  orders: [
    { id: 'ORD-5001', customerId: 1001, total: 25000, status: 'FULFILLED' },
    { id: 'ORD-5002', customerId: 1002, total: 8500, status: 'PROCESSING' }
  ]
};

// Infrastructure metadata endpoint
app.get('/health', (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  res.status(200).json({
    status: 'healthy',
    deploymentEnvironment: DEPLOYMENT_ENV,
    infrastructure: DEPLOYMENT_ENV === 'aws-ec2'
      ? {
          type: 'AWS EC2',
          instanceId: EC2_INSTANCE_ID,
          instanceType: EC2_INSTANCE_TYPE,
          region: AWS_REGION,
          amiId: AMI_ID,
          migrationStrategy: 'Lift-and-Shift (Rehosting)'
        }
      : {
          type: 'On-Premises',
          hostname: os.hostname(),
          platform: os.platform(),
          arch: os.arch(),
          totalMemoryMB: Math.round(os.totalmem() / 1024 / 1024),
          freeMemoryMB: Math.round(os.freemem() / 1024 / 1024)
        },
    application: {
      name: 'Legacy ERP System v5.2',
      uptime: `${uptimeSeconds}s`,
      pid: process.pid,
      nodeVersion: process.version
    }
  });
});

// Legacy monolithic endpoints (all in one app — classic monolith pattern)
app.get('/customers', (req, res) => {
  console.log(`[LEGACY-APP:${DEPLOYMENT_ENV}] GET /customers`);
  res.status(200).json({ deploymentEnv: DEPLOYMENT_ENV, customers: legacyData.customers });
});

app.get('/inventory', (req, res) => {
  console.log(`[LEGACY-APP:${DEPLOYMENT_ENV}] GET /inventory`);
  res.status(200).json({ deploymentEnv: DEPLOYMENT_ENV, inventory: legacyData.inventory });
});

app.get('/orders', (req, res) => {
  console.log(`[LEGACY-APP:${DEPLOYMENT_ENV}] GET /orders`);
  res.status(200).json({ deploymentEnv: DEPLOYMENT_ENV, orders: legacyData.orders });
});

// Migration status endpoint — shows before/after environment comparison
app.get('/migration/status', (req, res) => {
  res.status(200).json({
    migrationStrategy: 'Lift-and-Shift (Rehosting)',
    description: 'The application binary and configuration are moved to AWS EC2 without code changes',
    currentEnvironment: DEPLOYMENT_ENV,
    phases: [
      {
        phase: 1,
        name: 'Assessment',
        status: 'COMPLETED',
        description: 'Application dependencies and resource requirements documented'
      },
      {
        phase: 2,
        name: 'AMI Creation',
        status: DEPLOYMENT_ENV === 'aws-ec2' ? 'COMPLETED' : 'PENDING',
        description: 'On-premises server imaged using AWS Application Migration Service (MGN) or VM Import'
      },
      {
        phase: 3,
        name: 'EC2 Launch',
        status: DEPLOYMENT_ENV === 'aws-ec2' ? 'COMPLETED' : 'PENDING',
        description: 'AMI deployed as EC2 instance in target VPC with same application behavior'
      },
      {
        phase: 4,
        name: 'DNS Cutover',
        status: DEPLOYMENT_ENV === 'aws-ec2' ? 'COMPLETED' : 'PENDING',
        description: 'Route 53 / on-premises DNS updated to point to EC2 Elastic IP'
      }
    ],
    awsServices: [
      'AWS Application Migration Service (MGN)',
      'Amazon EC2',
      'Amazon VPC',
      'Amazon Route 53',
      'AWS Elastic IP'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`[LEGACY-APP] Legacy ERP System started on port ${PORT}`);
  console.log(`[LEGACY-APP] Deployment environment: ${DEPLOYMENT_ENV}`);
  if (DEPLOYMENT_ENV === 'aws-ec2') {
    console.log(`[LEGACY-APP] Running on EC2 instance: ${EC2_INSTANCE_ID} (${EC2_INSTANCE_TYPE}) in ${AWS_REGION}`);
  }
});
