// ==UserScript==
// @name         SMAX SGS 221 (LOCAL)
// @namespace    https://github.com/oadrianocardoso/smax-sgs-221
// @version      8.9-local
// @description  SMAX SGS 221 (modularizado - arquivos locais)
// @author       ADRIANO AUGUSTO CARDOSO E SANTOS
// @match        https://suporte.tjsp.jus.br/saw/*
// @match        https://suporte.tjsp.jus.br/saw/Requests*
// @run-at       document-start
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      hzjlgwuorhexkzcoxmay.supabase.co
//
// @require      file:///C:/Users/Adriano/Desktop/PROJETOS/smax-sgs-221/modules/config.js
// @require      file:///C:/Users/Adriano/Desktop/PROJETOS/smax-sgs-221/modules/supabase-db.js
// @require      file:///C:/Users/Adriano/Desktop/PROJETOS/smax-sgs-221/modules/css.js
// @require      file:///C:/Users/Adriano/Desktop/PROJETOS/smax-sgs-221/modules/highlights.js
// @require      file:///C:/Users/Adriano/Desktop/PROJETOS/smax-sgs-221/modules/magistrado.js
// @require      file:///C:/Users/Adriano/Desktop/PROJETOS/smax-sgs-221/modules/tags.js
// @require      file:///C:/Users/Adriano/Desktop/PROJETOS/smax-sgs-221/modules/comments.js
// @require      file:///C:/Users/Adriano/Desktop/PROJETOS/smax-sgs-221/modules/sections.js
// @require      file:///C:/Users/Adriano/Desktop/PROJETOS/smax-sgs-221/modules/attachments.js
// @require      file:///C:/Users/Adriano/Desktop/PROJETOS/smax-sgs-221/modules/detratores.js
// @require      file:///C:/Users/Adriano/Desktop/PROJETOS/smax-sgs-221/modules/botoes-resolucao.js
// @require      file:///C:/Users/Adriano/Desktop/PROJETOS/smax-sgs-221/modules/destaca-atendente.js
// @require      file:///C:/Users/Adriano/Desktop/PROJETOS/smax-sgs-221/modules/passar-aquele-gel.js
// @require      file:///C:/Users/Adriano/Desktop/PROJETOS/smax-sgs-221/modules/dados-eproc.js
// @require      file:///C:/Users/Adriano/Desktop/PROJETOS/smax-sgs-221/modules/export-chamados.js
// @require      file:///C:/Users/Adriano/Desktop/PROJETOS/smax-sgs-221/modules/menu-config.js
// @require      file:///C:/Users/Adriano/Desktop/PROJETOS/smax-sgs-221/modules/orchestrator.js
//
// ==/UserScript==

(async function () {
  'use strict';

  const root = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;

  if (root.SMAX && root.SMAX.supabase && root.SMAX.supabase.ready && typeof root.SMAX.supabase.ready.then === 'function') {
    try {
      await root.SMAX.supabase.ready;
      console.log('[SMAX SGS 221 LOCAL] Configuracoes carregadas do Supabase.');
    } catch (e) {
      console.error('[SMAX SGS 221 LOCAL] Erro ao aguardar carregamento do Supabase:', e);
    }
  }

  if (root.SMAX && root.SMAX.orchestrator && typeof root.SMAX.orchestrator.init === 'function') {
    try {
      root.SMAX.orchestrator.init();
      console.log('[SMAX SGS 221 LOCAL] Orchestrator iniciado com sucesso.');
    } catch (e) {
      console.error('[SMAX SGS 221 LOCAL] Erro ao iniciar SMAX.orchestrator.init:', e);
    }
  } else {
    console.error('[SMAX SGS 221 LOCAL] SMAX.orchestrator.init nao encontrado. Verifique a ordem dos @require.');
  }
})();
