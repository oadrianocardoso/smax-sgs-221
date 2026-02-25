(function (root) {
  'use strict';

  const SMAX = root.SMAX = root.SMAX || {};
  const CONFIG = SMAX.config || {};
  const prefs = CONFIG.prefs || {};
  const utils = SMAX.utils || {};
  const { getGridViewport, escapeReg } = utils;

  let cssInjected = false;
  function ensureCss() {
    if (cssInjected) return;
    cssInjected = true;
    if (typeof GM_addStyle !== 'function') return;
    GM_addStyle(`
      .tmx-hl-yellow { background:#ffeb3b; color:#000; font-weight:700; border-radius:5px; padding:0 .14em; }
      .tmx-hl-red    { background:#d32f2f; color:#fff; font-weight:700; border-radius:3px; padding:0 .16em; }
      .tmx-hl-green  { background:#2e7d32; color:#fff; font-weight:700; border-radius:3px; padding:0 .14em; }
      .tmx-hl-blue   { background:#1e88e5; color:#fff; font-weight:700; border-radius:3px; padding:0 .14em; }
      .tmx-hl-pink   { background:#FC0FC0; color:#000; font-weight:700; border-radius:3px; padding:0 .14em; }
    `);
  }

  const HL_ORDER = ['vermelho', 'rosa', 'amarelo', 'verde', 'azul'];

  function isPlainObject(v) {
    return Object.prototype.toString.call(v) === '[object Object]';
  }

  function normalizeList(v) {
    return Array.isArray(v)
      ? v.map(x => String(x || '').trim()).filter(Boolean)
      : [];
  }

  function parseRegexEntries(raw) {
    const out = [];
    if (!Array.isArray(raw)) return out;

    raw.forEach(item => {
      let pattern = '';
      let flags = 'giu';

      if (isPlainObject(item)) {
        pattern = String(item.pattern || '').trim();
        flags = String(item.flags || 'giu').trim() || 'giu';
      } else {
        pattern = String(item || '').trim();
      }

      if (!pattern) return;
      try {
        out.push(new RegExp(pattern, flags));
      } catch (e) {
        // ignore invalid regex from DB
      }
    });

    return out;
  }

  function buildConfiguredGroups(raw) {
    const source = isPlainObject(raw) ? raw : {};
    const out = {};

    Object.keys(source).forEach(name => {
      const cfg = source[name];
      if (!isPlainObject(cfg)) return;

      const cls = String(cfg.cls || '').trim();
      const whole = normalizeList(cfg.whole);
      const substr = normalizeList(cfg.substr);
      const custom = parseRegexEntries(cfg.regex);

      if (!cls) return;
      if (!whole.length && !substr.length && !custom.length) return;

      out[name] = { cls, whole, substr, custom };
    });

    return out;
  }

  function buildHighlightRegexes(g) {
    const regs = [];

    if (g.whole && g.whole.length) {
      regs.push(new RegExp(
        `(?<![\\p{L}\\d_])(${g.whole.map(escapeReg).join('|')})(?![\\p{L}\\d_])`,
        'giu'
      ));
    }

    if (g.substr && g.substr.length) {
      regs.push(new RegExp(
        `(${g.substr.map(escapeReg).join('|')})`,
        'giu'
      ));
    }

    if (g.custom && g.custom.length) {
      regs.push(...g.custom);
    }

    return regs;
  }

  function getGroupOrder(name) {
    const idx = HL_ORDER.indexOf(name);
    return idx >= 0 ? idx : Number.MAX_SAFE_INTEGER;
  }

  function getOrderedHighlightGroups() {
    const groups = buildConfiguredGroups(CONFIG.highlightGroups);

    return Object.entries(groups)
      .map(([name, cfg]) => ({
        name,
        cls: cfg.cls,
        regexes: buildHighlightRegexes(cfg)
      }))
      .filter(g => g.regexes.length)
      .sort((a, b) => {
        const aOrder = getGroupOrder(a.name);
        const bOrder = getGroupOrder(b.name);
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.name.localeCompare(b.name, 'pt-BR');
      });
  }

  function unwrapCellHighlights(rootEl) {
    (rootEl || root.document)
      .querySelectorAll('span[data-smax-hl="1"]')
      .forEach(span => span.replaceWith(root.document.createTextNode(span.textContent || '')));
  }

  function highlightMatchesInNode(container, regex, cls) {
    const doc = container.ownerDocument || root.document;
    const walker = doc.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const t = node.nodeValue;
        if (!t || !t.trim()) return NodeFilter.FILTER_REJECT;

        const pe = node.parentElement;
        if (!pe) return NodeFilter.FILTER_REJECT;
        if (pe.closest('input,textarea,[contenteditable],[role="button"],[aria-live]')) return NodeFilter.FILTER_REJECT;
        if (pe.closest('span[data-smax-hl="1"]')) return NodeFilter.FILTER_REJECT;

        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes = [];
    for (let n; (n = walker.nextNode());) nodes.push(n);

    for (const textNode of nodes) {
      const text = textNode.nodeValue;
      if (!regex.test(text)) {
        regex.lastIndex = 0;
        continue;
      }
      regex.lastIndex = 0;

      const frag = doc.createDocumentFragment();
      let last = 0;
      let m;

      while ((m = regex.exec(text)) !== null) {
        if (m.index > last) frag.appendChild(doc.createTextNode(text.slice(last, m.index)));

        const span = doc.createElement('span');
        span.className = cls;
        span.setAttribute('data-smax-hl', '1');
        span.textContent = m[0];
        frag.appendChild(span);

        last = m.index + m[0].length;
      }

      if (last < text.length) frag.appendChild(doc.createTextNode(text.slice(last)));
      textNode.parentNode.replaceChild(frag, textNode);
    }
  }

  function sweepHighlightsInCell(cell, orderedGroups) {
    if (!prefs.highlightsOn) return;

    const current = (cell.textContent || '').trim();
    const last = cell.getAttribute('data-tmx-last') || '';
    if (current === last) return;

    unwrapCellHighlights(cell);

    for (const g of orderedGroups) {
      for (const re of g.regexes) {
        highlightMatchesInNode(cell, re, g.cls);
      }
    }

    cell.setAttribute('data-tmx-last', (cell.textContent || '').trim());
  }

  function clearHighlights(scope) {
    const rootEl = scope || getGridViewport(root.document);
    if (!rootEl) return;
    unwrapCellHighlights(rootEl);
    rootEl.querySelectorAll('.slick-cell[data-tmx-last]').forEach(cell => {
      cell.removeAttribute('data-tmx-last');
    });
  }

  function apply() {
    const scope = getGridViewport(root.document);
    if (!prefs.highlightsOn) {
      clearHighlights(scope);
      return;
    }

    const orderedGroups = getOrderedHighlightGroups();
    if (!orderedGroups.length) {
      clearHighlights(scope);
      return;
    }

    ensureCss();

    scope.querySelectorAll('.slick-cell').forEach(cell => sweepHighlightsInCell(cell, orderedGroups));
  }

  SMAX.highlights = { apply };

})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
