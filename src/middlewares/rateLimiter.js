const createRedisClient = require('../config/redis');

const redisClient = createRedisClient();
redisClient.connect();

const rateLimiter = async (req, res, next) => {
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000;
  const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;
  
  const clientIp = req.ip || req.connection.remoteAddress;
  const key = `rate_limit:${clientIp}`;
  
  try {
    const currentRequests = await redisClient.get(key);
    const requestsCount = currentRequests ? parseInt(currentRequests) : 0;
    
    if (requestsCount >= maxRequests) {
      const ttl = await redisClient.ttl(key);
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `Limite de requisições excedido. Tente novamente em ${ttl} segundos.`,
        limit: maxRequests,
        window: windowMs / 60000 + ' minutos',
        remainingTime: ttl
      });
    }
    
    if (requestsCount === 0) {
      await redisClient.setEx(key, Math.ceil(windowMs / 1000), '1');
    } else {
      await redisClient.incr(key);
    }
    
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', maxRequests - (requestsCount + 1));
    res.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + Math.ceil(windowMs / 1000));
    
    next();
  } catch (error) {
    console.error('Rate limiter error:', error);
    next();
  }
};

module.exports = rateLimiter;