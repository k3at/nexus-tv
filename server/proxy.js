/**
 * Streaming proxy with CORS headers + HLS playlist rewriting.
 *
 * Browser players cannot load most IPTV sources directly (no CORS headers),
 * so every segment / playlist is routed through /api/proxy.
 */
import dns from 'node:dns/promises';
import { DEFAULT_UA, isPrivateAddress } from './util.js';

const PLAYLIST_TYPES = /mpegurl|x-mpegurl|vnd\.apple\.mpegurl|text\/vnd\.apple\.mpegurl/i;
const MAX_PLAYLIST_BYTES = 4 * 1024 * 1024;

export function isPlaylist(contentType, url) {
  if (PLAYLIST_TYPES.test(contentType || '')) return true;
  return /\.m3u8?(\?|#|$)/i.test(url || '');
}

async function assertPublicHost(hostname, allowPrivate) {
  if (allowPrivate) return;
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    throw Object.assign(new Error('blocked host'), { status: 400 });
  }
  let records;
  try {
    records = await dns.lookup(hostname, { all: true });
  } catch {
    return; // let fetch produce the real error
  }
  for (const rec of records) {
    if (isPrivateAddress(rec.address)) {
      throw Object.assign(new Error('blocked private address'), { status: 403 });
    }
  }
}

function proxiedUrl(absUrl, extra = '') {
  return `/api/proxy?u=${encodeURIComponent(absUrl)}${extra}`;
}

/** Rewrites every URI inside an HLS playlist so the browser stays on our origin. */
export function rewritePlaylist(text, baseUrl, extra = '') {
  const out = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      out.push('');
      continue;
    }
    if (line.startsWith('#')) {
      out.push(
        rawLine.replace(/URI="([^"]+)"/g, (_m, uri) => {
          try {
            return `URI="${proxiedUrl(new URL(uri, baseUrl).href, extra)}"`;
          } catch {
            return `URI="${uri}"`;
          }
        }),
      );
    } else {
      try {
        out.push(proxiedUrl(new URL(line, baseUrl).href, extra));
      } catch {
        out.push(rawLine);
      }
    }
  }
  return out.join('\n');
}

/**
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 */
export async function handleProxy(req, res, target, options = {}) {
  const {
    allowPrivate = false,
    timeoutMs = 20000,
    userAgent = null,
    referrer = null,
  } = options;

  let url;
  try {
    url = new URL(target);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('invalid url');
    return;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('unsupported protocol');
    return;
  }

  try {
    await assertPublicHost(url.hostname, allowPrivate);
  } catch (err) {
    res.writeHead(err.status || 403, { 'Content-Type': 'text/plain' });
    res.end(err.message);
    return;
  }

  const headers = {
    'User-Agent': userAgent || DEFAULT_UA,
    Accept: req.headers.accept || '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
  };
  if (referrer) headers.Referer = referrer;
  if (req.headers.range) headers.Range = req.headers.range;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let upstream;
  try {
    upstream = await fetch(url.href, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers,
    });
  } catch (err) {
    clearTimeout(timer);
    res.writeHead(502, {
      'Content-Type': 'text/plain',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(`upstream error: ${err.message}`);
    return;
  }

  const contentType = upstream.headers.get('content-type') || '';
  const extra = `&ua=${encodeURIComponent(userAgent || DEFAULT_UA)}${referrer ? `&ref=${encodeURIComponent(referrer)}` : ''}`;

  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Expose-Headers': 'Content-Length,Content-Range,Accept-Ranges',
    'Access-Control-Allow-Headers': 'Range,Content-Type',
    'Access-Control-Allow-Methods': 'GET,HEAD,OPTIONS',
  };

  if (isPlaylist(contentType, url.href)) {
    clearTimeout(timer);
    try {
      const buf = Buffer.from(await upstream.arrayBuffer());
      const text = buf.subarray(0, MAX_PLAYLIST_BYTES).toString('utf8');
      const rewritten = rewritePlaylist(text, upstream.url || url.href, extra);
      const body = Buffer.from(rewritten, 'utf8');
      res.writeHead(upstream.status, {
        ...cors,
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Content-Length': body.length,
        'Cache-Control': 'no-cache',
      });
      res.end(body);
    } catch (err) {
      res.writeHead(502, { ...cors, 'Content-Type': 'text/plain' });
      res.end(`playlist error: ${err.message}`);
    }
    return;
  }

  const outHeaders = {
    ...cors,
    'Content-Type': contentType || 'application/octet-stream',
    'Cache-Control': 'no-store',
  };
  for (const h of ['content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']) {
    const v = upstream.headers.get(h);
    if (v) outHeaders[h] = v;
  }

  res.writeHead(upstream.status, outHeaders);

  if (!upstream.body) {
    clearTimeout(timer);
    res.end();
    return;
  }

  const reader = upstream.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!res.write(value)) {
        await new Promise((resolve) => res.once('drain', resolve));
      }
      if (res.writableEnded) break;
    }
  } catch {
    /* client disconnected or upstream hiccup - nothing to do */
  } finally {
    clearTimeout(timer);
    reader.cancel?.().catch(() => {});
    if (!res.writableEnded) res.end();
  }
}
