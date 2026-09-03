# ADR-004: Incremental Enterprise SOC Core

## Status

Accepted — 2026-09-03.

## Context

Hydra needs tenant isolation, normalized telemetry, deterministic detections,
investigation state, threat intelligence, and controlled response without
requiring Kafka, OpenSearch, Kubernetes, or autonomous AI during local development.

## Decision

PostgreSQL remains the transactional source of truth. Redis/BullMQ remains the
asynchronous transport. Enterprise domain entities live in the existing monorepo
behind tenant-scoped services and APIs. Detection matches create first-class SOC
alerts and entity risk. Playbook executions require an idempotency key and human
approval; the API never performs external response actions directly.

## Consequences

The development profile stays lightweight and auditable. Analytical storage and
a distributed event bus can be introduced later behind adapters when benchmarks
demonstrate a need. Correlation windows and executor workers remain separate
follow-up components so their failure cannot interrupt ingestion.

The first executor therefore uses a separate BullMQ worker and a narrow built-in
action allowlist. Network commands, arbitrary shell commands, and arbitrary HTTP
requests are deliberately excluded.
