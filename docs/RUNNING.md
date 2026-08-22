# Running Hydra

## Prerequisites
- **Docker Desktop** installed and running.
- **Node.js 18+** (required only for local development mode).
- **Git**.

## Environment Setup
Copy the template to create your local environment file:
```bash
cp apps/api-gateway/.env.example apps/api-gateway/.env
```

### Required Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `DB_USER` | PostgreSQL username | `hydra` |
| `DB_PASSWORD` | PostgreSQL password | `hydra` |
| `DB_NAME` | PostgreSQL database name | `hydra` |
| `DATABASE_URL` | Prisma connection string | `postgresql://hydra:hydra@postgres:5432/hydra` |
| `REDIS_HOST` | Redis hostname | `redis` |
| `REDIS_PORT` | Redis port | `6379` |
| `JWT_SECRET` | JWT signing key (required; 32+ characters in production) | none |
| `ALLOW_PRIVATE_SCAN_TARGETS` | Allows private/loopback targets for an authorized local lab | `false` |
| `CORS_ORIGINS` | Comma-separated browser origins | `http://localhost:5173` |

## Running with Docker (Recommended)

The Docker setup is fully orchestrated. The API and Worker containers are configured to automatically run `prisma generate` and `prisma migrate deploy` on startup.

### Full boot
```bash
docker-compose down --remove-orphans -v
docker-compose up -d --build
```

### Check status
```bash
docker ps
docker-compose logs -f
```

### Individual service logs
```bash
docker logs -f hydra-api
docker logs -f hydra-worker
docker logs -f hydra-postgres
docker logs -f hydra-redis
```

### Stop and clean
```bash
npm run hydra:down
```

## Running Locally (Without Docker)

### 1. Start infrastructure (Docker only for DB + Redis)
```bash
docker-compose up postgres redis -d
```

### 2. Apply migrations
Navigate to the gateway and apply the schema:
```bash
cd apps/api-gateway
npx prisma generate
npx prisma migrate dev
```

### 3. Start services (3 terminals)
**Terminal 1 — API:**
```bash
npm --workspace=api-gateway run dev
```

**Terminal 2 — Worker:**
```bash
npm --workspace=api-gateway run worker
```

**Terminal 3 — Frontend:**
```bash
npm --workspace=web run dev
```

## Access Points
| Service   | URL                        |
|-----------|----------------------------|
| Dashboard | http://localhost:5173      |
| API       | http://localhost:3000      |
| Docs      | http://localhost:3000/docs |
| WebSocket | ws://localhost:3000/ws     |

## Database Management

All commands should be executed inside `apps/api-gateway`:
```bash
npx prisma migrate deploy   # Apply migrations to production/docker
npx prisma migrate dev      # Create/apply migrations in development
npx prisma migrate reset    # Reset (WARNING: deletes all data)
npx prisma studio           # Open database GUI
```

## Testing the API

### Health Check
```bash
curl http://localhost:3000/health
```

### Submit a scan (PowerShell)
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/scan" -Method Post `
  -Headers @{ Authorization = "Bearer $token" } `
  -Body '{"url":"https://example.com"}' `
  -ContentType "application/json"
```

### Submit a scan (Linux/Mac)
```bash
curl -X POST http://localhost:3000/scan \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

All scan and incident endpoints require authentication. Create an account through
the dashboard or `POST /auth/register`, then obtain a token from `POST /auth/login`.
Private targets, including the Hydra Lab, remain blocked unless
`ALLOW_PRIVATE_SCAN_TARGETS=true` is explicitly configured in a development environment.

## Enterprise Event Core

Authenticated tenant-scoped endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/events` | Validate, normalize, deduplicate, store and evaluate an event |
| `GET` | `/events?limit=50&cursor=...` | Cursor-paginated event investigation |
| `GET` | `/detections` | List tenant detection rules |
| `POST` | `/detections` | Create a versioned rule (`ADMIN`) |
| `POST` | `/detections/:id/test` | Test a rule against an in-memory dataset |
| `PATCH` | `/detections/:id/status` | Governed lifecycle transition (`ADMIN`) |

Detection conditions support `equals`, `not_equals`, `contains`, `in`, `gte`,
`lte`, and `exists` against normalized field paths such as `process.name`.
Rules cannot transition directly from `draft` to `enabled`; they must enter
`testing` first.

## Troubleshooting

### Prisma: "table does not exist" (P2021)
Manual fix if the auto-boot fails:
```bash
docker exec -it hydra-api npx prisma migrate deploy
```

### Redis: ENOTFOUND
Verify the Redis container health:
```bash
docker inspect -f '{{.State.Health.Status}}' hydra-redis
```

### Frontend: port conflict
If the frontend appears on 5174, force the default port:
```bash
npm run dev -- --host 0.0.0.0 --port 5173 --strictPort
```

### Clean rebuild (ghost cache issues)
```bash
docker-compose down -v
docker builder prune -f
docker-compose up -d --build
```

## Quick Reference
| Command | Description |
|---------|-------------|
| `npm run hydra:boot` | Full Docker boot (via root package.json) |
| `npm run hydra:down` | Stop and remove volumes |
| `docker-compose logs -f` | Stream all logs |

## Golden Rule
> "Nothing runs outside the container in production. Everything is idempotent and re-executable."
