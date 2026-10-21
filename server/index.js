/**
 * NEXUS//TV - server entry point.
 *
 * Responsibilities:
 *   - serve the single page application
 *   - import the public channel catalogue
 *   - continuously test streams and publish the "working channels" list
 *   - admin login, visitor codes, runtime settings
 *   - CORS/HLS proxy so the browser can actually play the streams
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import config from './config.js';
import { createStore } from './store.js';
import { Auth } from './auth.js';
import { loadCatalog, countryName } from './catalog.js';
import { StatusStore, Scanner } from './status.js';
import { probeStream } from './probe.js';
import { handleProxy } from './proxy.js';
import { sendJson, readJsonBody, createLimiter, clamp } from './util.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

const QUALITY_RANK = {
  '4k': 400, '2160p': 400, 'uhd': 400, '1440p': 300, '2k': 300, '1080p': 200,
  'fullhd': 200, 'fhd': 200, 'hd': 150, '720p': 150, '576p': 100, '480p': 80,
  '360p': 60, '240p': 40, '144p': 20,
};

const state = {
  catalog: null,
  channelStatus: new Map(), // channelId -> {online, best, streams:[status]}
  customChannels: [],
  clients: new Set(),
  lastBroadcast: 0,
  bootedAt: Date.now(),
};

const loginLimiter = createLimiter({ windowMs: 5 * 60 * 1000, max: 25 });

// ---------------------------------------------------------------------------
// bootstrap
// ---------------------------------------------------------------------------
const log = console;
const store = await createStore(config, log);
const auth = new Auth({ store, config, log });
await auth.init();

const statusStore = new StatusStore(store);
await statusStore.load();
log.log(`[status] restored ${statusStore.map.size} known stream states`);

let catalog = null;
async function refreshCatalog() {
  try {
    catalog = await loadCatalog({ base: config.catalogBase, log });
    state.catalog = catalog;
    scanner.setCatalog(catalog);
    recomputeAllChannelStatus();
    await loadCustomChannels();
    return catalog;
  } catch (err) {
    log.error('[catalog] load failed:', err.message);
    if (!state.catalog) {
      state.catalog = {
        channelsById: new Map(),
        streamsByChannel: new Map(),
        channels: [],
        countries: [],
        categories: [],
        totalStreams: 0,
        totalChannels: 0,
        loadedAt: Date.now(),
      };
    }
    return null;
  }
}

const scanner = new Scanner({
  catalog: { channels: [], streamsByChannel: new Map() },
  statusStore,
  probeOptions: { timeoutMs: config.probeTimeoutMs },
  concurrency: config.probeConcurrency,
  ratePerSec: config.scanRate,
  ttlMs: config.statusTtlMs,
  log,
  onUpdate: () => scheduleBroadcast(),
  onResult: (url, entry, stream) => {
    if (!stream?.channelId) return;
    // Keep the channel level state in sync so online/offline flips are instant.
    computeChannelStatus(stream.channelId);
  },
});

await refreshCatalog();

// ---------------------------------------------------------------------------
// channel status helpers
// ---------------------------------------------------------------------------
function streamStatusFor(url) {
  return statusStore.entryFor(url);
}

function computeChannelStatus(channelId) {
  const catalogStreams = state.catalog?.streamsByChannel.get(channelId);
  const custom = state.customChannels.find((c) => c.id === channelId);
  const streams = catalogStreams || custom?.streams || [];
  const entries = streams.map((stream) => ({
    ...stream,
    status: streamStatusFor(stream.url),
  }));
  const online = entries.some((e) => e.status.status === 'online');
  const sorted = [...entries].sort((a, b) => {
    const rank = (s) => (s.status.status === 'online' ? 0 : s.status.status === 'unknown' ? 1 : 2);
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    return (QUALITY_RANK[b.quality?.toLowerCase()] || 0) - (QUALITY_RANK[a.quality?.toLowerCase()] || 0);
  });
  const best = sorted.find((e) => e.status.status === 'online') || sorted[0] || null;
  const value = { online, best, streams: sorted, streamCount: entries.length };
  state.channelStatus.set(channelId, value);
  return value;
}

function recomputeAllChannelStatus() {
  state.channelStatus.clear();
  if (!state.catalog) return;
  for (const channel of state.catalog.channels) computeChannelStatus(channel.id);
}

function channelIsOnline(channelId) {
  return state.channelStatus.get(channelId)?.online === true;
}

// custom (user added) channels live in their own bucket
async function loadCustomChannels() {
  const list = (await store.get('custom:channels')) || [];
  state.customChannels = Array.isArray(list) ? list : [];
  for (const custom of state.customChannels) computeChannelStatus(custom.id);
}

async function saveCustomChannels() {
  await store.set('custom:channels', state.customChannels);
}

// ---------------------------------------------------------------------------
// catalogue helpers
// ---------------------------------------------------------------------------
function allChannels() {
  const base = state.catalog?.channels || [];
  if (!state.customChannels.length) return base;
  return [...base, ...state.customChannels.map((c) => ({ ...c, isCustom: true }))];
}

function matchSearch(channel, q) {
  if (!q) return true;
  const needle = q.toLowerCase();
  if (channel.name.toLowerCase().includes(needle)) return true;
  if (channel.id.toLowerCase().includes(needle)) return true;
  if (channel.network && channel.network.toLowerCase().includes(needle)) return true;
  if (channel.altNames?.some((n) => String(n).toLowerCase().includes(needle))) return true;
  if (channel.country && (channel.country.toLowerCase() === needle || countryName(channel.country).toLowerCase().includes(needle))) {
    return true;
  }
  if (channel.categories?.some((c) => c.toLowerCase().includes(needle))) return true;
  return false;
}

function channelSummary(channel) {
  const status = state.channelStatus.get(channel.id) || { online: false, best: null, streamCount: 0 };
  return {
    id: channel.id,
    name: channel.name,
    altNames: channel.altNames || [],
    network: channel.network || null,
    country: channel.country || null,
    countryName: countryName(channel.country),
    categories: channel.categories || [],
    logo: channel.logo || null,
    isNsfw: !!channel.isNsfw,
    closed: channel.closed || null,
    website: channel.website || null,
    isCustom: !!channel.isCustom,
    online: status.online,
    streamCount: status.streamCount,
    bestQuality: status.best?.quality || null,
    bestKind: status.best?.status?.kind || null,
  };
}

function facets() {
  const countries = new Map();
  const categories = new Map();
  for (const channel of allChannels()) {
    const online = channelIsOnline(channel.id);
    if (channel.country) {
      const entry = countries.get(channel.country) || { code: channel.country, name: countryName(channel.country), total: 0, online: 0 };
      entry.total++;
      if (online) entry.online++;
      countries.set(channel.country, entry);
    }
    for (const cat of channel.categories || []) {
      const entry = categories.get(cat) || { name: cat, total: 0, online: 0 };
      entry.total++;
      if (online) entry.online++;
      categories.set(cat, entry);
    }
  }
  return {
    countries: [...countries.values()].sort((a, b) => b.online - a.online || a.name.localeCompare(b.name)),
    categories: [...categories.values()].sort((a, b) => b.online - a.online || a.name.localeCompare(b.name)),
  };
}

function onlineChannelCount() {
  let n = 0;
  for (const channel of state.catalog?.channels || []) if (channelIsOnline(channel.id)) n++;
  for (const custom of state.customChannels) if (channelIsOnline(custom.id)) n++;
  return n;
}

// ---------------------------------------------------------------------------
// SSE broadcast
// ---------------------------------------------------------------------------
function broadcast() {
  state.lastBroadcast = Date.now();
  const payload = JSON.stringify({
    type: 'stats',
    online: onlineChannelCount(),
    total: state.catalog?.totalChannels || 0,
    streams: statusStore.stats(),
    scan: scanner.progress(),
    uptime: Math.round((Date.now() - state.bootedAt) / 1000),
  });
  for (const client of state.clients) {
    try {
      client.write(`data: ${payload}\n\n`);
    } catch {
      state.clients.delete(client);
    }
  }
}

let broadcastTimer = null;
function scheduleBroadcast() {
  if (broadcastTimer) return;
  broadcastTimer = setTimeout(() => {
    broadcastTimer = null;
    broadcast();
  }, 1000);
  broadcastTimer.unref?.();
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function isApi(req, url) {
  return url.pathname.startsWith('/api/');
}

function requireClientHeader(req, res) {
  // Simple CSRF guard: mutating API calls must carry our custom header,
  // which a cross-site form cannot set without a CORS preflight approval.
  if (req.headers['x-nxs-client'] !== '1') {
    sendJson(res, 403, { error: 'client header required' });
    return false;
  }
  return true;
}

function clientIp(req) {
  if (config.trustProxy) {
    const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    if (fwd) return fwd;
  }
  return req.socket.remoteAddress || 'unknown';
}

function ensureSession(req, res) {
  let session = auth.getSession(req);
  if (!session && !auth.settings.requireLogin) {
    const token = auth.createToken('guest', 'guest');
    res.setHeader('Set-Cookie', auth.sessionCookie(token, req));
    session = { role: 'guest', id: 'guest', label: 'guest' };
  }
  return session;
}

function authRequired(res) {
  sendJson(res, 401, { error: 'login required' });
  return false;
}

async function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  const filePath = path.join(PUBLIC_DIR, path.normalize(rel).replace(/^([/\\])+/, ''));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end('forbidden');
    return;
  }
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const etag = `W/"${stat.size}-${stat.mtimeMs}"`;
    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304).end();
      return;
    }
    const isHtml = ext === '.html';
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      ETag: etag,
      // revalidate every time (cheap 304s) so a redeploy never serves stale css/js
      'Cache-Control': isHtml ? 'no-cache' : 'no-cache, must-revalidate',
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

// ---------------------------------------------------------------------------
// request handler
// ---------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const { pathname } = url;

  try {
    // ---------------------------------------------------------------- proxy
    if (pathname === '/api/proxy') {
      const target = url.searchParams.get('u');
      if (!target) return sendJson(res, 400, { error: 'missing u' });
      const session = ensureSession(req, res);
      if (!session) return authRequired(res);
      const ua = url.searchParams.get('ua');
      const ref = url.searchParams.get('ref');
      await handleProxy(req, res, target, {
        allowPrivate: config.allowPrivateStreams,
        timeoutMs: config.proxyTimeoutMs,
        userAgent: ua || null,
        referrer: ref || null,
      });
      return;
    }

    // ---------------------------------------------------------------- events
    if (pathname === '/api/events') {
      const session = ensureSession(req, res);
      if (!session) return authRequired(res);
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'X-Accel-Buffering': 'no',
      });
      res.write(': connected\n\n');
      state.clients.add(res);
      const keepAlive = setInterval(() => {
        try {
          res.write(': ping\n\n');
        } catch {
          /* closed */
        }
      }, 20000);
      keepAlive.unref?.();
      req.on('close', () => {
        clearInterval(keepAlive);
        state.clients.delete(res);
      });
      broadcast();
      return;
    }

    // ----------------------------------------------------------------- auth
    if (pathname === '/api/auth/login') {
      if (req.method !== 'POST') return sendJson(res, 405, { error: 'method not allowed' });
      if (!requireClientHeader(req, res)) return;
      const ip = clientIp(req);
      const limit = loginLimiter(ip);
      if (!limit.allowed) return sendJson(res, 429, { error: 'too many attempts, slow down' });
      const body = await readJsonBody(req);
      const role = body.role === 'admin' ? 'admin' : 'visitor';
      const result =
        role === 'admin'
          ? await auth.loginAdmin(body.username, body.password)
          : await auth.loginVisitor(body.code);
      if (!result.ok) return sendJson(res, 401, { error: result.reason || 'login failed' });
      const token = auth.createToken(result.role, result.sub);
      res.setHeader('Set-Cookie', auth.sessionCookie(token, req));
      return sendJson(res, 200, {
        ok: true,
        role: result.role,
        label: result.label || result.sub,
        settings: auth.settings,
      });
    }

    if (pathname === '/api/auth/logout') {
      res.setHeader('Set-Cookie', auth.clearCookie());
      return sendJson(res, 200, { ok: true });
    }

    if (pathname === '/api/auth/me') {
      const session = auth.getSession(req);
      return sendJson(res, 200, {
        authenticated: !!session,
        role: session?.role || null,
        label: session?.label || null,
        requireLogin: auth.settings.requireLogin,
      });
    }

    // -------------------------------------------------------------- config
    if (pathname === '/api/config') {
      const session = ensureSession(req, res);
      const f = facets();
      return sendJson(res, 200, {
        siteName: auth.settings.siteName || config.siteName,
        tagline: auth.settings.tagline || config.siteTagline,
        requireLogin: auth.settings.requireLogin,
        allowCustomStreams: auth.settings.allowCustomStreams,
        hideOffline: auth.settings.hideOffline !== false,
        authenticated: !!session,
        role: session?.role || null,
        label: session?.label || null,
        countries: f.countries,
        categories: f.categories,
        totals: {
          channels: state.catalog?.totalChannels || 0,
          streams: state.catalog?.totalStreams || 0,
          online: onlineChannelCount(),
        },
      });
    }

    // ------------------------------------------------------------ channels
    if (pathname === '/api/channels' && req.method === 'GET') {
      const session = ensureSession(req, res);
      if (!session) return authRequired(res);

      const q = (url.searchParams.get('q') || '').trim();
      const country = (url.searchParams.get('country') || '').trim();
      const category = (url.searchParams.get('category') || '').trim();
      const includeOffline = url.searchParams.get('includeOffline') === '1';
      const limit = clamp(url.searchParams.get('limit') || 300, 1, 3000);
      const offset = clamp(url.searchParams.get('offset') || 0, 0, 1000000);

      const hideOffline = auth.settings.hideOffline !== false;
      const showOffline = includeOffline || !hideOffline;

      const matched = [];
      for (const channel of allChannels()) {
        if (!showOffline && !channelIsOnline(channel.id)) continue;
        if (country && channel.country !== country) continue;
        if (category && !(channel.categories || []).includes(category)) continue;
        if (!matchSearch(channel, q)) continue;
        matched.push(channel);
      }

      matched.sort((a, b) => {
        const oa = channelIsOnline(a.id) ? 0 : 1;
        const ob = channelIsOnline(b.id) ? 0 : 1;
        if (oa !== ob) return oa - ob;
        return a.name.localeCompare(b.name);
      });

      const page = matched.slice(offset, offset + limit);
      return sendJson(res, 200, {
        total: matched.length,
        offset,
        limit,
        channels: page.map(channelSummary),
      });
    }

    const channelMatch = pathname.match(/^\/api\/channels\/(.+)$/);
    if (channelMatch && req.method === 'GET') {
      const session = ensureSession(req, res);
      if (!session) return authRequired(res);
      const id = decodeURIComponent(channelMatch[1]);
      const channel =
        state.catalog?.channelsById.get(id) || state.customChannels.find((c) => c.id === id);
      if (!channel) return sendJson(res, 404, { error: 'channel not found' });
      const status = computeChannelStatus(channel.id);
      return sendJson(res, 200, {
        channel: channelSummary(channel),
        streams: status.streams.map((s) => ({
          id: s.id,
          title: s.title,
          url: s.url,
          quality: s.quality,
          labels: s.labels,
          userAgent: s.userAgent,
          referrer: s.referrer,
          status: s.status.status,
          code: s.status.code,
          latency: s.status.latency,
          contentType: s.status.contentType,
          kind: s.status.kind,
          reason: s.status.reason,
          checkedAt: s.status.checkedAt,
        })),
      });
    }

    // ------------------------------------------------------- probe / test
    if (pathname === '/api/probe' && req.method === 'POST') {
      const session = ensureSession(req, res);
      if (!session) return authRequired(res);
      if (!requireClientHeader(req, res)) return;
      const body = await readJsonBody(req);
      const target = String(body.url || '').trim();
      if (!target) return sendJson(res, 400, { error: 'missing url' });
      let parsed;
      try {
        parsed = new URL(target);
      } catch {
        return sendJson(res, 400, { error: 'invalid url' });
      }
      if (!/^https?:$/.test(parsed.protocol)) return sendJson(res, 400, { error: 'only http/https' });
      const result = await probeStream(target, {
        timeoutMs: config.probeTimeoutMs,
        userAgent: body.userAgent || null,
        referrer: body.referrer || null,
      });
      statusStore.set(target, {
        status: result.status,
        code: result.code ?? null,
        latency: result.latency,
        contentType: result.contentType ?? null,
        kind: result.kind ?? null,
        reason: result.reason,
        checkedAt: Date.now(),
      });
      scheduleBroadcast();
      return sendJson(res, 200, {
        url: target,
        status: result.status,
        code: result.code ?? null,
        latency: result.latency,
        contentType: result.contentType ?? null,
        kind: result.kind ?? null,
        reason: result.reason,
      });
    }

    if (pathname === '/api/channels/probe' && req.method === 'POST') {
      const session = ensureSession(req, res);
      if (!session) return authRequired(res);
      if (!requireClientHeader(req, res)) return;
      const body = await readJsonBody(req);
      const id = String(body.channelId || '');
      const streams =
        state.catalog?.streamsByChannel.get(id) || state.customChannels.find((c) => c.id === id)?.streams || [];
      const results = [];
      for (const stream of streams) {
        const result = await probeStream(stream.url, {
          timeoutMs: config.probeTimeoutMs,
          userAgent: stream.userAgent,
          referrer: stream.referrer,
        });
        statusStore.set(stream.url, {
          status: result.status,
          code: result.code ?? null,
          latency: result.latency,
          contentType: result.contentType ?? null,
          kind: result.kind ?? null,
          reason: result.reason,
          checkedAt: Date.now(),
        });
        results.push({ ...stream, ...result });
      }
      computeChannelStatus(id);
      scheduleBroadcast();
      return sendJson(res, 200, { channelId: id, results });
    }

    // ------------------------------------------------------- custom streams
    if (pathname === '/api/custom' && req.method === 'GET') {
      const session = ensureSession(req, res);
      if (!session) return authRequired(res);
      return sendJson(res, 200, {
        channels: state.customChannels.map((c) => ({
          ...channelSummary(c),
          url: c.url,
          status: streamStatusFor(c.url),
        })),
      });
    }

    if (pathname === '/api/custom' && req.method === 'POST') {
      const session = ensureSession(req, res);
      if (!session) return authRequired(res);
      if (!requireClientHeader(req, res)) return;
      if (!auth.settings.allowCustomStreams && session.role !== 'admin') {
        return sendJson(res, 403, { error: 'custom streams disabled' });
      }
      const body = await readJsonBody(req);
      const target = String(body.url || '').trim();
      if (!target) return sendJson(res, 400, { error: 'missing url' });
      let parsed;
      try {
        parsed = new URL(target);
      } catch {
        return sendJson(res, 400, { error: 'invalid url' });
      }
      if (!/^https?:$/.test(parsed.protocol)) return sendJson(res, 400, { error: 'only http/https' });
      const id = `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const name = String(body.name || parsed.hostname || 'Custom channel').slice(0, 60);
      const custom = {
        id,
        name,
        altNames: [],
        country: null,
        categories: ['custom'],
        logo: null,
        isNsfw: false,
        closed: null,
        website: null,
        isCustom: true,
        url: target,
        streams: [
          {
            id: `${id}::0`,
            channel: id,
            title: name,
            url: target,
            quality: 'auto',
            labels: [],
            userAgent: body.userAgent || null,
            referrer: body.referrer || null,
          },
        ],
        addedAt: Date.now(),
      };
      state.customChannels.push(custom);
      await saveCustomChannels();
      computeChannelStatus(id);
      const result = await probeStream(target, {
        timeoutMs: config.probeTimeoutMs,
        userAgent: custom.streams[0].userAgent,
        referrer: custom.streams[0].referrer,
      });
      statusStore.set(target, {
        status: result.status,
        code: result.code ?? null,
        latency: result.latency,
        contentType: result.contentType ?? null,
        kind: result.kind ?? null,
        reason: result.reason,
        checkedAt: Date.now(),
      });
      computeChannelStatus(id);
      scheduleBroadcast();
      return sendJson(res, 200, { ok: true, channel: channelSummary(custom), probe: result });
    }

    if (pathname.match(/^\/api\/custom\/.+$/) && req.method === 'DELETE') {
      const session = ensureSession(req, res);
      if (!session) return authRequired(res);
      if (!requireClientHeader(req, res)) return;
      if (session.role !== 'admin' && !auth.settings.allowCustomStreams) {
        return sendJson(res, 403, { error: 'not allowed' });
      }
      const id = decodeURIComponent(pathname.split('/').pop());
      state.customChannels = state.customChannels.filter((c) => c.id !== id);
      state.channelStatus.delete(id);
      await saveCustomChannels();
      return sendJson(res, 200, { ok: true });
    }

    // ------------------------------------------------------------- admin api
    if (pathname.startsWith('/api/admin/')) {
      const session = ensureSession(req, res);
      if (!session || session.role !== 'admin') return authRequired(res);
      if (!requireClientHeader(req, res)) return;

      if (pathname === '/api/admin/codes' && req.method === 'GET') {
        return sendJson(res, 200, { codes: auth.codes });
      }
      if (pathname === '/api/admin/codes' && req.method === 'POST') {
        const body = await readJsonBody(req);
        const code = await auth.createCode(body);
        return sendJson(res, 200, { ok: true, code });
      }
      const codeMatch = pathname.match(/^\/api\/admin\/codes\/([^/]+)$/);
      if (codeMatch && req.method === 'PATCH') {
        const body = await readJsonBody(req);
        const code = await auth.updateCode(codeMatch[1], body);
        return sendJson(res, 200, { ok: true, code });
      }
      if (codeMatch && req.method === 'DELETE') {
        await auth.deleteCode(codeMatch[1]);
        return sendJson(res, 200, { ok: true });
      }
      const rotateMatch = pathname.match(/^\/api\/admin\/codes\/([^/]+)\/rotate$/);
      if (rotateMatch && req.method === 'POST') {
        const code = await auth.rotateCode(rotateMatch[1]);
        return sendJson(res, 200, { ok: true, code });
      }
      if (pathname === '/api/admin/settings' && req.method === 'GET') {
        return sendJson(res, 200, { settings: auth.settings });
      }
      if (pathname === '/api/admin/settings' && req.method === 'PUT') {
        const body = await readJsonBody(req);
        const settings = await auth.updateSettings(body);
        return sendJson(res, 200, { ok: true, settings });
      }
      if (pathname === '/api/admin/password' && req.method === 'POST') {
        const body = await readJsonBody(req);
        const result = await auth.changeAdminPassword(
          body.currentPassword,
          body.newPassword,
          session.id,
        );
        if (!result.ok) return sendJson(res, 400, { error: result.reason });
        return sendJson(res, 200, { ok: true });
      }
      if (pathname === '/api/admin/username' && req.method === 'POST') {
        const body = await readJsonBody(req);
        const result = await auth.changeAdminUser(body.newUser, body.currentPassword);
        if (!result.ok) return sendJson(res, 400, { error: result.reason });
        return sendJson(res, 200, { ok: true });
      }
      if (pathname === '/api/admin/scan' && req.method === 'POST') {
        const body = await readJsonBody(req);
        if (body.action === 'stop') scanner.stop();
        else if (body.action === 'restart') {
          scanner.stop();
          scanner.setCatalog(state.catalog);
          scanner.start();
        } else {
          if (!scanner.started) {
            scanner.setCatalog(state.catalog);
            scanner.start();
          }
        }
        return sendJson(res, 200, { ok: true, progress: scanner.progress() });
      }
      if (pathname === '/api/admin/refresh' && req.method === 'POST') {
        const result = await refreshCatalog();
        return sendJson(res, 200, { ok: !!result, loadedAt: result?.loadedAt || null });
      }
      if (pathname === '/api/admin/stats' && req.method === 'GET') {
        return sendJson(res, 200, {
          catalogue: {
            channels: state.catalog?.totalChannels || 0,
            streams: state.catalog?.totalStreams || 0,
            loadedAt: state.catalog?.loadedAt || null,
          },
          status: statusStore.stats(),
          scan: scanner.progress(),
          onlineChannels: onlineChannelCount(),
          customChannels: state.customChannels.length,
          uptime: Math.round((Date.now() - state.bootedAt) / 1000),
        });
      }
      return sendJson(res, 404, { error: 'unknown admin endpoint' });
    }

    // ---------------------------------------------------------------- stats
    if (pathname === '/api/stats' && req.method === 'GET') {
      return sendJson(res, 200, {
        online: onlineChannelCount(),
        total: state.catalog?.totalChannels || 0,
        streams: statusStore.stats(),
        scan: scanner.progress(),
        uptime: Math.round((Date.now() - state.bootedAt) / 1000),
      });
    }

    if (pathname === '/api/health') {
      return sendJson(res, 200, { ok: true, uptime: Math.round((Date.now() - state.bootedAt) / 1000) });
    }

    if (isApi(req, url)) return sendJson(res, 404, { error: 'unknown endpoint' });

    return serveStatic(req, res, url);
  } catch (err) {
    log.error('[server]', err);
    if (!res.headersSent) sendJson(res, err.status || 500, { error: err.message || 'server error' });
    else res.end();
  }
});

server.keepAliveTimeout = 65_000;
server.headersTimeout = 70_000;
server.requestTimeout = 0;

// ---------------------------------------------------------------------------
// go
// ---------------------------------------------------------------------------
scanner.setCatalog(state.catalog);
scanner.start();

setInterval(() => {
  refreshCatalog().catch(() => {});
}, config.catalogRefreshMs).unref?.();

setInterval(() => broadcast(), 5000).unref?.();

server.listen(config.port, config.host, () => {
  log.log('');
  log.log(`  ${auth.settings.siteName || config.siteName}  ::  ${config.siteTagline}`);
  log.log(`  > http://localhost:${config.port}`);
  log.log(`  > admin user: ${auth.admin.user}`);
  log.log(
    `  > login required: ${auth.settings.requireLogin}   custom streams: ${auth.settings.allowCustomStreams}`,
  );
  log.log('');
});

async function shutdown(signal) {
  log.log(`[server] ${signal} received - saving state`);
  try {
    await statusStore.flush();
    await store.flush?.();
  } catch {
    /* ignore */
  }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref?.();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (err) => log.error('[unhandled]', err));
