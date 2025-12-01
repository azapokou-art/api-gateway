const express = require('express');
const dotenv = require('dotenv');
const rateLimiter = require('./middlewares/rateLimiter');
const loggerMiddleware = require('./middlewares/logger');
const { authMiddleware } = require('./middlewares/auth');
const router = require('./services/router');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: process.env.MAX_PAYLOAD_SIZE || '1mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.MAX_PAYLOAD_SIZE || '1mb' }));

app.use(loggerMiddleware);

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'UP', 
    message: 'API Gateway está funcionando',
    timestamp: new Date().toISOString(),
    services: Object.keys(require('../services.json').services),
    features: ['rate-limiting', 'dynamic-routing', 'jwt-auth', 'logging', 'proxy']
  });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'Bem-vindo ao API Gateway com Rate Limiter',
    endpoints: {
      health: '/health',
      protected: '/api/protected',
      limited: '/api/limited',
      services: '/services'
    },
    features: {
      rate_limit: {
        window: process.env.RATE_LIMIT_WINDOW_MS / 60000 + ' minutos',
        max_requests: process.env.RATE_LIMIT_MAX_REQUESTS
      },
      authentication: 'JWT Bearer token',
      dynamic_routing: 'Configurável via services.json'
    }
  });
});

app.get('/services', (req, res) => {
  const servicesConfig = require('../services.json');
  res.json({
    services: servicesConfig.services,
    global: servicesConfig.global
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

app.use(router.getMiddleware());

app.use(authMiddleware);

app.use((req, res, next) => {
  if (req.matchedRoute) {
    const route = req.matchedRoute;
    
    if (route.rateLimit) {
      return rateLimiter(req, res, () => {
        router.proxyRequest(req, res, route);
      });
    } else {
      return router.proxyRequest(req, res, route);
    }
  }
  
  next();
});

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'Rota não encontrada',
    path: req.originalUrl
  });
});

app.use((err, req, res, next) => {
  console.error('Erro no gateway:', err.stack);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Algo deu errado no servidor';
  
  res.status(statusCode).json({
    error: err.name || 'Internal Server Error',
    message: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Serviços configurados: http://localhost:${PORT}/services`);
  console.log(`Exemplo de rota com proxy: http://localhost:${PORT}/auth/login`);
  console.log(`Exemplo de rota protegida: http://localhost:${PORT}/api/protected`);
});