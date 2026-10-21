/**
 * Runtime configuration. Everything is env driven so the same build can run
 * locally, on a free VPS, or on an ephemeral container host.
 */
import fs from 'node:fs';
import path from 'node:path';

/**
 * Minimal .env loader (no dependencies). Existing process env always wins.
 * Works both for a local .env file and for hosts that mount secrets as files.
 */
function loadDotEnv(file = path.join(process.cwd(), '.env')) {
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch {
    return;
  }
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnv();

const bool = (v, fallback) => {
  if (v === undefined || v === null || v === '') return fallback;
  return /^(1|true|yes|on|enable[d]?)$/i.test(String(v).trim());
};

const num = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const config = {
  port: num(process.env.PORT, 8080),
  host: process.env.HOST || '0.0.0.0',

  siteName: process.env.SITE_NAME || 'NEXUS//TV',
  siteTagline: process.env.SITE_TAGLINE || 'Live channel intelligence grid',

  dataDir: path.resolve(process.env.DATA_DIR || path.join(process.cwd(), 'data')),
  sessionSecret: process.env.SESSION_SECRET || '',
  adminUser: process.env.ADMIN_USER || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || '',

  upstashUrl: process.env.UPSTASH_REDIS_REST_URL || '',
  upstashToken: process.env.UPSTASH_REDIS_REST_TOKEN || '',
  githubToken: process.env.GITHUB_TOKEN || '',
  githubRepo: process.env.GITHUB_REPO || '',
  githubKvPath: process.env.GITHUB_KV_PATH || 'data/kv.json',

  requireLogin: bool(process.env.REQUIRE_LOGIN, true),
  allowCustomStreams: bool(process.env.ALLOW_CUSTOM_STREAMS, true),

  probeTimeoutMs: num(process.env.PROBE_TIMEOUT_MS, 5000),
  probeConcurrency: num(process.env.PROBE_CONCURRENCY, 16),
  scanRate: num(process.env.SCAN_RATE, 8),
  statusTtlMs: num(process.env.STATUS_TTL_MS, 15 * 60 * 1000),

  proxyTimeoutMs: num(process.env.PROXY_TIMEOUT_MS, 20000),
  allowPrivateStreams: bool(process.env.ALLOW_PRIVATE_STREAMS, false),

  catalogBase: (process.env.CATALOG_API_BASE || 'https://iptv-org.github.io/api').replace(/\/+$/, ''),
  catalogRefreshMs: num(process.env.CATALOG_REFRESH_MS, 6 * 60 * 60 * 1000),

  sessionTtlMs: num(process.env.SESSION_TTL_MS, 7 * 24 * 60 * 60 * 1000),
  trustProxy: bool(process.env.TRUST_PROXY, true),
};

export default config;
