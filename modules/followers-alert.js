(function (root) {
  'use strict';

  const SMAX = root.SMAX = root.SMAX || {};
  const CONFIG = SMAX.config || {};
  const BADGE_ID = 'smax-followers-alert';
  const POPOVER_ID = 'smax-followers-popover';
  const CACHE_TTL_MS = 2 * 60 * 1000;

  let initialized = false;
  let activeRequestId = '';
  let pendingRequest = null;
  let nextRetryAt = 0;
  let cache = { requestId: '', followers: [], fetchedAt: 0 };

  function isEnabled() {
    return CONFIG.prefs?.followersAlertOn !== false;
  }

  function getRequestId() {
    const fromApi = SMAX.discussionApi?.getCurrentRequestId?.();
    if (fromApi) return String(fromApi);
    const match = String(root.location?.href || '').match(/\/saw\/Requests?(?:\/|%2F)(\d+)/i);
    return match ? match[1] : '';
  }

  function getTenantId() {
    return String(SMAX.discussionApi?.getTenantId?.() || CONFIG.tenantId || '213963628');
  }

  function responseEntities(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.entities)) return payload.entities;
    if (Array.isArray(payload?.data?.entities)) return payload.data.entities;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  }

  function normalizeFollowers(payload) {
    const seen = new Set();
    return responseEntities(payload).map(entity => {
      const properties = entity?.properties || entity?.Properties || entity || {};
      const name = String(
        properties.Name
        || properties.DisplayLabel
        || properties.FullName
        || properties.Upn
        || ''
      ).trim();
      const id = String(properties.Id || properties.PersonId || '').trim();
      return { id, name: name || (id ? `Usuário ${id}` : '') };
    }).filter(follower => {
      if (!follower.name) return false;
      const key = `${follower.id}:${follower.name.toLocaleUpperCase('pt-BR')}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
  }

  function findHost() {
    return root.document.querySelector(
      '#initdata_eproc_block .smax-eproc-followers-host'
    );
  }

  function removePopover() {
    root.document.getElementById(POPOVER_ID)?.remove();
  }

  function removeUi() {
    removePopover();
    root.document.getElementById(BADGE_ID)?.remove();
    const host = findHost();
    if (host) host.style.display = 'none';
  }

  function positionPopover(popover, badge) {
    if (!popover || !badge) return;
    const rect = badge.getBoundingClientRect();
    const width = Math.min(320, Math.max(240, root.innerWidth - 24));
    const left = Math.min(
      Math.max(12, rect.right - width),
      Math.max(12, root.innerWidth - width - 12)
    );
    popover.style.width = `${width}px`;
    popover.style.left = `${left}px`;
    popover.style.top = `${Math.min(rect.bottom + 8, root.innerHeight - 80)}px`;
  }

  function openPopover(badge, followers) {
    const existing = root.document.getElementById(POPOVER_ID);
    if (existing) {
      existing.remove();
      badge.setAttribute('aria-expanded', 'false');
      return;
    }

    const popover = root.document.createElement('div');
    popover.id = POPOVER_ID;
    popover.className = 'smax-followers-popover';
    popover.setAttribute('role', 'dialog');
    popover.setAttribute('aria-label', 'Seguidores do chamado');

    const header = root.document.createElement('div');
    header.className = 'smax-followers-popover-title';
    header.textContent = `Seguidores (${followers.length})`;
    popover.appendChild(header);

    const list = root.document.createElement('ul');
    list.className = 'smax-followers-list';
    followers.forEach(follower => {
      const item = root.document.createElement('li');
      item.textContent = follower.name;
      list.appendChild(item);
    });
    popover.appendChild(list);

    root.document.body.appendChild(popover);
    badge.setAttribute('aria-expanded', 'true');
    positionPopover(popover, badge);
  }

  function render(followers, requestId) {
    if (!isEnabled() || requestId !== getRequestId() || !followers.length) {
      removeUi();
      return;
    }

    const host = findHost();
    if (!host) return;

    let badge = root.document.getElementById(BADGE_ID);
    if (!badge) {
      badge = root.document.createElement('button');
      badge.id = BADGE_ID;
      badge.type = 'button';
      badge.className = 'smax-followers-alert';
      badge.dataset.source = 'smax-api';
      badge.setAttribute('aria-haspopup', 'dialog');
      badge.setAttribute('aria-expanded', 'false');
      badge.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        openPopover(badge, cache.followers);
      });
    }

    badge.textContent = `👁 ${followers.length}`;
    badge.title = followers.length === 1
      ? `1 seguidor: ${followers[0].name}`
      : `${followers.length} seguidores: ${followers.map(item => item.name).join(', ')}`;

    if (badge.parentElement !== host) host.prepend(badge);
    host.style.display = 'flex';
  }

  async function fetchFollowers(requestId) {
    const tenantId = getTenantId();
    const url = `/rest/${encodeURIComponent(tenantId)}/ems/Request/${encodeURIComponent(requestId)}`
      + '/associations/FollowedByUsers?layout=Name';
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const request = { requestId, controller };
    pendingRequest = request;

    try {
      const response = await root.fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Accept: 'application/json, text/plain, */*',
          'X-Requested-With': 'XMLHttpRequest'
        },
        signal: controller?.signal
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const followers = normalizeFollowers(await response.json());
      if (requestId !== getRequestId()) return;
      cache = { requestId, followers, fetchedAt: Date.now() };
      nextRetryAt = 0;
      render(followers, requestId);
    } catch (error) {
      if (error?.name === 'AbortError') return;
      if (requestId === getRequestId()) removeUi();
      nextRetryAt = Date.now() + 30000;
      console.warn('[SMAX Seguidores] Falha ao consultar seguidores pela API:', error);
    } finally {
      if (pendingRequest === request) pendingRequest = null;
    }
  }

  function apply(options) {
    if (!isEnabled()) {
      pendingRequest?.controller?.abort?.();
      pendingRequest = null;
      activeRequestId = '';
      nextRetryAt = 0;
      removeUi();
      return;
    }

    const requestId = getRequestId();
    if (!requestId) {
      pendingRequest?.controller?.abort?.();
      pendingRequest = null;
      activeRequestId = '';
      nextRetryAt = 0;
      removeUi();
      return;
    }

    if (activeRequestId !== requestId) {
      pendingRequest?.controller?.abort?.();
      pendingRequest = null;
      activeRequestId = requestId;
      nextRetryAt = 0;
      removeUi();
    }

    const force = options?.force === true;
    const cacheIsFresh = cache.requestId === requestId
      && (Date.now() - cache.fetchedAt) < CACHE_TTL_MS;
    if (!force && cacheIsFresh) {
      render(cache.followers, requestId);
      return;
    }
    if (!force && Date.now() < nextRetryAt) return;
    if (pendingRequest?.requestId === requestId) return;
    fetchFollowers(requestId);
  }

  function ensureCss() {
    if (root.document.getElementById('smax-followers-alert-style')) return;
    const style = root.document.createElement('style');
    style.id = 'smax-followers-alert-style';
    style.textContent = `
      #${BADGE_ID}.smax-followers-alert {
        box-sizing: border-box; min-width: 52px; height: 28px; margin: 0;
        padding: 0 10px; border: 1px solid #1a252f; border-radius: 4px;
        background: #2c3e50; color: #fff; font: 700 11px/26px Inter, Arial, sans-serif;
        cursor: pointer;
      }
      #${BADGE_ID}.smax-followers-alert:hover,
      #${BADGE_ID}.smax-followers-alert:focus-visible { background: #3b5268; }
      #${POPOVER_ID}.smax-followers-popover {
        position: fixed; z-index: 1000000; box-sizing: border-box; overflow: hidden;
        border: 1px solid #bdc7d1; border-radius: 6px; background: #fff; color: #263746;
        box-shadow: 0 10px 28px rgba(0, 0, 0, .24); font-family: Inter, Arial, sans-serif;
      }
      #${POPOVER_ID} .smax-followers-popover-title {
        padding: 10px 13px; border-bottom: 1px solid #e1e6eb; background: #f5f7f9;
        font-size: 13px; font-weight: 700;
      }
      #${POPOVER_ID} .smax-followers-list {
        max-height: 260px; margin: 0; padding: 6px 0; overflow: auto; list-style: none;
      }
      #${POPOVER_ID} .smax-followers-list li {
        padding: 7px 13px; border-bottom: 1px solid #f0f2f4; font-size: 12px;
      }
      #${POPOVER_ID} .smax-followers-list li:last-child { border-bottom: 0; }
    `;
    root.document.head.appendChild(style);
  }

  function init() {
    if (initialized) return;
    initialized = true;
    ensureCss();
    root.document.addEventListener('click', event => {
      const popover = root.document.getElementById(POPOVER_ID);
      if (!popover) return;
      if (popover.contains(event.target) || event.target.closest?.(`#${BADGE_ID}`)) return;
      removePopover();
      root.document.getElementById(BADGE_ID)?.setAttribute('aria-expanded', 'false');
    });
    root.addEventListener('resize', removePopover, { passive: true });
    root.addEventListener('scroll', removePopover, true);
    apply();
  }

  SMAX.followersAlert = {
    init,
    apply,
    refresh() {
      cache.fetchedAt = 0;
      nextRetryAt = 0;
      apply({ force: true });
    }
  };

})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
