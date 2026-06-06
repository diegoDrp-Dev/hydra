import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import NetworkRadar from "./NetworkRadar";

export type Scan = {
  id: string;
  url: string;
  statusCode?: number;
  duration?: number;
  score?: number;
  severity?: string;
  issues?: string[];
  createdAt: string;
};

// Extract hostname from URL (e.g., "http://localhost:4000" -> "localhost:4000")
function extractHostname(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.host || url;
  } catch {
    return url || "unknown";
  }
}

// Calculate score from statusCode and duration if score not provided
function calculateScore(scan: Scan): number {
  if (scan.score !== undefined && scan.score !== null) {
    return scan.score;
  }

  let s = 0;
  const status = scan.statusCode ?? 200;
  const duration = scan.duration ?? 0;

  if (status >= 500) s += 80;
  else if (status >= 400) s += 50;
  else if (status >= 300) s += 20;

  if (duration > 1000) s += 30;
  else if (duration > 500) s += 15;

  return Math.min(100, s);
}

// Get severity from score or from scan.severity if available
function getSeverity(scan: Scan): string {
  if (scan.severity) {
    return scan.severity.toUpperCase();
  }

  const s = calculateScore(scan);
  if (s >= 80) return "CRITICAL";
  if (s >= 60) return "HIGH";
  if (s >= 30) return "MEDIUM";
  return "LOW";
}

// Legacy color function for charts
function color(s: number) {
  if (s >= 80) return "#ef4444";
  if (s >= 60) return "#f97316";
  if (s >= 30) return "#eab308";
  return "#22c55e";
}

// Legacy severity function for charts
function severity(s: number) {
  if (s >= 80) return "CRITICAL";
  if (s >= 60) return "HIGH";
  if (s >= 30) return "MEDIUM";
  return "LOW";
}

// Legacy score function for charts
function score(status: number, duration: number) {
  let s = 0;

  if (status >= 500) s += 80;
  else if (status >= 400) s += 50;
  else if (status >= 300) s += 20;

  if (duration > 1000) s += 30;
  else if (duration > 500) s += 15;

  return Math.min(100, s);
}

export default function App() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [pulse, setPulse] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);

  // Load scans from REST API (memoized to keep effects stable)
  const loadScans = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:3000/scan");
      const response = await res.json();

      console.log("API RAW:", response);

      const data: Scan[] = Array.isArray(response?.data)
        ? response.data
        : [];

      setScans(() => [...data]); // força refresh real
      setPulse((p) => p + 1);
    } catch (err) {
      console.error("FETCH ERROR:", err);
    }
  }, []);

  // Initialize WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        const ws = new WebSocket("ws://localhost:3000/ws");

        ws.onopen = () => {
          console.log("WebSocket connected");
          // Subscribe to incidents room
          ws.send(JSON.stringify({ type: "subscribe", room: "incidents" }));
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            if (message.type === "incident") {
              // When incident arrives, fetch fresh scan data
              console.log("Incident received:", message.data);
              loadScans();
            }
          } catch (error) {
            console.error("Failed to parse WebSocket message:", error);
          }
        };

        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          // Will fallback to polling
        };

        ws.onclose = () => {
          console.log("WebSocket closed");
          wsRef.current = null;
        };

        wsRef.current = ws;
      } catch (error) {
        console.error("Failed to connect WebSocket:", error);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [loadScans]);

  // Polling as fallback (if WebSocket not available)
  useEffect(() => {
    // Defer initial call to avoid cascading render warnings
    const timeoutId = setTimeout(loadScans, 0);
    const interval = setInterval(loadScans, 2500);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(interval);
    };
  }, [loadScans]);

  useEffect(() => {
    console.log("SCANS STATE UPDATED:", scans.length);
  }, [scans]);

  const riskTimeline = useMemo(() => {
    const safeScans = Array.isArray(scans) ? scans : [];
    return safeScans.slice(0, 15).map((s, i) => ({
      name: i,
      risk: score(s.statusCode || 0, s.duration || 0),
    }));
  }, [scans]);

  const distribution = useMemo(() => {
    let c = 0,
      h = 0,
      m = 0,
      l = 0;

    const safeScans = Array.isArray(scans) ? scans : [];
    safeScans.forEach((s) => {
      const sc = score(s.statusCode || 0, s.duration || 0);
      if (sc >= 80) c++;
      else if (sc >= 60) h++;
      else if (sc >= 30) m++;
      else l++;
    });

    return [
      { name: "Critical", value: c },
      { name: "High", value: h },
      { name: "Medium", value: m },
      { name: "Low", value: l },
    ];
  }, [scans]);

  const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e"];

  const globalRisk = useMemo(() => {
    if (!scans.length) return 0;

    const total = scans.reduce((acc, s) => acc + calculateScore(s), 0);
    return Math.round(total / scans.length);
  }, [scans]);

  return (
    <div className="min-h-screen bg-black text-white font-mono p-6">

      {/* TOP BAR */}
      <div className="flex justify-between border-b border-white/10 pb-4 mb-6">
        <div>
          <h1 className="text-cyan-400 tracking-widest text-sm md:text-base">
            HYDRA // SECURITY OPERATIONS CENTER // AUTONOMOUS DEFENSE GRID
          </h1>
          <p className="text-xs text-gray-500">
            Classified network monitoring interface
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs text-gray-500">GLOBAL RISK INDEX</p>
          <p className="text-3xl text-red-500">{globalRisk}</p>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* RISK CHART */}
        <div className="lg:col-span-2 border border-white/10 bg-white/5 p-4 relative overflow-hidden">
          <h2 className="text-cyan-400 mb-4 text-xs tracking-wider">
            LIVE RISK EVOLUTION MATRIX
          </h2>

          {/* PULSE FIELD */}
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              transform: `scale(${1 + (pulse % 10) * 0.01})`,
              background:
                "radial-gradient(circle, rgba(34,211,238,0.4) 0%, transparent 70%)",
              transition: "transform 0.5s ease-out",
            }}
          />

          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={riskTimeline}>
              <XAxis dataKey="name" hide />
              <YAxis domain={[0, 100]} stroke="#475569" fontSize={10} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontFamily: 'monospace' }}
              />
              <Line
                type="monotone"
                dataKey="risk"
                stroke="#22d3ee"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* AI CORE */}
        <div className="border border-white/10 bg-white/5 p-4 flex flex-col justify-between">
          <div>
            <h2 className="text-cyan-400 mb-4 text-xs tracking-wider">
              NEURAL DEFENSE CORE
            </h2>

            <div className="space-y-2 text-sm text-gray-400">
              <p className="flex justify-between"><span>Behavioral model:</span> <span className="text-cyan-400">ACTIVE</span></p>
              <p className="flex justify-between"><span>Anomaly detection:</span> <span className="text-cyan-400">ENABLED</span></p>
              <p className="flex justify-between"><span>Threat correlation:</span> <span className="text-cyan-400">RUNNING</span></p>
              <p className="flex justify-between"><span>Predictive engine:</span> <span className="text-cyan-400">ONLINE</span></p>
            </div>
          </div>

          <div className="mt-6 border-t border-white/10 pt-4">
            <p className="text-xs text-gray-500">SYSTEM STATUS</p>
            <p className="text-green-400 animate-pulse">● OPERATIONAL</p>
          </div>
        </div>
      </div>

      {/* SECOND GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2">
          <NetworkRadar
            scans={scans}
            helpers={{ extractHostname, calculateScore, getSeverity }}
          />
        </div>

        {/* DISTRIBUTION */}
        <div className="border border-white/10 bg-white/5 p-4">
          <h2 className="text-cyan-400 mb-4 text-xs tracking-wider">THREAT DISTRIBUTION</h2>

          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={distribution}
                dataKey="value"
                outerRadius={70}
                innerRadius={40}
                paddingAngle={4}
              >
                {distribution.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontFamily: 'monospace' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* INCIDENT FEED */}
      <div className="mt-6 border border-white/10 bg-white/5 p-4 h-[240px] overflow-auto rounded">
        <h2 className="text-cyan-400 mb-4 text-xs tracking-wider sticky top-0 bg-[#0c1322] py-1">
          REAL-TIME INCIDENT STREAM
        </h2>

        <div className="space-y-1">
          {scans.map((s) => {
            const sc = score(s.statusCode || 0, s.duration || 0);

            return (
              <div
                key={s.id}
                className="flex justify-between border-b border-white/5 py-2 hover:bg-white/5 px-2 transition-colors duration-150"
              >
                <div className="truncate pr-4">
                  <p className="text-sm truncate text-slate-300 font-semibold">{s.url}</p>
                  <p className="text-[10px] text-gray-500">
                    {new Date(s.createdAt).toLocaleTimeString()} — ID: {s.id.substring(0, 8)}
                  </p>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold" style={{ color: color(sc) }}>{severity(sc)}</p>
                  <p className="text-[10px] text-gray-500">SCORE: {sc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}