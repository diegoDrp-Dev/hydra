# Koryn Security Platform Security Review

## Executive Summary

Revisão defensiva realizada em 5 de setembro de 2026 sobre o monorepo Koryn. Foram confirmados problemas de SSRF, isolamento multi-tenant, autenticação, WebSocket, logging, configuração e componentes vulneráveis. As correções de aplicação foram implementadas sem apagar dados ou migrations. Nenhum achado crítico foi confirmado. Riscos residuais que exigem decisão arquitetural são registrados abaixo.

## Rebranding Completed

A identidade visível foi atualizada para **Koryn Security Platform by HOJO** no console, API, Swagger, containers, scripts e documentação. Identificadores antigos restantes são exclusivamente compatibilidade transitória ou nomes do banco local preservados; veja `MIGRATION_KORYN.md`.

## Architecture Observed

React/Vite no frontend; Fastify e JWT na API; Prisma/PostgreSQL como fonte de verdade; Redis/BullMQ para filas e eventos; workers separados para análise e SOAR; WebSocket autenticado para atualização em tempo real; adaptadores HTTPS para webhooks.

## Security Findings

| ID | Severidade | Componente/arquivo | Trecho afetado | Cenário e impacto | Correção/teste | Status |
|---|---|---|---|---|---|---|
| KSP-001 | HIGH | Alertas / `webhook.service.ts`, adapters | URL de webhook fornecida pelo usuário | SSRF contra localhost, metadata ou rede interna | política HTTPS/DNS anti-SSRF, sem redirects, limites; testes unitários | FIXED |
| KSP-002 | HIGH | Scanner / `security.worker.ts` | redirects automáticos após validar URL inicial | redirect para destino privado contornava a política | redirects desativados e logs minimizados; testes existentes de target policy | FIXED |
| KSP-003 | HIGH | Incidentes legados / repository e controller | admin open/stats globais | administrador de um tenant podia observar agregados/registros de outro | filtro por associação ao tenant; typecheck/testes | FIXED |
| KSP-004 | HIGH | Dependências / lockfile | pacotes com advisories publicados | bypass, path traversal, DoS e SSRF em componentes transitivos | versões seguras, remoção de dependências não usadas; `npm audit` | FIXED |
| KSP-005 | MEDIUM | Auth / JWT | assinatura sem issuer/audience | token válido poderia ser reutilizado fora do contexto pretendido | emissão e validação de `iss`/`aud`; typecheck/testes | FIXED |
| KSP-006 | MEDIUM | Auth / rate limiting | falha aberta quando Redis caía | brute force durante indisponibilidade do limitador | login/register retornam 503; demais rotas preservam disponibilidade | FIXED |
| KSP-007 | MEDIUM | WebSocket / `socket.ts` | origin, tamanho e frequência não limitados | abuso de conexão, mensagens excessivas e cross-site WS | allowlist de origin, 4 KiB e 60 mensagens/minuto | FIXED |
| KSP-008 | MEDIUM | Logging / logger e workers | headers e URLs completas | credenciais ou parâmetros sensíveis podiam chegar aos logs | redaction e logging somente do hostname/metadados | FIXED |
| KSP-009 | MEDIUM | Frontend / `App.tsx` | JWT persistente em localStorage | maior janela de exposição em caso de XSS | migração única e armazenamento em sessionStorage | PARTIAL |
| KSP-010 | MEDIUM | Redis / Compose e cliente | serviço sem autenticação | processo na rede Docker poderia manipular filas/canais | senha aleatória obrigatória e Redis não publicado | FIXED |
| KSP-011 | LOW | Schemas Fastify | propriedades extras e filtros livres | coerção/mass assignment futuro e entradas ambíguas | `additionalProperties: false`, enums e limites | FIXED |
| KSP-012 | LOW | Docker/Swagger | portas globais, privilégio e auth persistida | exposição local desnecessária e retenção de token | bind em loopback, `no-new-privileges`, usuário não-root, persistência desligada | FIXED |

## Critical Findings

Nenhum achado crítico confirmado.

## High Findings

KSP-001 a KSP-004 foram corrigidos. SSRF foi tratado em todas as saídas HTTP controladas por usuário identificadas, e consultas administrativas legadas agora respeitam tenant.

## Medium Findings

KSP-005 a KSP-010 foram tratados. KSP-009 permanece parcial porque uma sessão baseada em bearer token ainda é acessível ao JavaScript da mesma origem.

## Low Findings

KSP-011 e KSP-012 foram corrigidos com validação, redução de exposição e defaults mais seguros.

## Fixed Vulnerabilities

Onze achados receberam correção completa. A atualização de dependências reduziu o relatório auditável a zero vulnerabilidades conhecidas no lockfile no momento da revisão. Nenhum `--force` ou major upgrade indiscriminado foi usado, exceto a atualização direcionada e compatível do plugin Swagger UI necessária para corrigir seu servidor estático.

## Remaining Risks

- **MEDIUM — sessão bearer no navegador:** `sessionStorage` reduz persistência, mas não substitui cookie `HttpOnly`, refresh-token rotativo e revogação. Essa mudança exige contrato de sessão/CSRF e deve ser projetada antes da adoção.
- **MEDIUM — DNS rebinding:** validação DNS antes da conexão e redirects bloqueados reduzem SSRF, mas pinagem do endereço resolvido exigiria agente HTTP dedicado e política IPv4/IPv6 testada.
- **LOW — perfil Compose de desenvolvimento:** bind mount do repositório e servidores `watch` são apropriados ao ambiente local, não a produção. Produção deve usar imagens imutáveis, filesystem read-only e secrets manager.
- **LOW — compatibilidade transitória:** aliases antigos de WebSocket/Redis ampliam temporariamente a superfície protocolar. Remover na próxima major após telemetria de adoção.

## Dependency Risks

`npm audit` foi executado antes e depois das atualizações. O primeiro resultado continha 20 vulnerabilidades (14 high, 3 moderate, 3 low). Dependências compatíveis foram atualizadas, Swagger UI foi corrigido e bibliotecas de mapa não utilizadas foram removidas. Resultado final esperado/validado: zero vulnerabilidades conhecidas. Novos advisories podem surgir; execute a auditoria no CI.

## Infrastructure Risks

Portas locais estão vinculadas a `127.0.0.1`; Redis não publica porta; containers usam `no-new-privileges` e Dockerfiles abandonam root. O Compose é perfil de desenvolvimento e não implementa TLS, orquestração de secrets, quotas completas ou segmentação de produção.

## Authentication Review

Senhas usam bcrypt, JWT restringe HS256 e agora valida expiração, emissor e audiência. Segredo JWT é obrigatório e o launcher gera valor criptograficamente aleatório. Login/register têm rate limiting fail-closed. Revogação e refresh tokens não existem e constam como evolução arquitetural.

## API Security Review

Prisma utiliza queries parametrizadas. Rotas SOC verificadas filtram tenant e recursos relacionados são validados antes de conexão. Schemas relevantes rejeitam propriedades adicionais. Payload global, paginação e quotas específicas de ingestão devem continuar sendo revisados conforme exposição pública.

## Frontend Security Review

Não foi localizado `dangerouslySetInnerHTML` ou escrita direta em `innerHTML`. React escapa valores renderizados. O token antigo é migrado e removido do armazenamento persistente. CORS continua restrito por allowlist. O tooltip do radar foi corrigido sem inserir HTML não confiável.

## Backend Security Review

Erros públicos são normalizados; logs redigem credenciais. Scanner e webhooks aplicam política de destino. SOAR mantém allowlist de ações e execução real desabilitada por padrão. Workers continuam separados da API.

## Docker Security Review

Imagens têm tags major fixadas, portas somente em loopback, Redis autenticado, `no-new-privileges` e usuário `node`. Recomenda-se multi-stage build e imagens sem ferramentas de desenvolvimento para produção.

## Database Security Review

Nenhuma migration foi apagada ou reescrita. Defaults antigos do banco local foram mantidos para preservar volumes. O modelo SOC moderno possui `tenantId`; o modelo legado vinculado ao usuário foi isolado através de `TenantMembership`. Faça backup antes de renomear banco, usuário ou volume.

## Recommendations

1. Projetar sessão com cookies `HttpOnly`, `Secure`, `SameSite`, refresh rotativo e revogação.
2. Criar imagens de produção multi-stage/read-only e usar secret manager.
3. Adicionar teste de integração PostgreSQL para BOLA/tenant e teste WebSocket de origin/rate limit.
4. Implementar pinagem DNS nos clientes HTTP se webhooks/scans forem expostos a usuários não confiáveis em produção.
5. Executar SAST, secret scanning, SBOM, audit e testes no CI a cada alteração.

## Tests Performed

- inventário com `rg --files` e busca semântica de identidade/segredos/sinks perigosos;
- `npm run typecheck`;
- 14 testes unitários Node, incluindo política anti-SSRF;
- ESLint do frontend;
- build TypeScript e Vite de produção;
- `npm audit` antes/depois;
- `docker compose config --quiet`;
- busca por `dangerouslySetInnerHTML`, raw SQL e execução de processos.

## Files Modified

Frontend, API, adaptadores, filas, WebSocket, Dockerfiles, Compose, launchers, manifests, lockfile, documentação, migração de marca e testes de segurança. A lista precisa pode ser obtida com `git diff --name-only`.
