# Koryn Security Platform — Web Console

Frontend React/Vite do console SOC da Koryn Security Platform by HOJO.

## Dados do dashboard

- Alertas: `GET /soc/alerts`
- Incidentes: `GET /soc/incidents`
- Risco de entidades: `GET /soc/entity-risks`
- Eventos: `GET /events?limit=100`
- Scans: `GET /scan`
- Realtime: WebSocket autenticado em `/ws`

O card **Asset telemetry** representa a quantidade de hosts/alvos únicos extraídos dos scans e dos campos de rede/host dos eventos carregados. Ele não representa agentes ou coletores.

## Risk signal

Os períodos `1h`, `6h`, `24h`, `7d` e `30d` são aplicados no cliente aos até 200 alertas mais recentes retornados atualmente por `/soc/alerts`. Não há agregação nem geração de dados fictícios. Para ambientes com mais de 200 alertas no intervalo, a API deverá futuramente oferecer filtros temporais e agregação server-side.

O limiar crítico de 80 reflete a política `calculateSeverity` do risk engine no backend: scores iguais ou superiores a 80 são críticos.

## Desenvolvimento

```bash
npm --workspace=web run dev
npm --workspace=web run lint
npm --workspace=web run build
```

## Publication polish

Telemetry source: backend/API. The card deduplicates URL hosts from scans and host/name/id/domain, source IP and destination IP from the loaded events (up to 100). It describes observed targets, not an inventory of collectors.

Legacy branding is formatted only at render time, including queue, tables, evidence and tooltips. Original API values and identifiers remain unchanged. The legacy browser token key remains for session migration. Database names/volumes and legacy WebSocket compatibility belong to the backend and are unchanged.

Greeting priority remains displayName, firstName, name, role, Analyst. Current login tokens provide role and email, without a profile name. Email is not used to infer a greeting name.

Realtime connected requires an open WebSocket. Polling fallback requires a successful API refresh in the last 65 seconds with no subsequent refresh error; reconnect attempts and disconnected API states are labelled separately.
