const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  if (!req.matchedRoute || !req.matchedRoute.requiresAuth) {
    return next();
  }
  
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Token de autenticação não fornecido ou formato inválido. Use: Bearer <token>'
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {

    const secret = process.env.JWT_SECRET || 'chave-secreta-padrao-mudar-em-producao';
    const decoded = jwt.verify(token, secret);
    
    req.user = decoded;
    req.userId = decoded.userId || decoded.id;
    
    console.log(`Autenticado: Usuário ${req.userId} acessando ${req.originalUrl}`);
    next();
  } catch (error) {
    console.error('Erro na autenticação:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid Token',
        message: 'Token inválido ou malformado'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token Expired',
        message: 'Token expirado. Faça login novamente'
      });
    }
    
    return res.status(401).json({
      error: 'Authentication Failed',
      message: 'Falha na autenticação'
    });
  }
};

const generateToken = (userId, userData = {}) => {
  const secret = process.env.JWT_SECRET || 'chave-secreta-padrao-mudar-em-producao';
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  
  const payload = {
    userId,
    ...userData,
    iat: Math.floor(Date.now() / 1000)
  };
  
  return jwt.sign(payload, secret, { expiresIn });
};

module.exports = { authMiddleware, generateToken };