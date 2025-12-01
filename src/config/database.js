const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'gateway_db',
  user: process.env.DB_USER || 'gateway_user',
  password: process.env.DB_PASSWORD || 'gateway_password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('Erro ao conectar ao PostgreSQL:', err.message);
  } else {
    console.log('Conectado ao PostgreSQL com sucesso');
    release();
  }
});

const logAccess = async (logData) => {
  const {
    ip_address,
    user_id,
    method,
    path,
    status_code,
    response_time,
    user_agent,
    service_name
  } = logData;
  
  const query = `
    INSERT INTO access_logs 
    (ip_address, user_id, method, path, status_code, response_time, user_agent, service_name)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `;
  
  try {
    await pool.query(query, [
      ip_address,
      user_id,
      method,
      path,
      status_code,
      response_time,
      user_agent,
      service_name
    ]);
  } catch (error) {
    console.error('Erro ao salvar log de acesso:', error.message);
  }
};

const isIpBlocked = async (ipAddress) => {
  const query = `
    SELECT * FROM blocked_ips 
    WHERE ip_address = $1 
    AND (is_permanent = TRUE OR blocked_until > NOW())
    LIMIT 1
  `;
  
  try {
    const result = await pool.query(query, [ipAddress]);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Erro ao verificar IP bloqueado:', error.message);
    return null;
  }
};

const blockIp = async (ipAddress, reason, blockedUntil = null, isPermanent = false, createdBy = 'system') => {
  const query = `
    INSERT INTO blocked_ips (ip_address, reason, blocked_until, is_permanent, created_by)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (ip_address) 
    DO UPDATE SET 
      reason = EXCLUDED.reason,
      blocked_until = EXCLUDED.blocked_until,
      is_permanent = EXCLUDED.is_permanent,
      blocked_at = CURRENT_TIMESTAMP
  `;
  
  try {
    await pool.query(query, [ipAddress, reason, blockedUntil, isPermanent, createdBy]);
    console.log(`IP ${ipAddress} bloqueado. Motivo: ${reason}`);
    return true;
  } catch (error) {
    console.error('Erro ao bloquear IP:', error.message);
    return false;
  }
};

const getConfig = async (configKey) => {
  const query = 'SELECT config_value FROM system_config WHERE config_key = $1';
  
  try {
    const result = await pool.query(query, [configKey]);
    return result.rows.length > 0 ? result.rows[0].config_value : null;
  } catch (error) {
    console.error('Erro ao obter configuração:', error.message);
    return null;
  }
};

module.exports = {
  pool,
  logAccess,
  isIpBlocked,
  blockIp,
  getConfig
};