(function (root) {
  'use strict';

  const SMAX   = root.SMAX = root.SMAX || {};
  const CONFIG = SMAX.config || {};
  const prefs  = CONFIG.prefs || {};
  const utils  = SMAX.utils  || {};
  const { getGridViewport, escapeReg } = utils;

  const HL_GROUPS = {
    amarelo: {
      cls:'tmx-hl-yellow',
      whole:[
        'jurisprudência','jurisprudencia','distribuidor','acessar','DJEN','Diário Eletrônico',
        'automatização','ceman','Central de Mandados','mandado','mandados','movimentar',
        'dois fatores','Renajud','Sisbajud','Autenticador','carta','evento','cadastro',
        'automação','automações','migrar','migrador','migração','perito','perita',
        'localizadores','localizador'
      ],
      substr:['acess','mail'],
      custom:[]
    },
    vermelho:{
      cls:'tmx-hl-red',
      whole:[
        'ERRO_AGENDAMENTO_EVENTO','ERRO_ENVIO_INTIMACAO_DJEN','ERRO_ENVIO_INTIMAÇÃO_DJEN',
        'Item 04 do Comunicado 435/2025','Erro ao gerar o Documento Comprobatório Renajud',
        'Cookie not found','Urgente','urgência','Plantão'
      ],
      substr:['erro','errado','réu revel','help_outline'],
      custom:[]
    },
    verde:{
      cls:'tmx-hl-green',
      whole:[
        'taxa','taxas','custa','custas','restituir','restituição','guia','diligência',
        'diligencia','justiça gratuíta','parcelamento','parcelamento das custas',
        'desvincular','desvinculação'
      ],
      substr:[],
      custom:[]
    },
    azul:{
      cls:'tmx-hl-blue',
      whole:['magistrado','magistrada'],
      substr:[],
      custom:[/\bju[ií]z(?:es|a)?\b/giu]
    },
    rosa:{
      cls:'tmx-hl-pink',
      whole:['inesperado'],
      substr:[],
      custom:[]
    }
  };

  const HL_ORDER = ['vermelho','rosa','amarelo','verde','azul'];

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

  const HL_LIST    = Object.entries(HL_GROUPS).map(([name,cfg]) => ({ name, cls:cfg.cls, regexes: buildHighlightRegexes(cfg) }));
  const HL_ORDERED = HL_LIST.slice().sort((a,b)=>HL_ORDER.indexOf(a.name)-HL_ORDER.indexOf(b.name));

  function unwrapCellHighlights(rootEl) {
    (rootEl || root.document).querySelectorAll(
      '.tmx-hl-yellow, .tmx-hl-red, .tmx-hl-green, .tmx-hl-blue, .tmx-hl-pink'
    ).forEach(span => span.replaceWith(root.document.createTextNode(span.textContent || '')));
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

      const frag = doc.createDocumentFragment();
      let last = 0, m;
      while ((m = regex.exec(text)) !== null) {
        if (m.index > last) frag.appendChild(doc.createTextNode(text.slice(last, m.index)));
        const span = doc.createElement('span');
        span.className = cls;
        span.textContent = m[0];
        frag.appendChild(span);
        last = m.index + m[0].length;
      }
      if (last < text.length) frag.appendChild(doc.createTextNode(text.slice(last)));
      textNode.parentNode.replaceChild(frag, textNode);
    }
  }

  function sweepHighlightsInCell(cell) {
    if (!prefs.highlightsOn) return;
    const current = (cell.textContent || '').trim();
    const last    = cell.getAttribute('data-tmx-last') || '';
    if (current === last) return;

    unwrapCellHighlights(cell);
    for (const g of HL_ORDERED) {
      for (const re of g.regexes) {
        highlightMatchesInNode(cell, re, g.cls);
      }
    }
    cell.setAttribute('data-tmx-last', (cell.textContent || '').trim());
  }

  function apply() {
    if (!prefs.highlightsOn) return;
    const scope = getGridViewport(root.document);
    scope.querySelectorAll('.slick-cell').forEach(sweepHighlightsInCell);
  }

  SMAX.highlights = { apply };

})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
