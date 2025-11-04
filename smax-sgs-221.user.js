// ==UserScript==
// @name         SMAX SGS 221
// @namespace    https://github.com/oadrianocardoso/smax-sgs-221
// @version      2.0.1
// @description  2.0
// @author       ADRIANO
// @match        https://suporte.tjsp.jus.br/saw/*
// @match        https://suporte.tjsp.jus.br/saw/Requests*
// @run-at       document-idle
// @grant        GM_addStyle
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
    autoTagsOn: true,
  };

  /* ====================== ESTILOS ====================== */
  GM_addStyle(`
    /* highlights */
    .tmx-hl-yellow { background:#ffeb3b; color:#000; font-weight:700; border-radius:5px; padding:0 .14em; }
    .tmx-hl-red    { background:#d32f2f; color:#fff; font-weight:700; border-radius:3px; padding:0 .16em; }
    .tmx-hl-green  { background:#2e7d32; color:#fff; font-weight:700; border-radius:3px; padding:0 .14em; }
    .tmx-hl-blue   { background:#1e88e5; color:#fff; font-weight:700; border-radius:3px; padding:0 .14em; }
    .tmx-hl-pink   { background:#FC0FC0; color:#000; font-weight:700; border-radius:3px; padding:0 .14em; }

    /* célula marcada como juiz/juíza */
    .tmx-juizdireito-hit { background:#1e88e5 !important; color:#fff !important; font-weight:700 !important; }

    /* badge de nomes (célula inteira colorida) */
    .slick-cell.tmx-namecell { font-weight:700 !important; transition: box-shadow .15s ease; }
    .slick-cell.tmx-namecell a { color: inherit !important; }
    .slick-cell.tmx-namecell:focus-within { outline: 2px solid rgba(0,0,0,.25); outline-offset: 2px; }
    .slick-cell.tmx-namecell:hover { box-shadow: 0 0 0 2px rgba(0,0,0,.08) inset; }

    /* TAGs automáticas (CSS blindado, sem herdar nada) */
    .tag-smax, .tag-smax * { all: unset !important; }
    .tag-smax {
      display: inline-block !important;
      background: #e0e0e0 !important; /* cinza claro */
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

    /* comentários */
    .comment-items { height: auto !important; max-height: none !important; }
  `);

  /* ===================== Helpers ====================== */
  const debounced = (fn, wait=120) => { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), wait); }; };
  const getSlickViewport = (root=document) => root.querySelector('.slick-viewport') || root;

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
      custom: [/\bju[ií]z(?:es|a)?\b/giu]
    },
    rosa: {
      cls: 'tmx-hl-pink',
      whole: ['BdOrigem','CDM','Controladoria Digital de Mandados','Devolvido sem cumprimento','Devolvidos sem cumprimento'],
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
            pcls?.contains('tmx-hl-pink')) return NodeFilter.FILTER_REJECT;
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
    for (const g of ORDERED_GROUPS) for (const re of g.regexes) highlightWithRegex(cell, re, g.cls);
    cell.setAttribute('data-tmx-last', (cell.textContent || '').trim());
  }
  function processCellHighlights(root=document) {
    if (!prefs.highlightsOn) return;
    const scope = getSlickViewport(root);
    scope.querySelectorAll('.slick-cell').forEach(processCell);
  }

  /* =========================================================
   *  2) MARCAR NOMES POR FINAIS DE ID (CÉLULA INTEIRA)
   * =======================================================*/
  const gruposNomes = {
    "ADRIANO":[0,1,2,3,4,5],"DANIEL CRUZ":[6,7,8,9,10,11],"DANIEL LEAL":[12,13,14,15,16,17],
    "GLAUCO":[18,19,20,21,22],"ISA":[23,24,25,26,27,28],"IVAN":[29,30,31,32,33,34],
    "JOAO GABRIEL":[35,36,37,38,39,40],"LAIS":[41,42,43,44,45,46],"LEONARDO":[47,48,49,50,51,52],
    "LUANA":[53,54,55,56,57,58],"LUIS FELIPE":[59,60,61,62,63,64],"MARCELO":[65,66,67,68,69,70],
    "DOUGLAS":[71,72,73,74,75],"MARLON":[76,77,78,79,80,81],"ROBSON":[82,83,84,85,86,87],
    "SAMUEL":[88,89,90,91,92,93],"YVES / IONE":[94,95,96,97,98,99],
  };
  const MARK_ATTR = 'adMarcado';
  const LINK_SELECTORS = ['a.entity-link-id', '.slick-row a'];
  const processedLinks = new WeakSet();
  const mapaNome = {};
  for (const [nome, nums] of Object.entries(gruposNomes)) nums.forEach(n => { mapaNome[String(n).padStart(2,'0')] = nome; });

  function pickLinks() {
    const set = new Set();
    for (const sel of LINK_SELECTORS) document.querySelectorAll(sel).forEach(a => set.add(a));
    return Array.from(set);
  }
  function extraiNumeroFinal(texto) {
    const m = String(texto).match(/(\d{2,})\D*$/);
    return m ? m[1] : '';
  }
  function processNameTags() {
    if (!prefs.nameBadgesOn) return;
    pickLinks().forEach(link => {
      if (!link || processedLinks.has(link)) return;
      const texto = (link.textContent || '').trim();
      const numero = extraiNumeroFinal(texto);
      if (!numero) { processedLinks.add(link); return; }
      const finais2 = numero.slice(-2).padStart(2,'0');
      const nome = mapaNome[finais2];
      const cell = link.closest('.slick-cell');
      const CORES = {
        "ADRIANO":{bg:"#E6E66A",fg:"#000"},"DANIEL CRUZ":{bg:"#CC6666",fg:"#000"},
        "DANIEL LEAL":{bg:"#E6A85C",fg:"#000"},"GLAUCO":{bg:"#4E9E4E",fg:"#fff"},
        "ISA":{bg:"#5C6FA6",fg:"#fff"},"IVAN":{bg:"#9A9A52",fg:"#000"},
        "JOAO GABRIEL":{bg:"#5C7ED8",fg:"#fff"},"LAIS":{bg:"#D966D9",fg:"#000"},
        "LEONARDO":{bg:"#8E5A8E",fg:"#fff"},"LUANA":{bg:"#7ACC7A",fg:"#000"},
        "LUIS FELIPE":{bg:"#5CA3A3",fg:"#000"},"MARCELO":{bg:"#A05252",fg:"#fff"},
        "DOUGLAS":{bg:"#66CCCC",fg:"#000"},"MARLON":{bg:"#A0A0A0",fg:"#000"},
        "ROBSON":{bg:"#CCCCCC",fg:"#000"},"SAMUEL":{bg:"#66A3CC",fg:"#000"},
        "YVES / IONE":{bg:"#4D4D4D",fg:"#fff"},
      };
      if (cell && nome && CORES[nome]) {
        const {bg,fg} = CORES[nome];
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
        }
        link.insertAdjacentElement('afterend', tag);
        link.dataset[MARK_ATTR] = '1';
      }
      processedLinks.add(link);
    });
  }

  /* =========================================================
   *  3) JUIZ/JUÍZA — apenas na coluna "Solicitado por.Título"
   *     (usa o header data-aid para localizar o índice lN/rN)
   * =======================================================*/
  const RE_MAGISTRADO = /\bju[ií]z(?:es|a)?(?:\s+de\s+direito)?\b/i;
  const AID_SOLICITADO_POR = 'grid_header_RequestedByPerson.Title';

  function getColSelectorByHeaderAid(aid) {
    const headers = Array.from(document.querySelectorAll('.slick-header-columns .slick-header-column'));
    const target = headers.find(h => h.getAttribute('data-aid') === aid);
    if (!target) return null;
    const idx = headers.indexOf(target);
    if (idx < 0) return null;
    return `.slick-row .slick-cell.l${idx}.r${idx}`;
  }

  function updateSolicitanteCells(root=document) {
    if (!prefs.magistradoOn) return;
    const scope = getSlickViewport(root);
    const colSel = getColSelectorByHeaderAid(AID_SOLICITADO_POR);
    if (!colSel) return;
    scope.querySelectorAll(colSel).forEach(cell => {
      const txt = (cell.textContent || '').trim();
      if (RE_MAGISTRADO.test(txt)) cell.classList.add('tmx-juizdireito-hit');
      else cell.classList.remove('tmx-juizdireito-hit');
    });
  }

  /* =========================================================
   *  4) TAGs automáticas — apenas na coluna "Descrição"
   *     (usa header data-aid para localizar lN/rN)
   * =======================================================*/
  const AID_DESCRICAO = 'grid_header_Description';

  const regrasTags = [
    { palavras: ["mandado","oficial de justiça","central de mandos"], tag: "CEMAN" },
    { palavras: ["custas","taxa","diligência","diligências"], tag: "CUSTAS" },
    { palavras: ["atp","automatização","automação","regra"], tag: "ATP" },
    { palavras: ["cadastrar","cadastro"], tag: "CADASTROS" },
    { palavras: ["acesso","login","acessar","fatores","autenticador","autenticação","authenticator","senha"], tag: "LOGIN" },
    { palavras: ["Migrado","Migrados","Migração","Migrador","migrar"], tag: "MIGRADOR" },
    { palavras: ["Carta","Cartas"], tag: "CORREIOS" },
    { palavras: ["DJEN"], tag: "DJEN" },
    { palavras: ["Renajud","Sisbajud"], tag: "ACIONAMENTOS" },
    { palavras: ["Distribuição","Redistribuir","Remeter"], tag: "DISTRIBUIÇÃO" },
  ];
  const norm = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const jaTemTagNoInicio = html => /\[\s*[A-Z]+\s*\]/.test(html.replace(/<[^>]+>/g,'').slice(0, 24));

  function processarCelulaDescricao(el) {
    if (el.dataset.smaxTagged === '1') return;
    const txt = el.textContent?.trim();
    if (!txt) return;
    const htmlAtual = el.innerHTML.trim();
    if (jaTemTagNoInicio(htmlAtual)) { el.dataset.smaxTagged = '1'; return; }
    const n = norm(txt);
    for (const r of regrasTags) {
      if (r.palavras.some(p => n.includes(norm(p)))) {
        el.innerHTML = `<span class="tag-smax">[${r.tag}]</span> ${htmlAtual}`;
        el.dataset.smaxTagged = '1';
        break;
      }
    }
  }

  function aplicarTagsDescricao() {
    if (!prefs.autoTagsOn) return;
    const colSel = getColSelectorByHeaderAid(AID_DESCRICAO);
    if (!colSel) return;
    const nodes = document.querySelectorAll(`${colSel}:not([data-smax-tagged])`);
    const MAX_POR_CICLO = 500;
    let count = 0;
    for (const el of nodes) {
      processarCelulaDescricao(el);
      if (++count >= MAX_POR_CICLO) break;
    }
  }

  /* =========================================================
   *  5) Comentários: altura automática
   * =======================================================*/
  (function enlargeComments() {
    if (!prefs.enlargeCommentsOn) return;
    // CSS já injetado no GM_addStyle acima
    const obs = new MutationObserver(muts => {
      for (const m of muts) {
        m.addedNodes?.forEach(node => {
          if (node.nodeType !== 1) return;
          if (node.matches?.('.comment-items')) {
            node.style.height = 'auto';
            node.style.maxHeight = 'none';
          } else {
            node.querySelectorAll?.('.comment-items').forEach(el => {
              el.style.height = 'auto';
              el.style.maxHeight = 'none';
            });
          }
        });
      }
    });
    obs.observe(document.body, { childList:true, subtree:true });
    window.addEventListener('beforeunload', () => obs.disconnect(), { once:true });
  })();

  /* =========================================================
   *  6) Recolher "Oferta de Catálogo" e remover seções
   * =======================================================*/
  (function sectionsTweaks() {
    if (!prefs.collapseOn) return;
    const SECTION_SELECTOR = '#form-section-5, [data-aid="section-catalog-offering"]';
    const IDS_PARA_REMOVER = ['form-section-1','form-section-7','form-section-8'];
    const collapsedOnce = new WeakSet();

    function isOpen(sectionEl) {
      const content = sectionEl?.querySelector?.('.pl-entity-page-component-content');
      return !!content && !content.classList.contains('ng-hide');
    }
    function syntheticClick(el) {
      try { el.click(); }
      catch { el.dispatchEvent(new MouseEvent('click', { bubbles:true, cancelable:true })); }
    }
    function fixAriaAndIcon(headerEl, sectionEl) {
      if (!headerEl || !sectionEl) return;
      if (headerEl.getAttribute('aria-expanded') !== 'false') headerEl.setAttribute('aria-expanded','false');
      const sr = sectionEl.querySelector('.pl-entity-page-component-header-sr');
      if (sr && /Expandido/i.test(sr.textContent || '')) sr.textContent = sr.textContent.replace(/Expandido/ig,'Recolhido');
      const icon = headerEl.querySelector('[pl-bidi-collapse-arrow]') || headerEl.querySelector('.icon-arrow-med-down, .icon-arrow-med-right');
      if (icon) { icon.classList.remove('icon-arrow-med-down'); icon.classList.add('icon-arrow-med-right'); }
    }
    function collapseOnce(sectionEl) {
      if (sectionEl.dataset.userInteracted === '1') return;
      if (collapsedOnce.has(sectionEl)) return;
      const header = sectionEl.querySelector('.pl-entity-page-component-header[role="button"]');
      if (!header) return;
      if (isOpen(sectionEl)) {
        syntheticClick(header);
        setTimeout(()=>fixAriaAndIcon(header,sectionEl),0);
      } else {
        fixAriaAndIcon(header,sectionEl);
      }
      collapsedOnce.add(sectionEl);
    }
    function removerSecoes() {
      IDS_PARA_REMOVER.forEach(id => { const el = document.getElementById(id); if (el && el.parentNode) el.remove(); });
    }
    function applyAll() {
      document.querySelectorAll(SECTION_SELECTOR).forEach(collapseOnce);
      removerSecoes();
    }
    document.addEventListener('click', (e)=>{
      const header = e.target.closest('.pl-entity-page-component-header[role="button"]');
      if (!header) return;
      const sectionEl = header.closest('#form-section-5, [data-aid="section-catalog-offering"]');
      if (sectionEl) sectionEl.dataset.userInteracted = '1';
    }, { capture:true });

    const schedule = debounced(applyAll, 100);
    const obs = new MutationObserver(()=>schedule());
    setTimeout(applyAll, 300);
    obs.observe(document.documentElement, { childList:true, subtree:true });
    window.addEventListener('beforeunload', () => obs.disconnect(), { once:true });
  })();

  /* =========================================================
   *  7) Orquestração (um único observer com debounce)
   * =======================================================*/
  function runAll() {
    const work = () => {
      processCellHighlights();
      processNameTags();
      updateSolicitanteCells();
      aplicarTagsDescricao();
    };
    if ('requestIdleCallback' in window) requestIdleCallback(work, { timeout: 500 });
    else setTimeout(work, 0);
  }
  const scheduleRunAll = debounced(runAll, 80);

  runAll();

  const obsMain = new MutationObserver(()=>scheduleRunAll());
  obsMain.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class','style','aria-expanded']
  });

  // Cabeçalho pode mudar indices lN/rN quando mostra/oculta/reordena colunas
  const header = document.querySelector('.slick-header-columns') || document.body;
  const obsHeader = new MutationObserver(()=>scheduleRunAll());
  obsHeader.observe(header, { childList:true, subtree:true, attributes:true });

  window.addEventListener('scroll', scheduleRunAll, true);
  window.addEventListener('resize', scheduleRunAll, { passive:true });
  window.addEventListener('beforeunload', () => { obsMain.disconnect(); obsHeader.disconnect(); }, { once:true });

  /* =============== (Opcional) Ícone caveira em pessoas lista =============== */
  (function grupo1Caveira() {
    // deixe aqui embaixo; se não quiser, basta comentar esta função.
    const ICON_CAVEIRA_URL = 'https://cdn-icons-png.flaticon.com/512/564/564619.png';
    const GRUPO_1 = [
      "DIEGO OLIVEIRA DA SILVA","GUILHERME CESAR DE SOUSA","THIAGO TADEU FAUSTINO DE OLIVEIRA","JANAINA DOS PASSOS SILVESTRE","PEDRO HENRIQUE PALACIO BARITTI",
      "MARCOS PAULO SILVA MADALENA","GUSTAVO DE MEIRA GONÇALVES","BRUNA MARQUES DOS SANTOS","RODRIGO SILVA OLIVEIRA","RYAN SOUZA CARVALHO","JULIANA LINO DOS SANTOS ROSA",
      "TATIANE ARAUJO DA CRUZ","MARIA FERNANDA DE OLIVEIRA BENTO","VICTOR VIANA ROCA","DIOGO MENDONÇA ANICETO","GIOVANNA CORADINI TEIXEIRA","LUCAS CARNEIRO PERES FERREIRA",
      "DAVI DOS REIS GARCIA","ESTER NAILI DOS SANTOS","DAVID LOPES DE OLIVEIRA","KARINE BARBARA VITOR DE LIMA SOUZA","ALESSANDRA SOUSA NUNES","BRENO MEDEIROS MALFATI",
      "JOYCE DA SILVA OLIVEIRA","FABIANO BARBOSA DOS REIS","JEFFERSON SILVA DE CARVALHO SOARES","RAFAELLA SILVA LIMA PETROLINI","ADRIANA DA SILVA FERREIRA OLIVEIRA",
      "CASSIA SANTOS ALVES DE LIMA","JUAN CAMPOS DE SOUZA","LUCAS ALVES DOS SANTOS","KAUE NUNES SILVA FARRELLY","ADRIANO ZILLI","KELLY FERREIRA DE FREITAS",
      "TATIANA LOURENÇO DA COSTA ANTUNES","GISLENE FERREIRA SANT'ANA RAMOS","Dalete Rodrigues Silva","Karina Nicolau Samaan","Davi dos Reis Garcia","Gabriel Teixeira Ludvig",
      "NATALIA YURIE SHIBA","Paulo Roberto Massoca","DEAULAS DE CAMPOS SALVIANO","LARISSA FERREIRA FUMERO","CARLOS HENRIQUE SCALA DE ALMEIDA","FABRICIO CHRISTIANO TANOBE LYRA"
    ];
    const normalize = s => (s||'').toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
    const LISTA = new Set(GRUPO_1.map(normalize));
    function getVisibleText(el) {
      const clone = el.cloneNode(true);
      while (clone.firstChild) {
        if (clone.firstChild.nodeType === Node.ELEMENT_NODE) clone.removeChild(clone.firstChild); else break;
      }
      return clone.textContent || '';
    }
    function aplicarAlerta(personItem) {
      try {
        if (!(personItem instanceof HTMLElement)) return;
        const nomeVisivel = getVisibleText(personItem);
        const chave = normalize(nomeVisivel);
        if (!LISTA.has(chave)) return;
        const img = personItem.querySelector('img.ts-avatar, img.pl-shared-item-img, img.ts-image') || personItem.querySelector('img');
        if (img && img.dataset.__g1Applied !== '1') {
          img.dataset.__g1Applied = '1';
          img.src = ICON_CAVEIRA_URL;
          img.alt = 'Alerta de Usuário Detrator';
          img.title = 'Alerta de Usuário Detrator';
          Object.assign(img.style, {
            border:'3px solid #ff0000', borderRadius:'50%', padding:'2px',
            backgroundColor:'#ff000022', boxShadow:'0 0 10px #ff0000'
          });
        }
        personItem.style.color = '#ff0000';
      } catch {}
    }
    const obs = new MutationObserver(()=>document.querySelectorAll('span.pl-person-item').forEach(aplicarAlerta));
    obs.observe(document.body, { childList:true, subtree:true });
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', ()=>document.querySelectorAll('span.pl-person-item').forEach(aplicarAlerta));
    } else {
      document.querySelectorAll('span.pl-person-item').forEach(aplicarAlerta);
    }
    window.addEventListener('beforeunload', () => obs.disconnect(), { once:true });
  })();

})();
