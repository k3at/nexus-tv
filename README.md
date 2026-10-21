# NEXUS//TV

> Live channel intelligence grid — search any channel, test every source, watch only what actually works.

**Live now:** **https://nexus-tv-yygq.onrender.com** (Render free tier, auto-deploys from this repo (Render free tier))

A self-hosted IPTV front-end with a **live stream health scanner**. The app imports the public
[iptv-org](https://github.com/iptv-org/iptv) dataset (10k+ channels / 16k+ sources), continuously
probes every source, and **only lists channels that currently have a working stream**. Channels that
go offline disappear automatically and re-appear the moment they come back.

---

## Features

| Area | What you get |
| --- | --- |
| **Search & grab** | Instant fuzzy search over channel names, alt-names, networks, countries and categories. Paste any URL to test/play a custom source. |
| **Stream testing** | Every source is probed (HTTP status, content-type, latency, HLS vs progressive). Per-source "test" button and "test all sources". |
| **Working-only list** | A background scanner re-tests the catalogue on a rolling basis. Offline channels are hidden until they return. |
| **Player** | hls.js + native HLS + progressive playback, all routed through a CORS/HLS-rewriting proxy. Per-source quality, latency and LIVE badges. |
| **Admin login** | Username + password (scrypt hashed), changeable from the panel at any time. |
| **Visitor codes** | Admin creates access codes; label, expiry, max-uses, enable/disable, rotate, delete — all live. |
| **Theme** | Dark high-tech UI: neon cyan/magenta, glass panels, animated grid + scanlines, live telemetry via SSE. |
| **Zero dependencies** | Pure Node.js standard library — no `npm install` needed, no build step, tiny attack surface. |

---

## Quick start

```bash
node server/index.js
# open http://localhost:8080
```

On the very first boot the admin credentials are printed in the console:

```
  +----------------------------------------------------------+
  |  FIRST RUN - ADMIN CREDENTIALS (change them immediately)   |
  |  user: admin                                            |
  |  pass: XXXXXXXXXXXX                                     |
  +----------------------------------------------------------+
```

Set `ADMIN_USER` / `ADMIN_PASSWORD` in the environment to choose them yourself.

### Configuration

Copy `.env.example` to `.env` (or export the variables) — the important ones:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8080` | HTTP port |
| `ADMIN_USER` / `ADMIN_PASSWORD` | `admin` / generated | Admin credentials |
| `SESSION_SECRET` | generated | HMAC key for session cookies |
| `REQUIRE_LOGIN` | `true` | Require a visitor code to enter |
| `ALLOW_CUSTOM_STREAMS` | `true` | Let visitors add their own URLs |
| `DATA_DIR` | `./data` | Where the KV store is written |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | – | Free persistent KV (Upstash) |
| `GITHUB_TOKEN` / `GITHUB_REPO` | – | Free persistent KV (JSON file inside a GitHub repo) |
| `PROBE_CONCURRENCY` / `SCAN_RATE` | `16` / `8` | Scanner parallelism and probes per second |
| `PROBE_TIMEOUT_MS` | `5000` | Per-probe timeout |
| `ALLOW_PRIVATE_STREAMS` | `false` | Allow proxying private/loopback addresses |

### Storage backends

The app auto-selects the first one that works:

1. **Upstash Redis** (free tier) — survives redeploys on ephemeral hosts.
2. **GitHub KV** — `GITHUB_TOKEN` + `GITHUB_REPO` writes `data/kv.json` into a repo. Free, no extra signup.
3. **Local file** (`DATA_DIR`) — best with a mounted volume.
4. **Memory** — fallback, data is lost on restart.

---

## API

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/config` | – | Site settings, facets, totals |
| `GET` | `/api/auth/me` | – | Current session |
| `POST` | `/api/auth/login` | – | `{role:"admin",username,password}` / `{role:"visitor",code}` |
| `POST` | `/api/auth/logout` | – | Clear session |
| `GET` | `/api/channels` | session | `?q=&country=&category=&includeOffline=1&limit=&offset=` |
| `GET` | `/api/channels/:id` | session | Channel + every source with its health state |
| `POST` | `/api/channels/probe` | session | Re-test all sources of a channel |
| `POST` | `/api/probe` | session | Test one URL `{url}` |
| `POST` | `/api/custom` | session | Add a custom source |
| `GET` | `/api/proxy?u=…` | session | CORS + HLS-rewriting stream proxy |
| `GET` | `/api/events` | session | SSE live telemetry |
| `GET` | `/api/admin/codes` | admin | List visitor codes |
| `POST` | `/api/admin/codes` | admin | Create a code |
| `PATCH`/`DELETE` | `/api/admin/codes/:id` | admin | Edit / delete |
| `POST` | `/api/admin/codes/:id/rotate` | admin | Rotate to a new code |
| `GET`/`PUT` | `/api/admin/settings` | admin | Runtime settings |
| `POST` | `/api/admin/password` | admin | Change the admin password |
| `POST` | `/api/admin/scan` | admin | `{action:"start"\|"stop"\|"restart"}` |

All mutating endpoints require the `X-NXS-Client: 1` header (CSRF guard).

---

## Deploying to a free host

The app is a single Node process — any free host that runs Node 18+ works.

**Render (free web service)**

```bash
git push            # push to GitHub
# Render dashboard -> New -> Blueprint -> select the repo (render.yaml is included)
# then set ADMIN_PASSWORD in the environment
```

**Fly.io**

```bash
fly launch --no-deploy --copy-config --name nexus-tv
fly secrets set ADMIN_PASSWORD=your-password
fly deploy
```

**Docker anywhere**

```bash
docker build -t nexus-tv .
docker run -p 8080:8080 -v nexus-data:/data -e ADMIN_PASSWORD=your-password nexus-tv
```

**Koyeb / Northflank / Railway / any VPS**

```bash
git push && node server/index.js   # or use the provided Dockerfile
```

### Persisting visitor codes on ephemeral hosts

Free hosts wipe the filesystem on redeploy. Either point `UPSTASH_REDIS_REST_URL/_TOKEN` at a free
Upstash database, or set `GITHUB_TOKEN` + `GITHUB_REPO` so codes/settings are mirrored into a JSON
file inside a repository.

---

## Testing

```bash
node scripts/smoke-test.mjs http://localhost:8080 admin your-password
```

Covers login, code lifecycle, search, probing, proxying, custom sources and the CSRF guard.

---

## Data & attribution

Channel metadata and stream URLs come from the public, MIT-licensed
[iptv-org/iptv](https://github.com/iptv-org/iptv) project — free-to-air channels with publicly
available streams. NEXUS//TV only *links* to those streams; it hosts no media itself and never
re-streams or stores content.

`hls.js` is bundled under `public/vendor/` (Apache-2.0).

### Live deployment

- URL: https://nexus-tv-yygq.onrender.com
- Source: https://github.com/k3at/nexus-tv
- Runtime: Docker (node:22-alpine), single Node process, no npm dependencies
- Render free tier spins down after inactivity (first request can take ~50s to wake).
