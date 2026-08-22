import dns from "node:dns/promises";
import net from "node:net";
import { env } from "../config/env.js";
import { AppError } from "../errors/app-error.js";

const BLOCKED_HOSTS = new Set(["localhost", "localhost.localdomain"]);

function isPrivateIpv4(ip: string): boolean {
  const octets = ip.split(".").map(Number);
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part))) return true;
  const [a, b] = octets;
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) return isPrivateIpv4(ip);
  if (!net.isIPv6(ip)) return true;
  const normalized = ip.toLowerCase();
  return normalized === "::" || normalized === "::1" || normalized.startsWith("fc") ||
    normalized.startsWith("fd") || normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") || normalized.startsWith("fea") ||
    normalized.startsWith("feb") || normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") || normalized.startsWith("::ffff:192.168.");
}

export async function assertAllowedScanTarget(rawUrl: string): Promise<URL> {
  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    throw new AppError(400, "INVALID_TARGET", "Target must be a valid URL");
  }

  if (!new Set(["http:", "https:"]).has(target.protocol)) {
    throw new AppError(400, "INVALID_TARGET_PROTOCOL", "Only HTTP and HTTPS targets are supported");
  }
  if (target.username || target.password) {
    throw new AppError(400, "INVALID_TARGET_CREDENTIALS", "Credentials are not allowed in target URLs");
  }

  const hostname = target.hostname.toLowerCase().replace(/\.$/, "");
  if (!env.allowPrivateScanTargets && BLOCKED_HOSTS.has(hostname)) {
    throw new AppError(403, "TARGET_OUT_OF_SCOPE", "Private scan targets are disabled");
  }

  let addresses: string[];
  try {
    addresses = net.isIP(hostname)
      ? [hostname]
      : (await dns.lookup(hostname, { all: true, verbatim: true })).map(({ address }) => address);
  } catch {
    throw new AppError(400, "TARGET_RESOLUTION_FAILED", "Target hostname could not be resolved");
  }

  if (addresses.length === 0) {
    throw new AppError(400, "TARGET_RESOLUTION_FAILED", "Target hostname resolved to no addresses");
  }
  if (!env.allowPrivateScanTargets && addresses.some(isPrivateIp)) {
    throw new AppError(403, "TARGET_OUT_OF_SCOPE", "Target resolves to a private or reserved address");
  }

  return target;
}
