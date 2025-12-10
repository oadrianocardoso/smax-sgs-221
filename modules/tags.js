(function (root) {
  'use strict';

  const SMAX   = root.SMAX = root.SMAX || {};
  const CONFIG = SMAX.config || {};
  const prefs  = CONFIG.prefs || {};
  const utils  = SMAX.utils  || {};
  const { normalizeText } = utils;

  const AID_DESCRICAO = 'grid_header_Description';

  // =========================
  // CSS ESPECÍFICO DO MÓDULO
  // =========================

  let cssInitialized = false;

  function ensureCss() {
    if (cssInitialized) return;
    cssInitialized = true;

    if (typeof GM_addStyle !== 'function') {
      console.warn('[SMAX tags] GM_addStyle não disponível.');
      return;
    }

    GM_addStyle(`
      .tag-smax, .tag-smax * {
        all: unset !important;
      }

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

      .tag-smax [class^="tmx-hl-"],
      .tag-smax [class*=" tmx-hl-"] {
        all: unset !important;
        background: none !important;
        color: inherit !important;
      }
    `);
  }

  // =========================
  // REGRAS DE AUTO-TAG (UTF-8 OK)
  // =========================

  const AUTO_TAG_RULES = [
    { palavras:["mandado","oficial de justiça","central de mandados"], tag:"CEMAN" },
    { palavras:["custas","taxa","diligência","diligências"],          tag:"CUSTAS" },
    { palavras:["atp","automatização","automação","regra"],           tag:"ATP" },
    { palavras:["cadastrar","cadastro"],                              tag:"CADASTROS" },
    {
      palavras:[
        "acesso","login","acessar","fatores",
        "autenticador","autenticação","authenticator","senha"
      ],
      tag:"LOGIN"
    },
    { palavras:["migrado","migrados","migração","migrador","migrar"], tag:"MIGRADOR" },
    { palavras:["carta","cartas"],                                    tag:"CORREIOS" },
    { palavras:["DJEN"],                                              tag:"DJEN" },
    { palavras:["Renajud","Sisbajud"],                                tag:"ACIONAMENTOS" },
    { palavras:["distribuição","redistribuir","remeter"],             tag:"DISTRIBUIÇÃO" }
  ];

  function getColumnSelectorByHeaderAid(aid) {
    const headers = Array.from(root.document.querySelectorAll('.slick-header-columns .slick-header-column'));
    const target  = headers.find(h => h.getAttribute('data-aid') === aid);
    if (!target) return null;
    const idx = headers.indexOf(target);
    if (idx < 0) return null;
    return `.slick-row .slick-cell.l${idx}.r${idx}`;
  }

  function hasLeadingTag(html) {
    const clean = html.replace(/<[^>]+>/g,'').slice(0,24);
    return /\[\s*[A-Z]+\s*\]/.test(clean);
  }

  function tagDescriptionCellOnce(el) {
    if (el.dataset.smaxTagged === '1') return;

    const plain = el.textContent?.trim();
    if (!plain) return;

    const htmlAtual = el.innerHTML.trim();
    if (hasLeadingTag(htmlAtual)) {
      el.dataset.smaxTagged = '1';
      return;
    }

    const n = normalizeText(plain);
    for (const r of AUTO_TAG_RULES) {
      if (r.palavras.some(p => n.includes(normalizeText(p)))) {
        el.innerHTML = `<span class="tag-smax">${r.tag}</span> ${htmlAtual}`;
        el.dataset.smaxTagged = '1';
        break;
      }
    }
  }

  function applyAutoTagsInDescription() {
    if (!prefs.autoTagsOn) return;

    // garante que o CSS da tag está carregado
    ensureCss();

    const colSel = getColumnSelectorByHeaderAid(AID_DESCRICAO);
    if (!colSel) return;

    const nodes = root.document.querySelectorAll(`${colSel}:not([data-smax-tagged])`);
    const MAX_PER_TICK = 500;
    let count = 0;
    for (const el of nodes) {
      tagDescriptionCellOnce(el);
      if (++count >= MAX_PER_TICK) break;
    }
  }

  SMAX.tags = { apply: applyAutoTagsInDescription };

})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
