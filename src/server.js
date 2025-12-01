const express = require('express');
const dotenv = require('dotenv');

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
    documentation: '/health para verificar saúde da API'
  });
});

app.listen(PORT, () => {
  console.log(`ervidor rodando na porta ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});