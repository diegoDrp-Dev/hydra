export const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "http://localhost:3000";

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, body?.error?.message ?? body?.message ?? "Request failed");
  return body as T;
}

export type SessionIdentity = {
  email: string;
  role: string;
  tenantId: string;
  displayName?: string;
  firstName?: string;
  name?: string;
};

export function decodeSession(token: string): SessionIdentity | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (!payload.email || !payload.tenantId) return null;
    const optionalText = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : undefined;
    return {
      email: String(payload.email),
      role: String(payload.role ?? "ANALYST"),
      tenantId: String(payload.tenantId),
      displayName: optionalText(payload.displayName),
      firstName: optionalText(payload.firstName),
      name: optionalText(payload.name),
    };
  } catch {
    return null;
  }
}
