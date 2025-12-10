(function (root) {
  'use strict';

  const SMAX = root.SMAX = root.SMAX || {};

  function init() {
    // CSS agora é injetado diretamente pelos módulos (highlights, badges, tags, attachments, comments).
    // Este módulo é mantido apenas para compatibilidade com versões antigas do userscript.
  }

  SMAX.css = { init };

})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
