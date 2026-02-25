(function (root) {
  'use strict';

  const SMAX = root.SMAX = root.SMAX || {};
  const CONFIG = SMAX.config || {};
  const prefs = CONFIG.prefs || {};

  const NAME_MARK_ATTR = 'adMarcado';
  const CELL_MARK_ATTR = 'smaxBadgeApplied';
  const LINK_PICKERS = ['a.entity-link-id', '.slick-row a'];
  const OWNER_TAG_CLASS = 'smax-owner-tag';

  function isPlainObject(v) {
    return Object.prototype.toString.call(v) === '[object Object]';
  }

  function normalizeName(value) {
    return String(value || '').trim().toUpperCase();
  }

  function getLiveNameGroups() {
    return isPlainObject(CONFIG.nameGroups) ? CONFIG.nameGroups : {};
  }

  function getLiveNameColors() {
    return isPlainObject(CONFIG.nameColors) ? CONFIG.nameColors : {};
  }

  function getAusentesSet() {
    if (!Array.isArray(CONFIG.ausentes)) return new Set();
    return new Set(CONFIG.ausentes.map(normalizeName).filter(Boolean));
  }

  function buildOwnerMap(nameGroups) {
    const map = new Map();
    Object.entries(nameGroups || {}).forEach(([ownerName, finals]) => {
      const owner = normalizeName(ownerName);
      if (!owner || !Array.isArray(finals)) return;

      finals.forEach(f => {
        const n = Number(f);
        if (!Number.isInteger(n) || n < 0 || n > 99) return;
        map.set(String(n), owner);
        map.set(String(n).padStart(2, '0'), owner);
      });
    });
    return map;
  }

  let cssInjected = false;
  function ensureCss() {
    if (cssInjected) return;
    cssInjected = true;
    if (typeof GM_addStyle !== 'function') return;
    GM_addStyle(`
      .slick-cell.tmx-namecell { font-weight:700 !important; transition: box-shadow .15s ease; }
      .slick-cell.tmx-namecell a { color: inherit !important; }
      .slick-cell.tmx-namecell:focus-within { outline: 2px solid rgba(0,0,0,.25); outline-offset: 2px; }
      .slick-cell.tmx-namecell:hover { box-shadow: 0 0 0 2px rgba(0,0,0,.08) inset; }
      .${OWNER_TAG_CLASS} { margin-left: 6px; font-weight: 600; border-radius: 4px; padding: 0 4px; }
    `);
  }

  function isAtivo(nome, ausentesSet) {
    if (!nome) return false;
    return !ausentesSet.has(normalizeName(nome));
  }

  function getResponsavel(numeroStr, ownerMap, ausentesSet) {
    let n = (numeroStr || '').replace(/\D/g, '');
    if (!n) return null;

    while (n.length > 0) {
      if (n.length >= 2) {
        const dono2 = ownerMap.get(n.slice(-2));
        if (dono2) {
          if (isAtivo(dono2, ausentesSet)) return dono2;
          n = n.slice(0, -1);
          continue;
        }
      }

      const dono1 = ownerMap.get(n.slice(-1));
      if (dono1) {
        if (isAtivo(dono1, ausentesSet)) return dono1;
        n = n.slice(0, -1);
        continue;
      }

      n = n.slice(0, -1);
    }

    return null;
  }

  function pickAllLinks() {
    const set = new Set();
    LINK_PICKERS.forEach(sel => {
      root.document.querySelectorAll(sel).forEach(a => set.add(a));
    });
    return Array.from(set);
  }

  function extractTrailingDigits(text) {
    const m = String(text).match(/(\d{2,})\D*$/);
    return m ? m[1] : '';
  }

  function findOwnerTag(link) {
    let next = link.nextSibling;
    while (next) {
      if (next.nodeType === 1) {
        if (next.classList && next.classList.contains(OWNER_TAG_CLASS)) return next;
        return null;
      }
      next = next.nextSibling;
    }
    return null;
  }

  function clearCellBadge(cell) {
    if (!cell) return;
    if (!cell.dataset[CELL_MARK_ATTR]) return;

    cell.classList.remove('tmx-namecell');
    cell.style.background = '';
    cell.style.color = '';
    cell.querySelectorAll('a').forEach(a => { a.style.color = ''; });
    delete cell.dataset[CELL_MARK_ATTR];
  }

  function applyCellBadge(cell, color) {
    if (!cell || !color) return;
    cell.classList.add('tmx-namecell');
    cell.style.background = color.bg;
    cell.style.color = color.fg || '';
    cell.querySelectorAll('a').forEach(a => { a.style.color = 'inherit'; });
    cell.dataset[CELL_MARK_ATTR] = '1';
  }

  function clearLinkBadge(link) {
    const tag = findOwnerTag(link);
    if (tag) tag.remove();
    delete link.dataset[NAME_MARK_ATTR];
    clearCellBadge(link.closest('.slick-cell'));
  }

  function applyLinkBadge(link, owner, color) {
    const cell = link.closest('.slick-cell');
    if (cell) {
      clearCellBadge(cell);
      applyCellBadge(cell, color);
    }

    let tag = findOwnerTag(link);
    if (!tag) {
      tag = root.document.createElement('span');
      tag.className = OWNER_TAG_CLASS;
      link.insertAdjacentElement('afterend', tag);
    }

    tag.textContent = ' ' + owner;
    if (color) {
      tag.style.background = color.bg || '';
      tag.style.color = color.fg || '';
    } else {
      tag.style.background = '';
      tag.style.color = '';
    }
    link.dataset[NAME_MARK_ATTR] = '1';
  }

  function clearAllBadges() {
    root.document.querySelectorAll(`.${OWNER_TAG_CLASS}`).forEach(el => el.remove());
    pickAllLinks().forEach(a => {
      delete a.dataset[NAME_MARK_ATTR];
    });
    root.document.querySelectorAll('.slick-cell.tmx-namecell').forEach(cell => {
      clearCellBadge(cell);
      cell.classList.remove('tmx-namecell');
    });
  }

  function applyNameBadges() {
    if (!prefs.nameBadgesOn) {
      clearAllBadges();
      return;
    }

    const nameGroups = getLiveNameGroups();
    const nameColors = getLiveNameColors();
    const ausentesSet = getAusentesSet();
    const ownerMap = buildOwnerMap(nameGroups);

    ensureCss();

    const links = pickAllLinks();
    if (!ownerMap.size || !links.length) {
      clearAllBadges();
      return;
    }

    links.forEach(link => {
      if (!link) return;

      const label = (link.textContent || '').trim();
      const digits = extractTrailingDigits(label);
      if (!digits) {
        clearLinkBadge(link);
        return;
      }

      const owner = getResponsavel(digits, ownerMap, ausentesSet);
      if (!owner) {
        clearLinkBadge(link);
        return;
      }

      const color = nameColors[owner] || null;
      applyLinkBadge(link, owner, color);
    });
  }

  SMAX.badges = { apply: applyNameBadges };

})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
