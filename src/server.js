const express = require('express');
const dotenv = require('dotenv');
const rateLimiter = require('./middlewares/rateLimiter');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'UP', 
    message: 'API Gateway está funcionando',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'Bem-vindo ao API Gateway com Rate Limiter',
    endpoints: {
      health: '/health',
      protected: '/api/protected',
      limited: '/api/limited'
    },
    rate_limit: {
      window: process.env.RATE_LIMIT_WINDOW_MS / 60000 + ' minutos',
      max_requests: process.env.RATE_LIMIT_MAX_REQUESTS
    }
  });
});

app.get('/api/protected', rateLimiter, (req, res) => {
  res.json({ 
    message: 'Esta rota está protegida pelo rate limiter',
    timestamp: new Date().toISOString(),
    yourIp: req.ip
  });
});

app.get('/api/limited', rateLimiter, (req, res) => {
  res.json({ 
    message: 'Outra rota com limitação de taxa',
    timestamp: new Date().toISOString()
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'Rota não encontrada'
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Algo deu errado no servidor'
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Rota protegida: http://localhost:${PORT}/api/protected`);
});