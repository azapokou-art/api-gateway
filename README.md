# API Gateway com Rate Limiter

Um API Gateway completo com rate limiting, autenticação JWT, cache, roteamento dinâmico e proxy HTTP, construído com Node.js, Express, PostgreSQL e Redis.

## Funcionalidades

- **Rate Limiting**: Limite de requisições por IP/janela de tempo
- **Autenticação JWT**: Middleware para rotas protegidas
- **Roteamento Dinâmico**: Configuração via JSON de serviços
- **Proxy HTTP**: Redirecionamento para serviços backend
- **Cache em Redis**: Cache opcional por rota (TTL configurável)
- **Bloqueio de IPs**: Automático e manual via PostgreSQL
- **Logs de Acesso**: Timestamp, método, status, tempo de resposta
- **Limite de Payload**: Proteção contra payloads muito grandes
- **Tratamento de Erros**: Respostas padronizadas em JSON
- **Health Check**: Endpoint para monitoramento
- **Admin API**: Rotas para gerenciamento de IPs bloqueados

## Tecnologias

- **Node.js** + **Express** - Servidor HTTP
- **PostgreSQL** - Armazenamento persistente (IPs bloqueados, logs)
- **Redis** - Rate limiting e cache
- **Docker** + **Docker Compose** - Containers do Redis e PostgreSQL
- **Axios** - Cliente HTTP para proxy
- **JWT** - Autenticação por tokens
- **dotenv** - Variáveis de ambiente

## Arquitetura
Cliente
↓
API Gateway (Express)
├── Middleware: Logs
├── Middleware: Bloqueio de IPs (PostgreSQL)
├── Middleware: Rate Limiter (Redis)
├── Middleware: Autenticação JWT
├── Middleware: Cache (Redis)
├── Router Dinâmico (services.json)
└── Proxy HTTP → Serviços Backend

text

## Estrutura do Projeto
api-gateway/
├── src/
│ ├── config/
│ │ ├── database.js # Conexão PostgreSQL
│ │ └── redis.js # Conexão Redis
│ ├── middlewares/
│ │ ├── auth.js # Autenticação JWT
│ │ ├── cache.js # Cache com Redis
│ │ ├── ipBlocker.js # Bloqueio de IPs
│ │ ├── logger.js # Logs de acesso
│ │ └── rateLimiter.js # Rate limiting
│ ├── services/
│ │ └── router.js # Roteador dinâmico
│ └── server.js # Ponto de entrada
├── sql/
│ └── init.sql # Scripts do PostgreSQL
├── tests/ # Testes (futuro)
├── services.json # Configuração de serviços
├── docker-compose.yml # Redis + PostgreSQL
├── mock-services.js # Serviços mock para testes
├── .env # Variáveis de ambiente
└── README.md # Esta documentação

text

## Instalação

### Pré-requisitos
- Node.js 14+
- Docker Desktop

Instale as dependências

## Passos

bash
npm install
Configure as variáveis de ambiente

bash
cp .env.example .env
# Edite o .env com suas configurações
Inicie os containers Docker

bash
docker-compose up -d
Inicie os serviços mock (para testes)

bash
node mock-services.js
Inicie o API Gateway

bash
node src/server.js
 
 Configuração
services.json
Configure os serviços backend no arquivo services.json:

json
{
  "services": {
    "auth": {
      "baseUrl": "http://127.0.0.1:3001",
      "routes": [
        {
          "path": "/auth/login",
          "methods": ["POST"],
          "requiresAuth": false,
          "cache": false
        }
      ]
    }
  }
}
Variáveis de Ambiente (.env)
env
PORT=3000
REDIS_HOST=localhost
REDIS_PORT=6379
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gateway_db
DB_USER=gateway_user
DB_PASSWORD=gateway_password
JWT_SECRET=sua-chave-secreta
MAX_PAYLOAD_SIZE=1mb

Endpoints
Públicos
GET / - Informações do gateway

GET /health - Health check

GET /services - Lista serviços configurados

POST /auth/login - Login (exemplo de proxy)

Protegidos (Rate Limit)
GET /api/protected - Exemplo com rate limiting

GET /api/limited - Outro exemplo

Admin (Requer autenticação)
GET /admin/blocked-ips - Lista IPs bloqueados

POST /admin/block-ip - Bloqueia IP manualmente

DELETE /admin/unblock-ip/:ip - Desbloqueia IP

Testando
Teste o Rate Limiting
bash
# Execute várias vezes para testar o limite
curl http://localhost:3000/api/protected
Teste o Proxy
bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
Teste o Cache
bash
# Primeira execução: X-Cache: MISS
curl -i http://localhost:3000/products

# Segunda execução (dentro de 5 min): X-Cache: HIT
curl -i http://localhost:3000/products
Teste Autenticação
bash
# Rota sem autenticação
curl http://localhost:3000/products

# Rota com autenticação (requer token)
curl http://localhost:3000/users \
  -H "Authorization: Bearer seu-token-jwt"

