import { lazy, Suspense, useState } from "react";
import { API_BASE_URL } from "./lib/api";

const SESSION_TOKEN_KEY = "koryn_token";
const LEGACY_TOKEN_KEY = "hydra_token";

function restoreSessionToken() {
  const current = sessionStorage.getItem(SESSION_TOKEN_KEY);
  if (current) return current;
  const legacy = localStorage.getItem(LEGACY_TOKEN_KEY);
  if (legacy) sessionStorage.setItem(SESSION_TOKEN_KEY, legacy);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  return legacy ?? "";
}

const EnterpriseConsole = lazy(() => import("./EnterpriseConsole"));

type ValidationIssue = {
  instancePath?: string;
  keyword?: string;
  params?: { limit?: number };
};

function authenticationError(body: unknown): string {
  if (!body || typeof body !== "object") return "Authentication failed";
  const response = body as {
    message?: string;
    error?: { message?: string; details?: { validation?: ValidationIssue[] } };
  };
  const issue = response.error?.details?.validation?.[0];
  if (issue?.instancePath === "/email") return "Enter a valid email address, such as analyst@company.com.";
  if (issue?.instancePath === "/password" && issue.keyword === "minLength") {
    return `Password must contain at least ${issue.params?.limit ?? 12} characters.`;
  }
  if (issue?.instancePath === "/password") return "Password does not meet the security requirements.";
  return response.error?.message ?? response.message ?? "Authentication failed";
}

export default function App() {
  const [token, setToken] = useState(restoreSessionToken);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const authenticate = async (event: React.FormEvent) => {
    event.preventDefault(); setMessage(""); setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/${mode}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(authenticationError(body));
      if (mode === "register") {
        setMode("login"); setMessage("Workspace created. Sign in to continue."); setPassword(""); return;
      }
      if (typeof body?.data !== "string") throw new Error("Invalid authentication response");
      sessionStorage.setItem(SESSION_TOKEN_KEY, body.data); setToken(body.data);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Authentication failed"); }
    finally { setSubmitting(false); }
  };

  if (token) return <Suspense fallback={<main className="app-loading"><div className="brand-mark"><span>K</span></div><p>Loading secure workspace…</p></main>}><EnterpriseConsole token={token} onSignOut={() => { sessionStorage.removeItem(SESSION_TOKEN_KEY); localStorage.removeItem(LEGACY_TOKEN_KEY); setToken(""); }} /></Suspense>;

  return (
    <main className="auth-shell">
      <div className="auth-atmosphere" />
      <section className="auth-brand">
        <div className="brand-mark large"><span>K</span></div>
        <p className="eyebrow">KORYN SECURITY · BY HOJO</p>
        <h1>Security operations,<br /><em>under control.</em></h1>
        <p className="auth-copy">One workspace for detection, investigation, intelligence and governed response.</p>
        <div className="trust-row"><span>Tenant isolated</span><span>Auditable</span><span>Defense-first</span></div>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-card-head"><div><p className="eyebrow">SECURE ACCESS</p><h2>{mode === "login" ? "Welcome back" : "Create workspace"}</h2></div><span className="status-dot online" /></div>
          <p className="muted">{mode === "login" ? "Authenticate to enter your operations console." : "Provision an isolated analyst workspace."}</p>
          <form onSubmit={authenticate}>
            <label>Email address<input type="email" autoComplete="email" pattern="[^\s@]+@[^\s@]+\.[^\s@]{2,}" title="Use a complete email address, such as analyst@company.com" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="analyst@company.com" required /></label>
            <label>Password<input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "register" ? 12 : 1} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••••" required />{mode === "register" && <small className="field-hint">Use at least 12 characters.</small>}</label>
            {message && <div className="form-message" role="status">{message}</div>}
            <button className="primary-button" disabled={submitting}>{submitting ? "Authenticating…" : mode === "login" ? "Enter operations console" : "Create secure workspace"}<span>→</span></button>
          </form>
          <button className="text-button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setMessage(""); }}>{mode === "login" ? "Need an analyst workspace? Create one" : "Already provisioned? Sign in"}</button>
        </div>
        <p className="auth-footnote">Protected by tenant-scoped access controls · KORYN SECURITY PLATFORM</p>
      </section>
    </main>
  );
}
