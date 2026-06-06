# HYDRA 🐉
### Real-Time Security Operations Center (SOC) Platform

![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?style=flat&logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-22-339933?style=flat&logo=node.js)
![Fastify](https://img.shields.io/badge/Fastify-5.3-000000?style=flat&logo=fastify)
![Redis](https://img.shields.io/badge/Redis-7-dc382d?style=flat&logo=redis)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169e1?style=flat&logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-ready-2496ed?style=flat&logo=docker)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat)
![Status](https://img.shields.io/badge/Status-Active%20Development-22c55e?style=flat)

> Distributed security monitoring platform for real-time threat detection,
> risk scoring, and incident visualization — built from scratch as a
> production-style SOC engine.

![Hydra Demo](./docs/demo.gif)

---

## 🚀 Quick Start

```bash
git clone https://github.com/diegoDrp-Dev/hydra
cd hydra
npm install
cp apps/api-gateway/.env.example apps/api-gateway/.env
npm run hydra:boot
```

| Service | URL |
|---------|-----|
| Dashboard | http://localhost:5173 |
| API | http://localhost:3000 |
| Docs | http://localhost:3000/docs |
| WebSocket | ws://localhost:3000/ws |

> To simulate attacks in real time, see
> **[hydra-lab](https://github.com/diegoDrp-Dev/hydra-lab)** —
> a separate repository with intentionally vulnerable targets
> built to stress-test this system.

---

## 🚨 Overview

Hydra is a **real-time SOC platform** that simulates how enterprise
security systems detect, score, and respond to threats.

It processes security events through a distributed pipeline — from raw
HTTP scan to risk-scored incident with real-time dashboard update —
covering the full internal lifecycle of a SOC engine.

---

## ⚙️ Architecture

POST /scans
↓
API Gateway (JWT auth + validation)
↓
BullMQ Queue (retry + backoff + DLQ)
↓
Worker Engine (HTTP scan + header analysis)
↓
Risk Engine (score 0–100 + severity + rules)
↓
Incident Manager (auto-generate + dedup)
↓
PostgreSQL (persist) + WebSocket (broadcast)
↓
SOC Dashboard (real-time update)

| Layer | Responsibility |
|-------|---------------|
| **API Gateway** | Receives scans, JWT auth, request routing |
| **Queue System** | BullMQ + Redis, exponential backoff, DLQ |
| **Worker Engine** | Executes scans, triggers risk analysis |
| **Risk Engine** | 0–100 scoring, 8 extensible rules, auto severity |
| **Incident Manager** | Auto-generation, hash-based dedup, status tracking |
| **Database** | PostgreSQL + Prisma — scans, incidents, risks, alerts |
| **Frontend** | React SOC dashboard, WebSocket, custom SVG Network Radar |

---

## 🔍 Core Features

### 🧠 Risk Engine
- 8 built-in security rules (CSP, HSTS, X-Frame-Options, auth strength...)
- Dynamic 0–100 normalized scoring
- Automatic severity classification: `low` → `medium` → `high` → `critical`
- Extensible rule registry — add new rules without redeploy

### 📡 Real-Time Monitoring
- Primary WebSocket stream
- Polling fallback (resilient mode)
- Live incident feed with automatic deduplication
- Continuous dashboard synchronization

### 🗺️ Network Interception Radar
- Custom SVG visualization (no D3 or external libs)
- Severity-based pulsing nodes
- Animated radar sweep (Darktrace-style)
- Per-node tooltip with scan details
- Deterministic positioning by hostname (golden angle algorithm)

### ⚡ Incident Management
- Auto-generation from scan results
- Hash-based deduplication (hostname + risk signature)
- Status tracking: `open` → `investigating` → `resolved`
- Webhook alerts: Discord, Slack, Generic

### 🔄 Distributed Queue
- BullMQ + Redis
- 3x retry with exponential backoff (2s → 4s → 8s)
- Dead Letter Queue for permanent failures
- Configurable concurrency

---

## 📈 Risk Rules Coverage

| Rule | What it detects |
|------|----------------|
| `missing_csp` | Missing Content-Security-Policy header |
| `missing_hsts` | Missing Strict-Transport-Security header |
| `missing_x_frame_options` | Clickjacking exposure |
| `missing_content_type_options` | MIME sniffing vulnerability |
| `weak_authentication` | Weak credentials or missing rate limiting |
| `exposed_admin_panel` | Unauthenticated admin endpoints |
| `slow_response` | Latency above threshold (DoS indicator) |
| `http_only` | Missing TLS |

---

## 🎯 What This Demonstrates

| Concept | Implementation in Hydra |
|---------|------------------------|
| Distributed systems | Decoupled API + Worker + Queue |
| Event-driven architecture | BullMQ with retry and DLQ |
| Real-time processing | WebSocket + live incident stream |
| Security engineering | Risk Engine with 8 extensible rules |
| Clean Architecture | SOLID, Repository pattern, DI |
| Observability | Pino structured logging with context |
| DevOps | Docker Compose with 5 orchestrated services |

---

## 🧰 Tech Stack

**Backend:** Node.js 22, Fastify 5.3, TypeScript 5.8 strict,
Prisma ORM, PostgreSQL 16, Redis 7, BullMQ 5.76, Pino

**Frontend:** React, TypeScript, Recharts, custom SVG engine,
native WebSocket

**Infrastructure:** Docker, Docker Compose, Monorepo (npm workspaces)

---

## 🧪 Validated with hydra-lab

This system was validated using
**[hydra-lab](https://github.com/diegoDrp-Dev/hydra-lab)** —
a separate repository with intentionally vulnerable targets
that exercise all 8 Risk Engine rules.

```bash
# Inside hydra-lab
npm run demo   # scans all 4 targets every 2–7s
```

---

## 🟢 System Status

| Module | Status |
|--------|--------|
| API Gateway | ✅ |
| Worker Engine | ✅ |
| Risk Engine | ✅ |
| Incident Manager | ✅ |
| SOC Dashboard | ✅ |
| WebSocket Stream | ✅ |
| Webhook Alerts | ✅ |
| Docker Compose | ✅ |

---

> Having issues? See the [full running guide](./docs/RUNNING.md)

---

## 👤 Author

**Diego Rodrigues Pereira**
Security Engineer | Backend Developer

[![LinkedIn](https://img.shields.io/badge/LinkedIn-diego--rodrigues--pereira-0077b5?style=flat&logo=linkedin)](https://www.linkedin.com/in/diego-rodrigues-pereira-drp/)
[![GitHub](https://img.shields.io/badge/GitHub-diegoDrp--Dev-181717?style=flat&logo=github)](https://github.com/diegoDrp-Dev)

---

⚠️ *Simulation project built for educational and portfolio purposes.
No real-world systems are targeted or affected.*

---

MIT License © 2026 Diego Rodrigues Pereira

