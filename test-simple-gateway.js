const express = require('express');
const httpProxy = require('http-proxy');

const app = express();
const proxy = httpProxy.createProxyServer({});
const PORT = 3005;

app.use(express.json());

app.get('/test', (req, res) => {
  res.json({ message: 'Gateway simples funcionando' });
});

app.post('/auth/login', (req, res) => {
  console.log('Proxy para /auth/login');
  
  proxy.web(req, res, {
    target: 'http://localhost:3001',
    changeOrigin: true
  }, (err) => {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Proxy failed' });
  });
});

app.listen(PORT, () => {
  console.log(`Gateway simples na porta ${PORT}`);
  console.log(`Teste: curl -X POST http://localhost:${PORT}/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}'`);
});