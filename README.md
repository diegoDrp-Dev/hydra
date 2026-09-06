# Koryn Security Platform — by HOJO

Plataforma defensiva para operações SOC: ingestão de telemetria, detecção, priorização de risco, investigação de incidentes e automação SOAR governada. O monorepo reúne o console React/Vite, API Fastify/TypeScript, PostgreSQL/Prisma, Redis/BullMQ e workers especializados.

## Início rápido no Windows

Pré-requisitos: Docker Desktop com Docker Compose, Node.js 22+ e Git.

1. Clone o repositório e entre na pasta do projeto.
2. Execute `start-koryn.cmd`.
3. Aguarde a mensagem `Koryn esta operacional`.
4. Acesse <http://localhost:5173> e entre ou crie um workspace.

O inicializador abre o Docker Desktop quando necessário, cria um `.env` local com segredos aleatórios caso ele ainda não exista, constrói toda a stack e aguarda os health checks. Para encerrar sem apagar os dados persistentes, execute `stop-koryn.cmd`.

> Nunca envie `.env`, senhas, tokens ou chaves ao Git. O arquivo local já é ignorado pelo repositório.

## Serviços locais

| Serviço | Endereço |
|---|---|
| Console operacional | <http://localhost:5173> |
| API | <http://localhost:3000> |
| OpenAPI | <http://localhost:3000/docs> |
| Readiness | <http://localhost:3000/ready> |

Para conferir o estado e acompanhar logs:

```bash
docker compose ps
docker compose logs -f api worker soar-worker web
```

## Desenvolvimento

```bash
npm install
npm run validate
npm run koryn:boot
npm run koryn:down
```

`npm run validate` executa typecheck, testes, lint e build de produção. Consulte [docs/RUNNING.md](./docs/RUNNING.md) para configuração e diagnóstico detalhados.

## Arquitetura e dados

Todos os recursos SOC modernos carregam `tenantId` e são filtrados pelo tenant autenticado. O dashboard não fabrica métricas: alertas, incidentes, riscos, eventos e scans são carregados da API, enquanto atualizações em tempo real usam WebSocket com polling HTTP como fallback.

O card **Asset telemetry** conta alvos únicos observados nos scans e nos campos de host/rede dos eventos carregados. Ele representa telemetria observada, não uma quantidade de agentes instalados.

Mais detalhes estão em [ARCHITECTURE.md](./ARCHITECTURE.md), [SECURITY_REVIEW.md](./SECURITY_REVIEW.md) e [apps/web/README.md](./apps/web/README.md).

## Laboratório

O laboratório deve autenticar com uma conta já existente na Koryn. Use no ambiente do laboratório as mesmas credenciais do usuário do console; o seed associa os registros ao tenant retornado pela autenticação.

Depois da simulação, entre com a mesma conta e use **Refresh**. O mapa de exposição utiliza scans e eventos. Casos não são criados automaticamente por qualquer evento: eles precisam ser abertos pelo fluxo operacional ou por um seed que crie casos explicitamente.

## Segurança

- Scans e webhooks bloqueiam destinos privados por padrão.
- A execução real de SOAR permanece desabilitada até ativação explícita.
- Habilite ações ofensivas, alvos privados ou webhooks internos somente em ambientes próprios e autorizados.
- Não use credenciais de produção no laboratório.

## Compatibilidade de identidade

A identidade pública e visual é **Koryn Security Platform by HOJO**. Alguns identificadores internos antigos de banco, Redis, WebSocket e armazenamento do navegador são preservados temporariamente para manter compatibilidade com instalações existentes; consulte [MIGRATION_KORYN.md](./MIGRATION_KORYN.md).

## Licença e uso

Uso restrito aos termos definidos pelo proprietário do repositório. Operações de segurança devem ser executadas apenas em sistemas e redes devidamente autorizados.
