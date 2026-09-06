# Migração para Koryn Security Platform

## Escopo

A identidade pública passa a ser **Koryn Security Platform by HOJO**. A migração evita perda de volumes, sessões em andamento e mensagens durante atualização gradual.

## Compatibilidade temporária

| Item | Identidade atual | Compatibilidade | Remoção sugerida |
|---|---|---|---|
| Token no navegador | `koryn_token` em `sessionStorage` | token antigo em `localStorage` é lido uma vez, migrado e apagado | próxima major após a adoção do console novo |
| Subprotocolo WebSocket | `koryn` | o identificador antigo ainda é aceito pelo servidor | após todos os clientes serem atualizados |
| Canal Redis de incidentes | `koryn:incidents` | API assina também o canal antigo; worker publica somente no novo | após drenar workers antigos |
| PostgreSQL local | variáveis `DB_USER`, `DB_PASSWORD`, `DB_NAME` existentes | padrões legados permanecem para reutilizar `postgres_data` | migração operacional planejada, com backup e restore |

## Procedimento

1. Faça backup do PostgreSQL e do `.env` local.
2. Encerre a versão anterior preservando volumes.
3. Execute `start-koryn.cmd`; o Compose recria containers com nomes Koryn e reaproveita os volumes nomeados do projeto.
4. Autentique novamente. Tokens emitidos antes da inclusão de `issuer` e `audience` podem ser recusados por design.
5. Confirme `/ready`, console, filas e atualizações em tempo real.
6. Atualize integrações para o canal e subprotocolo atuais antes de remover a compatibilidade.

Não renomeie diretamente banco ou volume em produção. Faça uma migração explícita, testada e reversível.
