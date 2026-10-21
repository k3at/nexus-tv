/**
 * End-to-end smoke test.
 *   node scripts/smoke-test.mjs [baseUrl] [adminUser] [adminPassword]
 */
const BASE = process.argv[2] || 'http://localhost:8080';
const USER = process.argv[3] || 'admin';
const PASS = process.argv[4] || 'NexusAdmin2026';

let pass = 0;
let fail = 0;

function check(name, ok, extra = '') {
  if (ok) {
    pass++;
    console.log(`  ok   ${name}`);
  } else {
    fail++;
    console.log(`  FAIL ${name} ${extra}`);
  }
}

async function call(path, { method = 'GET', body, cookie } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-NXS-Client': '1',
      ...(cookie ? { cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const setCookie = res.headers.get('set-cookie');
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data, setCookie };
}

console.log(`\nNEXUS//TV smoke test -> ${BASE}\n`);

// 1. health + config ------------------------------------------------------
const health = await call('/api/health');
check('health endpoint', health.status === 200 && health.data?.ok === true);

const cfg = await call('/api/config');
check('config endpoint', cfg.status === 200 && !!cfg.data?.siteName);
check('catalogue loaded', (cfg.data?.totals?.channels || 0) > 1000, `channels=${cfg.data?.totals?.channels}`);

// 2. access control --------------------------------------------------------
const noAuth = await call('/api/channels?limit=1');
check(
  'channels are gated when login is required',
  cfg.data?.requireLogin ? noAuth.status === 401 : noAuth.status === 200,
  `status=${noAuth.status}`,
);

// 3. admin login -----------------------------------------------------------
const login = await call('/api/auth/login', {
  method: 'POST',
  body: { role: 'admin', username: USER, password: PASS },
});
check('admin login', login.status === 200 && login.data?.role === 'admin', login.data?.error || '');
const adminCookie = (login.setCookie || '').split(';')[0];

const badLogin = await call('/api/auth/login', {
  method: 'POST',
  body: { role: 'admin', username: USER, password: 'wrong-password' },
});
check('wrong password rejected', badLogin.status === 401);

// 4. visitor codes ---------------------------------------------------------
const created = await call('/api/admin/codes', {
  method: 'POST',
  cookie: adminCookie,
  body: { label: 'smoke-test' },
});
check('admin creates visitor code', created.status === 200 && !!created.data?.code?.code, created.data?.error || '');
const visitorCode = created.data?.code?.code;

const vLogin = await call('/api/auth/login', {
  method: 'POST',
  body: { role: 'visitor', code: visitorCode },
});
check('visitor can log in with the code', vLogin.status === 200 && vLogin.data?.role === 'visitor');
const visitorCookie = (vLogin.setCookie || '').split(';')[0];

const vBad = await call('/api/auth/login', {
  method: 'POST',
  body: { role: 'visitor', code: 'NOPE1234' },
});
check('invalid visitor code rejected', vBad.status === 401);

// 5. visitor cannot reach the admin api ----------------------------------
const vAdmin = await call('/api/admin/codes', { cookie: visitorCookie });
check('visitor blocked from admin api', vAdmin.status === 401 || vAdmin.status === 403);

// 6. channel list ----------------------------------------------------------
const list = await call('/api/channels?limit=20&includeOffline=1', { cookie: visitorCookie });
check('visitor can list channels', list.status === 200 && Array.isArray(list.data?.channels));
const online = (list.data?.channels || []).filter((c) => c.online);
check('at least one channel online', online.length > 0, `online=${online.length}`);

// 7. search ----------------------------------------------------------------
const term = online[0]?.name?.slice(0, 6) || 'bbc';
const search = await call(`/api/channels?q=${encodeURIComponent(term)}&includeOffline=1`, {
  cookie: visitorCookie,
});
check('search returns matches', search.status === 200 && search.data.channels.length > 0, `q=${term}`);

// 8. channel detail + stream test -----------------------------------------
const target = online[0];
const detail = await call(`/api/channels/${encodeURIComponent(target.id)}`, { cookie: visitorCookie });
check('channel detail has sources', detail.status === 200 && detail.data?.streams?.length > 0);
const goodStream = detail.data?.streams?.find((s) => s.status === 'online') || detail.data?.streams?.[0];

const probe = await call('/api/probe', {
  method: 'POST',
  cookie: visitorCookie,
  body: { url: goodStream.url },
});
check('stream test returns a verdict', probe.status === 200 && !!probe.data?.status, probe.data?.status);

// 9. proxy (playback path) -------------------------------------------------
const proxied = await fetch(
  `${BASE}/api/proxy?u=${encodeURIComponent(goodStream.url)}`,
  { headers: { cookie: visitorCookie } },
);
check('proxy responds 200', proxied.status === 200, `status=${proxied.status}`);
const proxiedBody = await proxied.text();
check(
  'proxy returns stream data or playlist',
  proxiedBody.length > 10,
  `bytes=${proxiedBody.length}`,
);
if (/\.m3u8/i.test(goodStream.url)) {
  check('playlist URLs are rewritten for the proxy', proxiedBody.includes('/api/proxy?u='));
}

// 10. admin settings + code lifecycle --------------------------------------
const settings = await call('/api/admin/settings', { cookie: adminCookie });
check('admin reads settings', settings.status === 200 && !!settings.data?.settings);

const toggle = await call('/api/admin/settings', {
  method: 'PUT',
  cookie: adminCookie,
  body: { requireLogin: false },
});
check('admin toggles requireLogin', toggle.status === 200 && toggle.data?.settings?.requireLogin === false);

const openList = await call('/api/channels?limit=1');
check('open access works after toggling', openList.status === 200);

await call('/api/admin/settings', {
  method: 'PUT',
  cookie: adminCookie,
  body: { requireLogin: true },
});

const rotated = await call(`/api/admin/codes/${created.data.code.id}/rotate`, {
  method: 'POST',
  cookie: adminCookie,
});
check('admin rotates a code', rotated.status === 200 && rotated.data?.code?.code !== visitorCode);

const oldLogin = await call('/api/auth/login', {
  method: 'POST',
  body: { role: 'visitor', code: visitorCode },
});
check('rotated code invalidates the old one', oldLogin.status === 401);

const removed = await call(`/api/admin/codes/${created.data.code.id}`, {
  method: 'DELETE',
  cookie: adminCookie,
});
check('admin deletes a code', removed.status === 200);

// 11. custom stream --------------------------------------------------------
const custom = await call('/api/custom', {
  method: 'POST',
  cookie: adminCookie,
  body: { name: 'smoke', url: goodStream.url },
});
check('custom source can be added', custom.status === 200 && !!custom.data?.channel?.id, custom.data?.error || '');

// 12. csrf guard -----------------------------------------------------------
const noHeader = await fetch(`${BASE}/api/admin/codes`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', cookie: adminCookie },
  body: JSON.stringify({ label: 'nope' }),
});
check('mutations without client header are blocked', noHeader.status === 403);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
