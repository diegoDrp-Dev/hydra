# Executando a Koryn Security Platform

## Docker Desktop no Windows

Execute `start-koryn.cmd`. O script abre o Docker Desktop quando necessário, cria `.env` local com JWT aleatório, executa `docker compose up -d --build` e abre o console após API e frontend responderem.

Para encerrar sem apagar dados, use `stop-koryn.cmd` ou:

```bash
docker compose down --remove-orphans
```

Para apagar volumes deliberadamente, faça backup e execute manualmente `docker compose down --volumes`.

## Variáveis principais

| Variável | Padrão local | Observação |
|---|---|---|
| `JWT_SECRET` | sem padrão | obrigatório, aleatório e com 32+ caracteres |
| `JWT_ISSUER` | `koryn-security-platform` | emissor validado |
| `JWT_AUDIENCE` | `koryn-console` | audiência validada |
| `CORS_ORIGINS` | `http://localhost:5173` | lista separada por vírgulas |
| `ALLOW_PRIVATE_SCAN_TARGETS` | `false` | habilite somente em laboratório autorizado |
| `WEBHOOK_ALLOW_PRIVATE_TARGETS` | `false` | mantenha falso fora de redes controladas |
| `SOAR_EXECUTION_ENABLED` | `false` | execução real exige ativação explícita |

Os nomes antigos usados como padrão do banco local são preservados para não romper volumes existentes. Eles não representam a identidade pública do produto.

## Diagnóstico

```bash
docker compose ps
docker compose logs -f api worker soar-worker web
docker compose config
curl http://localhost:3000/ready
```

Se PostgreSQL ou Redis tiverem conflitos locais, as portas do host podem ser alteradas no Compose. Os serviços internos usam a rede Docker e não dependem das portas publicadas.

## Laboratório

O seed precisa autenticar com uma conta existente e usa o tenant retornado pela API. Depois do seed, entre no console com essa mesma conta e pressione “Refresh”. Casos não são criados automaticamente por telemetria: devem ser gerados pelo seed específico ou abertos por um analista a partir de alertas.
