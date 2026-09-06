import dns from "node:dns/promises";
import net from "node:net";
import { env } from "../config/env.js";
import { AppError } from "../errors/app-error.js";

function isPrivate(address: string): boolean {
  if (net.isIPv4(address)) {
    const [a, b] = address.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  const value = address.toLowerCase();
  return value === "::" || value === "::1" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe8") || value.startsWith("fe9") || value.startsWith("fea") || value.startsWith("feb");
}

export async function assertAllowedWebhookUrl(rawUrl: string): Promise<URL> {
  let target: URL;
  try { target = new URL(rawUrl); } catch { throw new AppError(400, "INVALID_WEBHOOK_URL", "Webhook URL must be valid"); }
  if (target.protocol !== "https:") throw new AppError(400, "INVALID_WEBHOOK_PROTOCOL", "Webhook URL must use HTTPS");
  if (target.username || target.password) throw new AppError(400, "INVALID_WEBHOOK_CREDENTIALS", "Credentials are not allowed in webhook URLs");
  if (rawUrl.length > 2048) throw new AppError(400, "INVALID_WEBHOOK_URL", "Webhook URL is too long");
  let addresses: string[];
  try { addresses = (await dns.lookup(target.hostname, { all: true, verbatim: true })).map(({ address }) => address); }
  catch { throw new AppError(400, "WEBHOOK_RESOLUTION_FAILED", "Webhook hostname could not be resolved"); }
  if (!addresses.length || (!env.webhookAllowPrivateTargets && addresses.some(isPrivate))) {
    throw new AppError(403, "WEBHOOK_TARGET_BLOCKED", "Webhook target is private or reserved");
  }
  return target;
}
