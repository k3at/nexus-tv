/**
 * Pluggable key/value storage.
 *
 *  - MemoryStore : always available fallback (data lost on restart)
 *  - FileStore   : local JSON file (best with a mounted volume)
 *  - RedisStore  : Upstash Redis over REST (free tier, works on ephemeral hosts)
 *  - GithubStore : a JSON file inside a GitHub repo (free, no extra signup)
 *
 * All stores expose the same tiny API so the app never cares which one is used.
 */
import fs from 'node:fs';
import path from 'node:path';

const now = () => Date.now();

function isExpired(entry) {
  return entry && entry.e && entry.e < now();
}

export class MemoryStore {
  constructor() {
    this.map = new Map();
    this.kind = 'memory';
  }
  async get(key) {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (isExpired(entry)) {
      this.map.delete(key);
      return null;
    }
    return entry.v;
  }
  async set(key, value, ttlMs) {
    this.map.set(key, { v: value, e: ttlMs ? now() + ttlMs : 0 });
    return true;
  }
  async del(key) {
    return this.map.delete(key);
  }
  async list(prefix = '') {
    const out = [];
    for (const [key, entry] of this.map) {
      if (isExpired(entry)) {
        this.map.delete(key);
        continue;
      }
      if (!prefix || key.startsWith(prefix)) out.push(key);
    }
    return out;
  }
  async incr(key, ttlMs) {
    const cur = Number(await this.get(key)) || 0;
    const next = cur + 1;
    await this.set(key, next, ttlMs);
    return next;
  }
  async flush() {}
}

export class FileStore {
  constructor(dir) {
    this.dir = dir;
    this.file = path.join(dir, 'kv.json');
    this.map = new Map();
    this.kind = 'file';
    this.dirty = false;
    this.timer = null;
    this.load();
  }
  load() {
    try {
      const raw = fs.readFileSync(this.file, 'utf8');
      const data = JSON.parse(raw);
      for (const [k, v] of Object.entries(data)) {
        if (!isExpired(v)) this.map.set(k, v);
      }
    } catch {
      /* first boot */
    }
  }
  schedule() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush();
    }, 8000);
    this.timer.unref?.();
  }
  async flush() {
    if (!this.dirty) return;
    try {
      fs.mkdirSync(this.dir, { recursive: true });
      const tmp = `${this.file}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(Object.fromEntries(this.map)));
      fs.renameSync(tmp, this.file);
      this.dirty = false;
    } catch (err) {
      console.error('[store] flush failed:', err.message);
    }
  }
  async get(key) {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (isExpired(entry)) {
      this.map.delete(key);
      this.dirty = true;
      this.schedule();
      return null;
    }
    return entry.v;
  }
  async set(key, value, ttlMs) {
    this.map.set(key, { v: value, e: ttlMs ? now() + ttlMs : 0 });
    this.dirty = true;
    this.schedule();
    return true;
  }
  async del(key) {
    this.dirty = true;
    this.schedule();
    return this.map.delete(key);
  }
  async list(prefix = '') {
    const out = [];
    for (const [key, entry] of this.map) {
      if (isExpired(entry)) continue;
      if (!prefix || key.startsWith(prefix)) out.push(key);
    }
    return out;
  }
  async incr(key, ttlMs) {
    const cur = Number(await this.get(key)) || 0;
    const next = cur + 1;
    await this.set(key, next, ttlMs);
    return next;
  }
}

export class RedisStore {
  constructor(url, token) {
    this.url = url.replace(/\/+$/, '');
    this.token = token;
    this.kind = 'redis';
  }
  async cmd(args) {
    const res = await fetch(this.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    });
    if (!res.ok) throw new Error(`redis http ${res.status}`);
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json.result;
  }
  async get(key) {
    const raw = await this.cmd(['GET', key]);
    if (raw == null) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  async set(key, value, ttlMs) {
    const payload = JSON.stringify({ v: value, e: ttlMs ? now() + ttlMs : 0 });
    if (ttlMs) await this.cmd(['SET', key, payload, 'EX', Math.ceil(ttlMs / 1000)]);
    else await this.cmd(['SET', key, payload]);
    return true;
  }
  async del(key) {
    await this.cmd(['DEL', key]);
    return true;
  }
  async list(prefix = '') {
    const raw = await this.cmd(['KEYS', `${prefix || ''}*`]);
    return Array.isArray(raw) ? raw : [];
  }
  async incr(key, ttlMs) {
    const n = Number(await this.cmd(['INCR', key])) || 0;
    if (ttlMs && n === 1) await this.cmd(['EXPIRE', key, Math.ceil(ttlMs / 1000)]);
    return n;
  }
  async flush() {}
}

/**
 * Stores the KV blob inside a GitHub repository. Handy for free hosts where
 * the filesystem is wiped on every deploy - needs only a PAT with repo scope.
 */
export class GithubStore {
  constructor(token, repo, kvPath) {
    this.token = token;
    this.repo = repo;
    this.path = kvPath;
    this.kind = 'github';
    this.map = new Map();
    this.sha = null;
    this.dirty = false;
    this.timer = null;
    this.inflight = null;
  }
  async init() {
    const res = await fetch(`https://api.github.com/repos/${this.repo}/contents/${this.path}`, {
      headers: { Authorization: `Bearer ${this.token}`, Accept: 'application/vnd.github+json' },
    });
    if (res.ok) {
      const json = await res.json();
      this.sha = json.sha;
      const content = Buffer.from(String(json.content || '').replace(/\n/g, ''), 'base64').toString('utf8');
      try {
        const data = JSON.parse(content || '{}');
        for (const [k, v] of Object.entries(data)) {
          if (!isExpired(v)) this.map.set(k, v);
        }
      } catch {
        /* ignore corrupt blob */
      }
    } else if (res.status !== 404) {
      throw new Error(`github kv read failed: ${res.status}`);
    }
  }
  schedule() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush().catch((err) => console.error('[store:github] flush failed:', err.message));
    }, 10000);
    this.timer.unref?.();
  }
  async flush() {
    if (!this.dirty) return;
    if (this.inflight) return this.inflight;
    this.inflight = (async () => {
      try {
        const content = Buffer.from(JSON.stringify(Object.fromEntries(this.map))).toString('base64');
        const res = await fetch(`https://api.github.com/repos/${this.repo}/contents/${this.path}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${this.token}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `chore(kv): sync ${new Date().toISOString()}`,
            content,
            ...(this.sha ? { sha: this.sha } : {}),
          }),
        });
        if (res.ok) {
          const json = await res.json();
          this.sha = json.content?.sha || this.sha;
          this.dirty = false;
        } else {
          throw new Error(`github kv write failed: ${res.status}`);
        }
      } finally {
        this.inflight = null;
      }
    })();
    return this.inflight;
  }
  async get(key) {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (isExpired(entry)) {
      this.map.delete(key);
      this.dirty = true;
      this.schedule();
      return null;
    }
    return entry.v;
  }
  async set(key, value, ttlMs) {
    this.map.set(key, { v: value, e: ttlMs ? now() + ttlMs : 0 });
    this.dirty = true;
    this.schedule();
    return true;
  }
  async del(key) {
    this.dirty = true;
    this.schedule();
    return this.map.delete(key);
  }
  async list(prefix = '') {
    const out = [];
    for (const [key, entry] of this.map) {
      if (isExpired(entry)) continue;
      if (!prefix || key.startsWith(prefix)) out.push(key);
    }
    return out;
  }
  async incr(key, ttlMs) {
    const cur = Number(await this.get(key)) || 0;
    const next = cur + 1;
    await this.set(key, next, ttlMs);
    return next;
  }
}

/** Picks the best available backend. */
export function createStore(config, log = console) {
  if (config.upstashUrl && config.upstashToken) {
    log.log('[store] using Upstash Redis');
    return new RedisStore(config.upstashUrl, config.upstashToken);
  }
  if (config.githubToken && config.githubRepo) {
    log.log(`[store] using GitHub KV (${config.githubRepo}/${config.githubKvPath})`);
    const store = new GithubStore(config.githubToken, config.githubRepo, config.githubKvPath);
    return store.init().then(
      () => store,
      (err) => {
        log.error('[store] GitHub KV init failed, falling back to memory:', err.message);
        return new MemoryStore();
      },
    );
  }
  try {
    fs.mkdirSync(config.dataDir, { recursive: true });
    const probe = path.join(config.dataDir, '.write-test');
    fs.writeFileSync(probe, 'ok');
    fs.unlinkSync(probe);
    log.log(`[store] using local file store (${config.dataDir})`);
    return new FileStore(config.dataDir);
  } catch (err) {
    log.warn(`[store] data dir not writable (${err.message}), using in-memory store`);
    return new MemoryStore();
  }
}
