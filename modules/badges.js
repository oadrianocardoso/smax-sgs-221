(function (root) {
  'use strict';

  const SMAX   = root.SMAX = root.SMAX || {};
  const CONFIG = SMAX.config || {};
  const prefs  = CONFIG.prefs || {};
  const NAME_GROUPS = CONFIG.nameGroups || {};
  const NAME_COLOR  = CONFIG.nameColors || {};
  const AUSENTES    = CONFIG.ausentes   || [];

  const NAME_MARK_ATTR = 'adMarcado';
  const LINK_PICKERS   = ['a.entity-link-id', '.slick-row a'];
  const processedLinks = new WeakSet();

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
    `);
  }

  function isAtivo(nome) {
    if (!nome) return false;
    if (AUSENTES.includes(nome)) return false;
    return true;
  }

  const SUB_TO_OWNER = (() => {
    const m = new Map();
    for (const [nome, finais] of Object.entries(NAME_GROUPS)) {
      for (const f of finais) {
        const s1 = String(f);
        const s2 = String(f).padStart(2, '0');
        m.set(s1, nome);
        m.set(s2, nome);
      }
    }
    return m;
  })();

  function getResponsavel(numeroStr) {
    let n = (numeroStr || "").replace(/\D/g, "");
    if (!n) return null;

    while (n.length > 0) {
      if (n.length >= 2) {
        const sub2  = n.slice(-2);
        const dono2 = SUB_TO_OWNER.get(sub2);
        if (dono2) {
          if (isAtivo(dono2)) return dono2;
          n = n.slice(0, -1);
          continue;
        }
      }

      const sub1  = n.slice(-1);
      const dono1 = SUB_TO_OWNER.get(sub1);
      if (dono1) {
        if (isAtivo(dono1)) return dono1;
        n = n.slice(0, -1);
        continue;
      }

      n = n.slice(0, -1);
    }

    return null;
  }

  function pickAllLinks() {
    const set = new Set();
    for (const sel of LINK_PICKERS) {
      root.document.querySelectorAll(sel).forEach(a => set.add(a));
    }
    return Array.from(set);
  }

  function extractTrailingDigits(text) {
    const m = String(text).match(/(\d{2,})\D*$/);
    return m ? m[1] : '';
  }

  function applyNameBadges() {
    if (!prefs.nameBadgesOn) return;
    ensureCss();
    pickAllLinks().forEach(link => {
      if (!link || processedLinks.has(link)) return;

      const label  = (link.textContent || '').trim();
      const digits = extractTrailingDigits(label);
      if (!digits) {
        processedLinks.add(link);
        return;
      }

      const owner = getResponsavel(digits);
      const cell  = link.closest('.slick-cell');

      if (cell && owner && NAME_COLOR[owner]) {
        const { bg, fg } = NAME_COLOR[owner];
        cell.classList.add('tmx-namecell');
        cell.style.background = bg;
        cell.style.color      = fg || '';
        cell.querySelectorAll('a').forEach(a => { a.style.color = 'inherit'; });
      }

      if (owner && !link.dataset[NAME_MARK_ATTR]) {
        const tag = root.document.createElement('span');
        tag.textContent = ' ' + owner;
        tag.style.marginLeft  = '6px';
        tag.style.fontWeight  = '600';
        const c = NAME_COLOR[owner];
        if (c) {
          tag.style.background   = c.bg;
          tag.style.color        = c.fg;
          tag.style.padding      = '0 4px';
          tag.style.borderRadius = '4px';
        }
        link.insertAdjacentElement('afterend', tag);
        link.dataset[NAME_MARK_ATTR] = '1';
      }

      processedLinks.add(link);
    });
  }

  SMAX.badges = { apply: applyNameBadges };

})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
