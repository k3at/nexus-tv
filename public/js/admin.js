/**
 * Admin control panel: visitor codes, site settings, credentials, grid ops.
 */
import { api, toast } from './app.js';

const $ = (id) => document.getElementById(id);

let polling = null;

function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString();
}

function fmtExpiry(ts) {
  if (!ts) return 'never';
  const d = new Date(ts);
  return d < new Date() ? 'expired' : d.toLocaleDateString();
}

export const Admin = {
  init() {
    $('btn-admin').addEventListener('click', () => this.open());
    for (const el of document.querySelectorAll('#admin-modal [data-close]')) {
      el.addEventListener('click', () => this.close());
    }
    $('btn-code-create').addEventListener('click', () => this.createCode());
    $('btn-save-settings').addEventListener('click', () => this.saveSettings());
    $('btn-change-pw').addEventListener('click', () => this.changePassword());
    $('btn-scan-start').addEventListener('click', () => this.scan('start'));
    $('btn-scan-stop').addEventListener('click', () => this.scan('stop'));
    $('btn-scan-restart').addEventListener('click', () => this.scan('restart'));
    $('btn-catalog-refresh').addEventListener('click', () => this.refreshCatalog());
  },

  async open() {
    $('admin-modal').hidden = false;
    await Promise.all([this.loadCodes(), this.loadSettings(), this.loadStats()]);
    if (!polling) polling = setInterval(() => this.loadStats(), 4000);
  },

  close() {
    $('admin-modal').hidden = true;
    if (polling) {
      clearInterval(polling);
      polling = null;
    }
  },

  async loadCodes() {
    try {
      const { codes } = await api('/api/admin/codes');
      const body = $('codes-body');
      body.innerHTML = '';
      if (!codes.length) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="6" class="muted">no codes yet — create one above</td>';
        body.appendChild(tr);
        return;
      }
      for (const code of codes) {
        const tr = document.createElement('tr');
        const expired = code.expiresAt && code.expiresAt < Date.now();
        const state = !code.enabled ? 'disabled' : expired ? 'expired' : 'active';
        tr.innerHTML = `
          <td>${escapeHtml(code.label)}</td>
          <td class="code-cell">${escapeHtml(code.code)}</td>
          <td>${code.uses || 0}${code.maxUses ? `/${code.maxUses}` : ''}</td>
          <td class="muted">${fmtExpiry(code.expiresAt)}</td>
          <td><span class="chip ${state === 'active' ? 'live' : ''}">${state}</span></td>
          <td style="white-space:nowrap">
            <button class="btn btn-ghost btn-sm" data-act="toggle" data-id="${code.id}">${code.enabled ? 'disable' : 'enable'}</button>
            <button class="btn btn-ghost btn-sm" data-act="rotate" data-id="${code.id}">rotate</button>
            <button class="btn btn-ghost btn-sm" data-act="del" data-id="${code.id}">del</button>
          </td>`;
        body.appendChild(tr);
      }
      body.querySelectorAll('button[data-act]').forEach((btn) => {
        btn.addEventListener('click', () => this.codeAction(btn.dataset.act, btn.dataset.id));
      });
    } catch (err) {
      toast(err.message, 'err');
    }
  },

  async codeAction(act, id) {
    try {
      if (act === 'toggle') {
        const { codes } = await api('/api/admin/codes');
        const code = codes.find((c) => c.id === id);
        await api(`/api/admin/codes/${id}`, {
          method: 'PATCH',
          body: { enabled: !code.enabled },
        });
      } else if (act === 'rotate') {
        const res = await api(`/api/admin/codes/${id}/rotate`, { method: 'POST' });
        toast(`new code: ${res.code.code}`, 'ok');
      } else if (act === 'del') {
        await api(`/api/admin/codes/${id}`, { method: 'DELETE' });
      }
      await this.loadCodes();
    } catch (err) {
      toast(err.message, 'err');
    }
  },

  async createCode() {
    const label = $('code-label').value.trim() || 'Guest';
    const code = $('code-value').value.trim();
    const expiry = $('code-expiry').value;
    try {
      const res = await api('/api/admin/codes', {
        method: 'POST',
        body: {
          label,
          code: code || undefined,
          expiresAt: expiry ? new Date(expiry).getTime() : null,
        },
      });
      toast(`code created: ${res.code.code}`, 'ok');
      $('code-label').value = '';
      $('code-value').value = '';
      $('code-expiry').value = '';
      await this.loadCodes();
    } catch (err) {
      toast(err.message, 'err');
    }
  },

  async loadSettings() {
    try {
      const { settings } = await api('/api/admin/settings');
      $('set-require').checked = !!settings.requireLogin;
      $('set-hideoffline').checked = settings.hideOffline !== false;
      $('set-custom').checked = !!settings.allowCustomStreams;
      $('set-name').value = settings.siteName || '';
      $('set-tagline').value = settings.tagline || '';
      $('set-rate').value = settings.scanRate ?? 5;
    } catch (err) {
      toast(err.message, 'err');
    }
  },

  async saveSettings() {
    try {
      await api('/api/admin/settings', {
        method: 'PUT',
        body: {
          requireLogin: $('set-require').checked,
          hideOffline: $('set-hideoffline').checked,
          allowCustomStreams: $('set-custom').checked,
          siteName: $('set-name').value.trim(),
          tagline: $('set-tagline').value.trim(),
          scanRate: Number($('set-rate').value) || 5,
        },
      });
      toast('settings saved', 'ok');
      await this.loadSettings();
    } catch (err) {
      toast(err.message, 'err');
    }
  },

  async changePassword() {
    const currentPassword = $('pw-current').value;
    const newPassword = $('pw-new').value;
    if (!currentPassword || !newPassword) return toast('fill both password fields', 'warn');
    try {
      await api('/api/admin/password', {
        method: 'POST',
        body: { currentPassword, newPassword },
      });
      $('pw-current').value = '';
      $('pw-new').value = '';
      toast('password updated', 'ok');
    } catch (err) {
      toast(err.message, 'err');
    }
  },

  async scan(action) {
    try {
      await api('/api/admin/scan', { method: 'POST', body: { action } });
      toast(`scanner ${action}`, 'ok');
      this.loadStats();
    } catch (err) {
      toast(err.message, 'err');
    }
  },

  async refreshCatalog() {
    try {
      await api('/api/admin/refresh', { method: 'POST' });
      toast('catalogue reloaded', 'ok');
      this.loadStats();
    } catch (err) {
      toast(err.message, 'err');
    }
  },

  async loadStats() {
    try {
      const stats = await api('/api/admin/stats');
      const pct = stats.scan.total
        ? Math.min(100, Math.round((stats.scan.checked / stats.scan.total) * 100))
        : 0;
      $('admin-stats').textContent = [
        `channels      ${stats.catalogue.channels}`,
        `sources       ${stats.catalogue.streams}`,
        `online now    ${stats.onlineChannels}`,
        `tested        ${stats.status.online} ok / ${stats.status.offline} fail / ${stats.status.unknown} ?`,
        `scan progress ${pct}%  (${stats.scan.checked}/${stats.scan.total})`,
        `custom added  ${stats.customChannels}`,
        `uptime        ${Math.floor(stats.uptime / 60)}m ${stats.uptime % 60}s`,
        `catalogue     ${stats.catalogue.loadedAt ? fmtDate(stats.catalogue.loadedAt) : '—'}`,
      ].join('\n');
    } catch {
      /* panel closed */
    }
  },
};

function escapeHtml(str = '') {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

export default Admin;
