const createRedisClient = require('../config/redis');

const redisClient = createRedisClient();
redisClient.connect();

const cacheMiddleware = (options = {}) => {
  const ttl = options.ttl || 300;
  const prefix = options.prefix || 'cache:';
  const onlyMethods = options.onlyMethods || ['GET'];
  
  return async (req, res, next) => {
    if (!req.matchedRoute || !req.matchedRoute.cache) {
      return next();
    }
    
    if (!onlyMethods.includes(req.method)) {
      return next();
    }
    
    const cacheKey = `${prefix}${req.method}:${req.originalUrl}`;
    
    try {
      const cached = await redisClient.get(cacheKey);
      
      if (cached) {
        console.log(`Cache HIT: ${cacheKey}`);
        const data = JSON.parse(cached);
        
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);
        res.setHeader('X-Cache-TTL', ttl);
        
        return res.status(200).json(data);
      }
      
      console.log(`Cache MISS: ${cacheKey}`);
      
      const originalSend = res.send;
      const originalJson = res.json;
      
      res.send = function(body) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redisClient.setEx(cacheKey, ttl, JSON.stringify(body))
            .catch(err => console.error('Cache set error:', err));
        }
        originalSend.call(this, body);
      };
      
      res.json = function(body) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redisClient.setEx(cacheKey, ttl, JSON.stringify(body))
            .catch(err => console.error('Cache set error:', err));
        }
        originalJson.call(this, body);
      };
      
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('X-Cache-Key', cacheKey);
      res.setHeader('X-Cache-TTL', ttl);
      
      next();
      
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

const invalidateCache = async (pattern) => {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
      console.log(`Cache invalidated: ${keys.length} keys matching ${pattern}`);
    }
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
};

module.exports = { cacheMiddleware, invalidateCache };