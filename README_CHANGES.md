# Histórico da transição Koryn

## Identidade

- Produto: Koryn Security Platform
- Marca: HOJO
- Posicionamento: plataforma defensiva de detecção, investigação e resposta

## Alterações principais

- identidade visual, textos, metadados, favicon, launchers e nomes de containers atualizados;
- migração temporária de token, protocolo WebSocket e canal Redis;
- JWT fortalecido com emissor e audiência;
- rate limiting de autenticação fail-closed;
- políticas anti-SSRF para scans e webhooks;
- redaction de credenciais em logs;
- consultas administrativas legadas isoladas por tenant;
- validações de entrada e limites WebSocket reforçados;
- documentação operacional e revisão de segurança atualizadas.

Detalhes de compatibilidade: [MIGRATION_KORYN.md](./MIGRATION_KORYN.md).
