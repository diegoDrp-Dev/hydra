# Hydra - Threat Detection & Risk Posture Platform

Hydra é uma plataforma profissional de detecção de ameaças e análise de postura de segurança construída com Node.js, TypeScript, Fastify e PostgreSQL.

## 🏗️ Arquitetura

### Componentes Principais

```
┌─────────────────────────────────────────────────┐
│              Hydra Platform                     │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │        Fastify API Gateway               │  │
│  │  ├─ Auth Module (JWT + bcrypt)          │  │
│  │  ├─ Scan Module                          │  │
│  │  ├─ Risk Engine                          │  │
│  │  ├─ Incident Management                  │  │
│  │  ├─ Alerts & Webhooks                    │  │
│  │  └─ WebSocket (Real-time)                │  │
│  └──────────────────────────────────────────┘  │
│                        │                        │
│  ┌─────────────┬───────┴────────┬──────────┐   │
│  │             │                │          │   │
│  ▼             ▼                ▼          ▼   │
│ [BullMQ]   [PostgreSQL]   [Redis]   [WebSocket]│
│  Queue      Database      Cache       Clients  │
│  Worker:    (Scans,       (Jobs)               │
│  Security   Risks,                             │
│  Scanner    Incidents)                         │
│                                                 │
└─────────────────────────────────────────────────┘
```

## 📦 Módulos Principais

### 1. **Risk Engine** (`/src/modules/risk-engine`)
Motor de avaliação de risco extensível com scoring 0-100.

**Componentes:**
- `RiskService`: Orquestra a avaliação de risco
- `RuleRegistry`: Gerencia regras (padrão + customizadas)
- `defaultRules`: Conjunto padrão de regras de segurança
- `DetectedRisk`: Modelo de risco detectado

**Regras Padrão:**
- HTTP Only (Critical: 40 pts)
- Missing HSTS (High: 20 pts)
- Missing CSP (High: 20 pts)
- Missing X-Content-Type-Options (Medium: 10 pts)
- Missing X-Frame-Options (Medium: 10 pts)
- Missing X-XSS-Protection (Low: 5 pts)
- 5xx Response (High: 15 pts)
- Slow Response (Medium: 8 pts)

**Uso:**
```typescript
const riskService = new RiskService();
const assessment = riskService.assessRisk({
  url: "https://example.com",
  headers: responseHeaders,
  statusCode: 200,
  responseTime: 234,
});

// Adicionar regra customizada
riskService.registerRule({
  id: "custom_rule",
  name: "Custom Security Check",
  description: "...",
  severity: "high",
  weight: 15,
  evaluate: (ctx) => { /* lógica */ }
});
```

### 2. **Incident Management** (`/src/modules/incidents`)
Gerenciamento automático de incidentes com deduplicação.

**Componentes:**
- `IncidentService`: Lógica de negócio
- `IncidentRepository`: Persistência
- `IncidentController`: HTTP handlers
- Deduplicação automática por hostname + risco

**Características:**
- Auto-geração a partir de scans
- Sistema de deduplicação baseado em hash
- Status tracking (open, investigating, resolved, false_positive)
- Associação com múltiplos riscos

**Endpoints:**
```
GET  /incidents              - Listar incidentes do usuário
GET  /incidents/:id          - Detalhes do incidente
PATCH /incidents/:id/status  - Atualizar status
GET  /incidents/admin/open   - Incidentes abertos
GET  /incidents/admin/stats  - Estatísticas
```

### 3. **Alerts & Webhooks** (`/src/modules/alerts`)
Sistema de notificação com suporte a múltiplos canais.

**Adapters Suportados:**
- **Discord**: Embed formatado com cores por severidade
- **Slack**: Rich message com fields estruturados
- **Generic**: JSON webhook padrão (customizável)

**Uso:**
```typescript
const webhookService = new WebhookService();

// Inscrever em notificações
await webhookService.subscribe(
  userId,
  "https://hooks.discord.com/...",
  "discord",
  ["critical", "high"]
);

// Notificar subscribers
await webhookService.notifySubscribers(incident);
```

**Payload Discord:**
```json
{
  "embeds": [{
    "title": "[CRITICAL] Security Issues on example.com",
    "color": 16711680,
    "fields": [
      { "name": "Severity", "value": "CRITICAL" },
      { "name": "Risk Score", "value": "85/100" }
    ]
  }]
}
```

### 4. **Real-time Notifications** (`/src/websocket`)
WebSocket para notificações em tempo real.

**Uso do Cliente:**
```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'incident') {
    console.log('Novo incidente:', message.data);
  }
};

// Inscrever em sala
ws.send(JSON.stringify({ type: 'subscribe', room: 'incidents' }));

// Keepalive
setInterval(() => {
  ws.send(JSON.stringify({ type: 'ping' }));
}, 30000);
```

### 5. **Queue & Worker** (`/src/queues`, `/src/workers`)
Sistema de fila com retry e backoff.

**Configuração:**
- Retry: 3 tentativas
- Backoff: Exponencial (2s → 4s → 8s)
- DLQ: Fila de letras mortas
- Concorrência: 5 jobs paralelos

**Uso:**
```typescript
await addScanJob({
  url: "https://example.com",
  userId: "user-123"
});
```

### 6. **Logging** (`/src/lib/logger.ts`)
Logging estruturado com Pino.

**Modo Desenvolvimento:** Pretty-printed com cores
**Modo Produção:** JSON para agregação

```typescript
logger.info({ userId: "123" }, "User logged in");
logger.error({ error: err }, "Database connection failed");
logger.debug({ trace: "..." }, "Debug information");
```

## 🚀 Quick Start

### 1. Clone e Setup
```bash
git clone <repo>
cd hydra
npm install
```

### 2. Configurar Variáveis
```bash
cp apps/api-gateway/.env.example apps/api-gateway/.env
# Editar .env conforme necessário
```

### 3. Setup Database
```bash
cd apps/api-gateway
npx prisma migrate dev
npx prisma db seed  # (opcional)
```

### 4. Rodar com Docker Compose
```bash
npm run hydra:boot

# API: http://localhost:3000
# Docs: http://localhost:3000/docs
# WebSocket: ws://localhost:3000/ws
```

### 5. Rodar Localmente (modo dev)
```bash
# Terminal 1: API
npm --workspace=api-gateway run dev

# Terminal 2: Worker
npm --workspace=api-gateway run worker
```

## 📊 Workflow Típico

1. **Usuário cria scan** via POST `/scans`
2. **Job é adicionado** à fila BullMQ
3. **Worker processa** (fetch, avaliação de risco)
4. **Risks são salvos** no banco
5. **Incidente é gerado** (se há riscos detectados)
6. **Webhooks são enviados** aos subscribers
7. **WebSocket broadcast** para clientes conectados

## 🧪 Testes

```bash
npm --workspace=api-gateway test
# ou com watch
npm --workspace=api-gateway test -- --watch
```

**Arquivos de Teste:**
- `tests/risk-engine.test.ts`
- `tests/incident.test.ts`

## 📝 Modelo de Dados

### Tabelas Principais
```sql
-- Scans
CREATE TABLE Scan {
  id String @id
  url String
  statusCode Int
  duration Int
  score Int (0-100)
  severity String
  risks Risk[]
  incident Incident?
}

-- Risks
CREATE TABLE Risk {
  id String @id
  scanId String
  ruleId String
  severity String
  score Int (0-100)
  description String
}

-- Incidents
CREATE TABLE Incident {
  id String @id
  title String
  description String
  severity String
  riskScore Int (0-100)
  status String (open|investigating|resolved|false_positive)
  deduplicationKey String @unique
  risks Risk[]
  alerts Alert[]
}

-- Alert Subscriptions
CREATE TABLE AlertSubscription {
  id String @id
  userId String
  webhookUrl String
  webhookType String (discord|slack|generic)
  severities String[] (filtros de severidade)
}
```

## 🔐 Segurança

- **JWT**: Autenticação com tokens
- **Bcrypt**: Hashing de senhas (10 rounds)
- **CORS**: Habilitado para localhost (configurar em produção)
- **Validação**: JSON Schema em todos os endpoints
- **Logging**: Estruturado para auditoria
- **Variáveis de Ambiente**: Sensíveis não são commitadas

## 🎯 SOLID Principles

- **SRP**: Cada módulo tem responsabilidade única
- **OCP**: Extensível via RuleRegistry, Adapters
- **LSP**: Interfaces bem definidas
- **ISP**: Interfaces segregadas (detalhadas)
- **DIP**: Depende de abstrações, não implementações

## 📚 Estrutura de Diretórios

```
hydra/
├── apps/
│   ├── api-gateway/
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── scans/
│   │   │   │   ├── risk-engine/
│   │   │   │   │   ├── types/
│   │   │   │   │   ├── services/
│   │   │   │   │   ├── rules/
│   │   │   │   │   └── repositories/
│   │   │   │   ├── incidents/
│   │   │   │   │   ├── services/
│   │   │   │   │   ├── repositories/
│   │   │   │   │   ├── controllers/
│   │   │   │   │   └── routes/
│   │   │   │   └── alerts/
│   │   │   │       ├── services/
│   │   │   │       └── adapters/
│   │   │   ├── websocket/
│   │   │   ├── lib/
│   │   │   │   ├── logger.ts
│   │   │   │   └── prisma.ts
│   │   │   ├── config/
│   │   │   ├── queues/
│   │   │   ├── workers/
│   │   │   └── app.ts
│   │   ├── prisma/
│   │   ├── tests/
│   │   ├── package.json
│   │   └── Dockerfile
│   └── web/
└── docker-compose.yml
```

## 🔄 Próximos Passos

1. **Autenticação Avançada**
   - OAuth2/OIDC
   - MFA
   - SSO

2. **Compliance & Reporting**
   - CIS Benchmarks
   - OWASP Top 10
   - Reports PDF/CSV

3. **Machine Learning**
   - Anomaly detection
   - Predictive risk scoring

4. **Integração com Ferramentas**
   - SIEM (Splunk, ELK)
   - Ticketing (Jira, ServiceNow)
   - APM (DataDog, New Relic)

5. **Performance**
   - Caching estratégico
   - Query optimization
   - Horizontal scaling

## 📞 Support

Para issues e sugestões, abra um issue no repositório.

---

**Desenvolvido com ❤️ para segurança em produção**
