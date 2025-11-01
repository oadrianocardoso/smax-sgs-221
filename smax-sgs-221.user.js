// ==UserScript==
// @name         SMAX SGS 221
// @namespace    https://github.com/oadrianocardoso/smax-sgs-221
// @version      1.1.4
// @description  Destaca termos, pinta células e ajustes de UX no SMAX SGS 2.2.1 do TJSP (sem painel)
// @author       ADRIANO AUGUSTO CARDOSO E SANTOS
// @match        https://suporte.tjsp.jus.br/saw/*
// @match        https://suporte.tjsp.jus.br/saw/Requests*
// @run-at       document-idle
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/oadrianocardoso/smax-sgs-221/main/smax-sgs-221.user.js
// @updateURL    https://raw.githubusercontent.com/oadrianocardoso/smax-sgs-221/main/smax-sgs-221.user.js
// @homepageURL  https://github.com/oadrianocardoso/smax-sgs-221
// @supportURL   https://github.com/oadrianocardoso/smax-sgs-221/issues
// ==/UserScript==

(() => {
  'use strict';

  /* =============== Preferências fixas (sem painel) =============== */
  const prefs = {
    highlightsOn: true,
    nameBadgesOn: true,
    magistradoOn: true,
    collapseOn: true,
    enlargeCommentsOn: true,
  };

  /* ====================== ESTILOS ====================== */
  const STYLE = `
    .tmx-hl-yellow { background:#ffeb3b; color:#000; font-weight:700; border-radius:5px; padding:0 .14em; }
    .tmx-hl-red    { background:#d32f2f; color:#fff; font-weight:700; border-radius:3px; padding:0 .16em; }
    .tmx-hl-green  { background:#2e7d32; color:#fff; font-weight:700; border-radius:3px; padding:0 .14em; }
    .tmx-hl-blue   { background:#1e88e5; color:#fff; font-weight:700; border-radius:3px; padding:0 .14em; }
    .tmx-hl-pink   { background:#FC0FC0; color:#000; font-weight:700; border-radius:3px; padding:0 .14em; }

    .tmx-juizdireito-hit { background:#1e88e5 !important; color:#fff !important; font-weight:700 !important; }

    .slick-cell.tmx-namecell { font-weight:700 !important; transition: box-shadow .15s ease; }
    .slick-cell.tmx-namecell a { color: inherit !important; }
    .slick-cell.tmx-namecell:focus-within { outline: 2px solid rgba(0,0,0,.25); outline-offset: 2px; }
    .slick-cell.tmx-namecell:hover { box-shadow: 0 0 0 2px rgba(0,0,0,.08) inset; }
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
      whole: ['jurisprudência','jurisprudencia','distribuidor','acessar','DJEN','Diário Eletrônico','automatização','ceman','Central de Mandados','mandado','mandados','movimentar','dois fatores','Renajud','Sisbajud','Autenticador','carta','evento','cadastro','automação','automações','migrar','migrador','migração','perito','perita','localizadores','localizador'],
      substr: ['acess','mail'],
      custom: []
    },
    vermelho: {
      cls: 'tmx-hl-red',
      whole: ['ERRO_AGENDAMENTO_EVENTO','ERRO_ENVIO_INTIMACAO_DJEN','ERRO_ENVIO_INTIMAÇÃO_DJEN','Item 04 do Comunicado 435/2025','Erro ao gerar o Documento Comprobatório Renajud','Cookie not found','Urgente','urgência','Plantão'],
      substr: ['erro','errado','réu revel','help_outline'],
      custom: []
    },
    verde: {
      cls: 'tmx-hl-green',
      whole: ['taxa','taxas','custa','custas','restituir','restituição','guia','diligência','diligencia','justiça gratuíta','parcelamento','parcelamento das custas'],
      substr: [],
      custom: []
    },
    azul: {
      cls: 'tmx-hl-blue',
      whole: ['magistrado','magistrada'],
      substr: [],
      custom: [/\bju[ií]z(?:es|a)?\b/giu] // juiz, juíza, juízes (evita "juizado")
    },
    rosa: {
      cls: 'tmx-hl-pink',
      whole: ['BdOrigem','CDM', 'Controladoria Digital de Mandados', 'Devolvido sem cumprimento', 'Devolvidos sem cumprimento'],
      substr: [],
      custom: []
    }
  };

  const GROUP_ORDER = ['vermelho','rosa','amarelo','verde','azul'];
  const escapeReg = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  function buildRegexesFromGroup(g) {
    const regs = [];
    if (g.whole?.length) regs.push(new RegExp(`(?<![\\p{L}\\d_])(${g.whole.map(escapeReg).join('|')})(?![\\p{L}\\d_])`, 'giu'));
    if (g.substr?.length) regs.push(new RegExp(`(${g.substr.map(escapeReg).join('|')})`, 'giu'));
    if (g.custom?.length) regs.push(...g.custom);
    return regs;
  }
  const GROUP_LIST = Object.entries(GROUPS).map(([name, cfg]) => ({ name, cls: cfg.cls, regexes: buildRegexesFromGroup(cfg) }));
  const ORDERED_GROUPS = GROUP_LIST.slice().sort((a,b) => GROUP_ORDER.indexOf(a.name) - GROUP_ORDER.indexOf(b.name));

  // Evita processamento repetido do mesmo nó/link
  const processedTextNodes = new WeakSet();

  function unwrapHighlights(root) {
    root.querySelectorAll('.tmx-hl-yellow, .tmx-hl-red, .tmx-hl-green, .tmx-hl-blue, .tmx-hl-pink')
      .forEach(span => span.replaceWith(document.createTextNode(span.textContent || '')));
  }

  function highlightWithRegex(container, regex, cls) {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (processedTextNodes.has(node)) return NodeFilter.FILTER_REJECT;
        const t = node.nodeValue;
        if (!t || !t.trim()) return NodeFilter.FILTER_REJECT;

        const pe = node.parentElement;
        if (!pe) return NodeFilter.FILTER_REJECT;
        if (pe.closest('input,textarea,[contenteditable],[role="button"],[aria-live]')) return NodeFilter.FILTER_REJECT;

        const pcls = pe.classList;
        if (pcls?.contains('tmx-hl-yellow') || pcls?.contains('tmx-hl-red') ||
            pcls?.contains('tmx-hl-green')  || pcls?.contains('tmx-hl-blue') ||
            pcls?.contains('tmx-hl-pink')) {
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
    if (!prefs.highlightsOn) return;
    const current = (cell.textContent || '').trim();
    const last = cell.getAttribute('data-tmx-last') || '';
    if (current === last) return;

    unwrapHighlights(cell);
    for (const g of ORDERED_GROUPS) {
      for (const re of g.regexes) highlightWithRegex(cell, re, g.cls);
    }
    cell.setAttribute('data-tmx-last', (cell.textContent || '').trim());
  }

  function getSlickViewport(root=document) {
    return root.querySelector('.slick-viewport') || root;
  }

  function processCellHighlights(root = document) {
    if (!prefs.highlightsOn) return;
    const scope = getSlickViewport(root);
    scope.querySelectorAll('.slick-cell').forEach(processCell);
  }

  /* =========================================================
   *  2) MARCAR NOMES POR FINAIS DE ID (CELULA INTEIRA COLORIDA)
   * =======================================================*/
  const gruposNomes = {
    "ADRIANO": [0,1,2,3,4,5],
    "DANIEL CRUZ": [6,7,8,9,10,11],
    "DANIEL LEAL": [12,13,14,15,16,17],
    "GLAUCO": [18,19,20,21,22],
    "ISA": [23,24,25,26,27,28],
    "IVAN": [29,30,31,32,33,34],
    "JOAO GABRIEL": [35,36,37,38,39,40],
    "LAIS": [41,42,43,44,45,46],
    "LEONARDO": [47,48,49,50,51,52],
    "LUANA": [53,54,55,56,57,58],
    "LUIS FELIPE": [59,60,61,62,63,64],
    "MARCELO": [65,66,67,68,69,70],
    "DOUGLAS": [71,72,73,74,75],
    "MARLON": [76,77,78,79,80,81],
    "ROBSON": [82,83,84,85,86,87],
    "SAMUEL": [88,89,90,91,92,93],
    "YVES / IONE": [94,95,96,97,98,99],
  };
  const COR_OUTROS = 'crimson';
  const MARK_ATTR = 'adMarcado';
  const LINK_SELECTORS = ['a.entity-link-id', '.slick-row a'];
  const processedLinks = new WeakSet();

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

  function extraiNumeroFinal(texto) {
    const m = String(texto).match(/(\d{2,})\D*$/);
    return m ? m[1] : '';
  }

  function marcarNomePorID(link) {
    if (!prefs.nameBadgesOn) return;
    if (!link || processedLinks.has(link)) return;

    const texto = (link.textContent || '').trim();
    const numero = extraiNumeroFinal(texto);
    if (!numero) { processedLinks.add(link); return; }

    const finais2 = numero.slice(-2).padStart(2, '0');
    const nome = mapaNome[finais2];
    const cell = link.closest('.slick-cell');

    const CORES = {
      "ADRIANO":       { bg: "#E6E66A", fg: "#000" },
      "DANIEL CRUZ":   { bg: "#CC6666", fg: "#000" },
      "DANIEL LEAL":   { bg: "#E6A85C", fg: "#000" },
      "GLAUCO":        { bg: "#4E9E4E", fg: "#fff" },
        "ISA":         { bg: "#5C6FA6", fg: "#fff" },
      "IVAN":          { bg: "#9A9A52", fg: "#000" },
      "JOAO GABRIEL":  { bg: "#5C7ED8", fg: "#fff" },
      "LAIS":          { bg: "#D966D9", fg: "#000" },
      "LEONARDO":      { bg: "#8E5A8E", fg: "#fff" },
      "LUANA":         { bg: "#7ACC7A", fg: "#000" },
      "LUIS FELIPE":   { bg: "#5CA3A3", fg: "#000" },
      "MARCELO":     { bg: "#A05252", fg: "#fff" },
      "DOUGLAS":     { bg: "#66CCCC", fg: "#000" },
      "MARLON":        { bg: "#A0A0A0", fg: "#000" },
      "ROBSON":        { bg: "#CCCCCC", fg: "#000" },
      "SAMUEL":        { bg: "#66A3CC", fg: "#000" },
      "YVES / IONE":   { bg: "#4D4D4D", fg: "#fff" },
    };

    if (cell && nome && CORES[nome]) {
      const { bg, fg } = CORES[nome];
      cell.classList.add('tmx-namecell');
      cell.style.background = bg;
      cell.style.color = fg || '';
      cell.querySelectorAll('a').forEach(a => { a.style.color = 'inherit'; });
    }

    if (nome && !link.dataset[MARK_ATTR]) {
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

    processedLinks.add(link);
  }

  function processNameTags() {
    if (!prefs.nameBadgesOn) return;
    pickLinks().forEach(marcarNomePorID);
  }

  /* =========================================================
   *  3) COLUNA l3 r3: JUIZ/JUÍZA DE DIREITO (abrangente)
   * =======================================================*/
  const COL_SELECTOR = '.slick-cell.l3.r3';
  const RE_MAGISTRADO = /\bju[ií]z(?:es|a)?\b/iu;

  function updateSolicitanteCells(root = document) {
    if (!prefs.magistradoOn) return;
    const scope = getSlickViewport(root);
    scope.querySelectorAll(COL_SELECTOR).forEach(el => {
      const txt = (el.textContent || '').trim();
      if (RE_MAGISTRADO.test(txt)) {
        el.classList.add('tmx-juizdireito-hit');
      } else {
        el.classList.remove('tmx-juizdireito-hit');
      }
    });
  }

  /* =========================================================
   *  4) Comentários com altura automática
   * =======================================================*/
  (function enlargeComments() {
    const CSS_ID = 'tmx-auto-height-comment-items';
    function injectCss() {
      if (!prefs.enlargeCommentsOn) return;
      if (document.getElementById(CSS_ID)) return;
      const style = document.createElement('style');
      style.id = CSS_ID;
      style.textContent = `
        .comment-items { height: auto !important; max-height: none !important; }
      `;
      document.head.appendChild(style);
    }
    function applyInlineStyle(el) {
      if (!prefs.enlargeCommentsOn || !el) return;
      el.style.height = 'auto';
      el.style.maxHeight = 'none';
    }
    function applyToExisting() {
      if (!prefs.enlargeCommentsOn) return;
      document.querySelectorAll('.comment-items').forEach(applyInlineStyle);
    }
    injectCss();
    applyToExisting();

    const obs = new MutationObserver((mutations) => {
      if (!prefs.enlargeCommentsOn) return;
      for (const m of mutations) {
        if (m.addedNodes && m.addedNodes.length) {
          m.addedNodes.forEach(node => {
            if (node.nodeType !== 1) return;
            if (node.matches?.('.comment-items')) {
              applyInlineStyle(node);
            } else {
              node.querySelectorAll?.('.comment-items').forEach(applyInlineStyle);
            }
          });
        }
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('beforeunload', () => obs.disconnect(), { once: true });
  })();

    /* =========================================================
 *  5) Recolher "Oferta de Catálogo" e remover seções
 * =======================================================*/
    (function sectionsTweaks() {
        const SECTION_SELECTOR = '#form-section-5, [data-aid="section-catalog-offering"]';
        const IDS_PARA_REMOVER = ['form-section-1', 'form-section-7', 'form-section-8'];

        // Guarda quais seções já foram colapsadas 1x (não recolar depois)
        const collapsedOnce = new WeakSet();

        function isOpen(sectionEl) {
            const content = sectionEl?.querySelector?.('.pl-entity-page-component-content');
            return !!content && !content.classList.contains('ng-hide');
        }
        function syntheticClick(el) {
            try { el.click(); }
            catch { el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); }
        }
        function fixAriaAndIcon(headerEl, sectionEl) {
            if (!headerEl || !sectionEl) return;
            if (headerEl.getAttribute('aria-expanded') !== 'false') {
                headerEl.setAttribute('aria-expanded', 'false');
            }
            const sr = sectionEl.querySelector('.pl-entity-page-component-header-sr');
            if (sr && /Expandido/i.test(sr.textContent || '')) {
                sr.textContent = sr.textContent.replace(/Expandido/ig, 'Recolhido');
            }
            const icon = headerEl.querySelector('[pl-bidi-collapse-arrow]') ||
                  headerEl.querySelector('.icon-arrow-med-down, .icon-arrow-med-right');
            if (icon) {
                icon.classList.remove('icon-arrow-med-down');
                icon.classList.add('icon-arrow-med-right');
            }
        }

        // Colapsa só uma vez; se o usuário já interagiu, não mexe mais
        function collapseOnce(sectionEl) {
            if (!prefs?.collapseOn || !sectionEl) return;
            if (sectionEl.dataset.userInteracted === '1') return; // usuário clicou: não interferir
            if (collapsedOnce.has(sectionEl)) return;              // já colapsamos antes

            const header = sectionEl.querySelector('.pl-entity-page-component-header[role="button"]');
            if (!header) return;

            if (isOpen(sectionEl)) {
                syntheticClick(header);
                setTimeout(() => fixAriaAndIcon(header, sectionEl), 0);
            } else {
                // Já estava fechado ao chegar na página — apenas garante ARIA/ícone
                fixAriaAndIcon(header, sectionEl);
            }

            // Marca que esta seção já recebeu o colapso inicial
            collapsedOnce.add(sectionEl);
        }

        function removerSecoes() {
            IDS_PARA_REMOVER.forEach(id => {
                const el = document.getElementById(id);
                if (el && el.parentNode) el.remove();
            });
        }

        function applyAll() {
            // Só colapsa "uma vez por seção nova"
            document.querySelectorAll(SECTION_SELECTOR).forEach(collapseOnce);
            removerSecoes();
        }

        // Marca se o usuário clicou no cabeçalho: libera abrir/fechar sem interferência
        document.addEventListener('click', (e) => {
            const header = e.target.closest('.pl-entity-page-component-header[role="button"]');
            if (!header) return;
            const sectionEl = header.closest('#form-section-5, [data-aid="section-catalog-offering"]');
            if (sectionEl) {
                sectionEl.dataset.userInteracted = '1';
            }
        }, { capture: true });

        // Debounce para mutações (ex.: quando SPA injeta a seção pela 1ª vez)
        const schedule = (() => { let t; return (fn, wait=100) => { clearTimeout(t); t = setTimeout(fn, wait); }; })();
        const obs = new MutationObserver(() => schedule(applyAll, 100));

        setTimeout(applyAll, 300);
        obs.observe(document.documentElement, { childList: true, subtree: true });
        window.addEventListener('beforeunload', () => obs.disconnect(), { once: true });
    })();


  /* =========================================================
   *  6) ORQUESTRAÇÃO (sem setInterval, com idle)
   * =======================================================*/
  const debounced = (fn, wait = 150) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), wait); }; };

  function _runAll() {
    const doWork = () => {
      processCellHighlights();
      processNameTags();
      updateSolicitanteCells();
    };
    if ('requestIdleCallback' in window) {
      requestIdleCallback(doWork, { timeout: 500 });
    } else {
      setTimeout(doWork, 0);
    }
  }
  const runAll = debounced(_runAll, 80);
  const scheduleRunAll = runAll;

  runAll();

  const obsMain = new MutationObserver(() => scheduleRunAll());
  obsMain.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'aria-expanded']
  });
  window.addEventListener('beforeunload', () => obsMain.disconnect(), { once: true });


    // ==UserScript==
// @name         SMAX - 3 Grupos de Alerta em Avatares
// @namespace    https://suporte.tjsp.jus.br/
// @version      2.0
// @description  Substitui o avatar por ícones de alerta (1, 2 ou 3 caveiras) conforme o grupo de pessoas
// @match        https://suporte.tjsp.jus.br/saw/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  /* =============================
      🧾 CONFIGURAÇÃO DOS GRUPOS
     ============================= */
  const GRUPO_1 = [
    '',
  ];
  const GRUPO_2 = [
    'DIEGO OLIVEIRA DA SILVA','GUILHERME CESAR DE SOUSA','THIAGO TADEU FAUSTINO DE OLIVEIRA','JANAINA DOS PASSOS SILVESTRE','PEDRO HENRIQUE PALACIO BARITTI',
     'MARCOS PAULO SILVA MADALENA','GUSTAVO DE MEIRA GONÇALVES','Bruna Marques dos Santos','Rodrigo Silva Oliveira','RYAN SOUZA CARVALHO','JULIANA LINO DOS SANTOS ROSA',
      'TATIANE ARAUJO DA CRUZ','MARIA FERNANDA DE OLIVEIRA BENTO','Victor Viana Roca','DIOGO MENDONÇA ANICETO','GIOVANNA CORADINI TEIXEIRA','LUCAS CARNEIRO PERES FERREIRA',
      'Davi dos Reis Garcia','ESTER NAILI DOS SANTOS','David Lopes de Oliveira','KARINE BARBARA VITOR DE LIMA SOUZA','ALESSANDRA SOUSA NUNES','BRENO MEDEIROS MALFATI',
      'Joyce da Silva Oliveira','FABIANO BARBOSA DOS REIS','JEFFERSON SILVA DE CARVALHO SOARES','Rafaella Silva Lima Petrolini','ADRIANA DA SILVA FERREIRA OLIVEIRA',
      'CASSIA SANTOS ALVES DE LIMA','JUAN CAMPOS DE SOUZA','LUCAS ALVES DOS SANTOS','Kaue Nunes Silva Farrelly','ADRIANO ZILLI','KELLY FERREIRA DE FREITAS','Tatiana Lourenço da Costa Antunes'
  ];
  const GRUPO_3 = [
    ''
  ];

  /* =============================
      💀 ÍCONES DOS NÍVEIS
     ============================= */
  const ICONS = {
    1: 'https://cdn-icons-png.flaticon.com/512/1828/1828884.png', // caveira simples
    2: 'https://cdn-icons-png.flaticon.com/512/564/564619.png',   // caveira dupla (exemplo)
    3: 'https://cdn-icons-png.flaticon.com/512/1400/1400307.png', // caveira vermelha (alerta crítico)
  };

  /* =============================
      ⚙️ FUNÇÕES DE SUPORTE
     ============================= */
  const normalize = (s) =>
    (s || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase();

  const MAPA_NOMES = new Map();
  GRUPO_1.forEach((n) => MAPA_NOMES.set(normalize(n), 1));
  GRUPO_2.forEach((n) => MAPA_NOMES.set(normalize(n), 2));
  GRUPO_3.forEach((n) => MAPA_NOMES.set(normalize(n), 3));

  function getNomeVisivel($el) {
    const texto = $el.clone().children().remove().end().text();
    return normalize(texto);
  }

  function aplicarCaveira(personItem) {
    try {
      const $item = window.jQuery ? window.jQuery(personItem) : null;
      if (!$item) return;

      const nome = getNomeVisivel($item);
      const nivel = MAPA_NOMES.get(nome);
      if (!nivel) return;

      const img = $item.find('img.ts-avatar, img.pl-shared-item-img, img.ts-image').get(0);
      if (!img || img.dataset.__alertaApplied === '1') return;

      img.dataset.__alertaApplied = '1';
      img.src = ICONS[nivel];
      img.alt = `Nível ${nivel} de alerta`;
      img.title = `Usuário com alerta nível ${nivel}`;

      const cores = {
        1: '#ffb400', // amarelo
        2: '#ff6a00', // laranja
        3: '#ff0000', // vermelho
      };

      Object.assign(img.style, {
        border: `3px solid ${cores[nivel]}`,
        borderRadius: '50%',
        padding: '2px',
        backgroundColor: `${cores[nivel]}22`,
        boxShadow: `0 0 10px ${cores[nivel]}`,
      });
    } catch (_) {}
  }

  function varrerPagina() {
    document.querySelectorAll('span.pl-person-item').forEach(aplicarCaveira);
  }

  const obs = new MutationObserver(() => varrerPagina());
  obs.observe(document.body, { childList: true, subtree: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', varrerPagina);
  } else {
    varrerPagina();
  }
})();


})();
