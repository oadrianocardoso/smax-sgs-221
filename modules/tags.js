(function (root) {
  'use strict';

  const SMAX   = root.SMAX = root.SMAX || {};
  const CONFIG = SMAX.config || {};
  const prefs  = CONFIG.prefs || {};
  const utils  = SMAX.utils  || {};
  const { normalizeText } = utils;

  const AID_DESCRICAO = 'grid_header_Description';

  const AUTO_TAG_RULES = [
    { palavras:["mandado","oficial de justiça","central de mandos"], tag:"CEMAN" },
    { palavras:["custas","taxa","diligência","diligências"],        tag:"CUSTAS" },
    { palavras:["atp","automatização","automação","regra"],         tag:"ATP" },
    { palavras:["cadastrar","cadastro"],                            tag:"CADASTROS" },
    { palavras:["acesso","login","acessar","fatores","autenticador","autenticação","authenticator","senha"], tag:"LOGIN" },
    { palavras:["Migrado","Migrados","Migração","Migrador","migrar"], tag:"MIGRADOR" },
    { palavras:["Carta","Cartas"],                                  tag:"CORREIOS" },
    { palavras:["DJEN"],                                            tag:"DJEN" },
    { palavras:["Renajud","Sisbajud"],                              tag:"ACIONAMENTOS" },
    { palavras:["Distribuição","Redistribuir","Remeter"],           tag:"DISTRIBUIÇÃO" },
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
