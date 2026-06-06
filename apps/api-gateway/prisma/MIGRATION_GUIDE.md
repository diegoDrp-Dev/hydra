# Hydra Risk Engine, Incidents & Alerts Migration

This migration adds:
- Risk table (for detected security risks)
- Incident table (for aggregated security incidents)
- Alert table (for notification delivery tracking)
- AlertSubscription table (for webhook subscriptions)
- WebhookEvent table (for webhook delivery audit)
- Supporting indexes and constraints

## Running Migration

### Using Prisma Migrations (Recommended):
```bash
cd apps/api-gateway

# Create migration from schema changes
npx prisma migrate dev --name add_risk_engine

# Or push schema directly to database (dev only)
npx prisma db push
```

### Using SQL Migration:
```bash
# If using raw SQL migration
psql -h localhost -U hydra -d hydra < migrations/001_add_risk_engine.sql
```

## Rollback (if needed):
```bash
# Prisma will create a backup and ask for confirmation
npx prisma migrate resolve --rolled-back add_risk_engine
```

## After Migration:
```bash
# Regenerate Prisma client
npx prisma generate

# Seed data (if seed script exists)
npx prisma db seed
```

## Verification:
```bash
# Check schema
npx prisma studio

# Or query directly
psql -h localhost -U hydra -d hydra -c "\dt"
```
