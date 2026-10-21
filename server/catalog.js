/**
 * Catalogue importer.
 *
 * Source: the public, MIT licensed iptv-org dataset (channels / streams / logos).
 *   https://iptv-org.github.io/api/channels.json
 *   https://iptv-org.github.io/api/streams.json
 *   https://iptv-org.github.io/api/logos.json
 *
 * The catalogue is normalised once at boot into:
 *   channelsById   : Map<id, channel>
 *   streamsByChannel: Map<channelId, stream[]>
 */
const UA = 'NEXUS-TV/1.0 (+https://github.com/iptv-org/iptv)';

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
  return res.json();
}

const regionNames =
  typeof Intl !== 'undefined' && Intl.DisplayNames
    ? new Intl.DisplayNames(['en'], { type: 'region' })
    : null;

export function countryName(code) {
  if (!code) return 'Unknown';
  if (!regionNames) return code;
  try {
    return regionNames.of(code) || code;
  } catch {
    return code;
  }
}

export async function loadCatalog({ base, log = console } = {}) {
  const apiBase = base || 'https://iptv-org.github.io/api';
  const started = Date.now();

  const [channelsRaw, streamsRaw, logosRaw] = await Promise.all([
    fetchJson(`${apiBase}/channels.json`),
    fetchJson(`${apiBase}/streams.json`),
    fetchJson(`${apiBase}/logos.json`).catch(() => []),
  ]);

  const logoByChannel = new Map();
  for (const logo of logosRaw || []) {
    if (!logo || !logo.channel || !logo.url) continue;
    const prev = logoByChannel.get(logo.channel);
    if (!prev || (prev.url.endsWith('.png') && !logo.url.endsWith('.png'))) {
      logoByChannel.set(logo.channel, logo);
    }
  }

  const channelsById = new Map();
  const countries = new Set();
  const categories = new Set();

  for (const c of channelsRaw || []) {
    if (!c || !c.id) continue;
    const logo = logoByChannel.get(c.id);
    const channel = {
      id: c.id,
      name: c.name || c.id,
      altNames: Array.isArray(c.alt_names) ? c.alt_names : [],
      network: c.network || null,
      owners: Array.isArray(c.owners) ? c.owners : [],
      country: c.country || null,
      categories: Array.isArray(c.categories) ? c.categories : [],
      isNsfw: !!c.is_nsfw,
      closed: c.closed || null,
      replacedBy: c.replaced_by || null,
      website: c.website || null,
      logo: logo?.url || null,
      logoText: logo?.text || null,
      logoSvg: logo?.svg || null,
    };
    channelsById.set(channel.id, channel);
    if (channel.country) countries.add(channel.country);
    for (const cat of channel.categories) categories.add(cat);
  }

  const streamsByChannel = new Map();
  let streamCount = 0;
  for (const s of streamsRaw || []) {
    if (!s || !s.url || !s.channel) continue;
    if (!channelsById.has(s.channel)) continue;
    const stream = {
      id: `${s.channel}::${streamCount}`,
      channel: s.channel,
      title: s.title || '',
      url: s.url,
      quality: s.quality || 'unknown',
      labels: Array.isArray(s.labels) ? s.labels : [],
      userAgent: s.user_agent || null,
      referrer: s.referrer || s.http_referrer || null,
    };
    if (!streamsByChannel.has(s.channel)) streamsByChannel.set(s.channel, []);
    streamsByChannel.get(s.channel).push(stream);
    streamCount += 1;
  }

  // Channels with at least one source, closed ones flagged (not hidden yet).
  const channels = [];
  for (const [id, channel] of channelsById) {
    const streams = streamsByChannel.get(id) || [];
    if (!streams.length) continue;
    channel.streamCount = streams.length;
    channels.push(channel);
  }

  const catalog = {
    channelsById,
    streamsByChannel,
    channels,
    countries: [...countries].sort(),
    categories: [...categories].sort(),
    totalStreams: streamCount,
    totalChannels: channels.length,
    loadedAt: Date.now(),
    loadMs: Date.now() - started,
  };

  log.log(
    `[catalog] ${catalog.totalChannels} channels / ${catalog.totalStreams} streams loaded in ${catalog.loadMs}ms`,
  );
  return catalog;
}
