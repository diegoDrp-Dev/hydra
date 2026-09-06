# Estrutura da Koryn Security Platform

```text
.
├── apps/
│   ├── api-gateway/     # Fastify, Prisma, workers, filas e testes
│   └── web/             # Console React/Vite
├── docs/
│   ├── adr/             # decisões arquiteturais
│   └── RUNNING.md       # operação local
├── docker-compose.yml
├── start-koryn.cmd
├── stop-koryn.cmd
├── ARCHITECTURE.md
├── MIGRATION_KORYN.md
└── SECURITY_REVIEW.md
```

Arquivos gerados (`dist`, `.turbo`, cobertura e cliente Prisma) e segredos locais são excluídos pelo `.gitignore`.
