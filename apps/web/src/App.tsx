import { lazy, Suspense, useState } from "react";
import { API_BASE_URL } from "./lib/api";

const EnterpriseConsole = lazy(() => import("./EnterpriseConsole"));

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("hydra_token") ?? "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const authenticate = async (event: React.FormEvent) => {
    event.preventDefault(); setMessage(""); setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/${mode}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? body?.message ?? "Authentication failed");
      if (mode === "register") {
        setMode("login"); setMessage("Workspace created. Sign in to continue."); setPassword(""); return;
      }
      if (typeof body?.data !== "string") throw new Error("Invalid authentication response");
      localStorage.setItem("hydra_token", body.data); setToken(body.data);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Authentication failed"); }
    finally { setSubmitting(false); }
  };

  if (token) return <Suspense fallback={<main className="app-loading"><div className="brand-mark"><span>H</span></div><p>Loading secure workspace…</p></main>}><EnterpriseConsole token={token} onSignOut={() => { localStorage.removeItem("hydra_token"); setToken(""); }} /></Suspense>;

  return (
    <main className="auth-shell">
      <div className="auth-atmosphere" />
      <section className="auth-brand">
        <div className="brand-mark large"><span>H</span></div>
        <p className="eyebrow">HYDRA ENTERPRISE</p>
        <h1>Security operations,<br /><em>under control.</em></h1>
        <p className="auth-copy">One workspace for detection, investigation, intelligence and governed response.</p>
        <div className="trust-row"><span>Tenant isolated</span><span>Auditable</span><span>Defense-first</span></div>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-card-head"><div><p className="eyebrow">SECURE ACCESS</p><h2>{mode === "login" ? "Welcome back" : "Create workspace"}</h2></div><span className="status-dot online" /></div>
          <p className="muted">{mode === "login" ? "Authenticate to enter your operations console." : "Provision an isolated analyst workspace."}</p>
          <form onSubmit={authenticate}>
            <label>Email address<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="analyst@company.com" required /></label>
            <label>Password<input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "register" ? 12 : 1} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••••" required /></label>
            {message && <div className="form-message" role="status">{message}</div>}
            <button className="primary-button" disabled={submitting}>{submitting ? "Authenticating…" : mode === "login" ? "Enter operations console" : "Create secure workspace"}<span>→</span></button>
          </form>
          <button className="text-button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setMessage(""); }}>{mode === "login" ? "Need an analyst workspace? Create one" : "Already provisioned? Sign in"}</button>
        </div>
        <p className="auth-footnote">Protected by tenant-scoped access controls · HYDRA SOC</p>
      </section>
    </main>
  );
}
