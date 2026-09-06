import { useCallback, useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import NetworkRadar from "./NetworkRadar";
import { API_BASE_URL, ApiError, apiRequest, decodeSession } from "./lib/api";
import type { ApiRecord, EntityRisk, Scan, SecurityAlert, SocIncident } from "./types";

type View = "overview" | "alerts" | "incidents" | "cases" | "events" | "risks" | "detections" | "intel" | "soar";
type DataMap = { alerts: SecurityAlert[]; incidents: SocIncident[]; cases: ApiRecord[]; events: ApiRecord[]; risks: EntityRisk[]; detections: ApiRecord[]; intel: ApiRecord[]; soar: ApiRecord[]; scans: Scan[] };
const emptyData: DataMap = { alerts: [], incidents: [], cases: [], events: [], risks: [], detections: [], intel: [], soar: [], scans: [] };
const endpoints: Record<Exclude<View, "overview">, string> = { alerts: "/soc/alerts", incidents: "/soc/incidents", cases: "/soc/cases", events: "/events?limit=100", risks: "/soc/entity-risks", detections: "/detections", intel: "/operations/threat-intel", soar: "/operations/playbooks" };
const nav: Array<{ key: View; label: string; icon: string; group?: string }> = [
  { key: "overview", label: "Overview", icon: "⌂", group: "OPERATIONS" }, { key: "alerts", label: "Alerts", icon: "△" },
  { key: "incidents", label: "Incidents", icon: "◆" }, { key: "cases", label: "Cases", icon: "▣" },
  { key: "events", label: "Event search", icon: "⌕", group: "ANALYSIS" }, { key: "risks", label: "Entity risk", icon: "◎" },
  { key: "detections", label: "Detections", icon: "⌁" }, { key: "intel", label: "Threat intel", icon: "◇" },
  { key: "soar", label: "SOAR", icon: "⚡", group: "RESPONSE" },
];
const severityRank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1, informational: 0 };
const scoreOf = (scan: Scan) => scan.score ?? Math.min(100, (scan.statusCode ?? 200) >= 500 ? 80 : (scan.duration ?? 0) > 1000 ? 30 : 0);
const hostOf = (url: string) => { try { return new URL(url).host; } catch { return url; } };
const objectValue = (value: unknown) => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const eventAssets = (events: ApiRecord[]): Scan[] => events.flatMap((event) => {
  const host = objectValue(event.host); const network = objectValue(event.network);
  const observed = [
    ["host", host.name ?? host.id ?? host.domain],
    ["source", network.sourceIp ?? network.ip],
    ["destination", network.destinationIp],
  ].filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].length > 0);
  const severity = String(event.severity ?? "low"); const score = { critical: 95, high: 75, medium: 50, low: 25, informational: 10 }[severity] ?? 10;
  return observed.map(([kind, asset]) => ({
    id: `${event.id}-${kind}-${asset}`, url: `asset://${asset}`, createdAt: String(event.timestamp ?? event.createdAt ?? new Date().toISOString()),
    severity: severity === "informational" ? "low" : severity, score, issues: [String(event.category ?? "telemetry"), String(event.action ?? "observed")],
  }));
});

function SeverityBadge({ value }: { value?: unknown }) {
  const label = String(value ?? "unknown").toLowerCase();
  return <span className={`severity-badge severity-${label}`}>{label}</span>;
}

function timeAgo(value?: unknown) {
  if (!value) return "—"; const seconds = Math.floor((Date.now() - new Date(String(value)).getTime()) / 1000);
  if (seconds < 60) return `${Math.max(0, seconds)}s ago`; if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`; return `${Math.floor(seconds / 86400)}d ago`;
}

export default function EnterpriseConsole({ token, onSignOut }: { token: string; onSignOut: () => void }) {
  const [view, setView] = useState<View>("overview"); const [data, setData] = useState<DataMap>(emptyData);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("all"); const [selected, setSelected] = useState<ApiRecord | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false); const session = decodeSession(token);
  const [connection, setConnection] = useState<"connecting" | "live" | "degraded">("connecting");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const requested = view === "overview" ? Object.entries(endpoints).filter(([key]) => ["alerts", "incidents", "risks", "events"].includes(key)) : [[view, endpoints[view]]];
      const results = await Promise.all(requested.map(async ([key, path]) => {
        const response = await apiRequest<{ data: ApiRecord[] }>(token, path); return [key, response.data] as const;
      }));
      let scans: Scan[] | undefined;
      if (view === "overview") scans = (await apiRequest<{ data: Scan[] }>(token, "/scan")).data;
      setData((current) => ({ ...current, ...Object.fromEntries(results), ...(scans ? { scans } : {}) } as DataMap));
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) return onSignOut();
      setError(cause instanceof Error ? cause.message : "Unable to load workspace data");
    } finally { setLoading(false); }
  }, [onSignOut, token, view]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  useEffect(() => {
    const interval = window.setInterval(() => void load(), 30_000);
    const wsUrl = `${API_BASE_URL.replace(/^http/, "ws")}/ws`;
    const socket = new WebSocket(wsUrl, ["koryn", token]);
    socket.onopen = () => { setConnection("live"); socket.send(JSON.stringify({ type: "subscribe", room: "incidents" })); };
    socket.onmessage = () => void load(); socket.onerror = () => setConnection("degraded"); socket.onclose = () => setConnection("degraded");
    return () => { clearInterval(interval); socket.close(); };
  }, [load, token]);

  const filtered = useMemo(() => {
    const activeRows: ApiRecord[] = view === "overview" ? [] : data[view];
    return activeRows.filter((row) => {
    const haystack = JSON.stringify(row).toLowerCase(); const rowSeverity = String(row.severity ?? row.priority ?? "").toLowerCase();
    return haystack.includes(query.toLowerCase()) && (severity === "all" || rowSeverity === severity);
    }).sort((a, b) => (severityRank[String(b.severity)] ?? 0) - (severityRank[String(a.severity)] ?? 0));
  }, [data, query, severity, view]);

  const critical = data.alerts.filter((item) => item.severity === "critical" && !["closed", "resolved"].includes(item.status)).length;
  const openIncidents = data.incidents.filter((item) => !["closed", "resolved"].includes(item.status)).length;
  const avgRisk = data.risks.length ? Math.round(data.risks.reduce((sum, item) => sum + item.score, 0) / data.risks.length) : 0;
  const trend = [...data.alerts].slice(0, 24).reverse().map((item, index) => ({ index, risk: item.riskScore, confidence: item.confidence }));
  const radarTelemetry = [...data.scans, ...eventAssets(data.events)];
  const activeAssets = new Set(radarTelemetry.map((item) => hostOf(item.url))).size;

  const mutateStatus = async (kind: "alerts" | "incidents", id: string, status: string) => {
    await apiRequest(token, `/soc/${kind}/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }); setSelected(null); await load();
  };

  return <div className="app-shell">
    <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
      <div className="sidebar-brand"><div className="brand-mark"><span>K</span></div><div><strong>KORYN</strong><small>SECURITY · BY HOJO</small></div></div>
      <div className="workspace-chip"><span className="workspace-avatar">W</span><div><small>WORKSPACE</small><strong>{session?.email.split("@")[1] ?? "KORYN LAB"}</strong></div><span className="chevron">⌄</span></div>
      <nav className="sidebar-nav">{nav.map((item) => <div key={item.key}>{item.group && <p className="nav-group">{item.group}</p>}<button className={view === item.key ? "active" : ""} onClick={() => { setView(item.key); setSelected(null); setSidebarOpen(false); }}><span>{item.icon}</span>{item.label}{item.key === "alerts" && critical > 0 && <b>{critical}</b>}</button></div>)}</nav>
      <div className="sidebar-footer"><div className="user-block"><span className="user-avatar">{session?.email[0].toUpperCase() ?? "A"}</span><div><strong>{session?.email ?? "Analyst"}</strong><small>{session?.role ?? "ANALYST"}</small></div></div><button onClick={onSignOut} title="Sign out">↪</button></div>
    </aside>
    {sidebarOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}

    <main className="workspace-main">
      <header className="topbar"><button className="mobile-menu" onClick={() => setSidebarOpen(true)}>☰</button><div><p className="breadcrumb">KORYN / {view.toUpperCase()}</p><h1>{nav.find((item) => item.key === view)?.label}</h1></div><div className="topbar-actions"><button className="command-trigger" onClick={() => setView("events")}><span>⌕</span> Search telemetry <kbd>OPEN</kbd></button><span className={`health-chip ${connection}`}><i /> {connection === "live" ? "Realtime connected" : connection === "connecting" ? "Connecting" : "Polling fallback"}</span><button className="icon-button" onClick={() => void load()} title="Refresh">↻</button></div></header>

      <div className="workspace-content">
        {error && <div className="error-banner"><span>!</span><div><strong>Data source unavailable</strong><p>{error}</p></div><button onClick={() => void load()}>Retry</button></div>}
        {view === "overview" ? <>
          <div className="page-heading"><div><p className="eyebrow">LIVE SECURITY POSTURE</p><h2>Good {new Date().getHours() < 12 ? "morning" : "afternoon"}, Analyst.</h2><p>Here is what needs attention across your environment.</p></div><div className="last-updated"><i /> Live · refreshed {timeAgo(new Date().toISOString())}</div></div>
          <section className="metric-grid">
            <Metric label="Critical alerts" value={critical} note="Requires immediate triage" tone="critical" icon="△" />
            <Metric label="Open incidents" value={openIncidents} note={`${data.incidents.filter((i) => i.status === "investigating").length} under investigation`} tone="warning" icon="◆" />
            <Metric label="Entity risk" value={avgRisk} note="Average exposure score" tone="cyan" icon="◎" suffix="/100" />
            <Metric label="Telemetry" value={activeAssets} note="Observed assets and targets" tone="green" icon="⌁" />
          </section>
          <section className="overview-grid">
            <div className="panel span-2"><PanelTitle title="Risk signal" subtitle="Latest alert risk and confidence" action="24 records" /><div className="chart-wrap">{trend.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={trend}><defs><linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#20d9d2" stopOpacity={0.28}/><stop offset="100%" stopColor="#20d9d2" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#1c2938" vertical={false}/><XAxis dataKey="index" hide/><YAxis domain={[0,100]} tick={{fill:"#64748b",fontSize:10}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:"#0d1723",border:"1px solid #26384a",borderRadius:8}}/><Area type="monotone" dataKey="risk" stroke="#20d9d2" fill="url(#riskFill)" strokeWidth={2}/><Area type="monotone" dataKey="confidence" stroke="#7c8cff" fill="none" strokeDasharray="4 4"/></AreaChart></ResponsiveContainer> : <EmptyState text="No alert telemetry yet" />}</div></div>
            <div className="panel"><PanelTitle title="Priority queue" subtitle="Highest-risk alerts" action={`${data.alerts.length} total`} /><div className="priority-list">{data.alerts.slice(0,5).map((alert) => <button key={alert.id} onClick={() => { setView("alerts"); setSelected(alert); }}><span className={`risk-marker severity-bg-${alert.severity}`}>{alert.riskScore}</span><div><strong>{alert.title}</strong><small>{alert.source} · {timeAgo(alert.createdAt)}</small></div><SeverityBadge value={alert.severity}/></button>)}{!data.alerts.length && <EmptyState text="No active alerts" />}</div></div>
            <div className="panel span-2 radar-panel"><PanelTitle title="Asset exposure map" subtitle="Scanner and event telemetry" action={`${activeAssets} assets`} /><NetworkRadar scans={radarTelemetry} helpers={{ extractHostname: hostOf, calculateScore: scoreOf, getSeverity: (scan) => scan.severity ?? (scoreOf(scan) >= 75 ? "critical" : "low") }} /></div>
            <div className="panel"><PanelTitle title="Incident posture" subtitle="Open response workload" action="Live" /><div className="incident-stack">{data.incidents.slice(0,5).map((incident) => <button key={incident.id} onClick={() => { setView("incidents"); setSelected(incident); }}><div><strong>{incident.title}</strong><small>{incident.alerts?.length ?? 0} alerts · {timeAgo(incident.updatedAt)}</small></div><span>{incident.riskScore}</span></button>)}{!data.incidents.length && <EmptyState text="No correlated incidents" />}</div></div>
          </section>
        </> : <OperationalView view={view} rows={filtered} loading={loading} query={query} severity={severity} onQuery={setQuery} onSeverity={setSeverity} onSelect={setSelected} />}
      </div>
    </main>
    {selected && <DetailDrawer record={selected} view={view} onClose={() => setSelected(null)} onStatus={mutateStatus} />}
  </div>;
}

function Metric({ label, value, note, tone, icon, suffix }: { label: string; value: number; note: string; tone: string; icon: string; suffix?: string }) { return <article className={`metric-card tone-${tone}`}><div className="metric-top"><span>{label}</span><i>{icon}</i></div><strong>{value}<small>{suffix}</small></strong><p>{note}</p></article>; }
function PanelTitle({ title, subtitle, action }: { title: string; subtitle: string; action: string }) { return <div className="panel-title"><div><h3>{title}</h3><p>{subtitle}</p></div><span>{action}</span></div>; }
function EmptyState({ text }: { text: string }) { return <div className="empty-state"><span>◇</span><p>{text}</p><small>New telemetry will appear automatically.</small></div>; }

function OperationalView({ view, rows, loading, query, severity, onQuery, onSeverity, onSelect }: { view: View; rows: ApiRecord[]; loading: boolean; query: string; severity: string; onQuery: (v:string)=>void; onSeverity:(v:string)=>void; onSelect:(row:ApiRecord)=>void }) {
  return <><div className="page-heading compact"><div><p className="eyebrow">OPERATIONAL WORKSPACE</p><h2>{nav.find((item) => item.key === view)?.label}</h2><p>Tenant-scoped records with live investigation context.</p></div></div>
    <section className="table-panel"><div className="table-toolbar"><label className="search-field"><span>⌕</span><input value={query} onChange={(e)=>onQuery(e.target.value)} placeholder={`Search ${view}…`} /></label><select value={severity} onChange={(e)=>onSeverity(e.target.value)}><option value="all">All severity</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select><span className="result-count">{rows.length} results</span></div>
      <div className="data-table"><div className="table-row table-head"><span>Record</span><span>Source / type</span><span>Severity</span><span>Risk</span><span>Updated</span><span /></div>{loading ? Array.from({length:6}).map((_,i)=><div className="table-row skeleton" key={i}><span/><span/><span/><span/><span/><span/></div>) : rows.map((row)=><button className="table-row" key={row.id} onClick={()=>onSelect(row)}><span><b>{String(row.title ?? row.name ?? row.entityKey ?? row.value ?? row.action ?? "Untitled record")}</b><small>{row.id.slice(0,12)}</small></span><span>{String(row.source ?? row.sourceType ?? row.entityType ?? row.status ?? "KORYN")}</span><span><SeverityBadge value={row.severity ?? row.priority ?? row.status}/></span><span className="risk-cell">{String(row.riskScore ?? row.score ?? row.confidence ?? "—")}</span><span>{timeAgo(row.updatedAt ?? row.createdAt ?? row.timestamp)}</span><span className="row-arrow">›</span></button>)}{!loading && !rows.length && <EmptyState text={query || severity !== "all" ? `No ${view} match your filters` : `No ${view} have been created for this workspace yet`} />}</div>
    </section></>;
}

function DetailDrawer({ record, view, onClose, onStatus }: { record: ApiRecord; view: View; onClose:()=>void; onStatus:(kind:"alerts"|"incidents",id:string,status:string)=>Promise<void> }) {
  const title = String(record.title ?? record.name ?? record.entityKey ?? record.value ?? "Record details");
  return <div className="drawer-layer"><button className="drawer-scrim" onClick={onClose} aria-label="Close details"/><aside className="detail-drawer"><header><div><p className="eyebrow">{view.toUpperCase()} / {record.id.slice(0,8)}</p><h2>{title}</h2></div><button onClick={onClose}>×</button></header><div className="drawer-body"><div className="detail-summary"><SeverityBadge value={record.severity ?? record.priority ?? record.status}/><span>Risk <b>{String(record.riskScore ?? record.score ?? "—")}</b></span><span>Confidence <b>{String(record.confidence ?? "—")}</b></span></div>{Boolean(record.description) && <section><h3>Summary</h3><p>{String(record.description)}</p></section>}<section><h3>Evidence</h3><dl>{Object.entries(record).filter(([key,value])=>!["description","title"].includes(key)&&value!==null&&value!==undefined).slice(0,18).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{typeof value === "object" ? JSON.stringify(value,null,2) : String(value)}</dd></div>)}</dl></section></div>{(view === "alerts" || view === "incidents") && <footer><span>Update workflow</span><select defaultValue="" onChange={(e)=>{if(e.target.value) void onStatus(view,record.id,e.target.value)}}><option value="" disabled>Change status…</option><option value="investigating">Investigating</option><option value="contained">Contained</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></footer>}</aside></div>;
}
