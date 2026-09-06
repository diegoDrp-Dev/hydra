# Arquitetura da Koryn Security Platform

## Visão geral

```text
Browser / Koryn Console
          |
     REST + WebSocket
          |
 Fastify API Gateway ---- Redis / BullMQ ---- Detection and SOAR workers
          |
   Prisma / PostgreSQL
```

## Componentes

- `apps/web`: console React, autenticação, postura SOC, casos, eventos e mapa de exposição.
- `apps/api-gateway`: API Fastify, autenticação JWT, autorização RBAC, isolamento de tenant, auditoria e WebSocket.
- `prisma`: modelo relacional e migrações.
- Redis/BullMQ: filas de scan, correlação e automações assíncronas.
- Workers: processamento defensivo, enriquecimento, risco e respostas governadas.

## Fronteiras de confiança

1. O navegador envia JWT de curta validade no cabeçalho ou subprotocolo WebSocket.
2. A API valida assinatura, emissor, audiência e associação ao tenant.
3. Rotas SOC filtram consultas pelo `tenantId`; recursos legados vinculados ao usuário são filtrados pela associação do usuário ao tenant.
4. Filas carregam identificadores de usuário/tenant e workers nunca devem confiar em URLs sem política de destino.
5. Integrações externas passam pela política anti-SSRF, sem redirects e com limites de tempo e corpo.

## Disponibilidade e consistência

PostgreSQL é a fonte de verdade. Redis é efêmero para filas, rate limiting e fan-out. O limitador de autenticação falha fechado se Redis estiver indisponível; limites gerais podem falhar aberto para preservar a visibilidade SOC. WebSocket complementa, mas não substitui, a atualização periódica do console.

## Compatibilidade

Consulte [MIGRATION_KORYN.md](./MIGRATION_KORYN.md) para os identificadores antigos preservados temporariamente e o plano de remoção.
