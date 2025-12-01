const { isIpBlocked, blockIp, getConfig } = require('../config/database');
const createRedisClient = require('../config/redis');

const redisClient = createRedisClient();
redisClient.connect();

const ipBlockerMiddleware = async (req, res, next) => {
  const clientIp = req.ip || req.connection.remoteAddress;
  
  const blockedRecord = await isIpBlocked(clientIp);
  
  if (blockedRecord) {
    const timeLeft = blockedRecord.blocked_until 
      ? Math.ceil((new Date(blockedRecord.blocked_until) - new Date()) / 1000)
      : 'permanent';
    
    return res.status(403).json({
      error: 'Forbidden',
      message: `Seu IP (${clientIp}) está bloqueado`,
      reason: blockedRecord.reason,
      blocked_at: blockedRecord.blocked_at,
      blocked_until: blockedRecord.blocked_until,
      time_left_seconds: timeLeft,
      is_permanent: blockedRecord.is_permanent
    });
  }
  
  const failedAuthKey = `failed_auth:${clientIp}`;
  try {
    const failedAttempts = await redisClient.get(failedAuthKey);
    const maxAttempts = await getConfig('max_login_attempts') || 5;
    
    if (parseInt(failedAttempts || 0) >= maxAttempts) {
    
      const blockDuration = await getConfig('block_duration_minutes') || 60;
      const blockedUntil = new Date(Date.now() + blockDuration * 60000);
      
      await blockIp(
        clientIp, 
        'Muitas tentativas de autenticação falhas', 
        blockedUntil, 
        false, 
        'auto-blocker'
      );
      
      await redisClient.del(failedAuthKey);
      
      return res.status(403).json({
        error: 'Forbidden',
        message: `IP bloqueado devido a múltiplas tentativas falhas. Tente novamente em ${blockDuration} minutos.`,
        reason: 'Muitas tentativas de autenticação falhas'
      });
    }
  } catch (error) {
    console.error('Erro ao verificar tentativas falhas:', error);
  }
  
  const rateLimitExceedKey = `rate_exceed:${clientIp}`;
  try {
    const exceedCount = await redisClient.get(rateLimitExceedKey);
    const maxExceed = 10;
    
    if (parseInt(exceedCount || 0) >= maxExceed) {
      const blockedUntil = new Date(Date.now() + 24 * 60 * 60000);
      
      await blockIp(
        clientIp,
        'Excesso recorrente de rate limiting',
        blockedUntil,
        false,
        'rate-limit-blocker'
      );
      
      await redisClient.del(rateLimitExceedKey);
      
      return res.status(403).json({
        error: 'Forbidden',
        message: 'IP bloqueado por excesso recorrente de requisições',
        reason: 'Múltiplas violações de rate limiting'
      });
    }
  } catch (error) {
    console.error('Erro ao verificar excedências de rate limit:', error);
  }
  
  req.clientIp = clientIp;
  const originalSend = res.send;
  res.send = function(body) {
    if (res.statusCode === 429) {
      incrementRateLimitExceed(clientIp).catch(console.error);
    }
    originalSend.call(this, body);
  };
  
  next();
};

async function incrementRateLimitExceed(ip) {
  const key = `rate_exceed:${ip}`;
  try {
    const current = await redisClient.get(key);
    if (current) {
      await redisClient.incr(key);
    } else {
      await redisClient.setEx(key, 3600, '1');
    }
  } catch (error) {
    console.error('Erro ao incrementar contador de rate exceed:', error);
  }
}

const recordFailedAuth = async (ip) => {
  const key = `failed_auth:${ip}`;
  try {
    const current = await redisClient.get(key);
    if (current) {
      await redisClient.incr(key);
    } else {
      await redisClient.setEx(key, 300, '1');
    }
  } catch (error) {
    console.error('Erro ao registrar tentativa falha:', error);
  }
};

const clearFailedAuth = async (ip) => {
  const key = `failed_auth:${ip}`;
  try {
    await redisClient.del(key);
  } catch (error) {
    console.error('Erro ao limpar tentativas falhas:', error);
  }
};

const adminRoutes = {
  setup: (app) => {
    app.get('/admin/blocked-ips', async (req, res) => {
      try {
        const { pool } = require('../config/database');
        const result = await pool.query(
          'SELECT * FROM blocked_ips ORDER BY blocked_at DESC LIMIT 100'
        );
        res.json(result.rows);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    app.post('/admin/block-ip', async (req, res) => {
      const { ip, reason, duration_minutes, permanent } = req.body;
      
      if (!ip || !reason) {
        return res.status(400).json({ error: 'IP e motivo são obrigatórios' });
      }
      
      let blockedUntil = null;
      if (!permanent && duration_minutes) {
        blockedUntil = new Date(Date.now() + duration_minutes * 60000);
      }
      
      const success = await blockIp(
        ip, 
        reason, 
        blockedUntil, 
        permanent || false, 
        req.userId || 'admin'
      );
      
      if (success) {
        res.json({ message: `IP ${ip} bloqueado com sucesso` });
      } else {
        res.status(500).json({ error: 'Erro ao bloquear IP' });
      }
    });
    
    app.delete('/admin/unblock-ip/:ip', async (req, res) => {
      const { ip } = req.params;
      
      try {
        const { pool } = require('../config/database');
        await pool.query('DELETE FROM blocked_ips WHERE ip_address = $1', [ip]);
        res.json({ message: `IP ${ip} desbloqueado com sucesso` });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }
};

module.exports = { 
  ipBlockerMiddleware, 
  recordFailedAuth, 
  clearFailedAuth,
  adminRoutes 
};