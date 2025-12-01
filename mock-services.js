const express = require('express');

const authService = express();
authService.use(express.json());

authService.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === 'admin' && password === 'admin123') {
    res.json({
      success: true,
      token: 'mock-jwt-token-for-' + username,
      user: { id: 1, username, role: 'admin' }
    });
  } else {
    res.status(401).json({ 
      success: false, 
      error: 'Credenciais inválidas' 
    });
  }
});

authService.post('/auth/register', (req, res) => {
  const { username, email, password } = req.body;
  
  res.json({
    success: true,
    message: 'Usuário registrado com sucesso',
    user: { id: Math.floor(Math.random() * 1000), username, email }
  });
});

authService.get('/auth/verify', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (token && token.includes('mock-jwt-token')) {
    res.json({
      valid: true,
      user: { id: 1, username: 'admin', role: 'admin' }
    });
  } else {
    res.status(401).json({ valid: false, error: 'Token inválido' });
  }
});

authService.get('/auth/profile', (req, res) => {
  res.json({
    id: 1,
    username: 'admin',
    email: 'admin@example.com',
    role: 'admin',
    createdAt: new Date().toISOString()
  });
});

authService.listen(3001, () => {
  console.log('Auth Service rodando na porta 3001');
});

const usersService = express();
usersService.use(express.json());

const mockUsers = [
  { id: 1, name: 'João Silva', email: 'joao@email.com', role: 'user' },
  { id: 2, name: 'Maria Santos', email: 'maria@email.com', role: 'user' },
  { id: 3, name: 'Admin User', email: 'admin@email.com', role: 'admin' }
];

usersService.get('/users', (req, res) => {
  res.json({
    users: mockUsers,
    count: mockUsers.length,
    page: 1,
    totalPages: 1
  });
});

usersService.post('/users', (req, res) => {
  const newUser = {
    id: mockUsers.length + 1,
    ...req.body,
    createdAt: new Date().toISOString()
  };
  mockUsers.push(newUser);
  
  res.status(201).json(newUser);
});

usersService.get('/users/:id', (req, res) => {
  const user = mockUsers.find(u => u.id === parseInt(req.params.id));
  
  if (user) {
    res.json(user);
  } else {
    res.status(404).json({ error: 'Usuário não encontrado' });
  }
});

usersService.put('/users/:id', (req, res) => {
  const index = mockUsers.findIndex(u => u.id === parseInt(req.params.id));
  
  if (index !== -1) {
    mockUsers[index] = { ...mockUsers[index], ...req.body, updatedAt: new Date().toISOString() };
    res.json(mockUsers[index]);
  } else {
    res.status(404).json({ error: 'Usuário não encontrado' });
  }
});

usersService.delete('/users/:id', (req, res) => {
  const index = mockUsers.findIndex(u => u.id === parseInt(req.params.id));
  
  if (index !== -1) {
    const deleted = mockUsers.splice(index, 1);
    res.json({ message: 'Usuário deletado', user: deleted[0] });
  } else {
    res.status(404).json({ error: 'Usuário não encontrado' });
  }
});

usersService.listen(3002, () => {
  console.log('Users Service rodando na porta 3002');
});

const productsService = express();
productsService.use(express.json());

const mockProducts = [
  { id: 1, name: 'Notebook', price: 3500.00, category: 'eletrônicos', stock: 10 },
  { id: 2, name: 'Smartphone', price: 2000.00, category: 'eletrônicos', stock: 25 },
  { id: 3, name: 'Camiseta', price: 49.90, category: 'vestuário', stock: 100 },
  { id: 4, name: 'Livro', price: 79.90, category: 'livros', stock: 50 }
];

productsService.get('/products', (req, res) => {
  const { category } = req.query;
  
  let filtered = mockProducts;
  if (category) {
    filtered = mockProducts.filter(p => p.category === category);
  }
  
  res.json({
    products: filtered,
    count: filtered.length,
    totalValue: filtered.reduce((sum, p) => sum + p.price, 0)
  });
});

productsService.post('/products', (req, res) => {
  const newProduct = {
    id: mockProducts.length + 1,
    ...req.body,
    createdAt: new Date().toISOString()
  };
  mockProducts.push(newProduct);
  
  res.status(201).json(newProduct);
});

productsService.get('/products/:id', (req, res) => {
  const product = mockProducts.find(p => p.id === parseInt(req.params.id));
  
  if (product) {
    res.json(product);
  } else {
    res.status(404).json({ error: 'Produto não encontrado' });
  }
});

productsService.put('/products/:id', (req, res) => {
  const index = mockProducts.findIndex(p => p.id === parseInt(req.params.id));
  
  if (index !== -1) {
    mockProducts[index] = { ...mockProducts[index], ...req.body, updatedAt: new Date().toISOString() };
    res.json(mockProducts[index]);
  } else {
    res.status(404).json({ error: 'Produto não encontrado' });
  }
});

productsService.delete('/products/:id', (req, res) => {
  const index = mockProducts.findIndex(p => p.id === parseInt(req.params.id));
  
  if (index !== -1) {
    const deleted = mockProducts.splice(index, 1);
    res.json({ message: 'Produto deletado', product: deleted[0] });
  } else {
    res.status(404).json({ error: 'Produto não encontrado' });
  }
});

productsService.get('/products/category/:category', (req, res) => {
  const filtered = mockProducts.filter(p => p.category === req.params.category);
  res.json({
    category: req.params.category,
    products: filtered,
    count: filtered.length
  });
});

productsService.listen(3003, () => {
  console.log('Products Service rodando na porta 3003');
});

const paymentsService = express();
paymentsService.use(express.json());

const mockPayments = [
  { id: 'pay_001', amount: 3500.00, status: 'completed', userId: 1, createdAt: '2024-01-15' },
  { id: 'pay_002', amount: 2000.00, status: 'pending', userId: 2, createdAt: '2024-01-16' },
  { id: 'pay_003', amount: 129.90, status: 'failed', userId: 1, createdAt: '2024-01-17' }
];

paymentsService.post('/payments/create', (req, res) => {
  const { amount, userId, method } = req.body;
  
  const newPayment = {
    id: 'pay_' + Math.random().toString(36).substr(2, 9),
    amount,
    userId,
    method: method || 'credit_card',
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  
  mockPayments.push(newPayment);
  
  res.status(201).json({
    success: true,
    payment: newPayment,
    message: 'Pagamento criado com sucesso'
  });
});

paymentsService.get('/payments/:id', (req, res) => {
  const payment = mockPayments.find(p => p.id === req.params.id);
  
  if (payment) {
    res.json(payment);
  } else {
    res.status(404).json({ error: 'Pagamento não encontrado' });
  }
});

paymentsService.listen(3004, () => {
  console.log('Payments Service rodando na porta 3004');
});

console.log('Todos os serviços mock estão rodando:');
console.log('   Auth:      http://localhost:3001');
console.log('   Users:     http://localhost:3002');
console.log('   Products:  http://localhost:3003');
console.log('   Payments:  http://localhost:3004');
console.log('');
console.log('Para testar o gateway, inicie estes serviços em outro terminal:');
console.log('   node mock-services.js');