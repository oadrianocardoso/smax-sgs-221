(function (root) {
  'use strict';

  const SMAX = root.SMAX = root.SMAX || {};
  const CONFIG = SMAX.config || {};
  const prefs = CONFIG.prefs || {};
  const utils = SMAX.utils || {};
  const { normalizeText } = utils;

  const AID_DESCRICAO = 'grid_header_Description';

  let cssInjected = false;
  function ensureCss() {
    if (cssInjected) return;
    cssInjected = true;
    if (typeof GM_addStyle !== 'function') return;
    GM_addStyle(`
      .tag-smax, .tag-smax * { all: unset !important; }
      .tag-smax {
        display: inline-block !important;
        background: #e0e0e0 !important;
        color: #000 !important;
        font-weight: 700 !important;
        border-radius: 3px !important;
        padding: 0 4px !important;
        margin-right: 4px !important;
        white-space: nowrap !important;
        font-size: inherit !important;
        font-family: inherit !important;
        line-height: inherit !important;
        text-decoration: none !important;
      }
      .tag-smax [class^="tmx-hl-"], .tag-smax [class*=" tmx-hl-"] {
        all: unset !important;
        background: none !important;
        color: inherit !important;
      }
    `);
  }

  function normalizeRules(raw) {
    const src = Array.isArray(raw) ? raw : [];
    const out = [];

    src.forEach(rule => {
      const tag = String(rule?.tag || '').trim();
      const palavras = Array.isArray(rule?.palavras)
        ? rule.palavras.map(v => String(v || '').trim()).filter(Boolean)
        : [];

      if (!tag || !palavras.length) return;
      out.push({ tag, palavras });
    });

    return out;
  }

  function getAutoTagRules() {
    return normalizeRules(CONFIG.autoTagRules);
  }

  function getColumnSelectorByHeaderAid(aid) {
    const headers = Array.from(root.document.querySelectorAll('.slick-header-columns .slick-header-column'));
    const target = headers.find(h => h.getAttribute('data-aid') === aid);
    if (!target) return null;

    const idx = headers.indexOf(target);
    if (idx < 0) return null;

    return `.slick-row .slick-cell.l${idx}.r${idx}`;
  }

  function hasLeadingTag(html) {
    const clean = html.replace(/<[^>]+>/g, '').slice(0, 24);
    return /\[\s*[A-Z]+\s*\]/.test(clean);
  }

  function tagDescriptionCellOnce(el, rules) {
    if (el.dataset.smaxTagged === '1') return;

    const plain = el.textContent?.trim();
    if (!plain) return;

    const htmlAtual = el.innerHTML.trim();
    if (hasLeadingTag(htmlAtual)) {
      el.dataset.smaxTagged = '1';
      return;
    }

    const n = normalizeText(plain);
    for (const r of rules) {
      if (r.palavras.some(p => n.includes(normalizeText(p)))) {
        el.innerHTML = `<span class="tag-smax">${r.tag}</span> ${htmlAtual}`;
        el.dataset.smaxTagged = '1';
        break;
      }
    }
  }

  function clearAutoTagsInDescription() {
    root.document.querySelectorAll('.slick-cell[data-smax-tagged]').forEach(el => {
      el.querySelectorAll('.tag-smax').forEach(tag => {
        const next = tag.nextSibling;
        tag.remove();
        if (next && next.nodeType === Node.TEXT_NODE) {
          next.nodeValue = String(next.nodeValue || '').replace(/^\s+/, '');
        }
      });
      delete el.dataset.smaxTagged;
    });
  }

  function applyAutoTagsInDescription() {
    if (!prefs.autoTagsOn) {
      clearAutoTagsInDescription();
      return;
    }

    const rules = getAutoTagRules();
    if (!rules.length) {
      clearAutoTagsInDescription();
      return;
    }

    ensureCss();

    const colSel = getColumnSelectorByHeaderAid(AID_DESCRICAO);
    if (!colSel) return;

    const nodes = root.document.querySelectorAll(`${colSel}:not([data-smax-tagged])`);
    const MAX_PER_TICK = 500;
    let count = 0;

    for (const el of nodes) {
      tagDescriptionCellOnce(el, rules);
      if (++count >= MAX_PER_TICK) break;
    }
  }

  SMAX.tags = { apply: applyAutoTagsInDescription };

})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
