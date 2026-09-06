import { AppError } from "../errors/app-error.js";

function booleanValue(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback;
  return value.toLowerCase() === "true";
}

function integerValue(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: integerValue(process.env.PORT, 3000),
  host: process.env.HOST ?? "0.0.0.0",
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "1h",
  jwtIssuer: process.env.JWT_ISSUER ?? "koryn-security-platform",
  jwtAudience: process.env.JWT_AUDIENCE ?? "koryn-console",
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  allowPrivateScanTargets: booleanValue(process.env.ALLOW_PRIVATE_SCAN_TARGETS),
  scanTimeoutMs: integerValue(process.env.SCAN_TIMEOUT_MS, 10_000),
  scanMaxRedirects: integerValue(process.env.SCAN_MAX_REDIRECTS, 2),
  soarExecutionEnabled: booleanValue(process.env.SOAR_EXECUTION_ENABLED),
  webhookAllowPrivateTargets: booleanValue(process.env.WEBHOOK_ALLOW_PRIVATE_TARGETS),
};

export function requireJwtSecret(): string {
  if (!env.jwtSecret) {
    throw new AppError(503, "AUTH_NOT_CONFIGURED", "Authentication is not configured");
  }

  if (env.nodeEnv === "production" && env.jwtSecret.length < 32) {
    throw new AppError(503, "AUTH_NOT_CONFIGURED", "JWT secret does not meet production requirements");
  }

  return env.jwtSecret;
}
