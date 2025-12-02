const createRedisClient = require('../config/redis');

const redisClient = createRedisClient();
redisClient.connect();

const cacheMiddleware = (options = {}) => {
  const ttl = options.ttl || 300;
  
  return async (req, res, next) => {
    console.log(`[CACHE] Check: ${req.method} ${req.originalUrl}`);
    console.log(`[CACHE] matchedRoute exists: ${!!req.matchedRoute}`);
    console.log(`[CACHE] cache flag: ${req.matchedRoute?.cache}`);
    
    if (!req.matchedRoute) {
      console.log(`[CACHE] Skip: No matchedRoute`);
      return next();
    }
    
    if (!req.matchedRoute.cache) {
      console.log(`[CACHE] Skip: cache=false for this route`);
      return next();
    }
    
    if (req.method !== 'GET') {
      console.log(`[CACHE] Skip: method=${req.method}, only GET`);
      return next();
    }
    
    const cacheKey = `cache:${req.method}:${req.originalUrl}`;
    
    try {
      const cached = await redisClient.get(cacheKey);
      
      if (cached) {
        console.log(`[CACHE] HIT: ${cacheKey}`);
        const data = JSON.parse(cached);
        
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);
        res.setHeader('X-Cache-TTL', ttl);
        
        return res.status(200).json(data);
      }
      
      console.log(`[CACHE] MISS: ${cacheKey}`);
      
      const originalJson = res.json;
      res.json = function(body) {
        if (res.statusCode === 200) {
          redisClient.setEx(cacheKey, ttl, JSON.stringify(body))
            .then(() => console.log(`[CACHE] Saved: ${cacheKey}`))
            .catch(err => console.error('[CACHE] Save error:', err));
        }
        
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('X-Cache-Key', cacheKey);
        res.setHeader('X-Cache-TTL', ttl);
        
        originalJson.call(this, body);
      };
      
      next();
      
    } catch (error) {
      console.error('[CACHE] Error:', error);
      next();
    }
  };
};

module.exports = { cacheMiddleware };