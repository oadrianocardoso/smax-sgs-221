// ==UserScript==
// @name         SMAX SGS 221
// @namespace    https://github.com/oadrianocardoso/smax-sgs-221
// @version      7.8
// @description  SMAX SGS 221 (modularizado)
// @author       ADRIANO AUGUSTO CARDOSO E SANTOS
// @match        https://suporte.tjsp.jus.br/saw/*
// @match        https://suporte.tjsp.jus.br/saw/Requests*
// @run-at       document-start
// @grant        GM_addStyle
// @grant        unsafeWindow
// @downloadURL  https://raw.githubusercontent.com/oadrianocardoso/smax-sgs-221/main/smax-sgs-221.user.js
// @updateURL    https://raw.githubusercontent.com/oadrianocardoso/smax-sgs-221/main/smax-sgs-221.user.js
// @homepageURL  https://github.com/oadrianocardoso/smax-sgs-221
// @supportURL   https://github.com/oadrianocardoso/smax-sgs-221/issues


// @require      https://raw.githubusercontent.com/oadrianocardoso/smax-sgs-221/main/modules/config.js?v=7.8
// @require      https://raw.githubusercontent.com/oadrianocardoso/smax-sgs-221/main/modules/css.js?v=7.8
// @require      https://raw.githubusercontent.com/oadrianocardoso/smax-sgs-221/main/modules/highlights.js?v=7.8
// @require      https://raw.githubusercontent.com/oadrianocardoso/smax-sgs-221/main/modules/badges.js?v=7.8
// @require      https://raw.githubusercontent.com/oadrianocardoso/smax-sgs-221/main/modules/magistrado.js?v=7.8
// @require      https://raw.githubusercontent.com/oadrianocardoso/smax-sgs-221/main/modules/tags.js?v=7.8
// @require      https://raw.githubusercontent.com/oadrianocardoso/smax-sgs-221/main/modules/comments.js?v=7.8
// @require      https://raw.githubusercontent.com/oadrianocardoso/smax-sgs-221/main/modules/sections.js?v=7.8
// @require      https://raw.githubusercontent.com/oadrianocardoso/smax-sgs-221/main/modules/attachments.js?v=7.8
// @require      https://raw.githubusercontent.com/oadrianocardoso/smax-sgs-221/main/modules/detratores.js?v=7.8
// @require      https://raw.githubusercontent.com/oadrianocardoso/smax-sgs-221/main/modules/botoes-resolucao.js?v=7.8
// @require      https://raw.githubusercontent.com/oadrianocardoso/smax-sgs-221/main/modules/destaca-atendente.js?v=7.8
// @require      https://raw.githubusercontent.com/oadrianocardoso/smax-sgs-221/main/modules/passar-aquele-gel.js?v=7.8
// @require      https://raw.githubusercontent.com/oadrianocardoso/smax-sgs-221/main/modules/dados-eproc.js?v=7.8
// @require      https://raw.githubusercontent.com/oadrianocardoso/smax-sgs-221/main/modules/orchestrator.js?v=7.8

// ==/UserScript==

(function () {
  'use strict';

  const root = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;

  if (root.SMAX && root.SMAX.orchestrator && typeof root.SMAX.orchestrator.init === 'function') {
    try {
      root.SMAX.orchestrator.init();
      console.log('[SMAX SGS 221] Orchestrator iniciado com sucesso.');
    } catch (e) {
      console.error('[SMAX SGS 221] Erro ao iniciar SMAX.orchestrator.init:', e);
    }
  } else {
    console.error('[SMAX SGS 221] SMAX.orchestrator.init não encontrado. Verifique a ordem dos @require.');
  }
})();
