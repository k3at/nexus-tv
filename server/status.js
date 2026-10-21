/**
 * Stream status storage + background scanner.
 *
 * StatusStore keeps the health state of every stream in memory and persists it
 * in shards so restarts do not re-scan the whole world.
 *
 * Scanner continuously walks the catalogue, re-tests sources and flips
 * channels between OFFLINE and ONLINE as the upstream servers come and go.
 */
import { probeStream } from './probe.js';

function hashCode(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export class StatusStore {
  constructor(store, shards = 32) {
    this.store = store;
    this.shards = shards;
    this.map = new Map();
    this.dirty = new Set();
    this.timer = null;
  }

  async load() {
    for (let i = 0; i < this.shards; i++) {
      const shard = await this.store.get(`st:${i}`);
      if (!shard || typeof shard !== 'object') continue;
      for (const [url, entry] of Object.entries(shard)) this.map.set(url, entry);
    }
    return this.map.size;
  }

  get(url) {
    return this.map.get(url) || null;
  }

  entryFor(url) {
    return (
      this.map.get(url) || {
        status: 'unknown',
        code: null,
        latency: 0,
        contentType: null,
        kind: null,
        reason: 'not tested',
        checkedAt: 0,
      }
    );
  }

  set(url, entry) {
    this.map.set(url, entry);
    this.dirty.add(hashCode(url) % this.shards);
    this.schedule();
  }

  schedule() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush().catch((err) => console.error('[status] flush failed:', err.message));
    }, 45000);
    this.timer.unref?.();
  }

  async flush() {
    if (!this.dirty.size) return;
    const shards = [...this.dirty];
    this.dirty.clear();
    for (const i of shards) {
      const bucket = {};
      for (const [url, entry] of this.map) {
        // 'unknown' results carry no value across restarts - skip them
        if (entry.status === 'unknown') continue;
        if (hashCode(url) % this.shards === i) bucket[url] = entry;
      }
      await this.store.set(`st:${i}`, bucket);
    }
  }

  stats() {
    const out = { online: 0, offline: 0, unknown: 0, total: this.map.size };
    for (const entry of this.map.values()) {
      if (entry.status === 'online') out.online++;
      else if (entry.status === 'offline') out.offline++;
      else out.unknown++;
    }
    return out;
  }
}

export class Scanner {
  constructor({
    catalog,
    statusStore,
    probeOptions = {},
    concurrency = 10,
    ratePerSec = 5,
    ttlMs = 15 * 60 * 1000,
    log = console,
    onUpdate = () => {},
    onResult = () => {},
  }) {
    this.catalog = catalog;
    this.statusStore = statusStore;
    this.probeOptions = probeOptions;
    this.concurrency = Math.max(1, concurrency);
    this.ratePerSec = Math.max(1, ratePerSec);
    this.ttlMs = ttlMs;
    this.log = log;
    this.onUpdate = onUpdate;
    this.onResult = onResult;

    this.queue = [];
    this.pending = new Set();
    this.allUrls = [];
    this.cursor = 0;
    this.running = 0;
    this.checked = 0;
    this.started = false;
    this.timer = null;
    this.workers = [];
  }

  /** Rebuild the work list (after a catalogue refresh). */
  setCatalog(catalog) {
    this.catalog = catalog;
    const urls = [];
    // Channels with more sources first - they are the most likely to be online.
    const channels = [...catalog.channels].sort((a, b) => b.streamCount - a.streamCount);
    for (const channel of channels) {
      const streams = catalog.streamsByChannel.get(channel.id) || [];
      for (const stream of streams) urls.push(stream.url);
    }
    this.allUrls = urls;
    this.cursor = 0;
  }

  enqueue(url) {
    if (!url || this.pending.has(url)) return;
    this.pending.add(url);
    this.queue.push(url);
  }

  start() {
    if (this.started) return;
    this.started = true;

    // First pass: everything, ordered by channel popularity.
    for (const url of this.allUrls) this.enqueue(url);
    this.log.log(`[scanner] first pass queued: ${this.queue.length} streams`);

    for (let i = 0; i < this.concurrency; i++) this.worker();
    this.timer = setInterval(() => this.tick(), 1000);
    this.timer.unref?.();
  }

  stop() {
    this.started = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Keeps the queue topped up so every stream is re-tested on a rolling basis. */
  tick() {
    if (!this.started) return;
    const budget = Math.max(1, this.ratePerSec);
    let added = 0;
    while (added < budget && this.cursor < this.allUrls.length) {
      const url = this.allUrls[this.cursor++];
      if (!this.pending.has(url)) {
        this.enqueue(url);
        added++;
      }
    }
    // cursor wrapped -> full cycle done, start over
    if (this.cursor >= this.allUrls.length) this.cursor = 0;
  }

  async worker() {
    while (this.started) {
      const url = this.queue.shift();
      if (!url) {
        await new Promise((r) => setTimeout(r, 200));
        continue;
      }
      this.pending.delete(url);
      this.running++;
      try {
        const stream = this.findStream(url);
        const result = await probeStream(url, {
          timeoutMs: this.probeOptions.timeoutMs,
          userAgent: stream?.userAgent,
          referrer: stream?.referrer,
        });
        const entry = {
          status: result.status,
          code: result.code ?? null,
          latency: result.latency,
          contentType: result.contentType ?? null,
          kind: result.kind ?? null,
          reason: result.reason,
          checkedAt: Date.now(),
        };
        this.statusStore.set(url, entry);
        this.onResult(url, entry, stream);
        this.checked++;
      } catch (err) {
        this.log.warn('[scanner] probe error:', err.message);
      } finally {
        this.running--;
        this.onUpdate();
      }
    }
  }

  findStream(url) {
    if (!this._streamIndex) {
      this._streamIndex = new Map();
      for (const [channelId, streams] of this.catalog.streamsByChannel) {
        for (const stream of streams) this._streamIndex.set(stream.url, { ...stream, channelId });
      }
    }
    return this._streamIndex.get(url) || null;
  }

  progress() {
    return {
      total: this.allUrls.length,
      queued: this.queue.length,
      running: this.running,
      checked: this.checked,
      started: this.started,
    };
  }
}
