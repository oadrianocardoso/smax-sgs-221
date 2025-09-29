// ==UserScript==
// @name         SMAX SGS 221
// @namespace    https://github.com/oadrianocardoso/smax-sgs-221
// @version      1.0.0
// @description  Destaca termos, pinta células, fixa colunas no SMAX SGS 2.2.1 do TJSP
// @author       ADRIANO AUGUSTO CARDOSO E SANTOS
// @match        https://suporte.tjsp.jus.br/saw/*
// @match        https://suporte.tjsp.jus.br/saw/Requests*
// @run-at       document-idle
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/oadrianocardoso/smax-sgs-221/main/smax-sgs-221.user.js
// @updateURL    https://raw.githubusercontent.com/oadrianocardoso/smax-sgs-221/main/smax-sgs-221.user.js
// @homepageURL  https://github.com/seu-usuario/smax-sgs-221
// @supportURL   https://github.com/seu-usuario/smax-sgs-221/issues
// ==/UserScript==


(() => {
  'use strict';

  /* ====================== ESTILOS ====================== */
  const STYLE = `
    .tmx-hl-yellow { background:#ffeb3b; color:#000; font-weight:700; border-radius:5px; padding:0 .14em; }
    .tmx-hl-red    { background:#d32f2f; color:#fff; font-weight:700; border-radius:3px; padding:0 .16em; }
    .tmx-hl-green  { background:#2e7d32; color:#fff; font-weight:700; border-radius:3px; padding:0 .14em; }
    .tmx-hl-blue   { background:#1e88e5; color:#fff; font-weight:700; border-radius:3px; padding:0 .14em; }
    .tmx-hl-pink   { background:#000; color:#ffeb3b; font-weight:700; border-radius:3px; padding:0 .14em; }

    .tmx-juizdireito-hit { background:#1e88e5 !important; color:#fff !important; font-weight:700 !important; }

    /* pinta a célula inteira para nomes mapeados */
    .slick-cell.tmx-namecell { font-weight:700 !important; }
    .slick-cell.tmx-namecell a { color: inherit !important; }
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = STYLE;
  document.documentElement.appendChild(styleEl);

  /* =========================================================
   *  1) DESTAQUES POR GRUPOS DE CORES (em .slick-cell)
   * =======================================================*/
  const GROUPS = {
    amarelo: {
      cls: 'tmx-hl-yellow',
      whole: ['jurisprudência','jurisprudencia','distribuidor','acessar','DJEN','Diário Eletrônico','automatização', 'ceman', 'Central de Mandados', 'mandado', 'mandados', 'movimentar', 'dois fatores', 'Renajud', 'Sisbajud',
              'Autenticador', 'carta', 'evento', 'cadastro', 'automação', 'automações', 'migrar', 'migrador', 'migração', 'perito','perita',

             ],
      substr: ['acess','mail'],
      custom: []
    },
    vermelho: {
      cls: 'tmx-hl-red',
      whole: ['ERRO_AGENDAMENTO_EVENTO', 'ERRO_ENVIO_INTIMACAO_DJEN', 'Cookie not found', 'Item 04 do Comunicado 435/2025', 'Erro ao gerar o Documento Comprobatório Renajud'],
      substr: ['erro', 'errado', 'réu revel', 'Cookie not found', 'Urgente', 'urgência','help_outline', 'Plantão'],
      custom: []
    },
    verde: {
      cls: 'tmx-hl-green',
      whole: ['taxa','taxas','custa','custas','restituir','restituição','guia', 'diligência', 'diligencia', 'justiça gratuíta', 'parcelamento', 'parcelamento das custas'],
      substr: [],
      custom: []
    },
    azul: {
      cls: 'tmx-hl-blue',
      whole: ['magistrado','magistrada'],
      substr: [],
      custom: [/\bju[ií]z(?:a|es)?\b/gi]
    },
    rosa: {
      cls: 'tmx-hl-pink',
      whole: ['BdOrigem'],
      substr: ['BdOrigem'],
      custom: []
    }
  };

  const GROUP_ORDER = ['vermelho','rosa','amarelo','verde','azul'];

  const escapeReg = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function buildRegexesFromGroup(g) {
    const regs = [];
    if (g.whole?.length) regs.push(new RegExp(`(?<![\\p{L}\\d_])(${g.whole.map(escapeReg).join('|')})(?![\\p{L}\\d_])`, 'giu'));
    if (g.substr?.length) regs.push(new RegExp(`(${g.substr.map(escapeReg).join('|')})`, 'giu'));
    if (g.custom?.length) regs.push(...g.custom.map(r => new RegExp(r.source, r.flags || 'giu')));
    return regs;
  }
  const GROUP_LIST = Object.entries(GROUPS).map(([name, cfg]) => ({
    name, cls: cfg.cls, regexes: buildRegexesFromGroup(cfg)
  }));
  const ORDERED_GROUPS = GROUP_LIST.slice().sort(
    (a,b) => GROUP_ORDER.indexOf(a.name) - GROUP_ORDER.indexOf(b.name)
  );

  function unwrapHighlights(root) {
    root.querySelectorAll('.tmx-hl-yellow, .tmx-hl-red, .tmx-hl-green, .tmx-hl-blue, .tmx-hl-pink')
      .forEach(span => span.replaceWith(document.createTextNode(span.textContent || '')));
  }

  function highlightWithRegex(container, regex, cls) {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const t = node.nodeValue;
        if (!t || !t.trim()) return NodeFilter.FILTER_REJECT;
        if (node.parentElement?.closest('input,textarea,[contenteditable=""],[contenteditable="true"]')) return NodeFilter.FILTER_REJECT;
        const pe = node.parentElement;
        if (!pe) return NodeFilter.FILTER_ACCEPT;
        if (pe.classList?.contains('tmx-hl-yellow') || pe.classList?.contains('tmx-hl-red') ||
            pe.classList?.contains('tmx-hl-green')  || pe.classList?.contains('tmx-hl-blue') ||
            pe.classList?.contains('tmx-hl-pink')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes = [];
    for (let n; (n = walker.nextNode()); ) nodes.push(n);

    for (const textNode of nodes) {
      const text = textNode.nodeValue;
      if (!regex.test(text)) { regex.lastIndex = 0; continue; }
      regex.lastIndex = 0;

      const frag = document.createDocumentFragment();
      let last = 0, m;
      while ((m = regex.exec(text)) !== null) {
        if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        const span = document.createElement('span');
        span.className = cls;
        span.textContent = m[0];
        frag.appendChild(span);
        last = m.index + m[0].length;
      }
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      textNode.parentNode.replaceChild(frag, textNode);
    }
  }

  function processCell(cell) {
    const current = (cell.textContent || '').trim();
    const last = cell.getAttribute('data-tmx-last') || '';
    if (current === last) return;

    unwrapHighlights(cell);
    for (const g of ORDERED_GROUPS) {
      for (const re of g.regexes) highlightWithRegex(cell, re, g.cls);
    }
    cell.setAttribute('data-tmx-last', (cell.textContent || '').trim());
  }

  function processCellHighlights(root = document) {
    const cells = root.querySelectorAll('.slick-cell');
    cells.forEach(processCell);
  }

  /* =========================================================
   *  2) MARCAR NOMES POR FINAIS DE ID (CELULA INTEIRA COLORIDA)
   * =======================================================*/

  const gruposNomes = {
    "ADRIANO": [0,1,2,3,4,5],
    "DANIEL CRUZ": [6,7,8,9,10,11],
    "DANIEL LEAL": [12,13,14,15,16,17],
    "GLAUCO": [18,19,20,21,22],
    "ISA / DOUGLAS": [23,24,25,26,27,28],
    "IVAN": [29,30,31,32,33,34],
    "JOAO GABRIEL": [35,36,37,38,39,40],
    "LAIS": [41,42,43,44,45,46],
    "LEONARDO": [47,48,49,50,51,52],
    "LUANA": [53,54,55,56,57,58],
    "LUIS FELIPE": [59,60,61,62,63,64],
    "MARCELO A": [65,66,67,68,69,70],
    "MARCELO M": [71,72,73,74,75],
    "MARLON": [76,77,78,79,80,81],
    "ROBSON": [82,83,84,85,86,87],
    "SAMUEL": [88,89,90,91,92,93],
    "YVES / IONE": [94,95,96,97,98,99],
  };
  const COR_OUTROS = 'crimson';
  const MARK_ATTR = 'adMarcado';
  const LINK_SELECTORS = ['a.entity-link-id', '.slick-row a'];

  const mapaNome = {};
  for (const [nome, nums] of Object.entries(gruposNomes)) {
    nums.forEach(n => { mapaNome[String(n).padStart(2, '0')] = nome; });
  }

  function pickLinks() {
    const set = new Set();
    for (const sel of LINK_SELECTORS) {
      document.querySelectorAll(sel).forEach(a => set.add(a));
    }
    return Array.from(set);
  }

  function marcarNomePorID(link) {
    if (!link) return;

    const texto = (link.textContent || '').trim();
    const numero = (texto.match(/\d+$/) || [''])[0];
    if (!numero) return;

    const finais2 = numero.slice(-2).padStart(2, '0');
    const nome = mapaNome[finais2];
    const cell = link.closest('.slick-cell');

    if (!nome) {
      if (!link.dataset[MARK_ATTR]) link.dataset[MARK_ATTR] = '0';
      return;
    }

      const CORES = {
          "ADRIANO":       { bg: "#E6C84F", fg: "#000" }, // dourado suave
          "DANIEL CRUZ":   { bg: "#D96B39", fg: "#fff" }, // laranja queimado claro
          "DANIEL LEAL":   { bg: "#8B5E3C", fg: "#fff" }, // marrom médio
          "GLAUCO":        { bg: "#4FBFC0", fg: "#000" }, // turquesa pastel
          "ISA / DOUGLAS": { bg: "#9C7ED1", fg: "#fff" }, // roxo claro
          "IVAN":          { bg: "#6E6E6E", fg: "#fff" }, // cinza médio
          "JOAO GABRIEL":  { bg: "#5C8DD8", fg: "#fff" }, // azul médio
          "LAIS":          { bg: "#E68AAE", fg: "#000" }, // rosa pastel
          "LEONARDO":      { bg: "#5D4C92", fg: "#fff" }, // índigo médio
          "LUANA":         { bg: "#E68C3A", fg: "#000" }, // laranja suave
          "LUIS FELIPE":   { bg: "#4FA59B", fg: "#000" }, // verde água médio
          "MARCELO A":     { bg: "#C94F52", fg: "#fff" }, // vermelho moderado
          "MARCELO M":     { bg: "#6377B9", fg: "#fff" }, // azul royal claro
          "MARLON":        { bg: "#6CBF6E", fg: "#000" }, // verde médio
          "ROBSON":        { bg: "#E6896A", fg: "#000" }, // coral claro
          "SAMUEL":        { bg: "#66B8E3", fg: "#000" }, // azul claro médio
          "YVES / IONE":   { bg: "#A7D76E", fg: "#000" }, // verde limão suave
      };


    if (cell) {
      const { bg, fg } = CORES[nome] || { bg: '', fg: '' };
      if (bg) {
        cell.classList.add('tmx-namecell');
        cell.style.background = bg;
        cell.style.color = fg || '';
        cell.querySelectorAll('a').forEach(a => { a.style.color = 'inherit'; });
      }
    }

    if (link.dataset[MARK_ATTR]) return;

    const tag = document.createElement('span');
    tag.textContent = ' ' + nome;
    tag.style.marginLeft = '6px';
    tag.style.fontWeight = '600';
    if (CORES[nome]) {
      tag.style.background = CORES[nome].bg;
      tag.style.color = CORES[nome].fg;
      tag.style.padding = '0 4px';
      tag.style.borderRadius = '4px';
    } else {
      tag.style.color = COR_OUTROS;
    }
    link.insertAdjacentElement('afterend', tag);

    link.dataset[MARK_ATTR] = '1';
  }

  function processNameTags() {
    pickLinks().forEach(marcarNomePorID);
  }

  /* =========================================================
   *  3) COLUNA l3 r3: JUIZ/JUÍZA DE DIREITO
   * =======================================================*/
  const COL_SELECTOR = '.slick-cell.l3.r3';
  const RE_MAGISTRADO = /\b(?:(ju[ií]z(?:a)?\s+de\s+direito)|(1[ºª]\s+ju[ií]z(?:a)?\s+substitut[oa]))\b/i;

  function updateSolicitanteCells(root = document) {
    root.querySelectorAll(COL_SELECTOR).forEach(el => {
      const txt = (el.textContent || '').trim();
      if (RE_MAGISTRADO.test(txt)) {
        el.classList.add('tmx-juizdireito-hit');
      } else {
        el.classList.remove('tmx-juizdireito-hit');
      }
    });
  }

  /* =========================================================
   *  4) ORQUESTRAÇÃO
   * =======================================================*/
  const debounced = (fn, wait = 120) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), wait); }; };
  const runAll = debounced(() => {
    processCellHighlights();
    processNameTags();
    updateSolicitanteCells();
  }, 80);

  runAll();
  const obs = new MutationObserver(runAll);
  obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true });
  setInterval(runAll, 1500);
})();
