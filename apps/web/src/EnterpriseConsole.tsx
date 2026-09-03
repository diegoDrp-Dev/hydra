import { useCallback, useEffect, useState } from "react";

type Section = "alerts" | "incidents" | "cases" | "risks" | "detections" | "intel" | "playbooks";
type Row = Record<string, unknown>;

const sections: Array<{ key: Section; label: string; endpoint: string }> = [
  { key: "alerts", label: "Alerts", endpoint: "/soc/alerts" },
  { key: "incidents", label: "Incidents", endpoint: "/soc/incidents" },
  { key: "cases", label: "Cases", endpoint: "/soc/cases" },
  { key: "risks", label: "Entity Risk", endpoint: "/soc/entity-risks" },
  { key: "detections", label: "Detections", endpoint: "/detections" },
  { key: "intel", label: "Threat Intel", endpoint: "/operations/threat-intel" },
  { key: "playbooks", label: "SOAR", endpoint: "/operations/playbooks" },
];

const value = (row: Row, ...keys: string[]) => keys.map((key) => row[key]).find((entry) => entry !== undefined && entry !== null);

export default function EnterpriseConsole({ token }: { token: string }) {
  const [section, setSection] = useState<Section>("alerts");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const active = sections.find(({ key }) => key === section)!;

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`http://localhost:3000${active.endpoint}`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? "Request failed");
      setRows(Array.isArray(body?.data) ? body.data : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Request failed");
    } finally { setLoading(false); }
  }, [active.endpoint, token]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <section className="mb-6 border border-white/10 bg-[#070d18]">
      <nav className="flex gap-1 overflow-x-auto border-b border-white/10 p-2">
        {sections.map((item) => <button key={item.key} onClick={() => setSection(item.key)} className={`px-3 py-2 text-[10px] tracking-wider whitespace-nowrap ${section === item.key ? "bg-cyan-400/15 text-cyan-300 border border-cyan-400/30" : "text-slate-500 hover:text-slate-200"}`}>{item.label.toUpperCase()}</button>)}
        <button onClick={() => void load()} className="ml-auto px-3 text-[10px] text-slate-500 hover:text-cyan-300">REFRESH</button>
      </nav>
      <div className="p-4">
        <div className="flex justify-between mb-3"><h2 className="text-cyan-400 text-xs tracking-widest">{active.label.toUpperCase()}</h2><span className="text-[10px] text-slate-500">{rows.length} RECORDS</span></div>
        {loading && <p className="text-xs text-cyan-500 animate-pulse">QUERYING TENANT DATA...</p>}
        {error && <p className="text-xs text-red-400">{error}</p>}
        {!loading && !error && rows.length === 0 && <p className="text-xs text-slate-600 py-6 text-center">NO RECORDS IN THIS WORKSPACE</p>}
        <div className="space-y-1 max-h-72 overflow-auto">
          {rows.map((row, index) => {
            const id = String(value(row, "id") ?? index);
            const title = String(value(row, "title", "name", "value", "entityKey") ?? id);
            const severity = String(value(row, "severity", "priority", "status") ?? "unknown");
            const score = value(row, "riskScore", "score", "confidence");
            return <div key={id} className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-white/5 px-2 py-2 text-xs hover:bg-white/5"><div><p className="text-slate-200">{title}</p><p className="text-[9px] text-slate-600">{id}</p></div><span className="text-amber-400 uppercase">{severity}</span><span className="text-cyan-400 w-12 text-right">{score === undefined ? "—" : String(score)}</span></div>;
          })}
        </div>
      </div>
    </section>
  );
}
