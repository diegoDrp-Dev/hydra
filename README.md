# Koryn Security Platform

**Koryn Security Platform**, uma solução HOJO, é uma plataforma defensiva de operações de segurança para ingestão de telemetria, detecção, priorização de risco, investigação de incidentes e automação SOAR governada.

## Início rápido no Windows

1. Instale e abra o Docker Desktop.
2. Execute `start-koryn.cmd`.
3. Acesse <http://localhost:5173>.

O inicializador cria um segredo JWT aleatório quando ainda não existe `.env`, sobe PostgreSQL, Redis, API, workers e frontend e aguarda os health checks. Para encerrar preservando os volumes, execute `stop-koryn.cmd`.

## Comandos

```bash
npm install
npm run validate
npm run koryn:boot
npm run koryn:down
```

Endpoints locais:

- Console: <http://localhost:5173>
- API: <http://localhost:3000>
- OpenAPI: <http://localhost:3000/docs>
- Saúde: <http://localhost:3000/ready>

## Arquitetura

O monorepo contém o console React/Vite, uma API Fastify/TypeScript, PostgreSQL com Prisma, Redis/BullMQ, workers de detecção e SOAR e notificações em tempo real via WebSocket. Todos os recursos SOC modernos carregam `tenantId` e são filtrados pelo tenant autenticado.

Consulte [ARCHITECTURE.md](./ARCHITECTURE.md), [docs/RUNNING.md](./docs/RUNNING.md) e [SECURITY_REVIEW.md](./SECURITY_REVIEW.md).

## Laboratório e dados vazios

O mapa e as tabelas exibem somente telemetria pertencente ao tenant da sessão. Se “Casos” estiver vazio, crie um caso pela API ou execute o seed do laboratório com as mesmas credenciais do usuário do console. Um token de outro tenant não é aceito como fonte de dados.

## Migração de identidade

Esta plataforma era conhecida anteriormente por outro nome. Identificadores internos antigos de banco, canal WebSocket, Redis e armazenamento do navegador são mantidos apenas durante a janela de compatibilidade descrita em [MIGRATION_KORYN.md](./MIGRATION_KORYN.md). A identidade pública e visual oficial é Koryn Security Platform by HOJO.

## Segurança

Não faça commit de `.env`, tokens, chaves ou credenciais. Scans e webhooks bloqueiam destinos privados por padrão. O modo SOAR de execução real permanece desabilitado até ativação explícita e deve ser usado somente em ambientes autorizados.

