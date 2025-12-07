(function (root) {
  'use strict';

  const SMAX   = root.SMAX = root.SMAX || {};
  const CONFIG = SMAX.config || {};
  const prefs  = CONFIG.prefs || {};
  const utils  = SMAX.utils  || {};
  const { getGridViewport } = utils;

  const RE_MAGISTRADO      = /\bju[ií]z(?:es|a)?(?:\s+de\s+direito)?\b/i;
  const AID_SOLICITADO_POR = 'grid_header_RequestedByPerson.Title';

  function getColumnSelectorByHeaderAid(aid) {
    const headers = Array.from(root.document.querySelectorAll('.slick-header-columns .slick-header-column'));
    const target  = headers.find(h => h.getAttribute('data-aid') === aid);
    if (!target) return null;
    const idx = headers.indexOf(target);
    if (idx < 0) return null;
    return `.slick-row .slick-cell.l${idx}.r${idx}`;
  }

  function markMagistrateColumn() {
    if (!prefs.magistradoOn) return;
    const doc   = root.document;
    const scope = getGridViewport(doc);
    const colSel = getColumnSelectorByHeaderAid(AID_SOLICITADO_POR);
    if (!colSel) return;
    scope.querySelectorAll(colSel).forEach(cell => {
      const txt = (cell.textContent || '').trim();
      if (RE_MAGISTRADO.test(txt)) cell.classList.add('tmx-juizdireito-hit');
      else cell.classList.remove('tmx-juizdireito-hit');
    });
  }

  SMAX.magistrado = { apply: markMagistrateColumn };

})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
