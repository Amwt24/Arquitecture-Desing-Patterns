require('dotenv').config();
const express = require('express');
const os = require('os');

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT) || 3006;
const INSTANCE_ID = process.env.INSTANCE_ID || `products-${os.hostname()}`;

const products = [
  { id: 'P001', name: 'Cloud Storage 100GB', price: 9.99, inStock: true },
  { id: 'P002', name: 'Virtual Machine Small', price: 29.99, inStock: true },
  { id: 'P003', name: 'Managed Database', price: 49.99, inStock: false }
];

app.get('/health', (req, res) => res.status(200).json({ status: 'ok', instance: INSTANCE_ID }));

app.get('/api/products', (req, res) => {
  console.log(`[SERVICE-B:${INSTANCE_ID}] GET /api/products (X-Request-ID: ${req.headers['x-request-id'] || 'none'})`);
  res.status(200).json({
    instance: INSTANCE_ID,
    hostname: os.hostname(),
    products,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/products/:id', (req, res) => {
  const product = products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  console.log(`[SERVICE-B:${INSTANCE_ID}] GET /api/products/${req.params.id}`);
  res.status(200).json({ instance: INSTANCE_ID, product });
});

app.listen(PORT, () => {
  console.log(`[SERVICE-B] Product Service running on port ${PORT} (instance=${INSTANCE_ID})`);
});
