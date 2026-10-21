/**
 * Stream health tester.
 *
 * A stream is considered ONLINE when the server answers with a media-ish
 * content type (or an HLS playlist) and a 2xx status code.
 * A stream is OFFLINE on DNS/connection errors, timeouts of the connection
 * itself or non-2xx responses.
 * Anything ambiguous (slow server, truncated body) is UNKNOWN - unknown
 * channels are hidden from the public list until they prove to work.
 */
import { DEFAULT_UA } from './util.js';

const MEDIA_TYPES = [
  'video/',
  'audio/',
  'application/vnd.apple.mpegurl',
  'application/x-mpegurl',
  'application/x-mpegurl;',
  'application/vnd.apple.mpegurl;',
  'text/vnd.apple.mpegurl',
  'application/dash+xml',
  'application/mp4',
  'video/mp2t',
  'application/octet-stream',
  'binary/octet-stream',
  'application/ogg',
];

function looksLikeMedia(contentType) {
  if (!contentType) return false;
  const ct = contentType.toLowerCase();
  if (ct.startsWith('text/plain')) return true; // verified by sniffing below
  return MEDIA_TYPES.some((t) => ct.startsWith(t) || ct.includes(t));
}

export function isHlsUrl(url = '') {
  return /\.m3u8?(\?|#|$)/i.test(url);
}

/**
 * @returns {Promise<{status:'online'|'offline'|'unknown', code:number|null,
 *   latency:number, contentType:string|null, kind:string|null, reason:string}>}
 */
export async function probeStream(url, options = {}) {
  const {
    timeoutMs = 6000,
    userAgent = null,
    referrer = null,
    maxBytes = 8192,
  } = options;

  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers = {
    'User-Agent': userAgent || DEFAULT_UA,
    Accept: '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
  };
  if (referrer) headers.Referer = referrer;
  headers.Range = 'bytes=0-4095';

  const finish = (result) => {
    clearTimeout(timer);
    return { latency: Date.now() - started, ...result };
  };

  try {
    let res;
    try {
      res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers,
      });
    } catch (err) {
      // Some servers dislike Range -> retry without it.
      if (err?.name === 'AbortError') throw err;
      delete headers.Range;
      res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers,
      });
    }

    const contentType = res.headers.get('content-type');
    const status = res.status;

    // Drain a little of the body so we can sniff HLS playlists.
    let sniff = Buffer.alloc(0);
    if (res.body) {
      try {
        const reader = res.body.getReader();
        const { value } = await reader.read();
        if (value) sniff = Buffer.from(value.slice(0, maxBytes));
        await reader.cancel().catch(() => {});
      } catch {
        /* ignore */
      }
    }

    if (status === 416) {
      return finish({ status: 'offline', code: status, contentType, reason: 'range rejected' });
    }
    if (status >= 400) {
      return finish({ status: 'offline', code: status, contentType, reason: `http ${status}` });
    }
    if (status >= 300) {
      return finish({ status: 'offline', code: status, contentType, reason: `redirect ${status}` });
    }

    const head = sniff.subarray(0, 32).toString('latin1');
    const isPlaylist = head.startsWith('#EXTM3U');

    if (isPlaylist || isHlsUrl(url) || /mpegurl/i.test(contentType || '')) {
      if (isPlaylist || /mpegurl/i.test(contentType || '')) {
        return finish({
          status: 'online',
          code: status,
          contentType,
          kind: 'hls',
          reason: isPlaylist ? 'hls playlist' : 'hls content-type',
        });
      }
      return finish({
        status: 'unknown',
        code: status,
        contentType,
        kind: 'hls?',
        reason: 'no playlist body',
      });
    }

    if (looksLikeMedia(contentType)) {
      return finish({
        status: 'online',
        code: status,
        contentType,
        kind: 'progressive',
        reason: 'media response',
      });
    }

    if (head.startsWith('<') || /text\/html/i.test(contentType || '')) {
      return finish({
        status: 'offline',
        code: status,
        contentType,
        reason: 'html error page',
      });
    }

    return finish({
      status: 'unknown',
      code: status,
      contentType,
      kind: 'unknown',
      reason: 'unrecognised content-type',
    });
  } catch (err) {
    if (err?.name === 'AbortError') {
      return finish({ status: 'unknown', code: null, contentType: null, reason: 'timeout' });
    }
    const msg = String(err?.cause?.code || err?.message || err);
    return finish({
      status: 'offline',
      code: null,
      contentType: null,
      reason: msg.slice(0, 120),
    });
  }
}
