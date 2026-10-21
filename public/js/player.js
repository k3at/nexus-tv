/**
 * Player controller: HLS (hls.js) + progressive streams, both routed through
 * the server proxy so the browser is never blocked by CORS.
 */
let hlsInstance = null;
let hlsLoading = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('failed to load ' + src));
    document.head.appendChild(s);
  });
}

async function getHls() {
  if (window.Hls) return window.Hls;
  if (hlsLoading) return hlsLoading;
  hlsLoading = (async () => {
    try {
      await import('/vendor/hls.min.js');
    } catch {
      await loadScript('https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js');
    }
    return window.Hls;
  })();
  return hlsLoading;
}

export function proxyUrl(url, { userAgent, referrer } = {}) {
  const params = new URLSearchParams({ u: url });
  if (userAgent) params.set('ua', userAgent);
  if (referrer) params.set('ref', referrer);
  return `/api/proxy?${params.toString()}`;
}

export class Player {
  constructor(video, overlay) {
    this.video = video;
    this.overlay = overlay;
    this.current = null;
    this.onState = () => {};
  }

  showOverlay(text) {
    if (!this.overlay) return;
    if (text) {
      this.overlay.hidden = false;
      const p = this.overlay.querySelector('p');
      if (p) p.textContent = text;
    } else {
      this.overlay.hidden = true;
    }
  }

  destroy() {
    if (hlsInstance) {
      try {
        hlsInstance.destroy();
      } catch {
        /* ignore */
      }
      hlsInstance = null;
    }
    this.video.removeAttribute('src');
    try {
      this.video.load();
    } catch {
      /* ignore */
    }
  }

  /**
   * @param {{url:string, userAgent?:string, referrer?:string, kind?:string}} stream
   */
  async play(stream) {
    if (!stream || !stream.url) return { ok: false, error: 'no stream' };
    this.destroy();
    this.current = stream;
    this.showOverlay('tuning…');

    const src = proxyUrl(stream.url, {
      userAgent: stream.userAgent,
      referrer: stream.referrer,
    });

    const isHls = /\.m3u8?(\?|#|$)/i.test(stream.url) || stream.kind === 'hls';

    try {
      if (isHls && !this.video.canPlayType('application/vnd.apple.mpegurl')) {
        const Hls = await getHls();
        if (!Hls || !Hls.isSupported()) {
          this.showOverlay('HLS not supported here');
          return { ok: false, error: 'hls unsupported' };
        }
        hlsInstance = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 30,
          manifestLoadingMaxRetry: 3,
          levelLoadingMaxRetry: 4,
          fragLoadingMaxRetry: 5,
        });
        hlsInstance.on(Hls.Events.ERROR, (_evt, data) => {
          if (!data || !data.fatal) return;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hlsInstance.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hlsInstance.recoverMediaError();
          } else {
            this.showOverlay('stream error');
            this.onState({ status: 'error', error: data.details || 'fatal error' });
            hlsInstance.destroy();
            hlsInstance = null;
          }
        });
        hlsInstance.loadSource(src);
        hlsInstance.attachMedia(this.video);
        hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
          this.showOverlay(null);
          this.video.play().catch(() => {});
        });
      } else {
        this.video.src = src;
        this.video.addEventListener('loadedmetadata', () => {
          this.showOverlay(null);
          this.video.play().catch(() => {});
        });
        this.video.addEventListener('error', () => {
          this.showOverlay('cannot play this source');
          this.onState({ status: 'error', error: 'media error' });
        });
        this.video.load();
      }
      this.onState({ status: 'loading' });
      return { ok: true };
    } catch (err) {
      this.showOverlay('cannot play this source');
      this.onState({ status: 'error', error: err.message });
      return { ok: false, error: err.message };
    }
  }

  stop() {
    this.destroy();
    this.current = null;
    this.showOverlay('Select a channel to tune in');
    this.onState({ status: 'idle' });
  }
}

export default Player;
