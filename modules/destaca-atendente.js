(function (root) {
  'use strict';

  const SMAX   = root.SMAX = root.SMAX || {};
  const CONFIG = SMAX.config || {};
  const prefs  = CONFIG.prefs || {};

  // =========================
  // DEFAULTS EMBUTIDOS
  // =========================
  const DEFAULT_NAME_GROUPS = {
    "ADRIANO":       [0,1,2,3,4,5,6],
    "DANIEL LEAL":   [7,8,9,10,11,12],
    "DOUGLAS":       [13,14,15,16,17,18,19],
    "IONE":          [20,21,22,23,24,25],
    "ISA":           [26,27,28,29,30,31,32],
    "IVAN":          [33,34,35,36,37,38,39],
    "LAIS":          [40,41,42,43,44,45,46],
    "LEONARDO":      [47,48,49,50,51,52,53],
    "LUANA":         [54,55,56,57,58,59,60],
    "LUIS FELIPE":   [61,62,63,64,65,66,67],
    "MARCELO":       [68,69,70,71,72,73,74],
    "MARLON":        [75,76,77,78,79,80,81],
    "ROBSON":        [82,83,84,85,86,87],
    "SAMUEL":        [88,89,90,91,92,93],
    "YVES":          [94,95,96,97,98,99]
  };

  const DEFAULT_NAME_COLORS = {
    "ADRIANO":            {bg:"#E6E66A", fg:"#000"},
    "DANIEL LEAL":        {bg:"#E6A85C", fg:"#000"},
    "DOUGLAS":            {bg:"#66CCCC", fg:"#000"},
    "IONE":               {bg:"#4D4D4D", fg:"#fff"},
    "ISA":                {bg:"#5C6FA6", fg:"#fff"},
    "IVAN":               {bg:"#9A9A52", fg:"#000"},
    "LAIS":               {bg:"#D966D9", fg:"#000"},
    "LEONARDO":           {bg:"#8E5A8E", fg:"#fff"},
    "LUANA":              {bg:"#7ACC7A", fg:"#000"},
    "LUIS FELIPE":        {bg:"#5CA3A3", fg:"#000"},
    "MARCELO":            {bg:"#A05252", fg:"#fff"},
    "MARLON":             {bg:"#A0A0A0", fg:"#000"},
    "ROBSON":             {bg:"#CCCCCC", fg:"#000"},
    "SAMUEL":             {bg:"#66A3CC", fg:"#000"},
    "YVES":               {bg:"#0a73d4ff", fg:"#fff"}
  };

  const DEFAULT_AUSENTES = ["ISA"];

  // Se tiver em CONFIG, usa o que veio de fora; senão, usa os defaults embutidos
  const NAME_GROUPS = CONFIG.nameGroups || DEFAULT_NAME_GROUPS;
  const NAME_COLOR  = CONFIG.nameColors || DEFAULT_NAME_COLORS;
  const AUSENTES    = Array.isArray(CONFIG.ausentes) ? CONFIG.ausentes : DEFAULT_AUSENTES;

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