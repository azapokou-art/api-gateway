CREATE TABLE IF NOT EXISTS blocked_ips (
    id SERIAL PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL UNIQUE,
    reason VARCHAR(255) NOT NULL,
    blocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    blocked_until TIMESTAMP,
    is_permanent BOOLEAN DEFAULT FALSE,
    created_by VARCHAR(100) DEFAULT 'system'
);

CREATE TABLE IF NOT EXISTS access_logs (
    id SERIAL PRIMARY KEY,
    ip_address VARCHAR(45),
    user_id VARCHAR(100),
    method VARCHAR(10),
    path VARCHAR(500),
    status_code INTEGER,
    response_time INTEGER, 
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    service_name VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS system_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT,
    description VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    roles TEXT[] DEFAULT '{"user"}'
);

CREATE INDEX idx_blocked_ips_ip ON blocked_ips(ip_address);
CREATE INDEX idx_access_logs_timestamp ON access_logs(timestamp);
CREATE INDEX idx_access_logs_ip ON access_logs(ip_address);
CREATE INDEX idx_access_logs_user_id ON access_logs(user_id);

INSERT INTO system_config (config_key, config_value, description) 
VALUES 
('rate_limit_default', '100', 'Limite padrão de requisições por janela'),
('rate_limit_window', '900000', 'Janela de tempo padrão em ms (15 minutos)'),
('max_login_attempts', '5', 'Máximo de tentativas de login falhas antes de bloquear IP'),
('block_duration_minutes', '60', 'Duração do bloqueio temporário em minutos')
ON CONFLICT (config_key) DO NOTHING;

-- (senha: admin123 - mudar em produção!)
INSERT INTO users (username, email, password_hash, roles) 
VALUES ('admin', 'admin@gateway.local', '$2b$10$YourHashedPasswordHere', '{"admin","user"}')
ON CONFLICT (username) DO NOTHING;