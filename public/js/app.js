/**
 * NEXUS//TV front-end controller.
 */
import { Player } from './player.js';
import { Admin } from './admin.js';

const $ = (id) => document.getElementById(id);

export const state = {
  config: null,
  channels: [],
  total: 0,
  offset: 0,
  limit: 400,
  current: null,
  currentStreams: [],
  role: null,
  player: null,
  searchTimer: null,
  listLoading: false,
};

/* ----------------------------------------------------------------- helpers */
export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-NXS-Client': '1',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok) throw new Error(data?.error || `request failed (${res.status})`);
  return data;
}

export function toast(message, kind = 'info') {
  const stack = $('toasts');
  if (!stack) return;
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(6px)';
    el.style.transition = 'all .25s';
    setTimeout(() => el.remove(), 260);
  }, 3600);
}

function escapeHtml(str = '') {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

function flagEmoji(code) {
  if (!code || code.length !== 2) return '';
  try {
    return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));
  } catch {
    return '';
  }
}

/* ------------------------------------------------------------------ render */
function renderChannels({ append = false } = {}) {
  const grid = $('channel-grid');
  if (!append) {
    grid.innerHTML = '';
  } else {
    grid.querySelector('.more-wrap')?.remove();
  }

  if (!state.channels.length && !append) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="radar"><i></i><i></i><i></i></div>
        <p>${state.config?.hideOffline ? 'No working channel matches this search yet.<br /><small>offline channels stay hidden until they come back online</small>' : 'No channel matches this search.'}</p>
      </div>`;
    updateResultBar();
    return;
  }

  const frag = document.createDocumentFragment();
  for (const ch of state.channels) {
    const card = document.createElement('article');
    card.className = 'ch-card';
    card.dataset.id = ch.id;
    if (state.current?.id === ch.id) card.classList.add('active');

    if (ch.logo) {
      const img = document.createElement('img');
      img.className = 'ch-logo';
      img.loading = 'lazy';
      img.alt = '';
      img.src = ch.logo;
      img.addEventListener('error', () => {
        const fallback = document.createElement('div');
        fallback.className = 'ch-logo-fallback';
        fallback.textContent = (ch.name || '?').slice(0, 3).toUpperCase();
        img.replaceWith(fallback);
      });
      card.appendChild(img);
    } else {
      const fallback = document.createElement('div');
      fallback.className = 'ch-logo-fallback';
      fallback.textContent = (ch.name || '?').slice(0, 3).toUpperCase();
      card.appendChild(fallback);
    }

    const name = document.createElement('div');
    name.className = 'ch-name';
    name.textContent = ch.name;
    card.appendChild(name);

    const meta = document.createElement('div');
    meta.className = 'ch-meta';
    const dot = document.createElement('span');
    dot.className = `status-dot ${ch.online ? 'online' : 'offline'}`;
    meta.appendChild(dot);
    if (ch.country) {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = `${flagEmoji(ch.country)} ${ch.countryName || ch.country}`;
      meta.appendChild(chip);
    }
    if (ch.bestKind === 'hls') {
      const chip = document.createElement('span');
      chip.className = 'chip hls';
      chip.textContent = 'hls';
      meta.appendChild(chip);
    }
    const srcChip = document.createElement('span');
    srcChip.className = 'chip';
    srcChip.textContent = `${ch.streamCount} src`;
    meta.appendChild(srcChip);
    card.appendChild(meta);

    card.addEventListener('click', () => selectChannel(ch.id));
    frag.appendChild(card);
  }
  grid.appendChild(frag);

  if (state.channels.length < state.total) {
    const more = document.createElement('div');
    more.className = 'more-wrap';
    more.style.cssText = 'grid-column:1/-1;display:flex;justify-content:center;padding:12px 0 4px';
    const btn = document.createElement('button');
    btn.className = 'btn btn-ghost';
    btn.textContent = `load ${Math.min(state.limit, state.total - state.channels.length)} more`;
    btn.addEventListener('click', () => loadChannels({ append: true }));
    more.appendChild(btn);
    grid.appendChild(more);
  }

  updateResultBar();
}

function updateResultBar() {
  $('result-count').textContent = `${state.total} channel${state.total === 1 ? '' : 's'} listed`;
  const online = state.channels.filter((c) => c.online).length;
  $('result-updated').textContent = `${online} online · ${state.channels.length} shown`;
}

function renderStreams() {
  const list = $('stream-list');
  list.innerHTML = '';
  if (!state.currentStreams.length) {
    list.innerHTML = '<p class="muted small">No sources for this channel.</p>';
    return;
  }
  for (const s of state.currentStreams) {
    const row = document.createElement('div');
    row.className = 'stream-row';
    row.dataset.id = s.id;
    const cls = s.status === 'online' ? 'online' : s.status === 'offline' ? 'offline' : 'unknown';
    row.innerHTML = `
      <span class="status-dot ${cls}" title="${escapeHtml(s.reason || '')}"></span>
      <div style="min-width:0">
        <div class="stream-title">${escapeHtml(s.title || s.url)}</div>
        <div class="stream-sub">${escapeHtml(s.quality || 'auto')} · ${s.kind || '—'}${s.code ? ` · HTTP ${s.code}` : ''}${s.latency ? ` · ${s.latency}ms` : ''}</div>
      </div>
      <span class="chip ${s.status === 'online' ? 'live' : ''}">${s.status}</span>
      <div class="stream-actions">
        <button class="btn btn-ghost btn-sm" data-act="play" title="Play this source">▶</button>
        <button class="btn btn-ghost btn-sm" data-act="test" title="Test this source">⚡</button>
      </div>`;
    row.querySelector('[data-act="play"]').addEventListener('click', (e) => {
      e.stopPropagation();
      playStream(s);
    });
    row.querySelector('[data-act="test"]').addEventListener('click', (e) => {
      e.stopPropagation();
      testStream(s);
    });
    row.addEventListener('click', () => playStream(s));
    list.appendChild(row);
  }
}

/* ------------------------------------------------------------------- data */
async function loadConfig() {
  const cfg = await api('/api/config');
  state.config = cfg;
  state.role = cfg.role;
  document.querySelector('[data-site-name]').textContent = cfg.siteName || 'NEXUS//TV';
  document.querySelector('[data-site-tagline]').textContent = cfg.tagline || '';
  document.title = `${cfg.siteName || 'NEXUS//TV'} · Live Channel Intelligence Grid`;

  const countrySel = $('filter-country');
  countrySel.innerHTML = '<option value="">All countries</option>';
  for (const c of cfg.countries || []) {
    const opt = document.createElement('option');
    opt.value = c.code;
    opt.textContent = `${flagEmoji(c.code)} ${c.name} (${c.online})`;
    countrySel.appendChild(opt);
  }
  const catSel = $('filter-category');
  catSel.innerHTML = '<option value="">All categories</option>';
  for (const c of cfg.categories || []) {
    const opt = document.createElement('option');
    opt.value = c.name;
    opt.textContent = `${c.name} (${c.online})`;
    catSel.appendChild(opt);
  }

  const authBtn = $('btn-auth');
  if (cfg.authenticated) {
    authBtn.textContent = cfg.role === 'admin' ? 'Admin' : cfg.role === 'guest' ? 'Guest' : 'Logout';
    authBtn.dataset.action = cfg.role === 'admin' ? 'admin' : 'logout';
  } else {
    authBtn.textContent = 'Login';
    authBtn.dataset.action = 'login';
  }
  $('btn-admin').style.display = cfg.role === 'admin' ? '' : 'none';

  $('stat-online').textContent = cfg.totals?.online ?? 0;
  $('stat-streams').textContent = cfg.totals?.streams ?? 0;
  $('toggle-offline').checked = cfg.hideOffline !== false;

  if (cfg.requireLogin && !cfg.authenticated) openAuth();
}

async function loadChannels({ append = false } = {}) {
  if (state.listLoading) return;
  state.listLoading = true;
  const params = new URLSearchParams({
    q: $('search').value.trim(),
    country: $('filter-country').value,
    category: $('filter-category').value,
    limit: String(state.limit),
    offset: String(append ? state.channels.length : 0),
  });
  if (!$('toggle-offline').checked) params.set('includeOffline', '1');
  try {
    const data = await api(`/api/channels?${params.toString()}`);
    state.channels = append ? [...state.channels, ...data.channels] : data.channels;
    state.total = data.total;
    renderChannels({ append });
  } catch (err) {
    if (String(err.message).includes('login')) openAuth();
    else toast(err.message, 'err');
  } finally {
    state.listLoading = false;
  }
}

async function selectChannel(id) {
  try {
    const data = await api(`/api/channels/${encodeURIComponent(id)}`);
    state.current = data.channel;
    state.currentStreams = data.streams;
    $('channel-name').textContent = data.channel.name;
    const sub = [data.channel.countryName, data.channel.categories.join(' · '), `${data.streams.length} sources`]
      .filter(Boolean)
      .join('  |  ');
    $('channel-sub').textContent = sub;
    const logo = $('channel-logo');
    if (data.channel.logo) {
      logo.src = data.channel.logo;
      logo.style.visibility = 'visible';
      logo.onerror = () => {
        logo.style.visibility = 'hidden';
      };
    } else {
      logo.style.visibility = 'hidden';
    }
    renderStreams();
    document.querySelectorAll('.ch-card').forEach((c) =>
      c.classList.toggle('active', c.dataset.id === id),
    );

    const best = data.streams.find((s) => s.status === 'online');
    if (best) playStream(best);
    else {
      state.player.showOverlay('no working source right now');
      $('live-tag').textContent = 'OFFLINE';
      $('live-tag').className = 'live-tag err';
    }
  } catch (err) {
    toast(err.message, 'err');
  }
}

function playStream(stream) {
  document.querySelectorAll('.stream-row').forEach((r) =>
    r.classList.toggle('playing', r.dataset.id === stream.id),
  );
  $('hud-quality').textContent = `${stream.quality || 'auto'}${stream.kind ? ` · ${stream.kind}` : ''}`;
  $('hud-latency').textContent = stream.latency ? `${stream.latency}ms` : '—';
  state.player.play({
    url: stream.url,
    userAgent: stream.userAgent,
    referrer: stream.referrer,
    kind: stream.kind,
  });
  $('live-tag').textContent = 'LIVE';
  $('live-tag').className = 'live-tag on';
}

async function testStream(stream) {
  const row = document.querySelector(`.stream-row[data-id="${CSS.escape(stream.id)}"]`);
  row?.classList.add('testing');
  try {
    const res = await api('/api/probe', {
      method: 'POST',
      body: { url: stream.url, userAgent: stream.userAgent, referrer: stream.referrer },
    });
    const label = res.status === 'online' ? 'online' : res.status === 'offline' ? 'offline' : 'unknown';
    toast(
      `${label.toUpperCase()} · HTTP ${res.code ?? '—'} · ${res.latency}ms · ${res.reason}`,
      res.status === 'online' ? 'ok' : res.status === 'offline' ? 'err' : 'warn',
    );
    if (state.current) selectChannel(state.current.id);
  } catch (err) {
    toast(err.message, 'err');
  } finally {
    row?.classList.remove('testing');
  }
}

/* ------------------------------------------------------------------- auth */
function openAuth() {
  $('auth-modal').hidden = false;
  setTimeout(() => $('visitor-code').focus(), 60);
}

function closeAuth() {
  $('auth-modal').hidden = true;
  $('auth-error').hidden = true;
}

async function doLogin(role, payload) {
  const errBox = $('auth-error');
  errBox.hidden = true;
  try {
    const res = await api('/api/auth/login', { method: 'POST', body: { role, ...payload } });
    toast(`welcome, ${res.label || res.role}`, 'ok');
    closeAuth();
    await loadConfig();
    await loadChannels();
  } catch (err) {
    errBox.textContent = err.message;
    errBox.hidden = false;
  }
}

/* ------------------------------------------------------------------ events */
function bindEvents() {
  const search = $('search');
  search.addEventListener('input', () => {
    $('search').parentElement.classList.toggle('filled', !!search.value);
    clearTimeout(state.searchTimer);
    state.searchTimer = setTimeout(() => loadChannels(), 240);
  });
  $('search-clear').addEventListener('click', () => {
    search.value = '';
    $('search').parentElement.classList.remove('filled');
    loadChannels();
  });
  $('btn-search-jump').addEventListener('click', () => search.focus());

  $('filter-country').addEventListener('change', () => loadChannels());
  $('filter-category').addEventListener('change', () => loadChannels());
  $('toggle-offline').addEventListener('change', () => loadChannels());
  $('filter-sort').addEventListener('change', () => sortChannels());

  $('btn-auth').addEventListener('click', async () => {
    const action = $('btn-auth').dataset.action;
    if (action === 'login') openAuth();
    else if (action === 'logout') {
      await api('/api/auth/logout', { method: 'POST' });
      location.reload();
    } else {
      Admin.open();
    }
  });

  for (const el of document.querySelectorAll('#auth-modal [data-close]')) {
    el.addEventListener('click', closeAuth);
  }
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab));
      document.querySelectorAll('.tab-body').forEach((b) =>
        b.classList.toggle('active', b.id === `form-${tab.dataset.tab}`),
      );
    });
  });

  $('form-visitor').addEventListener('submit', (e) => {
    e.preventDefault();
    doLogin('visitor', { code: $('visitor-code').value.trim() });
  });
  $('form-admin').addEventListener('submit', (e) => {
    e.preventDefault();
    doLogin('admin', { username: $('admin-user').value.trim(), password: $('admin-pass').value });
  });

  $('btn-test').addEventListener('click', async () => {
    const stream = state.currentStreams[0];
    if (!stream) return toast('no channel selected', 'warn');
    await testStream(stream);
  });
  $('btn-test-all').addEventListener('click', async () => {
    if (!state.current) return toast('no channel selected', 'warn');
    toast('testing every source…', 'info');
    try {
      const res = await api('/api/channels/probe', {
        method: 'POST',
        body: { channelId: state.current.id },
      });
      const ok = res.results.filter((r) => r.status === 'online').length;
      toast(`${ok}/${res.results.length} sources working`, ok ? 'ok' : 'err');
      selectChannel(state.current.id);
    } catch (err) {
      toast(err.message, 'err');
    }
  });
  $('btn-copy').addEventListener('click', async () => {
    const stream = state.currentStreams[0];
    if (!stream) return toast('no channel selected', 'warn');
    try {
      await navigator.clipboard.writeText(stream.url);
      toast('stream URL copied', 'ok');
    } catch {
      toast(stream.url, 'info');
    }
  });
  $('btn-fullscreen').addEventListener('click', () => {
    const shell = document.querySelector('.player-shell');
    if (shell?.requestFullscreen) shell.requestFullscreen();
  });

  $('btn-custom-test').addEventListener('click', async () => {
    const url = $('custom-url').value.trim();
    if (!url) return toast('enter a stream URL', 'warn');
    const out = $('custom-result');
    out.textContent = 'testing…';
    try {
      const res = await api('/api/probe', { method: 'POST', body: { url } });
      const label = res.status.toUpperCase();
      out.innerHTML = `<b class="${res.status === 'online' ? 'ok' : ''}">${label}</b> · HTTP ${
        res.code ?? '—'
      } · ${res.latency}ms · ${escapeHtml(res.reason || '')} · ${escapeHtml(res.contentType || '')}`;
      if (res.status === 'online') {
        playStream({ id: 'custom', url, quality: 'custom', kind: res.kind, latency: res.latency });
        toast('source is working — playing', 'ok');
      } else {
        toast(`source ${res.status}`, res.status === 'offline' ? 'err' : 'warn');
      }
    } catch (err) {
      out.textContent = err.message;
      toast(err.message, 'err');
    }
  });

  $('btn-rescan').addEventListener('click', async () => {
    toast('re-testing visible channels…', 'info');
    const ids = state.channels.slice(0, 25);
    for (const ch of ids) {
      try {
        await api('/api/channels/probe', { method: 'POST', body: { channelId: ch.id } });
      } catch {
        /* keep going */
      }
    }
    await loadChannels();
    toast('re-test finished', 'ok');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAuth();
      Admin.close();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      search.focus();
      search.select();
    }
  });
}

function sortChannels() {
  const mode = $('filter-sort').value;
  const cmp = {
    online: (a, b) => Number(b.online) - Number(a.online) || a.name.localeCompare(b.name),
    name: (a, b) => a.name.localeCompare(b.name),
    streams: (a, b) => b.streamCount - a.streamCount || a.name.localeCompare(b.name),
    country: (a, b) => String(a.country || 'zz').localeCompare(String(b.country || 'zz')) || a.name.localeCompare(b.name),
  }[mode];
  state.channels.sort(cmp);
  renderChannels();
}

/* --------------------------------------------------------------------- sse */
function connectEvents() {
  try {
    const es = new EventSource('/api/events');
    es.onmessage = (ev) => {
      let data;
      try {
        data = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (data.type !== 'stats') return;
      $('stat-online').textContent = data.online;
      $('stat-streams').textContent = data.streams.total;
      const pct = data.scan.total
        ? Math.min(100, Math.round((data.scan.checked / data.scan.total) * 100))
        : 0;
      $('stat-scan').textContent = `${pct}%`;
      $('scan-fill').style.width = `${pct}%`;
    };
    es.onerror = () => {
      es.close();
      setTimeout(connectEvents, 5000);
    };
  } catch {
    /* no events */
  }
}

/* -------------------------------------------------------------------- boot */
async function boot() {
  state.player = new Player($('player'), $('player-overlay'));
  state.player.onState = ({ status }) => {
    if (status === 'error') {
      $('live-tag').textContent = 'ERROR';
      $('live-tag').className = 'live-tag err';
    }
  };

  bindEvents();
  Admin.init();
  connectEvents();

  try {
    await loadConfig();
    await loadChannels();
  } catch (err) {
    toast(err.message, 'err');
  }

  // keep the "working channels" list fresh: channels re-appear when they come back
  setInterval(() => {
    if (document.hidden) return;
    if ($('auth-modal').hidden === false || $('admin-modal').hidden === false) return;
    loadChannels();
  }, 45000);
}

boot();
