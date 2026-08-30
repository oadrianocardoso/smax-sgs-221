// ==UserScript==
// @name         ARIA
// @version      3.6
// @description  Assistente de Resolução Integradas e Automações - SGS 2.3.2
// @author       FELIPY WILLIAM FERREIRA
// @updateURL    https://gist.github.com/felipywf/dff2f20be7fc0d366889ad5922b3e2c8/raw/aria.user.js
// @downloadURL  https://gist.github.com/felipywf/dff2f20be7fc0d366889ad5922b3e2c8/raw/aria.user.js
// @match        https://suporte.tjsp.jus.br/*
// @match        https://notebook.google.com/*
// @match        https://notebooklm.google.com/*
// @run-at       document-idle
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @grant        GM_openInTab
// @grant        GM_xmlhttpRequest
// @connect      smax-ai.felipywf.workers.dev
// ==/UserScript==

(() => {
    'use strict';

    // =========================================================================
    // ROTEADOR DE DOMÍNIO
    // Um único userscript atende as duas pontas: o SMAX e a aba do Gemini Notebook.
    // O agente do Gemini Notebook é autocontido e devolve o fluxo aqui mesmo — nada
    // do que vem abaixo (CSS, constantes, orquestrador do SMAX) roda lá.
    // =========================================================================
    if (/(^|\.)notebook(lm)?\.google\.com$/i.test(location.hostname)) {
        if (window.top === window.self) ariaBootNotebookAgent();
        return;
    }

    // =========================================================================
    // CONFIGURAÇÕES E ESTADOS GLOBAIS
    // =========================================================================
    const CONFIG = {

        features: {
            enableIdCopier: true,
            enableAttachmentsPreview: true,
            enableUserHighlight: true,
            enableRadarRevisar: true,
            enableEscalarAlert: true,
            enableAutoExpandShowMore: true,
            enableAutoHeightComments: true,
            enableVipBadge: true,
            enableDuplicityRadar: true,
            enableAutoDuplicityCheck: true,
            enableZenMode: true,
            enableBlocoNotas: true,
            // Cabeçalho
            enableHeaderRadar: true,
            enableHeaderEstatisticas: true,
            enableHeaderGlobais: true,
            // Botões contextuais
            enableContextualDesignar: true,
            enableContextualCorrigirOferta: true,
            enableContextualResolver: true,
            enableContextualBancoSolucoes: true,
            enableContextualBancoDiscussao: true,
            enableContextualLinker: true,
            enableContextualCopiarFilhos: true,
            // Menu lateral / lote
            enableSolucoesLote: true,
            // Motor visual
            enableDarkModeEngine: true,
            enableHeaderDarkMode: true,
            // Integração Gemini Notebook
            enableAriaNotebook: true
        },

        analistas: [
            { matricula: "372152", nome: "DAVID DE SOUZA DICHIRICO PESTILLI" },
            { matricula: "381504", nome: "FELIPY WILLIAM FERREIRA" },
            { matricula: "380924", nome: "GLAUCO BARROZO TOLENTINO" },
            { matricula: "373163", nome: "INGRID MARIA DOS SANTOS COSTA" },
            { matricula: "374593", nome: "JUSSARA MARIA BARROS TOLEDO" },
            { matricula: "380939", nome: "LUIS GUSTAVO BRUXEL MARTINS" },
            { matricula: "372335", nome: "MARIA FERNANDA PERES PINTO SAMPAIO" },
            { matricula: "380959", nome: "MATHEUS NICOLETTI NASCIMENTO BARBOSA" },
            { matricula: "379668", nome: "MAYARA MENDES CARDOSO BARBOSA" },
            { matricula: "361246", nome: "MIRIAM LUCIA DA SILVA" },
            { matricula: "378444", nome: "NICHOLAS FERREIRA DE SOUZA MELO" },
            { matricula: "810416", nome: "PETERSON MOREIRA BONIFACIO" },
            { matricula: "371563", nome: "RENATA APARECIDA FERREIRA BISPO" },
            { matricula: "375708", nome: "ROMULO PEREIRA DE ARAUJO" },
            { matricula: "381447", nome: "FERNANDA SANTOS DE JESUS" },
            { matricula: "381393", nome: "VINICIUS EMIDIO DA SILVA" }
        ],
        mestres: ["MAYARA MENDES CARDOSO BARBOSA", "DAVID DE SOUZA DICHIRICO PESTILLI", "MARCIO DO NASCIMENTO", "BRUNA MARTIN GRANATO", "SANDRA CRISTINA PAMIO LOPES", "MARINA BETTI VIANA DE CARVALHO", "MARLON TERGILENE BICALHO DOS SANTOS"],
        grupo1: ["CELSO HERCULANO OLIVEIRA DE MELO", "FERNANDA GODOY DE ABREU PITLIUK", "KAWE FARIA DE OLIVEIRA", "NATHALIA RODRIGUES DA SILVA", "Vitória Francista Leite", "WELLINGTON CARLOS DA SILVA", "NATHALIA RODRIGUES DA SILVA","LUCAS RESENDE BANDEIRA","CAROLINE MIEKO GUARINO","NATHALIA RODRIGUES DA SILVA","Adriana Da Silva Ferreira Oliveira","Alessandra Sousa Nunes","Bruna Marques Dos Santos","Breno Medeiros Malfati","Carlos Henrique Scala De Almeida","Cassia Santos Alves De Lima","Dalete Rodrigues Silva","David Lopes De Oliveira","Davi Dos Reis Garcia","Deaulas De Campos Salviano","Diego Oliveira Da Silva","Diogo Mendonça Aniceto","Elaine Moriya","Ester Naili Dos Santos","Fabiano Barbosa Dos Reis","Fabricio Christiano Tanobe Lyra","Gabriel Teixeira Ludvig","Gilberto Sintoni Junior","Giovanna Coradini Teixeira","Gislene Ferreira Sant'Ana Ramos","Guilherme Cesar De Sousa","Gustavo De Meira Gonçalves","Jackson Alcantara Santana","Janaina Dos Passos Silvestre","Jefferson Silva De Carvalho Soares","Joyce Da Silva Oliveira","Juan Campos De Souza","Juliana Lino Dos Santos Rosa","Karina Nicolau Samaan","Karine Barbara Vitor De Lima Souza","Kaue Nunes Silva Farrelly","Kelly Ferreira De Freitas","Larissa Ferreira Fumero","Lucas Alves Dos Santos","Lucas Carneiro Peres Ferreira","Marcos Paulo Silva Madalena","Maria Fernanda De Oliveira Bento","Natalia Yurie Shiba","Paulo Roberto Massoca","Pedro Henrique Palacio Baritti","Rafaella Silva Lima Petrolini","Renata Aparecida Mendes Bonvechio","Rodrigo Silva Oliveira","Ryan Souza Carvalho","Tatiana Lourenço Da Costa Antunes","Tatiane Araujo Da Cruz","Thiago Tadeu Faustino De Oliveira","Tiago Carvalho De Freitas Meneses","Victor Viana Roca","GERSON DA MATTA", "NATHALIA RODRIGUES DA SILVA", "WILLIAM DE FREITAS FERREIRA"],
        defaultTemplates: []
    };

    let rejeitadosDetectados = new Set();
    let prontosDetectados = new Set();
    let sccdProcessedForTicket = null;
    let currentEditIndex = -1;
    let isManagerDisc = false;

    // =========================================================================
    // CLOUDFLARE
    // =========================================================================
    const URL_CLOUDFLARE = "https://smax-ai.felipywf.workers.dev/";

    // =========================================================================
    // CSS E ESTILOS GLOBAIS
    // =========================================================================
    GM_addStyle(`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      .smax-hidden { display: none !important; }
      body.smax-auto-comments .comment-items {
      height: auto !important;
      max-height: none !important;
      }

      .tmPreviewModal { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 9999999; backdrop-filter: blur(5px); }
      .tmPreviewClose { position: absolute; top: 20px; right: 30px; font-size: 35px; color: #fff; cursor: pointer; z-index: 10000000; transition: color 0.2s; }
      .tmPreviewClose:hover { color: #e74c3c; }
      .tmPreviewImg { max-width: 90%; max-height: 90%; border: 4px solid #fff; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border-radius: 8px; }

      #smax-escalar-banner { position: fixed; top: 0; left: 50%; transform: translateX(-50%); background: #f1c40f; color: #2c3e50; padding: 9px 22px; z-index: 100000; font-size: 14px; font-family: 'Inter', sans-serif; border-radius: 0 0 11px 11px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); animation: slideDown 0.4s ease; display: flex; gap: 13px; align-items: center; font-weight: 500; border: 1px solid #f39c12; border-top: none; }
      #btn-banner-escalar { background: #e67e22; color: white; border: none; padding: 6px 15px; border-radius: 7px; cursor: pointer; font-size: 14px; font-weight: 600; font-family: 'Inter', sans-serif; transition: background 0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.1); } #smax-panel.minimized .smax-body { display: none; }
      .smax-header { background: #1e272e; color: #f5f6fa; padding: 12px 16px; font-size: 14px; font-weight: 600; display: flex; justify-content: space-between; align-items: center; cursor: move; user-select: none; }
      .smax-header-controls { display: flex; gap: 12px; cursor: pointer; align-items: center; }
      .smax-help-btn { background: rgba(255,255,255,0.15); border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: bold; transition: background 0.2s; color: #fff;}
      .smax-help-btn:hover { background: rgba(255,255,255,0.3); }
      .smax-body { padding: 16px 14px; display: flex; flex-direction: column; gap: 10px; max-height: 85vh; overflow-y: auto;}

      .smax-btn { padding: 10px; border: none; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; font-family: 'Inter', sans-serif; transition: all 0.2s ease; display: flex; align-items: center; color: white; width: 100%; justify-content: center; letter-spacing: 0.2px; }
      .smax-btn span { margin-left: 6px; }
      .smax-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 10px rgba(0,0,0,0.15); filter: brightness(1.05); }
      .smax-btn:active { transform: translateY(1px); box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
      .smax-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; filter: grayscale(50%);}
      .btn-purple { background: #575fcf !important; color: #ffffff !important; border: none !important; font-size: 13px !important; }
      .btn-green { background: #05c46b !important; color: #ffffff !important; border: none !important; font-size: 13px !important; }
      .btn-gray { background: #576574 !important; color: #ffffff !important; border: none !important; font-size: 13px !important; }

      .smax-select-container { width: 100%; margin-bottom: 5px; }
      .smax-select { width: 100%; height: 32px; padding: 0 8px; border: 1px solid #dcdde1; border-radius: 6px; background: #fdfdfd; font-size: 12px; font-family: 'Inter', sans-serif; cursor: pointer; outline: none; transition: border 0.2s; color: #2f3640; box-sizing: border-box;}
      .smax-select:focus { border-color: #575fcf; }
      .smax-label { font-size: 11px; font-weight: 700; color: #718093; margin-bottom: 6px; display: block; text-transform: uppercase; letter-spacing: 0.5px; }

      #smax-radar-box { background: #fff3cd; border: 1px solid #ffc048; border-radius: 8px; padding: 10px; color: #e15f41; font-size: 12px; font-weight: 600; text-align: center; display: none; box-shadow: 0 2px 8px rgba(255, 192, 72, 0.2); }
      #smax-radar-ids { font-weight: 400; margin-top: 6px; word-break: break-all; color: #2f3640; font-size: 11px; background: rgba(255,255,255,0.7); padding: 4px; border-radius: 4px;}
      .btn-radar-copy { background: #e15f41; color: white; border: none; border-radius: 6px; padding: 6px 10px; cursor: pointer; font-size: 11px; margin-top: 8px; width: 100%; font-weight: 600; transition: background 0.2s;}
      .btn-radar-copy:hover { background: #c44536; }

      .smax-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 1000000; display: flex; justify-content: center; align-items: center; font-family: "Metric", Arial, sans-serif; backdrop-filter: blur(3px); }
      .smax-modal-content { background: white; width: 650px; max-width: 90%; max-height: 90vh; border-radius: 4px; box-shadow: 0 15px 40px rgba(0,0,0,0.3); display: flex; flex-direction: column; animation: slideDown 0.3s ease; }
      .smax-modal-header { background: #2c3e50; color: white; padding: 15px 20px; font-weight: 400; display: flex; justify-content: space-between; align-items: center; border-radius: 4px 4px 0 0; font-size: 16px; transition: background 0.3s; letter-spacing: 0.3px; }
      .smax-close-btn { cursor: pointer; font-size: 22px; color: #ecf0f1; border: none; background: none; font-weight: normal; transition: color 0.2s; line-height: 1;}
      .smax-close-btn:hover { color: #f1c40f; }
      .smax-modal-body { padding: 25px; overflow-y: auto; flex: 1; color: #333; font-size: 13px; line-height: 1.6; }

      .template-item { display: flex; justify-content: space-between; align-items: center; background: #f8f9fa; border: 1px solid #e0e0e0; padding: 10px 15px; margin-bottom: 8px; border-radius: 4px; transition: background 0.2s; }
      .template-item:hover { background: #f1f2f6; }
      .action-group { display: flex; gap: 6px;}
      .smax-btn-icon { cursor: pointer; padding: 4px 10px; border-radius: 2px; font-weight: normal; border:none; font-size:12px; transition: filter 0.2s; font-family: inherit;}
      .smax-btn-icon:hover { filter: brightness(0.9); }
      .smax-btn-edit { background: #f1c40f !important; color: #2c3e50 !important; }
      .smax-btn-delete { background: #e74c3c !important; color: #fff !important; }

      .editor-section { border-top: 2px solid #ecf0f1; margin-top: 25px; padding-top: 20px; }
      .smax-input { width: 100%; padding: 8px 12px; margin-bottom: 12px; border: 1px solid #ccc; border-radius: 2px; box-sizing: border-box; outline: none; font-family: inherit; font-size: 13px; color: #333;}
      .smax-input::placeholder { color: #7f8c8d; font-weight: normal; }
      .smax-input:focus { border-color: #0073e7; }
      .editor-toolbar { background: #f1f2f6; padding: 8px; border: 1px solid #ccc; border-bottom: none; border-radius: 2px 2px 0 0; display: flex; gap: 6px; flex-wrap: wrap; }
      .toolbar-btn { background: white; border: 1px solid #ccc; cursor: pointer; padding: 4px 10px; border-radius: 2px; font-weight: normal; color: #333; font-size: 13px; transition: all 0.2s; font-family: inherit;}
      .toolbar-btn:hover { background: #e0e0e0; }
      .smax-textarea { width: 100%; height: 200px; padding: 15px; border: 1px solid #ccc; border-radius: 0 0 2px 2px; font-family: inherit; resize: vertical; overflow-y: auto; box-sizing: border-box; background: #fff; outline: none; font-size: 13px; line-height: 1.5; color: #333;}
      .smax-textarea:focus { border-color: #0073e7; }

      #smax-escalar-badge:hover {
      background: #f39c12 !important;
      border-color: #000 !important;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      }

      #smax-escalar-badge:active {
      transform: translateY(1px);
      box-shadow: none;
      }

     .btn-cloud {
     background: rgba(255,255,255,0.18);
     color: #ffffff;
     cursor: pointer;
     padding: 6px 10px;
     border-radius: 6px;
     border: 1px solid rgba(255,255,255,0.45);
     font-size: 12px;
     transition: all 0.2s ease;
     font-family: inherit;
     font-weight: 500;
     line-height: 1;
     white-space: nowrap;
     display: inline-flex;
     align-items: center;
     justify-content: center;
     gap: 4px;
     }

     .btn-cloud:hover {
     background: rgba(255,255,255,0.32);
     border-color: rgba(255,255,255,0.7);
     transform: translateY(-1px);
     }

     .btn-cloud:active {
     transform: translateY(1px);

}`);

    // =========================================================================
    // UTILITÁRIOS E HELPERS GLOBAIS
    // =========================================================================
    const STORAGE_KEY_SOL = 'smax_solutions_v2';
    const STORAGE_KEY_DISC = 'smax_discussions_v2';
    const SETTINGS_KEY = 'smax_settings';

    const createDefaultSettings = () => ({
        assignee: "NÃO IDENTIFICADO",
        x: null,
        y: null,
        minimized: false,
        features: { ...CONFIG.features }
    });

    // Preserva compatibilidade com dados antigos sem deixar localStorage corrompido interromper o script.
    const loadSettings = () => {
        const fallback = createDefaultSettings();
        try {
            const stored = localStorage.getItem(SETTINGS_KEY);
            if (!stored) return fallback;

            const parsed = JSON.parse(stored);
            return {
                ...fallback,
                ...parsed,
                features: { ...fallback.features, ...(parsed.features || {}) }
            };
        } catch {
            return fallback;
        }
    };
    const saveSettings = (settings) => localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

    const loadTemplates = (isDisc) => {
        const key = isDisc ? STORAGE_KEY_DISC : STORAGE_KEY_SOL;
        const stored = localStorage.getItem(key);
        let templates = [];
        try {
            templates = stored ? JSON.parse(stored) : [];
            // Salva-vidas: Se a memória corrompeu e não for uma lista, reseta sozinho!
            if (!Array.isArray(templates)) templates = [];
        } catch (e) {
            templates = [];
        }
        return templates.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR', { sensitivity: 'base' }));
    };

    const saveTemplates = (isDisc, templates) => {
        const key = isDisc ? STORAGE_KEY_DISC : STORAGE_KEY_SOL;
        localStorage.setItem(key, JSON.stringify(templates));
    };

    const getMinhaMatricula = () => {
        const s = loadSettings();
        const obj = CONFIG.analistas.find(a => a.nome === s.assignee || a.matricula === s.assignee) || CONFIG.analistas.find(a => a.matricula === "381504");
        return obj ? obj.matricula : "000000";
    };

    const getCsrfToken = () => {
        const match = document.cookie.match(new RegExp('(^| )XSRF-TOKEN=([^;]+)'));
        return match ? match[2] : '';
    };

    const debounce = (fn, wait = 120) => {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), wait);
        };
    };
    const normalizeText = (text = '') => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const htmlToText = (html = '') => {
        const element = document.createElement('div');
        element.innerHTML = html;
        return element.textContent || element.innerText || '';
    };
    const getCurrentTicketId = () => location.pathname.match(/\/saw\/Request\/(\d+)/)?.[1] || null;
    const isRequestPage = () => Boolean(getCurrentTicketId());
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    const simulateClick = (element) => {
        if (!element) return;
        ['mousedown', 'mouseup', 'click'].forEach(eventType => {
            const event = document.createEvent('MouseEvents');
            event.initEvent(eventType, true, true);
            element.dispatchEvent(event);
        });
    };

    // =========================================================================
    // ROTINAS DE INTERFACE E ALERTAS
    // =========================================================================
    function initDarkModeEngine() {
        if (CONFIG.features.enableDarkModeEngine === false) {
            document.documentElement.classList.remove('smax-dark');
            localStorage.setItem('smax_dark_mode', 'false');

            const oldStyle = document.getElementById('smax-dark-style');
            if (oldStyle) oldStyle.remove();

            document.getElementById('header-btn-dark-mode')?.style.setProperty('display', 'none', 'important');
            return;
        }
        const oldStyle = document.getElementById('smax-dark-style');
        if (oldStyle) oldStyle.remove();

        const style = document.createElement('style');
        style.id = 'smax-dark-style';
        style.innerHTML = `
          html.smax-dark { filter: invert(89%) hue-rotate(180deg) brightness(110%) contrast(105%) !important; background-color: #ffffff !important; }
          html.smax-dark img, html.smax-dark video, html.smax-dark .pl-avatar, html.smax-dark .ts-avatar, html.smax-dark .avatar-wrapper, html.smax-dark .image-small-size, html.smax-dark .pl-shared-item-img { filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(95%) !important; }
          html.smax-dark .cke_wysiwyg_div, html.smax-dark input, html.smax-dark textarea { filter: brightness(85%) contrast(105%) !important; }
      `;
        document.head.appendChild(style);
        if (localStorage.getItem('smax_dark_mode') === 'true') document.documentElement.classList.add('smax-dark');
    }

    function initFlagUsersSkull() {
        if (!CONFIG.features.enableUserHighlight) return;
        const SET_DETRATORES = new Set(CONFIG.grupo1.map(normalizeText));
        const SET_MESTRES = new Set(CONFIG.mestres.map(normalizeText));

        function applySkullAlert(personItem) {
            if (!(personItem instanceof HTMLElement)) return;
            const nome = normalizeText(personItem.textContent).trim();
            const img = personItem.querySelector('img');
            if (!img) return;

            if (SET_MESTRES.has(nome)) {
                if (img.dataset.__g1Applied !== 'mestre') {
                    img.dataset.__g1Applied = 'mestre'; img.src = 'https://cdn-icons-png.flaticon.com/512/564/564619.png';
                    Object.assign(img.style, { border:'2px solid #3498db', borderRadius:'50%', padding:'2px', backgroundColor:'rgba(52, 152, 219, 0.2)', boxShadow:'0 0 10px rgba(52, 152, 219, 0.8)' });
                }
                personItem.style.color = '#2980b9'; personItem.style.fontWeight = 'bold';
            } else if (SET_DETRATORES.has(nome)) {
                if (img.dataset.__g1Applied !== 'detrator') {
                    img.dataset.__g1Applied = 'detrator'; img.src = 'https://cdn-icons-png.flaticon.com/512/564/564619.png';
                    Object.assign(img.style, { border:'2px solid #e74c3c', borderRadius:'50%', padding:'2px', backgroundColor:'rgba(231, 76, 60, 0.2)', boxShadow:'0 0 8px rgba(231, 76, 60, 0.6)' });
                }
                personItem.style.color = '#c0392b'; personItem.style.fontWeight = 'bold';
            }
        }
        const processNode = (node) => {
            if (!(node instanceof HTMLElement)) return;
            if (node.matches('span.pl-person-item')) applySkullAlert(node);
            node.querySelectorAll?.('span.pl-person-item').forEach(applySkullAlert);
        };

        document.querySelectorAll('span.pl-person-item').forEach(applySkullAlert);
        new MutationObserver(records => {
            records.forEach(record => record.addedNodes.forEach(processNode));
        }).observe(document.body, { childList: true, subtree: true });
    }

    function checkDefPubVIP() {
        if (!CONFIG.features.enableVipBadge || !window.location.href.includes('/saw/Request/')) return;
        const groupEl = document.querySelector('div[data-aid="withoutResolution_ExpertGroup"] .select2-chosen, div[data-aid="ExpertGroup"] .select2-chosen');
        const requesterContainer = document.querySelector('div[data-aid="RequestedForPerson"] .pl-person-item, div[data-aid="withoutResolution_RequestedForPerson"] .pl-person-item');
        if (!requesterContainer) return;

        let isDefPub = groupEl && groupEl.textContent.toUpperCase().replace(/\s/g, '').includes('DEFPUB');
        const existingBadge = requesterContainer.querySelector('.smax-vip-badge');

        if (isDefPub && !existingBadge) {
            const vipBadge = document.createElement('span'); vipBadge.className = 'smax-vip-badge'; vipBadge.innerHTML = '👑 VIP';
            vipBadge.style.cssText = 'background: linear-gradient(135deg, #f1c40f, #f39c12); color: #fff; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 11px; margin-left: 8px; vertical-align: middle; box-shadow: 0 1px 3px rgba(0,0,0,0.2);';
            requesterContainer.appendChild(vipBadge);
        } else if (!isDefPub && existingBadge) existingBadge.remove();
    }

    function initDuplicityRadar() {
        if (!CONFIG.features.enableDuplicityRadar || !window.location.href.includes('/saw/Request/')) return;
        const requesterWrapper = document.querySelector('div[data-aid="RequestedByPerson"], div[data-aid="withoutResolution_RequestedByPerson"]');
        if (!requesterWrapper) return;

        const personItem = requesterWrapper.querySelector('.pl-person-item');
        if (!personItem || personItem.dataset.radarAdded === '1') return;

        let nomeLimpo = personItem.textContent.replace(/💀 BANIDO:/g, '').replace(/👑 VIP \(Defensoria\)/g, '').trim();
        if (!nomeLimpo) return;

        const btnRadar = document.createElement('button');
        btnRadar.className = 'btn btn-primary';
        btnRadar.type = 'button';
        btnRadar.innerHTML = 'Histórico';
        btnRadar.style.marginLeft = '12px';

        // Dicionário de Fases do SMAX
        const tradutorFases = {
            'Log': 'Log',
            'Classify': 'Classify',
            'FirstLineSupport': 'Aguardando atendimento',
            'Escalate': 'Aguardando atendimento',
            'Fulfill': 'Fulfill',
            'Review': 'Rejeitado',
            'Accept': 'Aguardando aceite',
            'Close': 'Fechado',
            'Abandon': 'Abandonado'
        };

        btnRadar.onclick = async (e) => {
            e.preventDefault(); e.stopPropagation();

            let dropdown = document.getElementById('smax-history-dropdown');
            if (!dropdown) {
                dropdown = document.createElement('div');
                dropdown.id = 'smax-history-dropdown';
                dropdown.style.cssText = 'display: none; position: absolute; width: 400px; background: #fff; border-radius: 4px; box-shadow: 0 8px 30px rgba(0,0,0,0.3); border: 1px solid #ccc; z-index: 999999; flex-direction: column; overflow: hidden; font-family: "Metric", Arial, sans-serif; font-size: 11px; font-weight: normal; cursor: default;';              document.body.appendChild(dropdown);

                document.addEventListener('click', (event) => {
                    if (!dropdown.contains(event.target) && event.target !== btnRadar) {
                        dropdown.style.display = 'none';
                    }
                });

                document.querySelector('.pl-entity-page-body')?.addEventListener('scroll', () => {
                    dropdown.style.display = 'none';
                });
            }

            if (dropdown.style.display === 'flex' && dropdown.dataset.alvo === nomeLimpo) {
                dropdown.style.display = 'none';
                return;
            }

            dropdown.dataset.alvo = nomeLimpo;

            const rect = btnRadar.getBoundingClientRect();
            dropdown.style.top = (rect.bottom + window.scrollY + 8) + 'px';
            dropdown.style.left = (rect.left + window.scrollX) + 'px';

            dropdown.style.display = 'flex';
            dropdown.innerHTML = `<div style="padding: 13px; text-align: center; color: #555; font-size: 11px; font-weight: normal;">⏳ Buscando chamados de <span style="font-weight: 600;">${nomeLimpo}</span>...</div>`;
            try {
                const urlPerson = `/rest/213963628/ems/Person?filter=Name='${encodeURIComponent(nomeLimpo)}'&layout=Id&size=1`;
                const resPerson = await fetch(urlPerson, { headers: { 'Accept': 'application/json' } });
                const dataPerson = await resPerson.json();

                if (!dataPerson.entities || dataPerson.entities.length === 0) {
                    dropdown.innerHTML = `<div style="padding: 13px; text-align: center; color: #e74c3c;">Usuário não encontrado no banco.</div>`;
                    return;
                }
                const personId = dataPerson.entities[0].properties.Id;

                const urlReq = `/rest/213963628/ems/Request?filter=(RequestedByPerson='${personId}')&layout=Id,PhaseId,DisplayLabel,Description,CreateTime&size=50&order=CreateTime desc`;
                const resReq = await fetch(urlReq, { headers: { 'Accept': 'application/json' } });
                const dataReq = await resReq.json();

                const ticketIdAtual = window.location.href.match(/\/saw\/Request\/(\d+)/)?.[1];
                const chamadosFiltrados = dataReq.entities.filter(t => t.properties.Id !== ticketIdAtual);

                if (chamadosFiltrados.length === 0) {
                    dropdown.innerHTML = `<div style="padding: 13px; text-align: center; color: #27ae60;">Nenhum outro chamado.</div>`;
                    return;
                }

                let htmlList = `
                  <div style="background: #f8f9fa; padding: 10px 16px; border-bottom: 1px solid #ddd; color: #333; display: flex; justify-content: space-between; align-items: center;">
                      <span>Histórico (${chamadosFiltrados.length} encontrados)</span>
                      <button id="close-radar-dropdown" style="background: transparent; border: none; font-size: 16px; cursor: pointer; color: #666; line-height: 1;" title="Fechar">&times;</button>
                  </div>
                  <div style="max-height: 350px; overflow-y: auto;">
              `;

                chamadosFiltrados.forEach(ticket => {
                    const id = ticket.properties.Id;
                    const tituloOriginal = ticket.properties.DisplayLabel || "Sem título";
                    const temMalware = /malware/i.test(tituloOriginal);
                    const titulo = temMalware ? `[MALWARE] ${tituloOriginal}` : tituloOriginal;
                    const faseRaw = ticket.properties.PhaseId || "";

                    let descHtml = ticket.properties.Description || "";
                    let descLimpa = htmlToText(descHtml).replace(/\s+/g, ' ').trim();
                    if (descLimpa.length > 100) descLimpa = descLimpa.substring(0, 100) + '...';

                    const fase = tradutorFases[faseRaw] || faseRaw;

                    let faseColor = '#aed6f1';
                    let faseText = '#2980b9';

                    if (fase === 'Fechado' || fase === 'Abandonado') {
                        faseColor = '#bdc3c7'; faseText = '#555';
                    } else if (fase === 'Rejeitado' || fase === 'Aguardando aceite') {
                        faseColor = '#fdebd0'; faseText = '#8e44ad';
                    } else if (fase === 'Log' || fase === 'Classify') {
                        faseColor = '#fcf3cf'; faseText = '#d35400';
                    }

                    htmlList += `
                      <div style="padding: 11px 13px; border-bottom: 1px solid #eee; display: flex; flex-direction: column; gap: 6px; transition: background 0.2s;" onmouseover="this.style.background='#f1f9ff'" onmouseout="this.style.background='#fff'">
                          <div style="display: flex; justify-content: space-between; align-items: center;">
                              <a href="https://suporte.tjsp.jus.br/saw/Request/${id}/general" target="_blank" style="color: #0073e7; text-decoration: none;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">#${id}</a>
                              <span style="background: ${faseColor}; color: ${faseText}; padding: 2px 6px; border-radius: 2px; border: 1px solid ${faseText}40;">${fase}</span>
                          </div>
                          <div style="color: ${temMalware ? '#e74c3c' : '#2c3e50'}; font-weight: ${temMalware ? '600' : 'normal'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${tituloOriginal}">${titulo}</div>
                          <div style="color: #7f8c8d; line-height: 1.4;"><i>"${descLimpa || 'Sem descrição'}"</i></div>
                      </div>
                  `;
                });

                htmlList += `</div>`;
                dropdown.innerHTML = htmlList;

                dropdown.querySelector('#close-radar-dropdown').onclick = (ev) => {
                    ev.stopPropagation();
                    dropdown.style.display = 'none';
                }

            } catch (e) {
                dropdown.innerHTML = `<div style="padding: 15px; text-align: center; color: #e74c3c;">Erro ao buscar API.</div>`;
            }
        };

        personItem.insertAdjacentElement('afterend', btnRadar);
        personItem.dataset.radarAdded = '1';
    }

    //  RADAR DE REJEITADOS
    let smaxLastRadarLocation = null; // Memória da tela atual
    let smaxPersonIdCache = ""; // Guarda o RG Oculto do analista atual
    let smaxCurrentAssigneeCache = ""; // Guarda o nome para saber se você trocou de pessoa no menu

    async function scanGridForRevisar() {
        // Se o motor do radar OU o botão do cabeçalho estiver desligado, esconde tudo
        if (!CONFIG.features.enableRadarRevisar || !CONFIG.features.enableHeaderRadar) {
            document.getElementById('header-radar-badge')?.style.setProperty('display', 'none');
            document.getElementById('header-notification-dropdown')?.style.setProperty('display', 'none');
            return;
        }

        const settings = loadSettings();
        const analistaObj = CONFIG.analistas.find(a => a.matricula === settings.assignee || a.nome === settings.assignee) || CONFIG.analistas.find(a => a.matricula === "381504");
        if (!analistaObj || !analistaObj.nome) return;

        // LÊ A URL ATUAL: Estamos num chamado específico ou na grade?
        const matchUrl = window.location.href.match(/\/saw\/Request\/(\d+)/);
        const localAtual = matchUrl ? matchUrl[1] : "grade_smax";

        let forcarBusca = false;

        // MUDOU DE ANALISTA? Força a atualização na hora
        if (smaxCurrentAssigneeCache !== analistaObj.nome) {
            smaxPersonIdCache = "";
            smaxCurrentAssigneeCache = analistaObj.nome;
            forcarBusca = true;

            // Zera a bolinha instantaneamente para não misturar os chamados antigos
            rejeitadosDetectados.clear();
            prontosDetectados.clear();
            atualizarRadarUI();
        }

        // TRAVA DE SEGURANÇA: Se não trocou de analista E a URL é a mesma de antes, ABORTA
        if (!forcarBusca && smaxLastRadarLocation === localAtual) {
            return;
        }

        // Atualiza a memória de navegação para a próxima verificação
        smaxLastRadarLocation = localAtual;

        try {
            // PASSO 1: Descobre o RG Oculto do novo analista (Seguro contra duplicatas inativas)
            if (!smaxPersonIdCache) {
                if (analistaObj.matricula === "372335") {
                    smaxPersonIdCache = "28428300"; // Hardcode de segurança
                } else {
                    let urlPerson = `/rest/213963628/ems/Person?filter=Upn='${analistaObj.matricula}'&layout=Id&size=1`;
                    let resPerson = await fetch(urlPerson, { headers: { 'Accept': 'application/json' } });
                    if (!resPerson.ok) return;
                    let dataPerson = await resPerson.json();

                    // Se não achar pela matrícula, tenta pelo nome como plano B
                    if (!dataPerson.entities || dataPerson.entities.length === 0) {
                        urlPerson = `/rest/213963628/ems/Person?filter=Name='${encodeURIComponent(analistaObj.nome)}'&layout=Id&size=1`;
                        resPerson = await fetch(urlPerson, { headers: { 'Accept': 'application/json' } });
                        dataPerson = await resPerson.json();
                    }

                    if (dataPerson.entities && dataPerson.entities.length > 0) {
                        smaxPersonIdCache = dataPerson.entities[0].properties.Id;
                    } else {
                        return; // Aborta silenciosamente
                    }
                }
            }

            // PASSO 2: Busca APENAS Revisar ou Aceitar. Limite expandido para 500 para evitar que chamados fiquem ocultos
            const urlReq = `/rest/213963628/ems/Request?filter=(ExpertAssignee='${smaxPersonIdCache}' and (PhaseId='Review' or PhaseId='Accept'))&layout=Id,PhaseId,Status&size=500&order=Id desc`;
            const resReq = await fetch(urlReq, { headers: { 'Accept': 'application/json' } });

            if (!resReq.ok) return;
            const dataReq = await resReq.json();

            const novosRejeitados = new Set();
            const novosProntos = new Set();

            dataReq.entities.forEach(ticket => {
                const fase = (ticket.properties.PhaseId || "").toUpperCase();
                const status = (ticket.properties.Status || "").toUpperCase();
                const id = ticket.properties.Id;

                // 🔴 Regra 1: Chamados Rejeitados
                if (fase === "REVIEW" || fase === "REVISAR") {
                    novosRejeitados.add(id);
                }
                // 🟠 Regra 2: Chamados no Aceite com Status "Pronto/Ready"
                else if ((fase === "ACCEPT" || fase === "ACEITAR" || fase === "AGUARDANDO ACEITE") && (status.includes("READY") || status.includes("PRONTO"))) {
                    novosProntos.add(id);
                }
            });

            // Atualiza a memória e a interface
            rejeitadosDetectados = novosRejeitados;
            prontosDetectados = novosProntos;
            atualizarRadarUI();

        } catch (e) {
            // Em caso de erro (ex: internet piscou), ignora sem cuspir erro na tela
        }
    }

    function applyAutoHeightComments() {
        if (CONFIG.features.enableAutoHeightComments) {
            document.body.classList.add('smax-auto-comments');
        } else {
            document.body.classList.remove('smax-auto-comments');
        }
    }

    function checkEscalarAlert() {
        if (!CONFIG.features.enableEscalarAlert || !window.location.href.includes('/saw/Request/')) {
            document.getElementById('smax-escalar-badge')?.remove();
            return;
        }

        const container = document.querySelector('.overview-buttons-container');
        if (!container) return;

        const escalateLink = document.querySelector('a[target-phase-id="Escalate"]');

        // Só mostra se o link de escalar existir e não estiver escondido
        if (escalateLink && !escalateLink.closest('.ng-hide') && !escalateLink.closest('.hide')) {
            let badge = document.getElementById('smax-escalar-badge');
            if (!badge) {
                badge = document.createElement('button'); // Mudado para button para melhor acessibilidade
                badge.id = 'smax-escalar-badge';
                badge.type = 'button';

                // Estilo: Amarelo SMAX, pulsante e com cursor de clique
                badge.style.cssText = 'background: #f1c40f; color: #2c3e50; padding: 0 10px; border-radius: 4px; font-size: 11px; font-weight: bold; margin-right: 10px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; border: 1px solid #333333; animation: blinker 2s linear infinite; font-family: Inter, sans-serif; transition: transform 0.1s; height: 28px; align-self: center; min-height: 28px; max-height: 28px; width: auto;';badge.innerHTML = 'ESCALAR';
                badge.title = "Clique aqui para escalar (N2) este chamado.";

                // Efeito de clique visual
                badge.onmousedown = () => badge.style.transform = 'scale(0.95)';
                badge.onmouseup = () => badge.style.transform = 'scale(1)';

                // Ao clicar, chama a função de escalonamento original
                badge.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    doEscalate();
                };

                container.prepend(badge);

                if (!document.getElementById('smax-blink-style')) {
                    const style = document.createElement('style');
                    style.id = 'smax-blink-style';
                    style.innerHTML = '@keyframes blinker { 50% { opacity: 0.7; } }';
                    document.head.appendChild(style);
                }
            }
        } else {
            document.getElementById('smax-escalar-badge')?.remove();
        }
    }

    // Memória invisível para não sobrecarregar a API com buscas repetidas
    let followersCacheForTicket = { id: null, names: [], status: 'idle' };

    function checkFollowerAlert() {
        if (!window.location.href.includes('/saw/Request/')) {
            document.getElementById('smax-follower-badge')?.remove();
            return;
        }

        const currentTicket = window.location.href.match(/\/saw\/Request\/(\d+)/)?.[1];
        if (!currentTicket) return;

        if (followersCacheForTicket.id !== currentTicket) {
            followersCacheForTicket = { id: currentTicket, names: [], status: 'loading' };
            fetch(`/rest/213963628/ems/Request/${currentTicket}/associations/FollowedByUsers?layout=Name`, { headers: { 'Accept': 'application/json' } })
                .then(res => res.json())
                .then(data => {
                followersCacheForTicket.names = data.entities?.map(e => e.properties.Name) || [];
                followersCacheForTicket.status = followersCacheForTicket.names.length > 0 ? 'found' : 'empty';
            });
            return;
        }

        const container = document.querySelector('.overview-buttons-container');
        if (!container) return;

        let badge = document.getElementById('smax-follower-badge');

        if (followersCacheForTicket.status === 'found') {
            if (!badge) {
                badge = document.createElement('span');
                badge.id = 'smax-follower-badge';

                badge.style.cssText = 'background: #2c3e50; color: #fff; padding: 0 10px; border-radius: 4px; font-size: 11px; font-weight: bold; margin-right: 10px; display: inline-flex; align-items: center; justify-content: center; cursor: help; border: 1px solid #1a252f; font-family: Inter, sans-serif; height: 28px; min-height: 28px; max-height: 28px; align-self: center; box-sizing: border-box;';

                badge.innerHTML = `👀 ${followersCacheForTicket.names.length}`;
                badge.title = `Seguidores: ${followersCacheForTicket.names.join(', ')}`;

                container.prepend(badge);
            }
        } else {
            badge?.remove();
        }
    }

    function moveAttachmentsIntoForm() {
        const attachments = document.querySelector('div.pl-entity-page-component[data-aid="attachments"]');
        const form = document.querySelector('ng-form[name="form"]');
        if (!attachments || !form) return;

        attachments.style.display = '';

        // 1. Move a aba de anexos para o topo do formulário
        if (attachments.parentNode !== form || form.firstElementChild !== attachments) {
            form.insertBefore(attachments, form.firstElementChild);
        }

        // 2. AUTO-EXPANDIR: Verifica se a aba está fechada (aria-expanded="false") e clica para abrir
        const headerContainer = attachments.querySelector('.pl-entity-page-component-header[aria-expanded="false"]');
        if (headerContainer) {
            // Busca o wrapper interno clicável (do HTML que você me mandou) ou clica no próprio container
            const clickableArea = headerContainer.querySelector('.pl-entity-page-component-header-inner-wrapper') || headerContainer;
            simulateClick(clickableArea);
        }
    }

    function applyAttachmentsFix() {
        document.querySelectorAll('a[href*="/rest/"][href*="file-list"]').forEach(link => {
            if (link.hasAttribute('ng-click')) link.removeAttribute('ng-click'); if (link.hasAttribute('download')) link.removeAttribute('download'); link.setAttribute('target', '_blank');
        });
    }

    function initAttachmentsPreview() {
        if (!CONFIG.features.enableAttachmentsPreview) return;
        document.addEventListener('click', (e) => {
            const attachLink = e.target.closest('a[href*="/rest/"][href*="file-list"]');
            if (attachLink) {
                e.preventDefault(); e.stopImmediatePropagation();
                const url = attachLink.href; const nomeArquivo = attachLink.textContent.toLowerCase();
                if (url.match(/\.(jpeg|jpg|gif|png)$/i) || nomeArquivo.match(/\.(jpeg|jpg|gif|png)$/i)) {
                    let modal = document.getElementById('smax-img-preview');
                    if (!modal) {
                        modal = document.createElement('div'); modal.id = 'smax-img-preview'; modal.className = 'tmPreviewModal';
                        modal.innerHTML = `<span class="tmPreviewClose">✖</span><img class="tmPreviewImg" src="">`; document.body.appendChild(modal);
                        modal.querySelector('.tmPreviewClose').onclick = () => modal.style.display = 'none'; modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
                    }
                    modal.querySelector('img').src = url; modal.style.display = 'flex';
                }
                else if (url.match(/\.(pdf)$/i) || nomeArquivo.match(/\.(pdf)$/i)) openPdfInNewTab(url, attachLink);
                else window.open(url, '_blank');
            }
        }, true);
    }

    async function openPdfInNewTab(url, linkElement) {
        const originalText = linkElement.textContent; linkElement.innerHTML = `<i>Abrindo PDF...</i>`; linkElement.style.pointerEvents = 'none';
        const novaAba = window.open('about:blank', '_blank');
        try { const response = await fetch(url); const blob = await response.blob(); novaAba.location.href = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' })); }
        catch (err) { novaAba.close(); window.open(url, '_blank'); }
        finally { linkElement.textContent = originalText; linkElement.style.pointerEvents = 'auto'; }
    }

    function autoExpandShowMore() {
        if (!CONFIG.features.enableAutoExpandShowMore) return;
        document.querySelectorAll('a[data-aid="show-more"]').forEach(btn => {
            if (btn.offsetHeight > 0 && btn.getAttribute('aria-label') === 'Mostrar mais' && btn.dataset.smaxClicked !== '1') {
                btn.dataset.smaxClicked = '1'; simulateClick(btn); setTimeout(() => { if(btn) btn.dataset.smaxClicked = '0'; }, 2000);
            }
        });
    }

    function autoCollapseSccd() {
        const match = window.location.href.match(/\/saw\/Request\/(\d+)/);
        if (!match) { sccdProcessedForTicket = null; return; }
        const currentTicketId = match[1];
        if (sccdProcessedForTicket === currentTicketId) return;

        const headers = document.querySelectorAll('.pl-entity-page-component-header-text');
        for (let h of headers) {
            if (h.textContent.includes('Informações SCCD')) {
                const headerContainer = h.closest('[aria-expanded]') || h.closest('.pl-entity-page-component-header');
                if (headerContainer && headerContainer.getAttribute('aria-expanded') === 'true') simulateClick(headerContainer);
                sccdProcessedForTicket = currentTicketId; break;
            }
        }
    }

    // =========================================================================
    // AUTOMAÇÃO DE PREENCHIMENTO E AÇÕES SMAX
    // =========================================================================
    function getUserTypeFromScreen() {
        const typeEl = document.querySelector('#withoutResolution_TipoUsuarioExt_c');
        if (typeEl) {
            const text = typeEl.textContent.toLowerCase();
            if (text.includes('pf') || text.includes('jus postulandi')) return 'PF';
            if (text.includes('advogado')) return 'Advogado';
        }
        const labelEl = Array.from(document.querySelectorAll('span.label-text, label')).find(l => l.textContent.includes('Tipo Usuário'));
        if (labelEl) {
            const container = labelEl.closest('.form-field-container') || labelEl.closest('.pl-prop-control') || labelEl.parentNode.parentNode;
            if (container) {
                const text = container.textContent.toLowerCase();
                if (text.includes('pf') || text.includes('jus postulandi')) return 'PF';
                if (text.includes('advogado')) return 'Advogado';
            }
        }
        return null;
    }

    async function fillSelect2ByExactLabel(labelText, targetValueText, maxWaitMs = 8000) {
        let labelEl = null; let tempoGasto = 0; const intervalo = 300;
        const normalizedSearch = labelText.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

        while (tempoGasto < maxWaitMs) {
            labelEl = Array.from(document.querySelectorAll('label, span.label-text, div.control-label')).find(l => l.textContent.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '').includes(normalizedSearch));
            if (labelEl) {
                if (labelEl.offsetHeight === 0) {
                    const sectionHeader = labelEl.closest('.form-section')?.querySelector('.pl-entity-page-component-header');
                    if (sectionHeader && sectionHeader.getAttribute('aria-expanded') === 'false') { simulateClick(sectionHeader); await sleep(300); }
                }
                if (labelEl.offsetHeight > 0) break;
            }
            await sleep(intervalo); tempoGasto += intervalo;
        }
        if (!labelEl || labelEl.offsetHeight === 0) return false;

        const containerWrapper = labelEl.closest('.form-group, .pl-prop-control, .form-field-container, .platform-dynamic-form-field-wrapper, .field-container') || labelEl.parentNode;
        if (!containerWrapper) return false;
        const container = containerWrapper.querySelector('.select2-container a');
        if (!container) return false;

        const chosenText = container.textContent.trim().toUpperCase();
        if (chosenText === targetValueText.trim().toUpperCase() || chosenText.includes(targetValueText.trim().toUpperCase())) return true;

        simulateClick(container); await sleep(200);
        const searchInput = document.querySelector('#select2-drop input.select2-input');
        if (searchInput && searchInput.offsetParent !== null) {
            searchInput.value = targetValueText;
            ['input', 'change'].forEach(e => searchInput.dispatchEvent(new Event(e, { bubbles: true })));
            searchInput.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'a' }));
            await sleep(800);
        }
        for (const opt of document.querySelectorAll('#select2-drop .select2-results .select2-result-selectable, #select2-drop .select2-results .select2-result-label')) {
            if (opt.textContent.trim().toUpperCase() === targetValueText.trim().toUpperCase()) {
                simulateClick(opt); const inner = opt.querySelector('.select2-result-label') || opt; if (inner !== opt) simulateClick(inner);
                await sleep(300); return true;
            }
        }
        simulateClick(document.body); return false;
    }

    function normalizarTextoBasico(texto) {
        return (texto || "")
            .toString()
            .replace(/[º°]/g, "o")
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[-_/]+/g, ' ')
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function capturarDescricaoChamado() {
        const descEdit = document.querySelector('div.cke_wysiwyg_div[aria-label="Descrição"]');
        const descView = document.querySelector('.field-name-Description .pl-rich-text-viewer, div[data-aid="Description"]');

        if (descEdit && descEdit.textContent.trim().length > 0) return descEdit.textContent.trim();
        if (descView && descView.textContent.trim().length > 0) return descView.textContent.trim();
        return "";
    }

    // =========================================================================
    // CLASSIFICAÇÃO DA FUNCIONALIDADE (botão "Corrigir")
    //
    // Três mudanças em relação à versão anterior:
    //
    // 1. CASAMENTO POR PALAVRA INTEIRA. Antes era `texto.includes(termo)`, que
    //    dava falso positivo silencioso: "pin" casava dentro de "opinião",
    //    "cna" dentro de "cnas", "evento" dentro de "eventualmente". Um chamado
    //    que só dissesse "na minha opinião" já pontuava em Login/2FA.
    //
    // 2. VOCABULÁRIO MUITO MAIOR, com sufixo `*` para radical
    //    ("peticion*" cobre peticionar/peticionamento/peticionei).
    //
    // 3. MODELO COMPOSTO PARA PETICIONAMENTO. As seis categorias de
    //    peticionamento são um produto cartesiano {Inicial, Intermediário} ×
    //    {1º Grau, 2º Grau, Colégio Recursal}. Em vez de seis listas soltas que
    //    competiam entre si, detectamos os eixos separadamente e combinamos.
    //    É de onde vem a maior parte da queda no fallback.
    // =========================================================================

    const ARIA_FALLBACK_FUNC = "Outras Funcionalidades";

    // Precisa bater EXATAMENTE com as opções do campo "Indique uma das
    // funcionalidades" no SMAX — fillSelect2ByExactLabel compara pelo rótulo.
    const ARIA_PRIORIDADE_FUNC = [
        "Login e Senha, Certificado Digital e Autenticação de 2 Fatores (2FA)",
        "Cadastro de Usuários",
        "Peticionamento Inicial de 2º Grau",
        "Peticionamento Inicial no Colégio Recursal",
        "Peticionamento Inicial de 1º Grau",
        "Peticionamento Intermediário de 2º Grau",
        "Peticionamento Intermediário no Colégio Recursal",
        "Peticionamento Intermediário de 1º Grau",
        "Consulta e Abertura de Prazos",
        "Consulta e Relatório de Processos",
        "Painel do Usuário",
        "Alteração de Dados Cadastrais",
        ARIA_FALLBACK_FUNC
    ];

    let ariaCacheRegexTermo = null;

    // `termo*` casa o radical; sem asterisco, casa a palavra inteira admitindo
    // plural simples. Em ambos os casos respeitando limites de palavra.
    function ariaRegexTermo(termo) {
        if (!ariaCacheRegexTermo) ariaCacheRegexTermo = new Map();
        if (ariaCacheRegexTermo.has(termo)) return ariaCacheRegexTermo.get(termo);

        const radical = termo.endsWith('*');
        const base = normalizarTextoBasico(radical ? termo.slice(0, -1) : termo);

        let regex = null;

        if (base) {
            const escapado = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const cauda = radical ? '[a-z0-9]*' : '(?:s|es)?';
            regex = new RegExp(`(?:^|\\s)${escapado}${cauda}(?:\\s|$)`);
        }

        ariaCacheRegexTermo.set(termo, regex);
        return regex;
    }

    function ariaTextoContemTermo(textoNormalizado, termo) {
        const regex = ariaRegexTermo(termo);
        return Boolean(regex && regex.test(textoNormalizado));
    }

    function ariaPesoTermo(termo) {
        const base = normalizarTextoBasico(termo.replace(/\*$/, ''));
        const palavras = base.split(' ').filter(Boolean).length;

        if (palavras >= 4 || base.length >= 28) return 10;
        if (palavras === 3 || base.length >= 18) return 7;
        if (palavras === 2 || base.length >= 11) return 4;
        return 2;
    }

    function ariaDicionarioFuncionalidades() {
        return {
            "Alteração de Dados Cadastrais": [
                "alterar dado*", "alteracao de dado*", "atualizar dado*", "atualizar cadastro",
                "atualizacao cadastral", "dados desatualizado*", "dado cadastral", "dados cadastrais",
                "alterar endereco", "mudanca de endereco", "endereco desatualizado",
                "alterar e mail", "trocar e mail", "e mail desatualizado", "e mail errado",
                "nao recebo e mail", "nao recebe e mail", "alterar telefone", "atualizar telefone",
                "alterar celular", "alterar senha pessoal", "trocar minha senha",
                "perfil do usuario", "meus dados", "meu cadastro", "preferencia*",
                "grupos de preferencias", "nome social", "corrigir nome", "nome errado",
                "alterar nome", "transferencia de seccional", "mudanca de seccional",
                "atualizar oab", "alterar oab", "inicializacao do sistema", "tela de inicializacao"
            ],

            "Login e Senha, Certificado Digital e Autenticação de 2 Fatores (2FA)": [
                "login", "logar", "senha", "nao consigo entrar", "nao consigo acessar",
                "nao consigo logar", "acesso negado", "usuario bloqueado", "conta bloqueada",
                "usuario invalido", "usuario nao autorizado", "cpf nao cadastrado",
                "muitas tentativas", "bloqueio por taxa de acesso", "sessao expirada",
                "recuperar senha", "redefinir senha", "esqueci a senha", "senha expirada",
                "senha bloqueada", "alterar minha senha de acesso",
                "certificado digital", "certificado", "certificado a1", "certificado a3",
                "certificado expirado", "certificado vencido", "cadeia de certificacao",
                "icp brasil", "token", "cartao criptografico", "leitora", "pin do certificado",
                "puk", "driver do certificado", "assinador", "assinador digital", "web signer",
                "websigner", "shodo", "java", "certificado sso", "certificado nao aparece",
                "certificado nao e reconhecido", "nao reconhece o certificado",
                "2fa", "dois fatores", "duas etapas", "dupla etapa", "autenticacao em dois fatores",
                "verificacao em duas etapas", "codigo de verificacao", "codigo invalido",
                "authenticator", "microsoft authenticator", "google authenticator", "authy",
                "qr code", "qrcode", "cookie*", "cookie nao encontrado",
                "gov br", "login gov br", "conta gov br", "sso"
            ],

            "Cadastro de Usuários": [
                "cadastrar no eproc", "cadastro no eproc", "nao sou cadastrado", "nao estou cadastrado",
                "cadastrar advogado", "cadastro de advogado", "credenciamento",
                "cadastro nacional da ordem de advogados do brasil", "cna",
                "oab nao esta cadastrada", "oab nao cadastrada", "oab suplementar",
                "nao foi localizado usuario com esta identificacao",
                "cadastro jus postulandi", "cadastro de entidade", "cadastro de pessoa fisica",
                "cadastro de pessoa juridica", "associacao de usuario a entidade",
                "associar assistente ao advogado", "vincular assistente", "vinculacao de perfil",
                "vincular perfil", "desativacao de usuario", "usuario inativo", "reativar usuario",
                "procurador chefe", "gerenciamento de usuarios", "unidade externa",
                "usuarios da unidade externa", "sociedade de advogados",
                "escritorio de pratica juridica", "estagiario", "assistente de advogado",
                "perito nao cadastrado", "cadastro de perito", "auxiliar nao cadastrado",
                "cadastro de auxiliar", "matricula", "novo usuario", "criar usuario",
                "solicito cadastro", "solicitacao de cadastro", "perfil de acesso",
                "nao tenho perfil", "perfil errado", "procuradoria"
            ],

            "Consulta e Abertura de Prazos": [
                "prazo*", "abertura de prazo", "abrir prazo", "reabrir prazo", "prazo nao abriu",
                "prazo nao aberto", "contagem de prazo", "prazo vencido", "prazo em dobro",
                "prorrogacao de prazo", "suspensao de prazo", "decurso", "decurso de prazo",
                "intimacao", "intimacoes", "nao fui intimado", "nao recebi intimacao",
                "intimacao eletronica", "citacao", "citacao eletronica", "ciencia",
                "dar ciencia", "tomar ciencia", "manifestacao das partes",
                "domicilio judicial eletronico", "diario judicial eletronico",
                "diario eletronico", "djen", "comunicacao processual", "expediente",
                "feriado*", "suspensao forense", "gerenciamento de feriados"
            ],

            "Consulta e Relatório de Processos": [
                "consulta processual", "consultar processo", "consulta de processo",
                "processo nao localizado", "nao encontro o processo", "nao localizo o processo",
                "processo nao aparece", "acesso aos autos", "integra dos autos", "autos digitais",
                "download integral", "baixar os autos", "download dos autos", "baixar o processo",
                "chave de acesso", "chave do processo", "processo sigiloso", "segredo de justica",
                "nivel de sigilo", "consulta publica", "relatorio*", "relatorio de processo*",
                "relatorio unificado", "arvore do processo", "arvore", "eventos do processo",
                "documentos do processo", "visualizar documento", "nao abre o documento",
                "documento nao abre", "pdf nao abre", "erro ao baixar", "capa do processo",
                "partes do processo", "movimentacao processual", "acompanhamento processual",
                "processos relacionados", "visualizacao dos autos", "consulta de documento"
            ],

            "Painel do Usuário": [
                "painel", "painel do usuario", "painel do advogado", "painel do procurador",
                "minhas tarefas", "localizador*", "favorito*", "tela inicial", "menu inicial",
                "pagina inicial", "notificacao*", "pendencia*", "meus processos",
                "lista de processos", "filtro do painel", "nao aparece no painel",
                "sumiu do painel", "quadro de avisos", "mural"
            ],

            "Peticionamento Inicial de 1º Grau": [
                "peticao inicial", "protocolo inicial", "peticionamento inicial",
                "distribuir acao", "distribuir processo", "distribuicao de acao",
                "ajuizar", "ajuizamento", "nova acao", "propor acao", "processo novo",
                "abrir processo", "desconsideracao da personalidade juridica",
                "embargos a execucao", "embargos de terceiro", "execucao de titulo extrajudicial",
                "carta precatoria", "classe processual", "assunto processual",
                "escolha da competencia", "prevencao", "juizado especial civel",
                "juizado especial da fazenda", "vara civel", "peticao inicial nao anexa"
            ],

            "Peticionamento Intermediário de 1º Grau": [
                "peticionamento intermediario", "peticao intermediaria", "juntar peticao",
                "juntada", "juntar documento", "anexar documento", "anexar arquivo",
                "anexar peticao", "peticionar no processo", "peticionar nos autos",
                "peticao movimentacao", "movimentar o processo", "evento*",
                "substabelecimento", "habilitacao", "habilitar advogado", "procuracao",
                "renuncia", "revogacao de procuracao", "contestacao", "replica",
                "impugnacao", "manifestacao nos autos", "cumprimento de sentenca",
                "apelacao", "recurso de apelacao", "embargos de declaracao",
                "arquivo muito grande", "tamanho do arquivo", "erro ao anexar",
                "formato do arquivo", "pdf invalido", "tipo de documento",
                "nao consigo peticionar", "peticao nao juntou", "peticao nao foi juntada"
            ],

            "Peticionamento Inicial de 2º Grau": [
                "agravo de instrumento", "mandado de seguranca", "habeas corpus",
                "acao rescisoria", "conflito de competencia", "reclamacao",
                "inicial de 2o grau", "inicial de segundo grau", "peticao inicial no tribunal",
                "distribuicao no 2o grau", "distribuir no tribunal", "protocolar no tribunal"
            ],

            "Peticionamento Intermediário de 2º Grau": [
                "intermediaria de 2o grau", "intermediario de 2o grau",
                "intermediaria de segundo grau", "peticionar no 2o grau",
                "peticionar no tribunal", "juntar peticao no agravo",
                "manifestacao no 2o grau", "contrarrazoes", "memoriais", "sustentacao oral",
                "processo no tribunal", "desembargador", "camara julgadora", "relator"
            ],

            "Peticionamento Inicial no Colégio Recursal": [
                "recurso inominado", "colegio recursal", "turma recursal",
                "inicial no colegio recursal", "distribuicao colegio recursal",
                "interpor recurso inominado"
            ],

            "Peticionamento Intermediário no Colégio Recursal": [
                "intermediaria no colegio recursal", "peticionar no colegio recursal",
                "juntar peticao colegio recursal", "manifestacao colegio recursal",
                "contrarrazoes ao recurso inominado"
            ]
        };
    }

    // -------------------------------------------------------------------------
    // Modelo composto do peticionamento
    // -------------------------------------------------------------------------
    const ARIA_PETIC_SINAIS = {
        acao: [
            "peticion*", "peticao", "peticoes", "protocol*", "juntar", "juntada",
            "anexar", "distribuir", "distribuicao", "ajuizar", "ajuizamento",
            "recurso", "recorrer", "interpor", "manifestacao", "manifestar",
            "contestacao", "embargos", "agravo", "apelacao", "impugnacao"
        ],
        inicial: [
            "peticao inicial", "protocolo inicial", "peticionamento inicial", "inicial",
            "distribuir", "distribuicao", "ajuizar", "ajuizamento", "nova acao",
            "propor acao", "processo novo", "abrir processo", "primeira peticao",
            "acao rescisoria", "conflito de competencia", "agravo de instrumento",
            "mandado de seguranca", "habeas corpus", "recurso inominado",
            "embargos a execucao", "embargos de terceiro", "carta precatoria"
        ],
        intermediario: [
            "peticionamento intermediario", "peticao intermediaria", "juntar", "juntada",
            "anexar", "nos autos", "no processo", "processo ja existente",
            "substabelecimento", "habilitacao", "procuracao", "contestacao", "replica",
            "impugnacao", "cumprimento de sentenca", "apelacao", "embargos de declaracao",
            "contrarrazoes", "memoriais", "evento*", "movimentar"
        ],
        segundoGrau: [
            "2o grau", "segundo grau", "segunda instancia", "tribunal de justica",
            "tribunal", "desembargador", "camara", "relator", "agravo de instrumento",
            "acao rescisoria", "conflito de competencia", "mandado de seguranca",
            "habeas corpus", "sustentacao oral", "memoriais"
        ],
        colegioRecursal: [
            "colegio recursal", "turma recursal", "recurso inominado"
        ],
        primeiroGrau: [
            "1o grau", "primeiro grau", "primeira instancia", "vara", "juizado especial",
            "juizado especial civel", "juizado especial da fazenda", "vara civel", "juiz"
        ]
    };

    function ariaPontuarSinais(textoNormalizado, termos) {
        let total = 0;
        let quantos = 0;

        for (const termo of termos) {
            if (ariaTextoContemTermo(textoNormalizado, termo)) {
                total += ariaPesoTermo(termo);
                quantos += 1;
            }
        }

        return { total, quantos };
    }

    // Devolve a categoria de peticionamento mais provável, ou null se o texto
    // não fala de peticionar coisa nenhuma.
    function ariaAnalisarPeticionamento(textoNormalizado) {
        const acao = ariaPontuarSinais(textoNormalizado, ARIA_PETIC_SINAIS.acao);
        if (acao.total < 2) return null;

        const colegio = ariaPontuarSinais(textoNormalizado, ARIA_PETIC_SINAIS.colegioRecursal);
        const segundo = ariaPontuarSinais(textoNormalizado, ARIA_PETIC_SINAIS.segundoGrau);
        const primeiro = ariaPontuarSinais(textoNormalizado, ARIA_PETIC_SINAIS.primeiroGrau);

        let grau = "1º Grau";
        let pontosGrau = primeiro.total;

        // O colégio recursal é mencionado por nome; quando aparece, ganha.
        if (colegio.total > 0) {
            grau = "Colégio Recursal";
            pontosGrau = colegio.total + 4;
        } else if (segundo.total > primeiro.total && segundo.total >= 4) {
            grau = "2º Grau";
            pontosGrau = segundo.total;
        }

        const inicial = ariaPontuarSinais(textoNormalizado, ARIA_PETIC_SINAIS.inicial);
        const intermediario = ariaPontuarSinais(textoNormalizado, ARIA_PETIC_SINAIS.intermediario);

        let tipo;
        let pontosTipo;

        if (inicial.total === intermediario.total) {
            // Empate: número de processo citado indica que o processo já existe.
            const temCnj = /\b\d{7}\s?\d{2}\s?(?:19|20)\d{2}\s?\d{1,2}\s?\d{2}\s?\d{4}\b/.test(textoNormalizado);
            tipo = temCnj ? "Intermediário" : "Inicial";
            pontosTipo = 2;
        } else if (inicial.total > intermediario.total) {
            tipo = "Inicial";
            pontosTipo = inicial.total;
        } else {
            tipo = "Intermediário";
            pontosTipo = intermediario.total;
        }

        const categoria = grau === "Colégio Recursal"
            ? `Peticionamento ${tipo} no Colégio Recursal`
            : `Peticionamento ${tipo} de ${grau}`;

        if (ARIA_PRIORIDADE_FUNC.indexOf(categoria) === -1) return null;

        return {
            categoria,
            score: acao.total + pontosGrau + pontosTipo,
            sinais: [`ação:${acao.total}`, `grau:${grau}`, `tipo:${tipo}`]
        };
    }

    // -------------------------------------------------------------------------
    // Classificador
    // -------------------------------------------------------------------------
    function classificarFuncionalidadePorDicionario(textoDesc, textoTitulo = "") {
        const vazio = { funcionalidade: ARIA_FALLBACK_FUNC, score: 0, encontrados: [] };

        const descricao = normalizarTextoBasico(textoDesc);
        const titulo = normalizarTextoBasico(textoTitulo);

        if (!descricao && !titulo) return vazio;

        const completo = `${titulo} ${descricao}`.trim();
        const dicionario = ariaDicionarioFuncionalidades();

        const resultados = Object.entries(dicionario).map(([funcionalidade, termos]) => {
            const encontrados = [];
            const vistos = new Set();
            let score = 0;

            for (const termo of termos) {
                const chave = normalizarTextoBasico(termo.replace(/\*$/, ''));
                if (!chave || vistos.has(chave)) continue;
                vistos.add(chave);

                const naDescricao = descricao && ariaTextoContemTermo(descricao, termo);
                const noTitulo = titulo && ariaTextoContemTermo(titulo, termo);

                if (!naDescricao && !noTitulo) continue;

                // O título é curto e escrito pelo próprio usuário: o que aparece
                // ali costuma ser o assunto de verdade.
                score += ariaPesoTermo(termo) * (noTitulo ? 1.6 : 1);
                encontrados.push(termo);
            }

            // Variedade de termos vale mais que repetição do mesmo indício.
            if (encontrados.length > 1) score += Math.min(encontrados.length, 4);

            return { funcionalidade, score, encontrados };
        });

        const composto = ariaAnalisarPeticionamento(completo);

        if (composto) {
            const alvo = resultados.find((r) => r.funcionalidade === composto.categoria);

            if (alvo) {
                alvo.score += composto.score;
                alvo.encontrados = alvo.encontrados.concat(composto.sinais);
            }
        }

        const validos = resultados
            .filter((r) => r.score >= 4 && r.encontrados.length > 0)
            .sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return ARIA_PRIORIDADE_FUNC.indexOf(a.funcionalidade) - ARIA_PRIORIDADE_FUNC.indexOf(b.funcionalidade);
            });

        if (!validos.length) return vazio;

        return validos[0];
    }

    function descricaoIndicaPerito(textoDesc) {
        const texto = normalizarTextoBasico(textoDesc);
        if (!texto) return false;

        // Mesma correção do classificador: por palavra inteira. Antes,
        // "contador" casava dentro de "contadoria" (que é setor do tribunal,
        // não auxiliar da justiça).
        const termosPerito = [
            "perit*", "pericia", "pericial", "laudo", "laudo pericial",
            "auxiliar da justica", "auxiliar de justica", "auxiliares da justica",
            "tradutor*", "interpret*", "leiloeir*", "administrador judicial",
            "administradora judicial", "sindic*", "depositari*", "avaliador*",
            "contador judicial", "contadora judicial", "assistente tecnico",
            "nomeado perito", "nomeada perita", "nomeacao", "nomeado nos autos",
            "honorarios periciais", "honorario pericial", "cadastro de perito",
            "curador*", "partidor", "arbitrador", "corretor judicial",
            "oficial de justica", "conciliador*", "mediador*"
        ];

        return termosPerito.some(termo => ariaTextoContemTermo(texto, termo));
    }


    function obterMotivoOfertaIgnorada(textoOferta) {
        const oferta = normalizarTextoBasico(textoOferta);
        if (!oferta) return "";

        const ofertasIgnoradas = [
            { termo: "mni 3.0", motivo: "Incompatível" },
            { termo: "testes funcionalidades", motivo: "Incompatível" }
        ];

        const regra = ofertasIgnoradas.find(item => oferta.includes(normalizarTextoBasico(item.termo)));
        return regra ? regra.motivo : "";
    }

    function obterTextoOfertaAtual() {
        const seletoresOferta = [
            '#withoutResolution_RequestsOffering_container .select2-chosen',
            'div[data-aid="withoutResolution_RequestsOffering"] .select2-chosen',
            'div[data-aid="RequestsOffering"] .select2-chosen',
            '#s2id_withoutResolution_RequestsOffering .select2-chosen',
            '#withoutResolution_Offering_container .select2-chosen',
            'div[data-aid="withoutResolution_Offering"] .select2-chosen',
            'div[data-aid="Offering"] .select2-chosen',
            '#s2id_withoutResolution_Offering .select2-chosen'
        ];

        const ofertaEl = seletoresOferta
            .map(seletor => document.querySelector(seletor))
            .find(el => el && el.textContent.trim().length > 0);

        return ofertaEl ? ofertaEl.textContent.trim() : "";
    }

    function obterMotivoTituloIgnorado(textoTitulo) {
        const tituloOriginal = (textoTitulo || "").trim();
        const titulo = normalizarTextoBasico(tituloOriginal);
        if (!titulo) return "";

        if (tituloOriginal.length > 50) return "Título preservado";
        if (titulo.includes("1o grau e colegio")) return "Incompatível";
        if (titulo.includes("sugestao de ajustes")) return "Incompatível";
        if (titulo.startsWith("global")) return "Incompatível";
        if (titulo.includes("2o grau")) return "Incompatível";
        if (titulo.startsWith("testes funcionalidades")) return "Incompatível";
        if (titulo.startsWith("homologacao")) return "Incompatível";
        if (titulo.startsWith("banco de dados")) return "Incompatível";
        if (titulo.includes("mni 3 0")) return "Incompatível";

        return "";
    }

    function mostrarAvisoIgnorado(btn, motivo) {
        if (!btn) return;

        const oldText = btn.innerHTML;
        const oldBackground = btn.style.backgroundColor;
        const oldBorder = btn.style.borderColor;
        const oldColor = btn.style.color;

        btn.innerHTML = motivo ? `⚠️ Ignorado (${motivo})` : "⚠️ Ignorado";
        btn.style.backgroundColor = "#f1c40f";
        btn.style.borderColor = "#f39c12";
        btn.style.color = "#2c3e50";
        btn.disabled = true;

        setTimeout(() => {
            btn.innerHTML = oldText;
            btn.style.backgroundColor = oldBackground;
            btn.style.borderColor = oldBorder;
            btn.style.color = oldColor;
            btn.disabled = false;
        }, 2000);
    }

    async function corrigirOfertaTicket(customBtn = null) {
        // Aceita o botão contextual ou busca o antigo (caso exista)
        const btn = (customBtn instanceof HTMLElement) ? customBtn : document.getElementById('btn-contextual-oferta');

        // Ofertas preservadas não entram no fluxo de correção contextual.
        const motivoOfertaIgnorada = obterMotivoOfertaIgnorada(obterTextoOfertaAtual());
        if (motivoOfertaIgnorada) {
            mostrarAvisoIgnorado(btn, motivoOfertaIgnorada);
            return;
        }

        const titleEl = document.querySelector('input[id="withoutResolution_DisplayLabel"], input[aria-label="Título"]');
        const motivoTituloIgnorado = titleEl && !titleEl.disabled ? obterMotivoTituloIgnorado(titleEl.value) : "";
        if (motivoTituloIgnorado) {
            mostrarAvisoIgnorado(btn, motivoTituloIgnorado);
            return;
        }

        // Decide tudo que pode abortar antes de alterar qualquer campo.
        const textoDesc = capturarDescricaoChamado();
        const tituloParaAnalise = titleEl && !titleEl.disabled ? (titleEl.value || "") : "";
        const analiseLocal = classificarFuncionalidadePorDicionario(textoDesc, tituloParaAnalise);
        const funcionalidadeEscolhida = analiseLocal.funcionalidade || "Outras Funcionalidades";
        const textoTemPerito = descricaoIndicaPerito(textoDesc);

        let areaAtuacao = "";
        let isGrupoEspecialista = false;
        let isGrupoEntconv = false;
        const groupEl = document.querySelector('div[data-aid="withoutResolution_ExpertGroup"] .select2-chosen, div[data-aid="ExpertGroup"] .select2-chosen');
        if (groupEl) {
            const gText = normalizarTextoBasico(groupEl.textContent).toUpperCase().replace(/\s/g, '');
            if (gText.includes('AUXJUSTICA')) { areaAtuacao = "Peritos e Auxiliares da Justiça"; isGrupoEspecialista = true; }
            else if (gText.includes('DEFPUB')) { areaAtuacao = "Defensoria Pública"; isGrupoEspecialista = true; }
            else if (gText.includes('DELEG')) { areaAtuacao = "Delegacias"; isGrupoEspecialista = true; }
            else if (gText.includes('MINPUB')) { areaAtuacao = "Ministério Público"; isGrupoEspecialista = true; }
            else if (gText.includes('AGU')) { areaAtuacao = "AGU - Advocacia-Geral da União"; isGrupoEspecialista = true; }
            else if (gText.includes('PGE')) { areaAtuacao = "PGE - Procuradoria-Geral do Estado"; isGrupoEspecialista = true; }
            else if (gText.includes('PGM')) { areaAtuacao = "PGM - Procuradoria-Geral do Município"; isGrupoEspecialista = true; }
            else if (gText.includes('ENTCONV')) { areaAtuacao = "Outros Entes Conveniados"; isGrupoEspecialista = true; isGrupoEntconv = true; }
            else if (gText.includes('EXTRAJUDICIAL')) { areaAtuacao = "Cartórios Extrajudiciais"; isGrupoEspecialista = true; }
        }

        if (isGrupoEntconv && textoTemPerito) {
            areaAtuacao = "Peritos e Auxiliares da Justiça";
        } else if (!isGrupoEspecialista) {
            const userTypeScreen = getUserTypeFromScreen();

            if (textoTemPerito) areaAtuacao = "Peritos e Auxiliares da Justiça";
            else if (userTypeScreen === 'PF') areaAtuacao = "Jus Postulandi (Público em Geral)";
            else if (userTypeScreen === 'Advogado') areaAtuacao = "Advogados";
            else {
                mostrarAvisoIgnorado(btn, "Tipo de usuário não identificado");
                return;
            }
        }

        if(btn) {
            btn.innerHTML = "&nbsp;Pensando...";
            btn.disabled = true; // Preserva a cor nativa azul, apenas bloqueia
        }

        let houveFalha = false;

        try {
            // HIGIENIZAÇÃO DO TÍTULO
            if (titleEl && !titleEl.disabled) {
                const titleText = titleEl.value.trim(); const tLower = titleText.toLowerCase();
                const isIgnoredTitle = titleText.length > 50 || /^eproc\s+p.*?externo$/i.test(titleText) || tLower.includes("eproc público externo") || tLower.includes("eproc publico externo") || tLower.includes("1º grau e colégio") || tLower.includes("1° grau e colégio") || tLower.includes("sugestão de ajustes") || tLower.startsWith("global") || tLower.includes("2º grau") || tLower.includes("2° grau") || tLower.startsWith("testes_funcionalidades") || tLower.startsWith("homologação") || tLower.startsWith("banco de dados") || tLower.includes("mni 3.0");

                if (!isIgnoredTitle && titleText !== "") {
                    titleEl.focus();
                    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(titleEl, "eproc Público Externo");
                    ['input', 'change', 'blur'].forEach(e => titleEl.dispatchEvent(new Event(e, { bubbles: true })));
                }
            }

            if(btn) btn.innerHTML = "&nbsp;Corrigindo...";

            // PREENCHIMENTO DOS CAMPOS SMAX
            await fillSelect2ByExactLabel("Oferta", "eproc Público Externo", 6500);
            await fillSelect2ByExactLabel("Plantão Judiciário", "NÃO", 2000);

            await fillSelect2ByExactLabel("Indique sua área de atuação", areaAtuacao, 2800);
            await fillSelect2ByExactLabel("Escolha uma opção", "Orientações de uso do eproc", 2800);
            await fillSelect2ByExactLabel("Indique uma das funcionalidades", funcionalidadeEscolhida, 6500);

            // SUCESSO SILENCIOSO: Removida a tela verde. Ele vai passar direto pro bloco 'finally'

        } catch (e) {
            houveFalha = true;
            // ALERTA DE ERRO
            if(btn) {
                btn.innerHTML = "&nbsp;Falha";
                btn.style.backgroundColor = "#e74c3c";
                btn.style.borderColor = "#e74c3c";
                btn.style.color = "#ffffff";
            }
        }

        // Restaura o botão e a interface de forma limpa
        setTimeout(() => {
            if(btn) {
                if (houveFalha) {
                    btn.disabled = false;
                    return;
                }

                if (btn.id === 'btn-contextual-oferta') {
                    btn.dataset.finalizado = '1';
                    btn.style.display = 'none';
                    const labelText = btn.parentNode.querySelector('.label-text');
                    if (labelText) labelText.style.display = '';
                } else {
                    btn.innerHTML = "Corrigir";
                }

                // Limpa as cores caso tenha dado erro para restaurar ao original
                btn.style.backgroundColor = "";
                btn.style.borderColor = "";
                btn.style.color = "";
                btn.disabled = false;
            }
        }, 1000);
    }

    function initContextualOfertaButton() {
        if (!CONFIG.features.enableContextualCorrigirOferta) {
            document.getElementById('btn-contextual-oferta')?.remove();
            return;
        }
        const container = document.getElementById('withoutResolution_RequestsOffering_container');
        if (!container) return;

        const labelText = container.querySelector('.label-text');
        if (!labelText) return;

        let btn = document.getElementById('btn-contextual-oferta');

        // 1. TRAVA: Se a correção já rodou e finalizou, garante que o botão fique invisível e o texto "Oferta" visível
        if (btn && btn.dataset.finalizado === '1') {
            btn.style.display = 'none';
            labelText.style.display = '';
            return;
        }

        // Se o botão não existe, cria ele no lugar do título com a CLASSE NATIVA
        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'btn-contextual-oferta';
            btn.className = 'btn btn-primary'; // O Crachá Oficial do SMAX
            btn.type = 'button';
            btn.innerHTML = 'Corrigir';
            btn.style.marginRight = '8px'; // Apenas recuo leve para não colar

            btn.onclick = async (e) => {
                e.preventDefault(); e.stopPropagation();
                await corrigirOfertaTicket(btn);
            };

            labelText.parentNode.insertBefore(btn, labelText);
        }

        // 3. ESTADO NORMAL: Enquanto não for finalizado, oculta a palavra "Oferta" e mostra o botão
        if (btn.dataset.finalizado !== '1') {
            btn.style.display = 'inline-block';
            labelText.style.display = 'none';
        }
    }

    function initContextualConclusaoButton() {
        if (!CONFIG.features.enableContextualResolver) {
            document.getElementById('btn-contextual-conclusao')?.remove();
            return;
        }
        // 1. Encontra o texto "Código de conclusão" na tela
        let labelText = null;
        document.querySelectorAll('.label-text').forEach(el => {
            if (el.textContent.includes('Código de conclusão')) {
                labelText = el;
            }
        });
        if (!labelText) return;

        // 2. Procura a caixa de seleção ao lado dele para ver se JÁ ESTÁ preenchido
        const containerPai = labelText.closest('.field-container') || labelText.closest('.pl-prop-control') || labelText.parentNode.parentNode;
        const chosenSpan = containerPai ? containerPai.querySelector('.select2-chosen') : null;
        const concluidoAtual = chosenSpan ? chosenSpan.textContent.trim().toUpperCase() : "";

        // Verifica se já está marcado como "Incidente resolvido"
        const isJaResolvido = concluidoAtual.includes('INCIDENTE RESOLVIDO');

        let btn = document.getElementById('btn-contextual-conclusao');

        // Se já estiver resolvido, esconde o botão e volta o texto original
        if (isJaResolvido) {
            if (btn) btn.style.display = 'none';
            labelText.style.display = '';
            return;
        }

        // Se não existir o botão ainda, cria ele
        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'btn-contextual-conclusao';

            // CRACHÁ NATIVO SMAX (Tamanho grande padrão)
            btn.className = 'btn btn-primary';
            btn.type = 'button';
            btn.innerHTML = 'Resolver';
            btn.style.marginRight = '8px'; // Apenas recuo para não colar no texto

            // O CLIQUE: Chama a função automática
            btn.onclick = async (e) => {
                e.preventDefault(); e.stopPropagation();

                const textoOriginal = btn.innerHTML;

                // LOADING NATIVO (Igual ao Designar, apenas desativa e preserva a cor do sistema)
                btn.innerHTML = "&nbsp;Aplicando...";
                btn.disabled = true;

                try {
                    // Pede para o robô preencher com limite de espera de 3 segundos
                    const sucesso = await fillSelect2ByExactLabel("Código de conclusão", "Incidente resolvido", 3000);

                    if (sucesso) {
                        // SUCESSO SILENCIOSO: Remove tela verde e apenas desaparece
                        setTimeout(() => {
                            btn.style.display = 'none';
                            labelText.style.display = '';
                            btn.disabled = false;
                        }, 500);
                    } else {
                        throw new Error("Não encontrou o menu");
                    }
                } catch (e) {
                    btn.innerHTML = "&nbsp;Erro";
                    btn.style.backgroundColor = "#e74c3c"
                    btn.style.borderColor = "#e74c3c";
                    btn.style.color = "#ffffff";

                    setTimeout(() => {
                        // Restaura o visual original caso dê erro
                        btn.innerHTML = "Resolver";
                        btn.style.backgroundColor = "";
                        btn.style.borderColor = "";
                        btn.style.color = "";
                        btn.disabled = false;
                    }, 2000);
                }
            };

            labelText.parentNode.insertBefore(btn, labelText);
        }

        // Garante que o botão sobreponha o texto se a ação ainda não foi feita
        if (!btn.disabled && btn.style.display !== 'none') {
            btn.style.display = 'inline-block';
            labelText.style.display = 'none';
        }
    }

    async function doEscalate() {
        const btnBanner = document.getElementById('btn-banner-escalar'); if(btnBanner) btnBanner.innerText = "Aguarde...";
        try {
            let escalateLink = document.querySelector('a[target-phase-id="Escalate"]');
            if (!escalateLink || !(escalateLink.offsetWidth > 0)) {
                const dropdownToggle = document.querySelector('button[data-aid="dropdown-toggle"]');
                if (dropdownToggle) { simulateClick(dropdownToggle); await sleep(300); escalateLink = document.querySelector('a[target-phase-id="Escalate"]'); }
            }
            if (escalateLink) { simulateClick(escalateLink); if(escalateLink.firstChild) simulateClick(escalateLink.firstChild); await sleep(3000); } else throw new Error();
            const b = document.getElementById('smax-escalar-banner'); if(b) b.remove();
        } catch (e) { if(btnBanner) { btnBanner.innerText = "Erro"; setTimeout(() => { btnBanner.innerText = "Escalar Agora"; }, 2000); } }
    }

    async function doAssign(btn) {
        if(!btn) btn = document.getElementById('btn-contextual-assign');
        if(!btn) return;

        const textoOriginal = btn.innerHTML;

        // Visual Nativo: Apenas muda o texto e desativa (o SMAX cuida do azul e do cinza)
        btn.innerHTML = "&nbsp;Atribuindo...";
        btn.disabled = true;

        try {
            const settings = loadSettings();
            // Usa a variável correta da equipe de 1G/Público Externo
            const analistaObj = CONFIG.analistas.find(a => a.matricula === settings.assignee || a.nome === settings.assignee) || CONFIG.analistas.find(a => a.matricula === "381504");
            const targetName = analistaObj.nome; const targetMatricula = analistaObj.matricula;

            let container = document.querySelector('div[data-aid="ExpertAssignee"] .select2-container a') || document.querySelector('.entity-picker-of-ExpertAssignee')?.closest('.select2-container')?.querySelector('a');
            if (!container) throw new Error("Campo não encontrado.");

            simulateClick(container); await sleep(500);
            const searchInput = document.querySelector('#select2-drop input.select2-input');
            if (!searchInput) throw new Error("Campo busca falhou.");

            searchInput.value = targetName;
            ['input', 'change'].forEach(e => searchInput.dispatchEvent(new Event(e, { bubbles: true })));
            try { searchInput.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Enter', keyCode: 13 })); } catch(e){}

            await sleep(1500);
            const options = document.querySelectorAll('#select2-drop .select2-results .select2-result-selectable');
            let found = false; let bestOption = null;

            for (const opt of options) {
                const optText = opt.textContent.toUpperCase().trim(); const searchName = targetName.toUpperCase().trim();
                if (optText.includes(searchName) || optText.includes(targetMatricula)) {
                    if (!bestOption) bestOption = opt;
                    if (optText.includes(targetMatricula)) { bestOption = opt; break; }

                    const isExactStart = optText.startsWith(searchName);
                    const isInternal = optText.includes('@TJSP.JUS.BR');
                    const isExternal = optText.includes('EXTERNO') || optText.includes('ADVOGADO');

                    // Lógica específica do 1G
                    if (isExactStart && isInternal) { bestOption = opt; break; }
                    else if (isExactStart && !isExternal) { bestOption = opt; }
                }
            }

            if (bestOption) {
                simulateClick(bestOption);
                const inner = bestOption.querySelector('.select2-result-label');
                if (inner) simulateClick(inner);
                found = true;
            }

            // Só altera a cor (Vermelho) e o texto se NÃO encontrar (Falha)
            if (!found) {
                btn.innerHTML = "&nbsp;Falhou";
                btn.style.backgroundColor = "#e74c3c";
                btn.style.borderColor = "#e74c3c";
                btn.style.color = "#ffffff";
            }

        } catch (err) {
            // Se der erro de código ou o campo não abrir
            btn.innerHTML = "&nbsp;Erro";
            btn.style.backgroundColor = "#e74c3c";
            btn.style.borderColor = "#e74c3c";
            btn.style.color = "#ffffff";
        }

        // Aguarda 2 segundos e esconde o botão silenciosamente (ou restaura se deu erro)
        setTimeout(() => {
            if (btn.id === 'btn-contextual-assign') {
                btn.style.display = 'none';
                const labelText = btn.parentNode.querySelector('.label-text');
                if (labelText) labelText.style.display = '';
            }

            btn.style.backgroundColor = '';
            btn.style.borderColor = '';
            btn.style.color = '';
            btn.innerHTML = textoOriginal;
            btn.disabled = false;
        }, 2000);
    }

    function initContextualAssignButton() {
        if (!CONFIG.features.enableContextualDesignar) {
            document.getElementById('btn-contextual-assign')?.remove();
            return;
        }
        const container = document.querySelector('[id*="ExpertAssignee_container"]');
        if (!container) return;

        const labelText = container.querySelector('.label-text');
        if (!labelText) return;

        const settings = loadSettings();
        const analistaObj = CONFIG.analistas.find(a => a.matricula === settings.assignee || a.nome === settings.assignee) || CONFIG.analistas.find(a => a.matricula === "381504");
        const meuNome = analistaObj ? analistaObj.nome.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase() : "";

        const chosenSpan = container.querySelector('.select2-chosen');
        const designadoAtual = chosenSpan ? chosenSpan.textContent.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim() : "";

        const isAssignedToMe = designadoAtual && !designadoAtual.includes('-- SELECIONE') && designadoAtual.includes(meuNome);

        let btn = document.getElementById('btn-contextual-assign');

        if (isAssignedToMe) {
            if (btn) btn.style.display = 'none';
            labelText.style.display = '';
            return;
        }

        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'btn-contextual-assign';

            // CRACHÁ NATIVO SMAX
            btn.className = 'btn btn-primary';
            btn.type = 'button';
            btn.innerHTML = 'Designar';
            btn.style.marginRight = '8px'; // Apenas recuo para não colar no texto

            btn.onclick = async (e) => {
                e.preventDefault(); e.stopPropagation();
                await doAssign(btn);
            };

            labelText.parentNode.insertBefore(btn, labelText);
        }

        if (!btn.disabled && btn.style.display !== 'none') {
            btn.style.display = 'inline-block';
            labelText.style.display = 'none';
        }
    }

    // =========================================================================
    // BANCOS INTELIGENTES (SOLUÇÕES E DISCUSSÕES)
    // =========================================================================
    function refreshDropdownUI() {
        const selectSol = document.getElementById('smax-solution-bank-select');
        const selectDisc = document.getElementById('smax-discussion-bank-select');

        if(selectSol) {
            selectSol.innerHTML = '<option value="">-- Selecione para aplicar --</option>';
            loadTemplates(false).forEach((t, idx) => selectSol.insertAdjacentHTML('beforeend', `<option value="${idx}">${t.title}</option>`));
        }
        if(selectDisc) {
            selectDisc.innerHTML = '<option value="">-- Selecione para aplicar --</option>';
            loadTemplates(true).forEach((t, idx) => selectDisc.insertAdjacentHTML('beforeend', `<option value="${idx}">${t.title}</option>`));
        }
    }

    function insertSmartHtml(htmlContent, isDisc = false) {
        let inserted = false;
        if (typeof CKEDITOR !== 'undefined' && Object.keys(CKEDITOR.instances).length > 0) {
            for (let name in CKEDITOR.instances) {
                let editor = CKEDITOR.instances[name];
                let isMatch = false;

                if (editor.container && editor.container.$) {
                    if (isDisc) {
                        if (editor.container.$.closest('pl-entity-comment-tab, [data-aid="tab-panel-content-discussions"]')) {
                            isMatch = true;
                        }
                    } else {
                        if (editor.container.$.closest('#onlyResolution_Solution_container, [data-aid="onlyResolution_Solution"]')) {
                            isMatch = true;
                        }
                    }
                }

                if (isMatch && editor.container && editor.container.$ && editor.container.$.offsetHeight > 0) {
                    editor.insertHtml(htmlContent);
                    editor.fire('change');
                    inserted = true;
                    break;
                }
            }
        }

        if (!inserted) {
            const fallbackSelector = isDisc
            ? 'pl-entity-comment-tab .cke_wysiwyg_div'
            : '#onlyResolution_Solution_container .cke_wysiwyg_div';
            const targetDiv = document.querySelector(fallbackSelector);

            if (targetDiv) {
                targetDiv.innerHTML += htmlContent;
                ['input', 'keyup', 'change'].forEach(e => targetDiv.dispatchEvent(new Event(e, { bubbles: true })));
                inserted = true;
            }
        }

        if (!inserted) {
            alert("Não consegui encontrar a caixa de texto correta. Clique dentro dela primeiro para ativá-la!");
        }
    }

    function buildBankBar(idPrefix, titleText, isDisc) {
        const bar = document.createElement('div');
        bar.id = idPrefix + '-bar';

        bar.style.cssText = 'width: 100%; margin-bottom: 15px; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 2px; padding: 6px 12px; display: flex; align-items: center; gap: 10px; box-sizing: border-box;';

        bar.innerHTML = `
          <span style="font-family: inherit; font-size: 16px; color: #333;">${titleText}</span>
          <select id="${idPrefix}-select" style="width: auto; min-width: 200px; max-width: 260px; padding: 4px 8px; border-radius: 2px; border: 1px solid #ccc; font-family: inherit; font-size: 16px; color: #333; outline: none; background: #fff; cursor: pointer; transition: all 0.2s; height: 30px; box-sizing: border-box;">
              <option value="">-- Selecione para aplicar --</option>
          </select>
          <button id="${idPrefix}-manage" class="btn btn-primary" type="button" style="margin-left: 8px;">
              Gerenciar
          </button>
      `;

        const select = bar.querySelector('select');
        loadTemplates(isDisc).forEach((t, idx) => select.insertAdjacentHTML('beforeend', `<option value="${idx}">${t.title}</option>`));

        const btnManage = bar.querySelector('button');
        btnManage.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            openManager(isDisc);
        });

        select.addEventListener('change', async (e) => {
            e.preventDefault(); e.stopPropagation();
            if (!select.value) return;

            const idx = select.value;
            const templates = loadTemplates(isDisc);

            if (templates[idx]) {
                const selectedOption = select.options[select.selectedIndex];
                const originalText = selectedOption.text;

                try {
                    // Injeção instantânea silenciosa
                    insertSmartHtml(templates[idx].content, isDisc);
                    if (!isDisc) await fillSelect2ByExactLabel("Código de conclusão", "Incidente resolvido", 400);
                    select.value = "";
                } catch (error) {
                    const oldBg = select.style.backgroundColor;
                    const oldColor = select.style.color;
                    const oldBorder = select.style.borderColor;

                    select.style.backgroundColor = '#e74c3c';
                    select.style.color = '#ffffff';
                    select.style.borderColor = '#e74c3c';
                    selectedOption.text = 'Erro';

                    setTimeout(() => {
                        select.style.backgroundColor = oldBg;
                        select.style.color = oldColor;
                        select.style.borderColor = oldBorder;
                        selectedOption.text = originalText;
                        select.value = "";
                    }, 1500);
                }
            }
        });

        return bar;
    }

    function initContextualSolutionBank() {
        if (!CONFIG.features.enableContextualBancoSolucoes) {
            document.getElementById('btn-contextual-solution-bank')?.remove();
            return;
        }
        const container = document.getElementById('onlyResolution_Solution_container');
        if (!container || document.getElementById('smax-solution-bank-bar')) return;

        const bar = buildBankBar('smax-solution-bank', 'Soluções:', false);
        const control = container.querySelector('.control-container');
        if (control) control.insertBefore(bar, control.firstChild);
        else container.prepend(bar);
    }

    function initContextualDiscussionBank() {
        if (!CONFIG.features.enableContextualBancoDiscussao) {
            document.getElementById('btn-contextual-discussion-bank')?.remove();
            return;
        }

        const container = document.querySelector('pl-entity-comment-tab');
        if (!container || document.getElementById('smax-discussion-bank-bar')) return;

        const bar = buildBankBar('smax-discussion-bank', 'Discussões:', true);

        const editorContent = container.querySelector('.currentUserComment .editor-content');
        const commentEditorArea = container.querySelector('.currentUserComment');
        const filterArea = container.querySelector('.comment-filter');

        if (editorContent) {
            editorContent.insertBefore(bar, editorContent.firstChild);
        } else if (commentEditorArea) {
            bar.style.marginLeft = '55px';
            bar.style.width = 'calc(100% - 55px)';
            commentEditorArea.parentNode.insertBefore(bar, commentEditorArea);
        } else if (filterArea) {
            filterArea.parentNode.insertBefore(bar, filterArea.nextSibling);
        } else {
            container.prepend(bar);
        }
    }

    function openManager(isDisc) {
        isManagerDisc = isDisc;
        const existing = document.getElementById('smax-manager-modal'); if(existing) existing.remove();
        const modal = document.createElement('div'); modal.id = 'smax-manager-modal'; modal.className = 'smax-modal';

        const titleHeader = isDisc ? "Gerenciador de Textos de Discussão" : "Gerenciador de Soluções";
        const headerColor = "#0073e7";

        modal.innerHTML = `
          <div class="smax-modal-content">
              <div class="smax-modal-header" style="background: ${headerColor};">
                  <span>${titleHeader}</span>
                  <div style="display:flex; gap: 10px; align-items:center;">
                   <button id="btn-cloud-up" class="btn-cloud">☁️ Fazer Backup</button>
                   <button id="btn-cloud-down" class="btn-cloud">☁️ Baixar Backup</button>
                   <button class="smax-close-btn" id="smax-manager-close" style="margin-left: 10px;">&times;</button>
                  </div>
              </div>
              <div class="smax-modal-body">
                  <div id="smax-list-container"></div>
                  <div class="editor-section">
                      <div id="editor-title-label" style="margin-top:0; margin-bottom:10px; color:#333; font-size: 15px; font-weight: normal;">Criar Texto</div>
                      <input type="text" id="smax-new-title" class="smax-input" placeholder="Título" autocomplete="off">
                      <div class="editor-toolbar">
                          <button type="button" class="toolbar-btn" data-cmd="bold"><b>B</b></button>
                          <button type="button" class="toolbar-btn" data-cmd="italic"><i>I</i></button>
                          <button type="button" class="toolbar-btn" data-cmd="underline"><u>U</u></button>
                          <button type="button" class="toolbar-btn" data-cmd="insertUnorderedList">•</button>
                          <button type="button" class="toolbar-btn" data-cmd="insertOrderedList">1.</button>
                          <button type="button" class="toolbar-btn" data-cmd="removeFormat">Limpar formatação</button>
                      </div>
                      <div id="smax-new-content" class="smax-textarea" contenteditable="true" placeholder="Escreva aqui..."></div>
                      <div style="margin-top:15px; display:flex; justify-content:flex-end; gap: 10px;">
                          <button id="smax-cancel-btn" class="btn" style="display:none;">Cancelar</button>
                          <button id="smax-save-btn" class="btn btn-primary">Salvar</button>
                      </div>
                  </div>
              </div>
          </div>
      `;
        document.body.appendChild(modal);

        const executeCloudAction = async (btn, actionType) => {
            const oldText = btn.innerHTML;
            btn.innerHTML = actionType === 'up' ? "Enviando..." : "Baixando...";
            btn.disabled = true;

            try {
                const matriculaEnvio = isManagerDisc ? getMinhaMatricula() + "_DISC" : getMinhaMatricula();

                if (actionType === 'up') {
                    if (!confirm("ATENÇÃO: Isso vai SUBSTITUIR o seu backup na nuvem pelos textos que estão neste computador agora.\nDeseja confirmar?")) return;
                    const solucoes = loadTemplates(isManagerDisc);
                    const res = await fetch(URL_CLOUDFLARE, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: "salvar_solucoes", matricula: matriculaEnvio, solucoes: solucoes })
                    });
                    if (!res.ok) throw new Error("Falha HTTP do servidor.");
                    alert("Backup salvo na nuvem com sucesso!");

                } else {
                    const res = await fetch(URL_CLOUDFLARE, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: "carregar_solucoes", matricula: matriculaEnvio })
                    });
                    if (!res.ok) throw new Error("Falha HTTP do servidor.");

                    const nuvemData = await res.json();
                    if (!Array.isArray(nuvemData) || nuvemData.length === 0) {
                        alert("A nuvem está vazia para este banco. Envie dados primeiro!");
                        return;
                    }

                    const juntar = confirm(`Encontradas ${nuvemData.length} entradas na nuvem.\n\nDeseja MANTER seus textos atuais do PC e juntar com as da nuvem?\n\n[OK] = Sim, juntar as duas listas\n[Cancelar] = Não, apagar o PC e usar SÓ as da nuvem`);

                    if (juntar) {
                        const locais = loadTemplates(isManagerDisc);
                        const titulosNuvem = nuvemData.map(i => i.title);
                        const locaisFiltrados = locais.filter(i => !titulosNuvem.includes(i.title));
                        saveTemplates(isManagerDisc, locaisFiltrados.concat(nuvemData));
                    } else {
                        saveTemplates(isManagerDisc, nuvemData);
                    }

                    alert(`Banco da nuvem importado com sucesso!`);
                    renderList();
                    refreshDropdownUI();
                }
            } catch(err) {
                alert(`Erro ao ${actionType === 'up' ? 'enviar para a' : 'baixar da'} nuvem: ` + err.message);
            } finally {
                btn.innerHTML = oldText;
                btn.disabled = false;
            }
        };

        document.getElementById('btn-cloud-up').onclick = (e) => executeCloudAction(e.target, 'up');
        document.getElementById('btn-cloud-down').onclick = (e) => executeCloudAction(e.target, 'down');

        const renderList = () => {
            const container = document.getElementById('smax-list-container'); let html = ''; const currentTmpls = loadTemplates(isManagerDisc);
            if(currentTmpls.length === 0){ html = '<p style="color:#7f8c8d; font-size: 13px;">Nenhum texto cadastrado ainda.</p>'; }
            else { currentTmpls.forEach((t, index) => { html += `<div class="template-item"><strong>${t.title}</strong><div class="action-group"><button class="btn smax-btn-icon smax-btn-edit" data-index="${index}">✏️ Editar</button><button class="btn smax-btn-icon smax-btn-delete" data-index="${index}">🗑️ Excluir</button></div></div>`; }); }
            container.innerHTML = html;

            container.querySelectorAll('.smax-btn-delete').forEach(btn => {
                btn.onclick = (e) => {
                    const idx = parseInt(e.currentTarget.getAttribute('data-index'));
                    if(confirm('Excluir este item?')) {
                        const tmpls = loadTemplates(isManagerDisc); tmpls.splice(idx, 1); saveTemplates(isManagerDisc, tmpls); renderList();
                        refreshDropdownUI();
                        if(currentEditIndex === idx) resetForm();
                    }
                };
            });
            container.querySelectorAll('.smax-btn-edit').forEach(btn => { btn.onclick = (e) => { const idx = parseInt(e.currentTarget.getAttribute('data-index')); loadIntoEditor(idx); }; });
        };

        const loadIntoEditor = (idx) => {
            const t = loadTemplates(isManagerDisc)[idx]; currentEditIndex = idx;
            document.getElementById('smax-new-title').value = t.title; document.getElementById('smax-new-content').innerHTML = t.content;
            document.getElementById('editor-title-label').innerText = "✏️ Editando Texto";
            document.getElementById('smax-save-btn').innerHTML = "Atualizar";
            document.getElementById('smax-cancel-btn').style.display = 'inline-block';
        };

        const resetForm = () => {
            currentEditIndex = -1; document.getElementById('smax-new-title').value = ""; document.getElementById('smax-new-content').innerHTML = "";
            document.getElementById('editor-title-label').innerText = "Criando Texto";
            document.getElementById('smax-save-btn').innerHTML = "Salvar";
            document.getElementById('smax-cancel-btn').style.display = 'none';
        };

        modal.querySelectorAll('.toolbar-btn').forEach(btn => {
            btn.onclick = (e) => { e.preventDefault(); const cmd = btn.getAttribute('data-cmd'); document.getElementById('smax-new-content').focus();
                                  if (cmd === 'createlink') { const url = prompt("URL do link:", "https://"); if (url) document.execCommand(cmd, false, url); } else { document.execCommand(cmd, false, null); }
                                 };
        });

        document.getElementById('smax-save-btn').onclick = () => {
            const title = document.getElementById('smax-new-title').value.trim(); const content = document.getElementById('smax-new-content').innerHTML;
            if(!title || !content || content === '<br>') { alert('Preencha título e conteúdo!'); return; }
            const tmpls = loadTemplates(isManagerDisc); if(currentEditIndex >= 0) { tmpls[currentEditIndex] = { title, content }; } else { tmpls.push({ title, content }); }
            saveTemplates(isManagerDisc, tmpls); renderList();
            refreshDropdownUI();
            resetForm();
        };

        document.getElementById('smax-cancel-btn').onclick = resetForm; document.getElementById('smax-manager-close').onclick = () => modal.remove();
        renderList();
    }

    // =========================================================================
    // PAINEL FLUTUANTE / CONFIGURAÇÕES
    // =========================================================================
    window.smaxOpenSettings = function() {
        let modal = document.getElementById('smax-settings-modal'); if (modal) modal.remove();
        const s = loadSettings(); const f = s.features;
        modal = document.createElement('div'); modal.id = 'smax-settings-modal'; modal.className = 'smax-modal';

        const FEATURE_DEFS = [

            { id: 'enableSolucoesLote', label: '⚡ Menu: Resolução em Lote' },
            //{ id: 'enableHeaderDarkMode', label: '💡 Botão Modo Escuro no Cabeçalho' },
            { id: 'enableDarkModeEngine', label: '🌙 Modo Escuro' },

            { id: 'enableAttachmentsPreview', label: '👁️ Preview de Anexos na Tela' },
            { id: 'enableUserHighlight', label: '🔵🔴 Destaque de Chefes/Detratores' },

            { id: 'enableHeaderRadar', label: '🔔 Botão Radar no Cabeçalho' },
            { id: 'enableRadarRevisar', label: '🚨 Motor do Radar de Fila' },
            { id: 'enableHeaderEstatisticas', label: '📊 Botão Estatísticas no Cabeçalho' },
            { id: 'enableHeaderGlobais', label: '🌍 Botão Globais no Cabeçalho' },

            { id: 'enableEscalarAlert', label: '⚠️ Alerta Escalar' },
            { id: 'enableAutoExpandShowMore', label: '↕️ Auto-clique em "Mostrar mais"' },
            { id: 'enableAutoHeightComments', label: '📜 Expandir Rolagem de Comentários' },
            { id: 'enableVipBadge', label: '👑 Selo VIP (Defensoria Pública)' },
            { id: 'enableDuplicityRadar', label: '🔍 Botão Histórico do Solicitante' },
            { id: 'enableAutoDuplicityCheck', label: '🤖 Alerta Automático de Duplicidade' },
            { id: 'enableZenMode', label: '🧹 Modo Zen (Ocultar Campos Inúteis)' },
            { id: 'enableBlocoNotas', label: '📝 Bloco de Notas' },
            { id: 'enableIdCopier', label: '📋 Copiadores rápidos de ID/CNJ/Dados' },

            { id: 'enableContextualDesignar', label: '👤 Botão Contextual: Designar' },
            { id: 'enableContextualCorrigirOferta', label: '✨ Botão Contextual: Corrigir Oferta' },
            { id: 'enableContextualResolver', label: '✅ Botão Contextual: Resolver' },
            { id: 'enableContextualBancoSolucoes', label: '💬 Botão Contextual: Banco de Soluções' },
            { id: 'enableContextualBancoDiscussao', label: '🗣️ Botão Contextual: Banco de Discussões' },
            { id: 'enableContextualLinker', label: '🔗 Botão Contextual: Vincular Chamados' },
            { id: 'enableContextualCopiarFilhos', label: '📋 Botão Contextual: Copiar IDs filhos' },

            { id: 'enableAriaNotebook', label: '🤖 Integração Gemini Notebook' },

        ];

        // Removemos a condicional de estilo que deixava a primeira opção grosseira
        let checksHtml = FEATURE_DEFS.map(def => `
          <label style="display:flex; align-items:center; gap:8px; margin-bottom:10px; cursor:pointer; font-size:13px; color:#2f3640;">
              <input type="checkbox" class="smax-feature-chk" data-id="${def.id}" ${f[def.id] !== false ? 'checked' : ''} style="-webkit-appearance: checkbox !important; appearance: auto !important; width: 16px !important; height: 16px !important; display: inline-block !important; opacity: 1 !important; visibility: visible !important; position: static !important; margin: 0 !important; cursor: pointer;">
              ${def.label}
          </label>
      `).join('');

        modal.innerHTML = `
          <div class="smax-modal-content" style="width: 450px;">
              <div class="smax-modal-header"><span>Configurações</span><button class="smax-close-btn" id="smax-settings-close">&times;</button></div>
              <div class="smax-modal-body"><p style="font-size:12px; color:#7f8c8d; margin-top:0; margin-bottom:15px;">Marque ou desmarque as ferramentas que deseja usar no seu SMAX.</p>
              <div style="background:#f8f9fa; padding:15px; border-radius:8px; border:1px solid #dcdde1; max-height:45vh; overflow-y:auto;">${checksHtml}</div>
              <div style="margin-top:20px; display:flex; justify-content:flex-end;"><button id="btn-save-settings" class="btn btn-primary" style="padding: 8px 20px;">Salvar e Atualizar</button></div></div>
          </div>`;
        document.body.appendChild(modal);
        document.getElementById('smax-settings-close').onclick = () => modal.remove();
        document.getElementById('btn-save-settings').onclick = () => {
            const chks = modal.querySelectorAll('.smax-feature-chk');
            chks.forEach(chk => { s.features[chk.getAttribute('data-id')] = chk.checked; }); saveSettings(s); window.location.reload();
        };
    };

    // =========================================================================
    // AUTO-DETECTAR USUÁRIO LOGADO E RASTREADOR CNJ
    // =========================================================================
    function autoDetectLoggedUser() {
        // Busca cirúrgica pelo contêiner do SMAX que guarda o nome no atributo 'title'
        const userContainer = document.querySelector('span.logged-in-user-container[title]');
        let userNameDOM = "";

        if (userContainer) {
            // Extrai o nome direto do atributo title ("MAYARA MENDES CARDOSO BARBOSA")
            userNameDOM = userContainer.getAttribute('title') || "";
        }

        // Higieniza o texto (remove acentos e espaços extras)
        userNameDOM = userNameDOM.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();

        if (userNameDOM) {
            // Procura na sua lista de CONFIG.analistas quem é essa pessoa
            const analistaMatch = CONFIG.analistas.find(a =>
                                                        userNameDOM.includes(a.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()) ||
                                                        a.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().includes(userNameDOM)
                                                       );

            if (analistaMatch) {
                const s = loadSettings();
                // Se mudou de pessoa, atualiza a memória silenciosamente
                if (s.assignee !== analistaMatch.nome) {
                    s.assignee = analistaMatch.nome;
                    saveSettings(s);
                }
            }
        }
    }

    // Helper para buscar Processo na tela
    function getCNJFromScreen() {
        const cnjRegex = /\b(\d{7})[-.\s]?(\d{2})[-.\s]?(\d{4})[-.\s]?(\d)[-.\s]?(\d{2})[-.\s]?(\d{4})\b/;
        const formatCNJ = (str) => str.replace(/[^\d]/g, '').replace(/(\d{7})(\d{2})(\d{4})(\d)(\d{2})(\d{4})/, '$1-$2.$3.$4.$5.$6');

        // 1. Tenta pegar do campo nativo do formulário
        const inputProcesso = document.querySelector('input[name="NumerodoProcesso_c"], input[aria-label="Número do processo"]');
        if (inputProcesso && inputProcesso.value) {
            const match = inputProcesso.value.match(cnjRegex);
            if (match) return formatCNJ(match[0]);
        }

        // 2. Se não achar, procura na descrição
        const descContainer = document.querySelector('div.cke_wysiwyg_div[aria-label="Descrição"], .field-name-Description .pl-rich-text-viewer, div[data-aid="Description"]');
        if (descContainer) {
            const match = descContainer.textContent.match(cnjRegex);
            if (match) return formatCNJ(match[0]);
        }

        return null;
    }

    function applyZenMode() {
        // 1. Injeta o CSS blindado uma única vez
        if (!document.getElementById('smax-zen-mode-style')) {

            const elementosParaOcultar = [
                // CAMPOS DO FORMULÁRIO
                'div[id*="Fabricante_c_container"]',
                'div[id*="TicketFornecedor_c_container"]',
                'div[id*="TicketAuxiliar_c_container"]',
                'div[id*="DataEnvioFornecedor_c_container"]',
                'div[id*="Garantia_c_container"]',
                'div[id*="DataAgendamento_c_container"]',
                'div[id*="PreferredContactMethod_container"]',
                'div[data-aid="related-knowledge-preview"]',

                // NOVOS CAMPOS OCULTOS DA CLASSIFICAÇÃO
                'div[id*="RegisteredForServiceComponent_container"]', // Componente de serviço
                'div[id*="SubscriptionActionType_container"]',        // Tipo de ação
                //'div[id*="TipoAtendimento_c_container"]',           // Tipo de atendimento

                // ABAS SUPERIORES (Navegação)
                'div[data-aid="tab-panel-nav-task-plan"]',      // Oculta Plano de tarefa
                'div[data-aid="tab-panel-nav-slts"]',           // Oculta Metas
                'div[data-aid="tab-panel-nav-involved-cis"]',   // Oculta CIs Envolvidos
                'div[data-aid="tab-panel-nav-related-news"]',   // Oculta Conhecimento relacionado
                'div[data-aid="tab-panel-nav-reservation"]',    // Oculta Reserva

                // CONTROLE DINÂMICO
                '.smax-zen-hidden'
            ];

            const style = document.createElement('style');
            style.id = 'smax-zen-mode-style';
            style.type = 'text/css';

            const regrasCSS = elementosParaOcultar.map(seletor => {
                return `body.smax-zen-active ${seletor}, body.smax-zen-active div[pl-tab-width]:has(> ${seletor}) { display: none !important; }`;
            }).join('\n');

            style.innerHTML = regrasCSS;
            document.head.appendChild(style);
        }

        // 2. Liga ou Desliga na página
        if (CONFIG.features.enableZenMode) {
            document.body.classList.add('smax-zen-active');
        } else {
            document.body.classList.remove('smax-zen-active');
            return;
        }

        // 3. Faxina Dinâmica Cirúrgica
        if (window.location.href.includes('/saw/Request/')) {
            const titulosParaOcultar = ["Informações SCCD", "Hardware", "Peça Relacionada"];
            const headers = document.querySelectorAll('span.pl-entity-page-component-header-text');

            headers.forEach(header => {
                for (let titulo of titulosParaOcultar) {
                    if (header.textContent.includes(titulo)) {

                        const barraHeader = header.closest('.pl-entity-page-component-header');
                        if (barraHeader) {
                            const containerPai = barraHeader.parentElement;
                            if (containerPai && !containerPai.classList.contains('smax-zen-hidden')) {
                                containerPai.classList.add('smax-zen-hidden');
                            }
                        }
                    }
                }
            });
        }
    }
    // Injeta as Ferramentas no Cabeçalho
    function initHeaderTools() {
        const toolbar = document.getElementById('application-toolbar');
        if (!toolbar) return;

        const settings = loadSettings();
        let nomeExibicao = "ANALISTA";
        if (settings.assignee) {
            nomeExibicao = settings.assignee.startsWith("MARIA FERNANDA") ? "MARIA FERNANDA" : settings.assignee.split(' ')[0];
        }

        let toolsLi = document.getElementById('smax-header-tools');

        if (toolsLi) {
            const nameEl = document.getElementById('header-analista-name');
            if (nameEl && nameEl.innerText !== nomeExibicao) {
                nameEl.innerText = nomeExibicao;
            }

            const radarHeader = document.getElementById('header-notification-container');
            if (radarHeader) {
                const radarLigado = CONFIG.features.enableRadarRevisar !== false && CONFIG.features.enableHeaderRadar !== false;
                radarHeader.style.setProperty('display', radarLigado ? 'flex' : 'none', 'important');
            }

            const btnDash = document.getElementById('header-btn-dash');
            if (btnDash) {
                btnDash.style.display = CONFIG.features.enableHeaderEstatisticas !== false ? 'flex' : 'none';
            }

            const btnGlobais = document.getElementById('header-btn-globais');
            if (btnGlobais) {
                btnGlobais.style.display = CONFIG.features.enableHeaderGlobais !== false ? 'flex' : 'none';
            }

            const btnDark = document.getElementById('header-btn-dark-mode');
            if (btnDark) {
                const darkDisponivel = CONFIG.features.enableHeaderDarkMode !== false && CONFIG.features.enableDarkModeEngine !== false;
                btnDark.style.setProperty('display', darkDisponivel ? 'flex' : 'none', 'important');
            }

            return;
        }

        toolsLi = document.createElement('li');
        toolsLi.id = 'smax-header-tools';

        // Altura exata da navbar do SMAX (56px) sem margin-top.
        toolsLi.style.cssText = 'display: inline-flex; align-items: center; gap: 14px; margin-right: 15px; height: 56px; float: left; margin-top: 0;';

        toolsLi.innerHTML = `
          <div style="font-size: 11px; font-weight: 800; color: rgba(255,255,255,0.5); letter-spacing: 1.5px; user-select: none; margin-right: 2px;">ARIA</div>

          <div id="header-notification-container" style="position: relative; display: flex; align-items: center; justify-content: center;">
              <div id="header-bell-icon" title="Notificações de Chamados" style="cursor: pointer; font-size: 18px; position: relative; user-select: none; transition: transform 0.2s; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px;">
              <i class="icon-alert" style="line-height: 1; display: block; margin-top: -2px;"></i>
              <span id="header-radar-badge" style="display: none; position: absolute; top: -4px; right: -6px; background: #e74c3c; color: white; font-size: 10px; font-weight: bold; padding: 1px 4px; border-radius: 10px; border: 1px solid #0073e7; line-height: 1.1;">0</span>
          </div>
              <div id="header-notification-dropdown" style="display: none; position: absolute; top: 40px; left: -120px; width: 280px; background: #fff; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.25); border: 1px solid #ccc; z-index: 9999; flex-direction: column; overflow: hidden; cursor: default;">
                  <div style="background: #f8f9fa; padding: 12px 16px; border-bottom: 1px solid #ddd; font-weight: normal; color: #333; font-size: 15px; display: flex; justify-content: space-between; align-items: center;">
                      <span>🚨 Alertas</span>
                      <span id="header-dropdown-count" style="background: #e74c3c; color: #fff; padding: 2px 8px; border-radius: 12px; font-size: 13px;">0</span>
                  </div>
                  <div id="header-notification-list" style="max-height: 350px; overflow-y: auto; padding: 0;">
                  </div>
              </div>
          </div>

          <div id="header-analista-name" style="font-family: inherit; padding: 4px 10px; border-radius: 2px; border: 1px solid rgba(255,255,255,0.3); font-size: 13px; background: rgba(0,0,0,0.15); color: #fff; font-weight: normal; user-select: none; letter-spacing: 0.5px; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                ${nomeExibicao}
            </div>

          <div id="header-btn-dash" title="Estatísticas" style="cursor:pointer; font-size:18px; color:#fff; transition: transform 0.2s; user-select: none; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px;">
          <i class="icon-analytics smax-icon" style="line-height: 1; display: block; margin-top: -2px;"></i>
          </div>

          <div id="header-btn-globais" title="Globais" style="cursor:pointer; font-size:18px; color:#fff; transition: transform 0.2s; user-select: none; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px;">
          <i class="icon-web" style="line-height: 1; display: block; margin-top: -2px;"></i>
          </div>

          <div id="header-btn-dark-mode" title="Alternar Luz" style="cursor:pointer; font-size:18px; color:#fff; display: ${CONFIG.features.enableDarkModeEngine ? 'flex' : 'none'}; align-items: center; justify-content: center; width: 24px; height: 24px;">
          <i id="smax-dark-icon" class="${document.documentElement.classList.contains('smax-dark') ? 'icon-bulb' : 'icon-bulb'}" style="line-height: 1; display: block; margin-top: -2px;"></i>
          </div>

          <div id="header-btn-settings" title="Configurações" style="cursor:pointer; font-size:18px; color:#fff; transition: transform 0.2s; user-select: none; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px;">
          <i class="icon-settings" style="line-height: 1; display: block; margin-top: -2px;"></i>
          </div>

            `;

        // CONTROLE DE VISIBILIDADE DOS BOTÕES DO CABEÇALHO
        if (CONFIG.features.enableHeaderRadar === false || CONFIG.features.enableRadarRevisar === false) {
            toolsLi.querySelector('#header-notification-container')?.remove();
        }

        if (CONFIG.features.enableHeaderEstatisticas === false) {
            toolsLi.querySelector('#header-btn-dash')?.remove();
        }

        if (CONFIG.features.enableHeaderGlobais === false) {
            toolsLi.querySelector('#header-btn-globais')?.remove();
        }

        if (CONFIG.features.enableHeaderDarkMode === false || CONFIG.features.enableDarkModeEngine === false) {
            toolsLi.querySelector('#header-btn-dark-mode')?.remove();
        }

        const searchIcon = toolbar.querySelector('div[data-aid="main-toolbar-search-icon"]');
        if (searchIcon && searchIcon.closest('li')) {
            toolbar.insertBefore(toolsLi, searchIcon.closest('li'));
        } else {
            toolbar.prepend(toolsLi);
        }

        // EVENTOS DA NOTIFICAÇÃO
        const bellIcon = toolsLi.querySelector('#header-bell-icon');
        const dropdown = toolsLi.querySelector('#header-notification-dropdown');

        if (bellIcon && dropdown) {
            bellIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOp = dropdown.style.display === 'flex';
                dropdown.style.display = isOp ? 'none' : 'flex';
            });
            bellIcon.addEventListener('mouseover', () => bellIcon.style.transform = 'scale(1.15)');
            bellIcon.addEventListener('mouseout', () => bellIcon.style.transform = 'scale(1)');
            document.addEventListener('click', (e) => {
                if (!dropdown.contains(e.target) && e.target !== bellIcon) {
                    dropdown.style.display = 'none';
                }
            });
        }

        // EVENTO DO PLACAR
        const btnDash = toolsLi.querySelector('#header-btn-dash');
        if (btnDash) {
            btnDash.addEventListener('click', () => {
                openSmaxDashboard();
            });
            btnDash.addEventListener('mouseover', () => btnDash.style.transform = 'scale(1.15)');
            btnDash.addEventListener('mouseout', () => btnDash.style.transform = 'scale(1)');
        }

        // EVENTO DOS GLOBAIS
        const btnGlobais = toolsLi.querySelector('#header-btn-globais');
        if (btnGlobais) {
            btnGlobais.addEventListener('click', () => {
                openGlobaisDashboard();
            });
            btnGlobais.addEventListener('mouseover', () => btnGlobais.style.transform = 'scale(1.15)');
            btnGlobais.addEventListener('mouseout', () => btnGlobais.style.transform = 'scale(1)');
        }

        // EVENTOS DO MODO NOTURNO
        const btnDark = toolsLi.querySelector('#header-btn-dark-mode');
        if (btnDark) {
            btnDark.addEventListener('click', (e) => {
                if (CONFIG.features.enableDarkModeEngine === false) return;

                const isDark = document.documentElement.classList.toggle('smax-dark');
                localStorage.setItem('smax_dark_mode', isDark);

                const icon = document.getElementById('smax-dark-icon');
                if (icon) {
                    icon.className = 'icon-bulb';
                }
            });

            btnDark.addEventListener('mouseover', () => {
                if (CONFIG.features.enableHeaderDarkMode === false || CONFIG.features.enableDarkModeEngine === false) return;
                btnDark.style.transform = 'scale(1.15)';
            });

            btnDark.addEventListener('mouseout', () => {
                if (CONFIG.features.enableHeaderDarkMode === false || CONFIG.features.enableDarkModeEngine === false) return;
                btnDark.style.transform = 'scale(1)';
            });
        }

        const btnSettings = toolsLi.querySelector('#header-btn-settings');
        if (btnSettings) {
            btnSettings.addEventListener('click', () => {
                if (typeof window.smaxOpenSettings === 'function') window.smaxOpenSettings();
            });
            btnSettings.addEventListener('mouseover', () => btnSettings.style.transform = 'scale(1.15)');
            btnSettings.addEventListener('mouseout', () => btnSettings.style.transform = 'scale(1)');
        }
    }

    // ATUALIZAR RADAR (Lista os chamados dentro do Menu Suspenso)
    function atualizarRadarUI() {
        const badge = document.getElementById('header-radar-badge');
        const dropdownCount = document.getElementById('header-dropdown-count');
        const listContainer = document.getElementById('header-notification-list');
        const dropdown = document.getElementById('header-notification-dropdown');

        if (!badge || !dropdownCount || !listContainer) return;

        const totalChamados = rejeitadosDetectados.size + prontosDetectados.size;

        if (totalChamados > 0) {
            badge.style.display = 'block';
            badge.textContent = totalChamados;
            dropdownCount.textContent = totalChamados;

            let listHtml = "";

            // Renderiza os Rejeitados (Vermelho)
            if (rejeitadosDetectados.size > 0) {
                const idsRejeitados = Array.from(rejeitadosDetectados);
                listHtml += idsRejeitados.map(id => `
                  <div style="padding: 12px 16px; border-bottom: 1px solid #eee; border-left: 5px solid #e74c3c; background: #fff;">
                      <div style="color: #c0392b; font-size: 13px; font-weight: normal; margin-bottom: 4px; letter-spacing: 0.5px;">🔴 REJEITADO</div>
                      <div style="font-size: 11px; color: #7f8c8d; margin-bottom: 4px;">O usuário rejeitou o chamado.</div>
                      <div style="font-size: 14px; color: #333;">
                          <a href="https://suporte.tjsp.jus.br/saw/Request/${id}/general" target="_blank" style="color: #0984e3; font-weight: normal; text-decoration: none;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">Chamado #${id}</a>
                      </div>
                  </div>
              `).join('');
            }

            // Renderiza os Prontos (Laranja)
            if (prontosDetectados.size > 0) {
                const idsProntos = Array.from(prontosDetectados);
                listHtml += idsProntos.map(id => `
                  <div style="padding: 12px 16px; border-bottom: 1px solid #eee; border-left: 5px solid #f39c12; background: #fff;">
                      <div style="color: #d35400; font-size: 13px; font-weight: normal; margin-bottom: 4px; letter-spacing: 0.5px;">🟠 DÚVIDA</div>
                      <div style="font-size: 11px; color: #7f8c8d; margin-bottom: 4px;">O usuário inseriu um comentário mas não rejeitou.</div>
                      <div style="font-size: 14px; color: #333;">
                          <a href="https://suporte.tjsp.jus.br/saw/Request/${id}/general" target="_blank" style="color: #0984e3; font-weight: normal; text-decoration: none;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">Chamado #${id}</a>
                      </div>
                  </div>
              `).join('');
            }

            listContainer.innerHTML = listHtml;

        } else {
            // Zera tudo: Some com a bolinha do sino e avisa que está limpo
            badge.style.display = 'none';
            dropdownCount.textContent = '0';

            listContainer.innerHTML = `
              <div style="padding: 24px 20px; text-align: center; color: #7f8c8d; font-size: 14px;">
                  Nada a ser mostrado.
              </div>
          `;

            // Se você resolver o último chamado enquanto a caixinha estiver aberta, ela fecha sozinha!
            if (dropdown && dropdown.style.display === 'flex') {
                dropdown.style.display = 'none';
            }
        }
    }

    // =========================================================================
    // DASHBOARD DE ESTATÍSTICAS
    // =========================================================================
    async function openSmaxDashboard() {
        // 1. Cria a interface inicial do Modal
        const existing = document.getElementById('smax-dash-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'smax-dash-modal';
        modal.className = 'smax-modal';
        modal.style.zIndex = '9999999';

        modal.innerHTML = `
          <div class="smax-modal-content" style="width: 650px; max-width: 95%;">
              <div class="smax-modal-header" style="background: #2c3e50;">
                  <span>Estatísticas</span>
                  <button class="smax-close-btn" id="smax-dash-close">&times;</button>
              </div>
              <div class="smax-modal-body" id="smax-dash-body" style="background: #f4f6f8; display: flex; align-items: center; justify-content: center; min-height: 150px;">
                  <h3 style="color: #7f8c8d; font-size: 15px;">Puxando os dados...</h3>
              </div>
          </div>
      `;
        document.body.appendChild(modal);
        document.getElementById('smax-dash-close').onclick = () => modal.remove();

        try {
            // 2. Descobre quem é o analista selecionado
            const settings = loadSettings();
            const analistaObj = CONFIG.analistas.find(a => a.matricula === settings.assignee || a.nome === settings.assignee) || CONFIG.analistas[0];

            // 3. Pega o ID (RG Oculto) do analista - CORREÇÃO DE CONTAS DUPLICADAS E INATIVAS
            let personId = "";

            // BLINDAGEM MÁXIMA: Hardcode do ID da Maria Fernanda descoberto na interface
            if (analistaObj.matricula === "372335") {
                personId = "28428300";
            } else {
                // Pesquisa prioritariamente SÓ pela matrícula (Upn) para evitar contas homônimas antigas
                const personFilter = encodeURIComponent(`Upn='${analistaObj.matricula}'`);
                let urlPerson = `/rest/213963628/ems/Person?filter=${personFilter}&layout=Id,Name,Upn,PhaseId,Email&size=5`;
                let resPerson = await fetch(urlPerson, { headers: { 'Accept': 'application/json' } });
                let dataPerson = await resPerson.json();

                // Se por acaso não achar pelo UPN, faz o fallback pelo Nome
                if (!dataPerson.entities || dataPerson.entities.length === 0) {
                    const nameFilter = encodeURIComponent(`Name='${analistaObj.nome}'`);
                    urlPerson = `/rest/213963628/ems/Person?filter=${nameFilter}&layout=Id,Name,Upn,PhaseId,Email&size=5`;
                    resPerson = await fetch(urlPerson, { headers: { 'Accept': 'application/json' } });
                    dataPerson = await resPerson.json();
                }

                if (!dataPerson.entities || dataPerson.entities.length === 0) {
                    throw new Error("Seu usuário não foi encontrado no banco do SMAX.");
                }

                // Filtra a conta correta: prioriza a conta que está 'Active' (Ativa)
                let person = dataPerson.entities.find(e => e.properties.PhaseId === 'Active' || e.properties.IsActive === true);

                // Fallbacks de segurança
                if (!person) person = dataPerson.entities.find(e => e.properties.Upn && e.properties.Upn.includes(analistaObj.matricula));
                if (!person) person = dataPerson.entities[0];

                personId = person.properties.Id;
            }

            // 4. BUSCA CIRÚRGICA (ALTERADO AQUI: Review movido para filterAtivos)
            const filterAtivos = encodeURIComponent(`(ExpertAssignee='${personId}' and (PhaseId='FirstLineSupport' or PhaseId='Escalate' or PhaseId='Review'))`);
            const filterHistorico = encodeURIComponent(`(ExpertAssignee='${personId}' and (PhaseId='Accept' or PhaseId='Fulfill' or PhaseId='Close' or PhaseId='Abandon'))`);
            const layout = "Id,PhaseId,Status,DisplayLabel,Description,CreateTime,LastUpdateTime,DataEnvioAceite_c";

            const urlAtivos = `/rest/213963628/ems/Request?filter=${filterAtivos}&layout=${layout}&size=100&order=Id desc`;
            const urlHistorico = `/rest/213963628/ems/Request?filter=${filterHistorico}&layout=${layout}&size=1000&order=Id desc`;

            // Dispara as duas buscas ao mesmo tempo
            const [resAtivos, resHist] = await Promise.all([
                fetch(urlAtivos, { headers: { 'Accept': 'application/json' } }),
                fetch(urlHistorico, { headers: { 'Accept': 'application/json' } })
            ]);

            if (!resAtivos.ok || !resHist.ok) throw new Error("A API recusou a busca de chamados.");

            const dataAtivos = await resAtivos.json();
            const dataHistorico = await resHist.json();

            const chamadosAtivos = dataAtivos.entities || [];
            const chamadosHistorico = dataHistorico.entities || [];

            // DICIONÁRIO OFICIAL SMAX DE STATUS E FASES (CÓPIA DA SUA VERSÃO MANUAL)
            const statusMap = {
                'ready': { text: 'Pronto', bg: '#e3f2fd', color: '#1565c0' },
                'inprogress': { text: 'Em andamento', bg: '#e8f8f5', color: '#16a085' },
                'pendingcustomer': { text: 'Usuário pendente', bg: '#fef9e7', color: '#d35400' },
                'pending': { text: 'Usuário pendente', bg: '#fef9e7', color: '#d35400' },
                'suspended': { text: 'Suspenso', bg: '#f5eef8', color: '#8e44ad' },
                'complete': { text: 'Concluído', bg: '#eaeded', color: '#7f8c8d' },
                'pendingparent': { text: 'Elem. prim. pendente', bg: '#fef9e7', color: '#d35400' },
                'rejected': { text: 'Rejeitado', bg: '#fdedec', color: '#c0392b' },
                'pendingvendor': { text: 'Fornecedor pendente', bg: '#fef9e7', color: '#d35400' },
                'pendingexternalservicedesk': { text: 'Central ext. pendente', bg: '#fef9e7', color: '#d35400' },
                'pendingspecialoperation': { text: 'Op. especial pendente', bg: '#fef9e7', color: '#d35400' },
                'timeout': { text: 'Decurso de prazo', bg: '#eaeded', color: '#7f8c8d' }
            };

            const tradutorFases = {
                'log': 'Registrado',
                'classify': 'Classificado',
                'firstlinesupport': 'Suporte primeira linha',
                'escalate': 'Escalado',
                'review': 'Rejeitado',
                'accept': 'Aguardando Aceite',
                'fulfill': 'Processar',
                'close': 'Fechado',
                'abandon': 'Abandonado'
            };

            // 5. Função auxiliar para extrair dados
            const extractTicketData = (ticket) => {
                const faseRaw = ticket.properties.PhaseId || "";
                const id = ticket.properties.Id;
                const titulo = ticket.properties.DisplayLabel || "Sem título";
                const desc = ticket.properties.Description || "";
                const createTime = parseInt(ticket.properties.CreateTime) || 0;
                const lastUpdateTime = parseInt(ticket.properties.LastUpdateTime) || createTime;
                const dataEnvioAceite = parseInt(ticket.properties.DataEnvioAceite_c) || 0;
                const rawStatus = ticket.properties.Status || "";

                // O relógio prioriza a 'DataEnvioAceite_c'. Se não existir, usa a última atualização.
                const dataTratativa = dataEnvioAceite > 0 ? dataEnvioAceite : lastUpdateTime;

                const key = rawStatus.toLowerCase().replace('requeststatus', '');
                let statusText = rawStatus || "Sem status";
                let statusBg = '#ecf0f1'; let statusColor = '#2c3e50';

                if (statusMap[key]) {
                    statusText = statusMap[key].text; statusBg = statusMap[key].bg; statusColor = statusMap[key].color;
                } else if (rawStatus) {
                    if (key.includes('pronto')) { statusBg = '#e3f2fd'; statusColor = '#1565c0'; }
                    else if (key.includes('andamento')) { statusBg = '#e8f8f5'; statusColor = '#16a085'; }
                    else if (key.includes('pendente') || key.includes('suspenso')) { statusBg = '#fef9e7'; statusColor = '#d35400'; }
                    else if (key.includes('rejeitada')) { statusBg = '#fdedec'; statusColor = '#c0392b'; }
                }

                let nomeFase = tradutorFases[faseRaw.toLowerCase()] || faseRaw;

                return { id, titulo, desc, createTime, lastUpdateTime, dataTratativa, statusText, statusBg, statusColor, nomeFase };
            };

            // Processa os Ativos (Fila Atual)
            let filaAtiva = 0;
            let listaAtivosHTML = [];
            chamadosAtivos.forEach(ticket => {
                filaAtiva++;
                listaAtivosHTML.push(extractTicketData(ticket));
            });

            // LÓGICA DE TEMPO PARA AS ESTATÍSTICAS
            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
            const startOf7Days = startOfToday - (6 * 24 * 60 * 60 * 1000);
            const startOf30Days = startOfToday - (29 * 24 * 60 * 60 * 1000);

            let statsHistorico = {
                hoje: 0,
                sete: 0,
                trinta: 0
            };

            // Processa o Histórico e Conta as Estatísticas baseadas no Trabalho Real
            let listaHistorico = [];
            chamadosHistorico.forEach(ticket => {
                const objTicket = extractTicketData(ticket);
                listaHistorico.push(objTicket);

                // Conta a produtividade baseada na DATA DE TRATATIVA REAL
                if (objTicket.dataTratativa >= startOfToday) statsHistorico.hoje++;
                if (objTicket.dataTratativa >= startOf7Days) statsHistorico.sete++;
                if (objTicket.dataTratativa >= startOf30Days) statsHistorico.trinta++;
            });

            // 6. Ordenações baseadas na Data da Tratativa Real
            listaAtivosHTML.sort((a, b) => b.dataTratativa - a.dataTratativa);
            listaHistorico.sort((a, b) => b.dataTratativa - a.dataTratativa);

            const top10Historico = listaHistorico.slice(0, 10);

            // 7. Renderização
            // Renderiza Ativos
            let linksAtivos = "";
            if (listaAtivosHTML.length > 0) {
                linksAtivos = `<div style="max-height: 250px; overflow-y: auto; text-align: left; background: #fff; padding: 10px 15px; border-radius: 6px; border: 1px solid #b3e5fc; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">`;
                listaAtivosHTML.forEach(t => {
                    let descLimpa = htmlToText(t.desc).replace(/\s+/g, ' ').trim();
                    if (descLimpa.length > 120) descLimpa = descLimpa.substring(0, 120) + '...';
                    linksAtivos += `
                      <div style="padding: 10px 0; border-bottom: 1px solid #f1f2f6; display: flex; flex-direction: column; gap: 4px; transition: background 0.2s;" onmouseover="this.style.background='#fcfdfe'" onmouseout="this.style.background='transparent'">
                          <div style="font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 6px;">
                              <a href="https://suporte.tjsp.jus.br/saw/Request/${t.id}/general" target="_blank" style="color: #0277bd; font-weight: 900; text-decoration: none;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">#${t.id}</a>
                              <span style="background: ${t.statusBg}; color: ${t.statusColor}; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; line-height: 1;">${t.statusText}</span>
                              <span style="color: #34495e; font-weight: bold; overflow: hidden; text-overflow: ellipsis;" title="${t.titulo}">${t.titulo}</span>
                          </div>
                          <div style="font-size: 11px; color: #7f8c8d; line-height: 1.4; white-space: normal;"><i>"${descLimpa || 'Sem descrição'}"</i></div>
                      </div>
                  `;
                });
                linksAtivos += `</div>`;
            } else {
                linksAtivos = `<div style="font-size: 13px; color: #7f8c8d; text-align: center; margin-top: 10px;">Nenhum chamado pendente na fila.</div>`;
            }

            // Renderiza Histórico
            let linksHistorico = "";
            if (top10Historico.length > 0) {
                linksHistorico = `<div style="max-height: 250px; overflow-y: auto; text-align: left; background: #fff; padding: 10px 15px; border-radius: 6px; border: 1px solid #e0e0e0; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">`;
                top10Historico.forEach(t => {
                    let descLimpa = htmlToText(t.desc).replace(/\s+/g, ' ').trim();
                    if (descLimpa.length > 100) descLimpa = descLimpa.substring(0, 100) + '...';
                    linksHistorico += `
                      <div style="padding: 10px 0; border-bottom: 1px solid #f1f2f6; display: flex; flex-direction: column; gap: 4px; transition: background 0.2s;" onmouseover="this.style.background='#f9f9f9'" onmouseout="this.style.background='transparent'">
                          <div style="font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 6px;">
                              <a href="https://suporte.tjsp.jus.br/saw/Request/${t.id}/general" target="_blank" style="color: #8e44ad; font-weight: 900; text-decoration: none;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">#${t.id}</a>
                              <span style="background: #f4f6f8; color: #7f8c8d; border: 1px solid #dcdde1; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; line-height: 1;">Fase atual: ${t.nomeFase}</span>
                              <span style="color: #34495e; font-weight: bold; overflow: hidden; text-overflow: ellipsis;" title="${t.titulo}">${t.titulo}</span>
                          </div>
                          <div style="font-size: 11px; color: #7f8c8d; line-height: 1.4; white-space: normal;"><i>"${descLimpa || 'Sem descrição'}"</i></div>
                      </div>
                  `;
                });
                linksHistorico += `</div>`;
            } else {
                linksHistorico = `<div style="font-size: 13px; color: #7f8c8d; text-align: center; margin-top: 10px;">Nenhum histórico recente.</div>`;
            }

            // 8. Monta a tela dividida
            const dashBody = document.getElementById('smax-dash-body');
            dashBody.style.display = 'block';
            dashBody.style.padding = '20px';

            dashBody.innerHTML = `
              <div style="background: #e1f5fe; padding: 15px; border-radius: 8px; border: 1px solid #81d4fa; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                      <div>
                          <h3 style="margin: 0; color: #0277bd; font-size: 18px;">Meus Chamados Designados</h3>
                          <p style="margin: 2px 0 0 0; font-size: 12px; color: #555;">(Suporte de primeira linha, Escalar e Revisar)</p>
                      </div>
                      <div style="font-size: 32px; color: #d35400; font-weight: 900; background: #fff; padding: 0 15px; border-radius: 8px; border: 2px solid #81d4fa;">
                          ${filaAtiva}
                      </div>
                  </div>
                  ${linksAtivos}
              </div>

              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #dcdde1; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">

                  <div style="margin-bottom: 15px;">
                      <h3 style="margin: 0 0 10px 0; color: #2c3e50; font-size: 16px;">Produtividade</h3>
                      <div style="display: flex; justify-content: space-between; gap: 10px;">
                          <div style="flex: 1; background: #fff; padding: 10px; border-radius: 6px; text-align: center; border: 1px solid #dcdde1;">
                              <div style="font-size: 10px; color: #7f8c8d; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">Hoje</div>
                              <div style="font-size: 20px; color: #2c3e50; font-weight: 900; margin-top: 3px;">${statsHistorico.hoje}</div>
                          </div>
                          <div style="flex: 1; background: #fff; padding: 10px; border-radius: 6px; text-align: center; border: 1px solid #dcdde1;">
                              <div style="font-size: 10px; color: #7f8c8d; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">Últimos 7 Dias</div>
                              <div style="font-size: 20px; color: #2c3e50; font-weight: 900; margin-top: 3px;">${statsHistorico.sete}</div>
                          </div>
                          <div style="flex: 1; background: #fff; padding: 10px; border-radius: 6px; text-align: center; border: 1px solid #dcdde1;">
                              <div style="font-size: 10px; color: #7f8c8d; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">Últimos 30 Dias</div>
                              <div style="font-size: 20px; color: #2c3e50; font-weight: 900; margin-top: 3px;">${statsHistorico.trinta}</div>
                          </div>
                      </div>
                  </div>

                  <div style="margin-bottom: 10px; border-top: 1px solid #e0e0e0; padding-top: 15px;">
                      <h3 style="margin: 0; color: #2c3e50; font-size: 16px;">Últimos 10 Atendimentos</h3>
                      <p style="margin: 2px 0 0 0; font-size: 12px; color: #7f8c8d;">(Chamados que avançaram de fase)</p>
                  </div>
                  ${linksHistorico}
              </div>
          `;

        } catch (err) {
            document.getElementById('smax-dash-body').innerHTML = `
              <div style="text-align: center;">
                  <h3 style="color: #e74c3c; margin-bottom: 10px;">Erro de Busca</h3>
                  <p style="color: #555; font-size: 14px;">${err.message}</p>
              </div>
          `;
        }
    }

    // =========================================================================
    // DASHBOARD DE CHAMADOS GLOBAIS
    // =========================================================================
    async function openGlobaisDashboard() {
        const existing = document.getElementById('smax-globais-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'smax-globais-modal';
        modal.className = 'smax-modal';
        modal.style.zIndex = '9999999';

        modal.innerHTML = `
          <div class="smax-modal-content" style="width: 800px; max-width: 95%;">
              <div class="smax-modal-header" style="background: #273c75;">
                  <span>Monitor de Chamados Globais</span>
                  <button class="smax-close-btn" id="smax-globais-close">&times;</button>
              </div>
              <div class="smax-modal-body" id="smax-globais-body" style="background: #f4f6f8; min-height: 200px; padding: 20px;">
                  <div style="text-align: center; margin-top: 40px;">
                      <h3 style="color: #7f8c8d; font-size: 16px;">Buscando Globais...</h3>
                      <p style="color: #95a5a6; font-size: 13px;">Buscando usuários Globais, cruzando grupos e extraindo os chamados.</p>
                  </div>
              </div>
          </div>
      `;
        document.body.appendChild(modal);
        document.getElementById('smax-globais-close').onclick = () => modal.remove();

        const dashBody = document.getElementById('smax-globais-body');

        try {
            // ==================================================================
            // ETAPA 1: BUSCA DE USUÁRIOS
            // ==================================================================
            const nomesGlobaisExatos = [
                "GLOBAL EPROC – PUBLICO EXTERNO",
                "GLOBAL EPROC - ENTIDADE CONVENIADA",
                "GLOBAL EPROC – 1º GRAU E COLEGIO RECURSAL",
                "GLOBAL EPROC – 2º GRAU"
            ];

            const nomesFormatados = nomesGlobaisExatos.map(n => `'${n}'`).join(',');
            const filterGlobal = encodeURIComponent(`Name in (${nomesFormatados})`);

            let urlPerson = `/rest/213963628/ems/Person?filter=${filterGlobal}&layout=Id,Name&size=100`;

            let resPerson = await fetch(urlPerson, { headers: { 'Accept': 'application/json' } });
            if (!resPerson.ok) {
                const errTxt = await resPerson.text();
                throw new Error(`[ERRO NA ETAPA 1 - USUÁRIOS] O SMAX rejeitou a busca de pessoas. Detalhe: ${errTxt}`);
            }

            let dataPerson = await resPerson.json();

            if (!dataPerson.entities || dataPerson.entities.length === 0) {
                dashBody.innerHTML = `
                  <div style="text-align: center; padding: 30px;">
                      <h3 style="color: #e67e22;">Nenhum dos usuários Globais listados foi encontrado no banco do SMAX.</h3>
                      <p style="color: #555; font-size: 13px;">Verifique se os nomes na lista estão com a ortografia correta.</p>
                  </div>`;
                return;
            }

            let globalUserMap = {};
            const globalIds = dataPerson.entities.map(e => {
                globalUserMap[e.properties.Id] = e.properties.Name;
                return `'${e.properties.Id}'`;
            });

            // ==================================================================
            // ETAPA 2: BUSCA DE CHAMADOS (Filtro de fase mantido invisível)
            // ==================================================================
            const filterReq = encodeURIComponent(`Active='true' and RequestedForPerson in (${globalIds.join(',')}) and (PhaseId='FirstLineSupport' or PhaseId='Escalate')`);
            const layoutReq = "Id,PhaseId,Status,DisplayLabel,Description,ExpertGroup,RequestedForPerson,RequestedByPerson";

            let resReq = await fetch(`/rest/213963628/ems/Request?filter=${filterReq}&layout=${layoutReq}&size=200&order=Id desc`, { headers: { 'Accept': 'application/json' } });
            if (!resReq.ok) {
                const errTxt = await resReq.text();
                throw new Error(`[ERRO NA ETAPA 2 - CHAMADOS] O SMAX rejeitou a busca de tickets. Detalhe: ${errTxt}`);
            }

            let dataReq = await resReq.json();

            if (!dataReq.entities || dataReq.entities.length === 0) {
                dashBody.innerHTML = `
                  <div style="text-align: center; padding: 40px;">
                      <div style="font-size: 40px; margin-bottom: 10px;">🎉</div>
                      <h3 style="color: #27ae60; margin: 0;">Tudo Limpo!</h3>
                      <p style="color: #7f8c8d; font-size: 14px;">Não há nenhum chamado Global aberto no Suporte N1 ou Escalado no momento.</p>
                  </div>`;
                return;
            }

            const chamados = dataReq.entities;

            // ==================================================================
            // ETAPA 3: DICIONÁRIO DE GRUPOS MANUAL
            // ==================================================================
            // Basta adicionar o ID numérico novo aqui e o respectivo Nome entre aspas!
            const dicionarioGrupos = {
                "51182381": "GSE - STI 1 SUPORTE N3_eproc",
                "86297660": "GSE - STI 4 INFRA Suporte N3_eproc",
                "69531584": "GSE - STI 5.3 - Migração eproc",
                "56931126": "GSE - SGS 3 - GESTÃO SISTEMA EPROC",
                "66561429": "GSE - SGS - EPROC - MIGRAÇÃO 1G",
                "4325314": "GSE - STI 4.1.2",
                "1533492" : "GSE - STI 1.2.1",
                "11501": "GSE - STI 1.2.2",
                "70774702": "GSE - STI 1.3.1",
                "58024475": "GSE – STI 1.1.6",
                "51700635": "GSE - SGS - EPROC PUB EXT - ADV",
                "51642955": "GSE - SGS - EPROC 1G - ACIV",
                "51642956": "GSE - SGS - EPROC 1G - ACRIM",
                "51643320": "GSE - SGS - EPROC 2G - DISTRIBUIÇÃO",

            };

            // ==================================================================
            // ETAPA 4: RENDERIZAÇÃO DA TELA (AGRUPADA PELO USUÁRIO GLOBAL)
            // ==================================================================
            let chamadosPorGlobal = {};

            const statusMap = {
                'ready': { text: 'Pronto', bg: '#e3f2fd', color: '#1565c0' },
                'inprogress': { text: 'Em andamento', bg: '#e8f8f5', color: '#16a085' },
                'pendingcustomer': { text: 'Usuário pendente', bg: '#fef9e7', color: '#d35400' },
                'suspended': { text: 'Suspenso', bg: '#f5eef8', color: '#8e44ad' }
            };

            chamados.forEach(ticket => {
                const id = ticket.properties.Id;
                const titulo = ticket.properties.DisplayLabel || "Sem título";
                let desc = htmlToText(ticket.properties.Description || "").replace(/\s+/g, ' ').trim();
                if (desc.length > 150) desc = desc.substring(0, 150) + '...';

                const rawStatus = ticket.properties.Status || "";
                const key = rawStatus.toLowerCase().replace('requeststatus', '');
                const statusTag = statusMap[key] ? `<span style="background:${statusMap[key].bg}; color:${statusMap[key].color}; border: 1px solid ${statusMap[key].color}40; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">${statusMap[key].text}</span>` : `<span style="background:#ecf0f1; color:#2c3e50; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:bold;">${rawStatus}</span>`;

                // Pega a equipe consultando o Dicionário Manual
                const groupId = ticket.properties.ExpertGroup;
                const nomeGrupo = groupId && dicionarioGrupos[groupId] ? dicionarioGrupos[groupId] : (groupId ? `ID Equipe: ${groupId}` : "Sem Equipe Designada");

                // Descobre de quem é o chamado
                const requesterId = ticket.properties.RequestedForPerson || ticket.properties.RequestedByPerson;
                const nomeGlobal = globalUserMap[requesterId] || "Global Desconhecido";

                if (!chamadosPorGlobal[nomeGlobal]) chamadosPorGlobal[nomeGlobal] = [];

                chamadosPorGlobal[nomeGlobal].push(`
                  <div style="background: #fff; padding: 12px 15px; border-radius: 6px; border: 1px solid #dcdde1; margin-bottom: 8px; transition: box-shadow 0.2s;" onmouseover="this.style.boxShadow='0 4px 8px rgba(0,0,0,0.05)'" onmouseout="this.style.boxShadow='none'">
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                          <div style="display: flex; align-items: center; gap: 8px;">
                              <a href="https://suporte.tjsp.jus.br/saw/Request/${id}/general" target="_blank" style="color: #273c75; font-weight: 900; font-size: 15px; text-decoration: none;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">#${id}</a>
                              ${statusTag}
                          </div>
                          <div style="font-size: 10px; background: #f4f6f8; color: #7f8c8d; padding: 2px 6px; border-radius: 4px; font-weight: bold; border: 1px solid #dcdde1; max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${nomeGrupo}">
                              🏢 ${nomeGrupo}
                          </div>
                      </div>
                      <div style="font-size: 13px; font-weight: bold; color: #2c3e50; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${titulo}">${titulo}</div>
                      <div style="font-size: 12px; color: #7f8c8d; line-height: 1.4;"><i>"${desc || 'Sem descrição'}"</i></div>
                  </div>
              `);
            });

            let htmlFinal = `<div style="margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
              <h2 style="margin: 0; color: #2c3e50; font-size: 18px;">Globais Ativos (${chamados.length})</h2>
          </div>`;

            const globaisOrdenados = Object.keys(chamadosPorGlobal).sort();

            globaisOrdenados.forEach(global => {
                htmlFinal += `
                  <div style="margin-bottom: 20px;">
                      <div style="background: #2c3e50; color: #ecf0f1; padding: 8px 12px; border-radius: 6px 6px 0 0; font-size: 14px; font-weight: bold; letter-spacing: 0.5px; display: flex; justify-content: space-between;">
                          <span>👤 ${global}</span>
                          <span style="background: #fff; color: #2c3e50; padding: 1px 8px; border-radius: 12px; font-size: 12px;">${chamadosPorGlobal[global].length}</span>
                      </div>
                      <div style="background: #e8ecf1; padding: 10px; border-radius: 0 0 6px 6px; border: 1px solid #dcdde1; border-top: none;">
                          ${chamadosPorGlobal[global].join('')}
                      </div>
                  </div>
              `;
            });

            dashBody.innerHTML = htmlFinal;

        } catch (err) {
            dashBody.innerHTML = `
              <div style="text-align: center; padding: 30px;">
                  <h3 style="color: #e74c3c; margin-bottom: 10px;">Erro na Comunicação com o SMAX</h3>
                  <p style="color: #555; font-size: 14px; font-weight: bold;">${err.message}</p>
              </div>
          `;
        }
    }

    // =========================================================================
    // BLOCO DE NOTAS DO EPROC (EMBUTIDO NA BARRA LATERAL NATIVA)
    // =========================================================================
    function initBlocoNotasPrivado() {
        const match = window.location.href.match(/Request\/(\d+)/);
        if (!match) return;

        const ticketId = match[1];
        const storageKeyText = `smax_nota_${ticketId}`;
        const storageKeyApi = `smax_api_data_${ticketId}`;
        const storageKeyMinimized = `smax_bloco_minimized`;
        const storageKeyPosition = `smax_bloco_position`;

        const blocoExistente = document.getElementById('smax-bloco-notas');
        if (blocoExistente) {
            if (blocoExistente.getAttribute('data-ticket-id') === ticketId) return;
            blocoExistente.remove();
        }

        const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));
        const savedPosition = (() => {
            try {
                const parsed = JSON.parse(localStorage.getItem(storageKeyPosition) || 'null');
                if (parsed && Number.isFinite(parsed.left) && Number.isFinite(parsed.top)) return parsed;
            } catch(e) {}
            return null;
        })();

        const initialLeft = savedPosition ? `${clamp(savedPosition.left, 12, window.innerWidth - 172)}px` : 'auto';
        const initialTop = savedPosition ? `${clamp(savedPosition.top, 12, window.innerHeight - 90)}px` : '92px';
        const initialRight = savedPosition ? 'auto' : '18px';

        const bloco = document.createElement('div');
        bloco.id = 'smax-bloco-notas';
        bloco.setAttribute('data-ticket-id', ticketId);

        bloco.style.cssText = `position: fixed; top: ${initialTop}; right: ${initialRight}; left: ${initialLeft}; width: min(200px, calc(100vw - 24px)); max-height: calc(100vh - 110px); background: #fff; border: 1px solid #b3e5fc; border-radius: 6px; box-shadow: 0 10px 28px rgba(0,0,0,0.22); display: flex; flex-direction: column; overflow: hidden; font-family: inherit; transition: box-shadow 0.2s ease, border-color 0.2s ease; z-index: 999998; box-sizing: border-box;`;

        const isMinimized = localStorage.getItem(storageKeyMinimized) === 'true';
        const bodyDisplay = isMinimized ? 'none' : 'flex';
        const toggleIcon = isMinimized ? '□' : '_';
        const toggleTitle = isMinimized ? 'Maximizar' : 'Minimizar';

        // O ID virou um badge clicável (class="smax-copy-badge" e data-text com apenas os números)
        bloco.innerHTML = `
          <div style="background: #ffffff; color: #2c3e50; border-bottom: 1px solid #b3e5fc; padding: 6px 10px; font-weight: normal; display: flex; justify-content: space-between; align-items: center; user-select: none; font-size: 13px; cursor: move;" id="bloco-header">
              <span style="display: flex; align-items: center;">📝 Notas <span class="smax-copy-badge" data-text="${ticketId}" style="background: #f4f6f8; color: #0073e7; padding: 2px 6px; border-radius: 4px; border: 1px solid #dcdde1; cursor: pointer; margin-left: 6px; font-weight: normal; transition: 0.2s;" title="Copiar ID do chamado">#${ticketId}</span></span>
              <span id="bloco-toggle" style="cursor: pointer; padding: 0 5px; font-size: 16px;" title="${toggleTitle}">${toggleIcon}</span>
          </div>
          <div id="bloco-body" style="display: ${bodyDisplay}; flex-direction: column; padding: 8px; gap: 6px; max-height: calc(100vh - 200px); overflow-y: auto;">
              <div id="bloco-api-data" style="display: none; flex-direction: column; gap: 4px; margin-top: 4px;"></div>

              <textarea id="bloco-texto" style="width: 100%; height: 80px; resize: vertical; border: 1px solid #ccc; border-radius: 2px; padding: 6px; box-sizing: border-box; font-size: 13px; line-height: 1.1; font-family: inherit;" placeholder="Notas pessoais..."></textarea>
              <div style="font-size: 10px; color: #7f8c8d; text-align: right;" id="bloco-status">Carregando...</div>
          </div>
      `;

        // A INJEÇÃO DE DEPENDÊNCIA
        document.body.appendChild(bloco);

        const header = document.getElementById('bloco-header');
        const textarea = document.getElementById('bloco-texto');
        const status = document.getElementById('bloco-status');
        const body = document.getElementById('bloco-body');
        const toggle = document.getElementById('bloco-toggle');
        const apiDataContainer = document.getElementById('bloco-api-data');

        let dragState = null;
        const keepBlocoInViewport = () => {
            const rect = bloco.getBoundingClientRect();
            const nextLeft = clamp(rect.left, 8, window.innerWidth - bloco.offsetWidth - 8);
            const nextTop = clamp(rect.top, 8, window.innerHeight - bloco.offsetHeight - 8);
            bloco.style.left = `${nextLeft}px`;
            bloco.style.top = `${nextTop}px`;
            bloco.style.right = 'auto';
        };

        const saveBlocoPosition = () => {
            const rect = bloco.getBoundingClientRect();
            localStorage.setItem(storageKeyPosition, JSON.stringify({ left: rect.left, top: rect.top }));
        };

        header.addEventListener('pointerdown', (e) => {
            if (e.target.closest('#bloco-toggle, .smax-copy-badge')) return;
            const rect = bloco.getBoundingClientRect();
            dragState = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, startLeft: rect.left, startTop: rect.top };
            header.setPointerCapture(e.pointerId);
            bloco.style.transition = 'none';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        });

        header.addEventListener('pointermove', (e) => {
            if (!dragState || e.pointerId !== dragState.pointerId) return;
            const nextLeft = clamp(dragState.startLeft + e.clientX - dragState.startX, 8, window.innerWidth - bloco.offsetWidth - 8);
            const nextTop = clamp(dragState.startTop + e.clientY - dragState.startY, 8, window.innerHeight - bloco.offsetHeight - 8);
            bloco.style.left = `${nextLeft}px`;
            bloco.style.top = `${nextTop}px`;
            bloco.style.right = 'auto';
        });

        const finishDrag = (e) => {
            if (!dragState || e.pointerId !== dragState.pointerId) return;
            dragState = null;
            try { header.releasePointerCapture(e.pointerId); } catch(err) {}
            bloco.style.transition = 'box-shadow 0.2s ease, border-color 0.2s ease';
            document.body.style.userSelect = '';
            saveBlocoPosition();
        };

        header.addEventListener('pointerup', finishDrag);
        header.addEventListener('pointercancel', finishDrag);

        const createCopyBtn = (icon, text) => {
            if (!text || text === "N/A") return '';
            return `<div class="smax-copy-badge" data-text="${text}" style="background: #ffffff; color: #2c3e50; font-size: 13px; font-weight: normal; padding: 4px 6px; border-radius: 4px; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; display: block; box-sizing: border-box; border: 1px solid #dcdde1; transition: 0.2s;" title="${text}">${icon} ${text}</div>`;
        };

        const renderApiData = (nome, cpf, email) => {
            if (!nome && !cpf && !email) {
                apiDataContainer.style.display = 'none';
                return;
            }
            apiDataContainer.style.display = 'flex';
            apiDataContainer.style.flexWrap = 'wrap';
            apiDataContainer.innerHTML = `
              ${createCopyBtn('👤', nome)}
              ${createCopyBtn('📄', cpf)}
              ${createCopyBtn('📧', email)}
          `;
        };

        // Agora o evento escuta cliques no 'bloco' inteiro, não só na div da API.
        // Isso significa que ele vai capturar o clique do cabeçalho, dos dados e do CNJ
        bloco.addEventListener('click', (e) => {
            if (!CONFIG.features.enableIdCopier) return;
            const badge = e.target.closest('.smax-copy-badge');
            if (badge) {
                e.preventDefault(); e.stopPropagation();

                const textToCopy = badge.getAttribute('data-text');
                navigator.clipboard.writeText(textToCopy);

                const oldBg = badge.style.background;
                const oldColor = badge.style.color;
                const oldBorder = badge.style.border;
                const oldText = badge.innerHTML;

                badge.style.background = '#27ae60';
                badge.style.color = '#ffffff';
                badge.style.border = '1px solid #27ae60';
                badge.innerHTML = 'Copiado!';

                setTimeout(() => {
                    badge.style.background = oldBg;
                    badge.style.color = oldColor;
                    badge.style.border = oldBorder;
                    badge.innerHTML = oldText;
                }, 1500);
            }
        });

        const fetchUserData = async () => {
            try {
                status.textContent = "Lendo chamado...";

                const resTicket = await fetch(`/rest/213963628/ems/Request/${ticketId}?layout=Id,RequestedForPerson,RequestedByPerson`);
                if (!resTicket.ok) throw new Error("Erro na API");
                const dataTicket = await resTicket.json();

                if (dataTicket.entities && dataTicket.entities.length > 0) {
                    const ticket = dataTicket.entities[0];
                    const personId = ticket.properties.RequestedForPerson || ticket.properties.RequestedByPerson;

                    if (!personId) throw new Error("Sem usuário.");

                    status.textContent = "Puxando dados...";

                    const resPerson = await fetch(`/rest/213963628/ems/Person/${personId}?layout=Id,Name,Email,Upn,EmployeeNumber`);
                    if (!resPerson.ok) throw new Error("Erro no cadastro");
                    const dataPerson = await resPerson.json();

                    if (dataPerson.entities && dataPerson.entities.length > 0) {
                        const pessoa = dataPerson.entities[0].properties;

                        const nome = pessoa.Name || "N/A";
                        const email = pessoa.Email || "N/A";
                        const cpfMatricula = pessoa.EmployeeNumber || pessoa.Upn || "N/A";

                        const apiDataObj = { nome, cpf: cpfMatricula, email };
                        localStorage.setItem(storageKeyApi, JSON.stringify(apiDataObj));

                        renderApiData(nome, cpfMatricula, email);
                        status.textContent = "Dados carregados.";
                    }
                }
            } catch (e) {
                status.textContent = "Erro na busca.";
            }
        };

        const savedApi = localStorage.getItem(storageKeyApi);
        if (savedApi) {
            try {
                const parsed = JSON.parse(savedApi);
                renderApiData(parsed.nome, parsed.cpf, parsed.email);
                status.textContent = "Carregado da memória.";
            } catch(e) { fetchUserData(); }
        } else {
            fetchUserData();
        }

        const savedText = localStorage.getItem(storageKeyText);
        if (savedText) textarea.value = savedText;

        textarea.addEventListener('input', () => {
            localStorage.setItem(storageKeyText, textarea.value);
            status.textContent = "Anotação salva.";
        });

        toggle.addEventListener('click', () => {
            if (body.style.display === 'none') {
                body.style.display = 'flex';
                toggle.textContent = "_";
                toggle.title = "Minimizar";
                localStorage.setItem(storageKeyMinimized, 'false');
                requestAnimationFrame(() => {
                    keepBlocoInViewport();
                    saveBlocoPosition();
                });
            } else {
                body.style.display = 'none';
                toggle.textContent = "□";
                toggle.title = "Maximizar";
                localStorage.setItem(storageKeyMinimized, 'true');
                saveBlocoPosition();
            }
        });
    }

    function updatePrivateNotebook() {
        if (!CONFIG.features.enableBlocoNotas) {
            const bloco = document.getElementById('smax-bloco-notas');
            if (bloco) bloco.remove();
            return;
        }

        if (isRequestPage()) {
            initBlocoNotasPrivado();

            const cnj = getCNJFromScreen();
            if (cnj) {
                const apiDataContainer = document.getElementById('bloco-api-data');
                const badgeCnj = document.getElementById('smax-cnj-badge');

                if (apiDataContainer && !badgeCnj) {
                    apiDataContainer.style.display = 'flex';
                    apiDataContainer.insertAdjacentHTML('beforeend',
                                                        `<div id="smax-cnj-badge" class="smax-copy-badge" data-text="${cnj}" style="background: #ffffff; color: #2c3e50; font-size: 13px; font-weight: normal; padding: 4px 6px; border-radius: 4px; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; display: block; box-sizing: border-box; border: 1px solid #dcdde1; transition: 0.2s; margin-top: 2px;" title="${cnj}">⚖️ ${cnj}</div>`
                                                       );
                } else if (badgeCnj && badgeCnj.getAttribute('data-text') !== cnj) {
                    badgeCnj.setAttribute('data-text', cnj);
                    badgeCnj.innerHTML = `⚖️ ${cnj}`;
                }
            }
        } else {
            const bloco = document.getElementById('smax-bloco-notas');
            if (bloco) bloco.remove();
        }
    }

    // =========================================================================
    // RADAR DE DUPLICIDADE AVANÇADO
    // =========================================================================
    async function autoCheckDuplicity() {
        if (!CONFIG.features.enableAutoDuplicityCheck) {
            document.getElementById('smax-ai-toast')?.remove();
            window._aiDuplicityChecked = null;
            return;
        }

        const match = window.location.href.match(/\/saw\/Request\/(\d+)/);

        // Se não estiver dentro de um chamado específico (ex: na grade de chamados)
        if (!match) {
            const painelAtivo = document.getElementById('smax-ai-toast');
            if (painelAtivo) painelAtivo.remove(); // Destrói o toast
            return;
        }

        const ticketIdAtual = match[1];

        if (window._aiDuplicityChecked === ticketIdAtual) return;

        const requesterWrapper = document.querySelector('div[data-aid="RequestedByPerson"], div[data-aid="withoutResolution_RequestedByPerson"]');
        if (!requesterWrapper) return;
        const personItem = requesterWrapper.querySelector('.pl-person-item');
        if (!personItem) return;

        let nomeLimpo = personItem.textContent.replace(/💀 BANIDO:/g, '').replace(/👑 VIP \(Defensoria\)/g, '').trim();
        if (!nomeLimpo) return;

        window._aiDuplicityChecked = ticketIdAtual;

        try {
            const urlPerson = `/rest/213963628/ems/Person?filter=Name='${encodeURIComponent(nomeLimpo)}'&layout=Id&size=1`;
            const resPerson = await fetch(urlPerson, { headers: { 'Accept': 'application/json' } });
            const dataPerson = await resPerson.json();

            if (!dataPerson.entities || dataPerson.entities.length === 0) return;
            const personId = dataPerson.entities[0].properties.Id;

            const seteDiasAtras = Date.now() - (7 * 24 * 60 * 60 * 1000);
            const urlReq = `/rest/213963628/ems/Request?filter=(RequestedByPerson='${personId}' and CreateTime >= ${seteDiasAtras})&layout=Id,PhaseId,Description,ExpertGroup&size=5&order=CreateTime desc`;
            const resReq = await fetch(urlReq, { headers: { 'Accept': 'application/json' } });
            const dataReq = await resReq.json();

            let ultimosChamados = dataReq.entities.filter(t => t.properties.Id !== ticketIdAtual).slice(0, 4);
            if (ultimosChamados.length === 0) return;

            const groupIds = [...new Set(ultimosChamados.map(t => t.properties.ExpertGroup).filter(id => id))];
            const mapaGrupos = {};

            if (groupIds.length > 0) {
                const queryGrupos = groupIds.map(id => `'${id}'`).join(',');
                const urlGroup = `/rest/213963628/ems/PersonGroup?filter=Id in (${queryGrupos})&layout=Id,Name`;
                const resGroup = await fetch(urlGroup, { headers: { 'Accept': 'application/json' } });
                const dataGroup = await resGroup.json();
                if (dataGroup.entities) {
                    dataGroup.entities.forEach(g => { mapaGrupos[g.properties.Id] = g.properties.Name; });
                }
            }

            const resolverDuplicidadeViaAPI = async (btn, dupId) => {
                try {
                    const solEdit = document.querySelector('#onlyResolution_Solution_container .cke_wysiwyg_div');
                    const solView = document.querySelector('div[data-aid="onlyResolution_Solution"] .pl-rich-text-viewer');
                    let solucaoHTML = "";

                    if (solEdit && solEdit.innerHTML.trim() !== "" && solEdit.innerHTML !== "<br>") {
                        solucaoHTML = solEdit.innerHTML;
                    } else if (solView) {
                        solucaoHTML = solView.innerHTML;
                    }

                    const textoPuro = htmlToText(solucaoHTML).replace(/&nbsp;/g, '').trim();
                    if (!solucaoHTML || textoPuro === "") {
                        throw new Error("A caixa de Solução do chamado atual está VAZIA!\n\nVocê precisa escrever e salvar uma solução neste chamado antes de resolver o duplicado.");
                    }

                    const confirmacao = window.confirm(`CONFIRMAÇÃO DE RESOLUÇÃO\n\nVocê está prestes a resolver o chamado #${dupId}.\n\nSerá utilizada a mesma solução que você escreveu para este chamado atual.\n\nDeseja prosseguir?`);

                    if (!confirmacao) return;

                    btn.innerHTML = "Copiando...";
                    btn.disabled = true;

                    let meuIdOperador = null;
                    const reqAtualRes = await fetch(`/rest/213963628/ems/Request/${ticketIdAtual}?layout=ExpertAssignee`);
                    const reqAtualData = await reqAtualRes.json();
                    if (reqAtualData.entities && reqAtualData.entities.length > 0) {
                        meuIdOperador = reqAtualData.entities[0].properties.ExpertAssignee;
                    }

                    const payload = {
                        "entities": [{
                            "entity_type": "Request",
                            "properties": {
                                "Id": dupId,
                                "Solution": solucaoHTML,
                                "CompletionCode": "CompletionCodeIncidentResolved"
                            }
                        }],
                        "operation": "UPDATE"
                    };

                    if (meuIdOperador) {
                        payload.entities[0].properties.ExpertAssignee = meuIdOperador;
                    }

                    const resposta = await fetch('/rest/213963628/ems/bulk', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                            'X-XSRF-TOKEN': document.cookie.match(new RegExp('(^| )XSRF-TOKEN=([^;]+)'))?.[2] || ''
                        },
                        body: JSON.stringify(payload)
                    });

                    if (!resposta.ok) throw new Error("Erro na API do SMAX.");

                    btn.className = 'btn';
                    btn.style.cssText = "background: #27ae60; color: white; width: 100%; border: none; font-weight: normal; font-size: 11px; font-family: inherit;";
                    btn.innerHTML = "Resolvido!";

                } catch (err) {
                    btn.className = 'btn';
                    btn.style.cssText = "background: #e74c3c; color: white; width: 100%; border: none; font-weight: normal; font-size: 11px; font-family: inherit;";
                    btn.innerHTML = "Erro";
                    alert(err.message);

                    setTimeout(() => {
                        btn.className = 'btn btn-primary btn-resolver-dup';
                        btn.style.cssText = "width: 100%; font-weight: normal; font-size: 11px; font-family: inherit;";
                        btn.innerHTML = "Resolver";
                        btn.disabled = false;
                    }, 3000);
                }
            };

            //  Construção do Elemento
            let toast = document.getElementById('smax-ai-toast');
            if (toast) toast.remove();

            toast = document.createElement('div');
            toast.id = 'smax-ai-toast';

            // Estilos globais (Fontes nativas, sem negrito, tamanho 13px)
            const styleBase = `position: fixed; bottom: 30px; right: 30px; z-index: 9999999; font-family: "Metric", Arial, sans-serif; font-size: 11px; font-weight: normal; animation: slideUpToast 0.4s ease;`;
            toast.style.cssText = styleBase;

            const mapaFasesPTBR = {
                'Log': 'Log', 'Classify': 'Classify', 'FirstLineSupport': 'Aguardando atendimento',
                'Escalate': 'Aguardando atendimento', 'Fulfill': 'Aguardando atendimento', 'Review': 'Rejeitado',
                'Close': 'Fechado', 'Accept': 'Aguardando aceite', 'Abandon': 'Abandonado',
                'Validate': 'Validação', 'Approve': 'Aprovação'
            };
            const fasesTratadas = ['Accept', 'Abandon', 'Close'];

            // 1. Constrói o Lançador (MINIMIZADO)
            const launcherHTML = `
            <div id="duplicity-launcher" style="background: #ffffff; border: 1px solid #c8d2d6; border-radius: 4px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); padding: 8px 15px; cursor: pointer; display: flex; align-items: center; gap: 8px; color: #333; transition: all 0.2s;"><span</span>
                <span>${ultimosChamados.length} histórico(s)</span>
                <span style="font-size: 10px; color: #0073e7;">(ver)</span>
            </div>
          `;

            // 2. Constrói o Painel (EXPANDIDO)
            let panelHTML = `
                 <div id="duplicity-panel" style="display: none; background: #ffffff; border: 1px solid #c8d2d6; border-radius: 4px; box-shadow: 0 4px 11px rgba(0,0,0,0.15); width: 400px; flex-direction: column; overflow: hidden;">              <div style="background: #f5f7f9; padding: 11px 16px; border-bottom: 1px solid #c8d2d6; display: flex; justify-content: space-between; align-items: center;">
                  <span style="color: #333;">Histórico Recente (${ultimosChamados.length})</span>
                  <div style="display: flex; gap: 10px;">
                    <button id="btn-toast-minimizar" style="background: transparent; border: none; font-size: 18px; cursor: pointer; color: #666; line-height: 1;" title="Minimizar">_</button>
                    <button id="btn-toast-fechar-x" style="background: transparent; border: none; font-size: 18px; cursor: pointer; color: #666; line-height: 1;" title="Fechar definitivamente">&times;</button>
                  </div>
              </div>
              <div style="padding: 11px; display: flex; flex-direction: column; gap: 10px; max-height: 450px; overflow-y: auto;">
          `;

            ultimosChamados.forEach(t => {
                let descLimpa = htmlToText(t.properties.Description).replace(/\s+/g, ' ').trim();
                if (descLimpa.length > 80) descLimpa = descLimpa.substring(0, 80) + '...';
                const dupId = t.properties.Id;
                const faseIngles = t.properties.PhaseId || "Desconhecida";
                const faseVisual = mapaFasesPTBR[faseIngles] || faseIngles;
                const isFechado = fasesTratadas.includes(faseIngles);
                const nomeGrupo = mapaGrupos[t.properties.ExpertGroup] || "Sem grupo atribuído";

                let faseColor = '#aed6f1';
                let faseText = '#2980b9';

                if (faseVisual === 'Fechado' || faseVisual === 'Abandonado') {
                    faseColor = '#bdc3c7'; faseText = '#555';
                } else if (faseVisual === 'Rejeitado' || faseVisual === 'Aguardando aceite') {
                    faseColor = '#fdebd0'; faseText = '#8e44ad';
                } else if (faseVisual === 'Log' || faseVisual === 'Classify') {
                    faseColor = '#fcf3cf'; faseText = '#d35400';
                }

                const areaAcaoHTML = isFechado
                ? `<div style="margin-top: 8px; font-size: 11px; color: ${faseText}; text-align: center; font-weight: 600;">🔒</div>`
                : `<div style="margin-top: 8px;"><button class="btn btn-primary btn-resolver-dup" data-id="${dupId}" style="width: 100%; padding: 4px 11px; font-size: 11px; font-weight: normal; font-family: inherit;">Resolver</button></div>`;

                panelHTML += `
                  <div style="background: #fff; border: 1px solid #e1e5e8; border-radius: 4px; padding: 11px; display: flex; flex-direction: column; gap: 6px;">
                      <div style="display: flex; justify-content: space-between; align-items: center;">
                          <a href="https://suporte.tjsp.jus.br/saw/Request/${dupId}/general" target="_blank" class="pl-text-link" style="text-decoration: none; font-weight: normal;">#${dupId}</a>
                          <span style="font-size: 11px; background: ${faseColor}; color: ${faseText}; padding: 2px 6px; border-radius: 2px; font-weight: normal; border: 1px solid ${faseText}40;">${faseVisual}</span>
                      </div>
                      <div style="color: #666;"><span>👥 Grupo:</span> ${nomeGrupo}</div>
                      <div style="color: #555; line-height: 1.4; font-style: italic;">"${descLimpa || 'Sem descrição'}"</div>
                      ${areaAcaoHTML}
                  </div>
              `;
            });

            panelHTML += `</div></div>`;
            toast.innerHTML = launcherHTML + panelHTML;
            document.body.appendChild(toast);

            // --- Lógica de Interação ---
            const launcher = document.getElementById('duplicity-launcher');
            const panel = document.getElementById('duplicity-panel');

            launcher.onclick = () => { launcher.style.display = 'none'; panel.style.display = 'flex'; };
            document.getElementById('btn-toast-minimizar').onclick = () => { panel.style.display = 'none'; launcher.style.display = 'flex'; };
            document.getElementById('btn-toast-fechar-x').onclick = () => toast.remove();

            toast.querySelectorAll('.btn-resolver-dup').forEach(btn => {
                btn.onclick = (e) => resolverDuplicidadeViaAPI(e.target, e.target.getAttribute('data-id'));
            });

        } catch { }
    }

    // =========================================================================
    // BOTÃO VINCULAR CHAMADOS CONTEXTUAL
    // =========================================================================
    function initContextualLinker() {
        if (!CONFIG.features.enableContextualLinker) {
            document.getElementById('btn-contextual-linker')?.remove();
            return;
        }
        // Procura a aba "Registros relacionados" no menu lateral
        const tabNav = document.querySelector('div[data-aid="tab-panel-nav-related-records"]');
        if (!tabNav) return;

        let btn = document.getElementById('btn-contextual-linker');

        // Se a aba estiver selecionada (active)
        if (tabNav.classList.contains('active')) {
            if (!btn) {
                btn = document.createElement('button');
                btn.id = 'btn-contextual-linker';

                // O Crachá Oficial do SMAX (Isto garante o fundo azul nativo!)
                btn.className = 'btn btn-primary';
                btn.innerHTML = 'Vincular em Lote';

                // Forçando o texto normal
                btn.style.cssText = `
                width: 90%; margin: 8px auto 10px auto; display: flex;
                align-items: center; justify-content: center; font-weight: normal;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1); font-family: inherit;
                transition: transform 0.1s ease;
                `;

                btn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    abrirPainelLinker(); // Chama o painel que já construímos
                };

                // Efeito sutil de clique (Pressionar) para melhorar a resposta visual
                btn.onmousedown = () => btn.style.transform = 'scale(0.96)';
                btn.onmouseup = () => btn.style.transform = 'scale(1)';
                btn.onmouseleave = () => btn.style.transform = 'scale(1)';

                // Insere o botão logo abaixo da aba dentro do menu
                tabNav.parentNode.insertBefore(btn, tabNav.nextSibling);
            }
            btn.style.display = 'flex';
        } else {
            // Se o usuário clicar em outra aba (ex: Geral), esconde o botão
            if (btn) btn.style.display = 'none';
        }
    }


    // =========================================================================
    // MOTOR DA VINCULAÇÃO EM LOTE
    // =========================================================================
    function abrirPainelLinker() {
        const existing = document.getElementById('smax-linker-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'smax-linker-modal';
        modal.style.cssText = `
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.7); z-index: 9999999; display: flex;
          justify-content: center; align-items: center; font-family: "Metric", Arial, sans-serif;
          backdrop-filter: blur(3px);
      `;

        modal.innerHTML = `
          <div style="background: #fff; width: 600px; max-width: 95%; border-radius: 4px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); overflow: hidden; display: flex; flex-direction: column; font-family: "Metric", Arial, sans-serif;">
              <div style="background: #2c3e50; color: #fff; padding: 15px 20px; font-size: 16px; display: flex; justify-content: space-between; align-items: center;">
                  <span>Vinculação de Chamados em Lote</span>
                  <button id="close-linker" style="background: transparent; border: none; color: #fff; font-size: 20px; cursor: pointer;">&times;</button>
              </div>

              <div style="padding: 20px; display: flex; flex-direction: column; gap: 15px; background: #fdfdfd;">

                  <div style="background: #f4f6f8; padding: 15px; border-radius: 6px; border: 1px solid #dcdde1;">
                      <label style="font-weight: bold; color: #2c3e50; display: block; margin-bottom: 5px;">ID do Chamado GLOBAL:</label>
                      <input type="text" id="linker-global-id" placeholder="" style="width: 100%; padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; box-sizing: border-box; outline: none; font-family: inherit;">
                  </div>

                  <div>
                      <label style="font-weight: bold; color: #2c3e50; display: block; margin-bottom: 5px;">IDs dos Chamados FILHOS:</label>
                      <p style="font-size: 11px; color: #7f8c8d; margin-top: 0; margin-bottom: 8px;">Cole os IDs separados por espaço, vírgula ou quebra de linha.</p>
                      <textarea id="linker-filhos-ids" placeholder="" style="width: 100%; height: 120px; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; font-family: monospace; resize: vertical; box-sizing: border-box; outline: none;"></textarea>
                  </div>

                  <div style="display: flex; justify-content: flex-end; align-items: center; gap: 10px; margin-top: 5px;">
                      <span id="linker-count" style="font-size: 12px; color: #0073e7; font-weight: bold;">0 filhos detectados</span>
                      <button id="btn-executar-linker" class="btn btn-primary" style="font-family: inherit;">Vincular Tudo</button>
                  </div>

                  <div style="margin-top: 10px;">
                      <label style="font-weight: bold; color: #2c3e50; display: block; margin-bottom: 5px; font-size: 12px;">Terminal de Execução:</label>
                      <div id="linker-terminal" style="background: #1e272e; color: #2ecc71; font-family: monospace; font-size: 12px; padding: 10px; border-radius: 4px; height: 150px; overflow-y: auto; white-space: pre-wrap; line-height: 1.5;">Aguardando IDs...</div>
                  </div>
              </div>
          </div>
      `;

        document.body.appendChild(modal);

        document.getElementById('close-linker').onclick = () => modal.remove();

        const inputGlobal = document.getElementById('linker-global-id');
        const textFilhos = document.getElementById('linker-filhos-ids');
        const countVisor = document.getElementById('linker-count');
        const btnExecutar = document.getElementById('btn-executar-linker');
        const terminal = document.getElementById('linker-terminal');

        const log = (msg, color = '#2ecc71') => {
            terminal.innerHTML += `<br><span style="color: ${color}">> ${msg}</span>`;
            terminal.scrollTop = terminal.scrollHeight;
        };

        textFilhos.addEventListener('input', () => {
            const raw = textFilhos.value.trim();
            const filhos = raw.split(/[\s,]+/).filter(id => id.match(/^\d+$/));
            countVisor.innerText = `${filhos.length} filho(s) detectado(s)`;
        });

        btnExecutar.onclick = async () => {
            const globalId = inputGlobal.value.trim().replace(/\D/g, '');
            const rawFilhos = textFilhos.value.trim();
            const filhosIds = [...new Set(rawFilhos.split(/[\s,]+/).filter(id => id.match(/^\d+$/)))];

            if (!globalId) return alert("Digite o ID do Chamado Global!");
            if (filhosIds.length === 0) return alert("Digite pelo menos um ID de chamado filho!");
            if (filhosIds.includes(globalId)) return alert("O chamado Global não pode estar na lista de filhos!");

            const confirmacao = confirm(`Você está prestes a vincular ${filhosIds.length} chamado(s) ao Global #${globalId}.\n\nDeseja prosseguir?`);
            if (!confirmacao) return;

            btnExecutar.disabled = true;
            btnExecutar.innerText = "Vinculando...";
            inputGlobal.disabled = true;
            textFilhos.disabled = true;

            terminal.innerHTML = `> INICIANDO VINCULAÇÃO EM LOTE AO GLOBAL #${globalId}...`;

            let sucessos = 0; let falhas = 0;

            for (const filhoId of filhosIds) {
                log(`Processando filho #${filhoId}...`, '#f1c40f');
                const payload = {
                    "relationships": [{
                        "name": "RequestCausedByRequest",
                        "firstEndpoint": { "Request": globalId },
                        "secondEndpoint": { "Request": filhoId }
                    }],
                    "operation": "CREATE"
                };

                try {
                    const resposta = await fetch('/rest/213963628/ems/bulk', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                            'X-XSRF-TOKEN': getCsrfToken()
                        },
                        body: JSON.stringify(payload)
                    });

                    const dados = await resposta.json();

                    if (dados.relationship_result_list && dados.relationship_result_list[0] && dados.relationship_result_list[0].completion_status === "OK") {
                        log(`#${filhoId} vinculado com sucesso!`);
                        sucessos++;
                    } else {
                        throw new Error("O SMAX rejeitou o vínculo.");
                    }
                } catch (err) {
                    log(`Erro ao vincular #${filhoId}: ${err.message}`, '#e74c3c');
                    falhas++;
                }
                await sleep(400); // Respiro de API
            }

            log(`\n=================================`, '#3498db');
            log(`OPERAÇÃO FINALIZADA!`, '#3498db');
            log(`Sucessos: ${sucessos} | Falhas: ${falhas}`, '#3498db');

            btnExecutar.innerText = "Operação Concluída";
            setTimeout(() => {
                btnExecutar.innerText = "Vincular Tudo";
                btnExecutar.disabled = false;
                inputGlobal.disabled = false;
                textFilhos.disabled = false;
            }, 3000);
        };
    }

    // =========================================================================
    // RESOLVER EM LOTE
    // =========================================================================
    function initBotaoLoteNative() {
        if (!CONFIG.features.enableSolucoesLote) {
            document.getElementById('btn-smax-lote')?.remove();
            return;
        }
        // 1. Verifica se o botão já existe ou se o botão de referência (Suporte ao Vivo) está na tela
        if (document.getElementById('btn-smax-lote')) return;

        const refItem = document.querySelector('[data-aid="sub-menu-item-live-support"]');
        if (!refItem) return; // Sai se o menu ainda não carregou

        // 2. Cria o container principal imitando o subitem do SMAX
        const container = document.createElement('div');
        container.id = 'btn-smax-lote';
        container.className = 'subitem-link';
        // Removemos estilos de posição fixa, ele agora segue o fluxo do menu
        container.style.cursor = 'pointer';

        // 3. Cria o link de texto imitando o estilo nativo
        const link = document.createElement('a');
        link.className = 'item-text';
        link.title = 'Resolução em Lote';
        link.innerHTML = 'Resolução em Lote';

        // 4. Adiciona o evento de clique
        container.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            abrirPainelLote();
        };

        // 5. Monta a estrutura
        container.appendChild(link);

        // 6. Insere no menu, logo após o "Suporte ao Vivo"
        refItem.parentNode.insertBefore(container, refItem.nextSibling);

        // Opcional: Adicionar efeito de hover manual caso o SMAX não aplique automaticamente em IDs novos
        container.onmouseover = () => container.classList.add('selected-subitem');
        container.onmouseout = () => container.classList.remove('selected-subitem');
    }

    async function abrirPainelLote() {
        const existing = document.getElementById('smax-lote-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'smax-lote-modal';
        modal.className = 'smax-modal';
        modal.style.zIndex = '9999999';

        modal.innerHTML = `
          <div class="smax-modal-content" style="width: 700px; max-width: 95%;">
              <div class="smax-modal-header" style="background: #27ae60;">
                  <span>Resolução de Chamados em Lote</span>
                  <button id="close-lote" class="smax-close-btn">&times;</button>
              </div>
              <div class="smax-modal-body" style="background: #fdfdfd; display: flex; flex-direction: column; gap: 15px;">

                  <div style="background: #f4f6f8; padding: 15px; border-radius: 6px; border: 1px solid #dcdde1;">
                      <label style="font-weight: bold; color: #2c3e50; display: block; margin-bottom: 5px;">IDs dos Chamados:</label>
                      <p style="font-size: 11px; color: #7f8c8d; margin-top: 0; margin-bottom: 8px;">Cole os IDs separados por espaço, vírgula ou quebra de linha.</p>
                      <textarea id="lote-ids" placeholder="" style="width: 100%; height: 90px; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; font-family: monospace; resize: vertical; box-sizing: border-box; outline: none;"></textarea>
                      <div id="lote-count" style="font-size: 12px; color: #0073e7; font-weight: bold; text-align: right; margin-top: 5px;">0 detectados</div>
                  </div>

                  <div class="editor-section" style="margin-top: 0; padding-top: 0; border: none;">
                      <label style="font-weight: bold; color: #2c3e50; display: block; margin-bottom: 5px;">Solução Padrão:</label>
                      <div class="editor-toolbar" style="border-radius: 4px 4px 0 0;">
                          <button type="button" class="toolbar-btn" data-cmd="bold"><b>B</b></button>
                          <button type="button" class="toolbar-btn" data-cmd="italic"><i>I</i></button>
                          <button type="button" class="toolbar-btn" data-cmd="underline"><u>U</u></button>
                          <button type="button" class="toolbar-btn" data-cmd="insertUnorderedList">•</button>
                          <button type="button" class="toolbar-btn" data-cmd="insertOrderedList">1.</button>
                            <button type="button" class="toolbar-btn" data-cmd="removeFormat">Limpar formatação</button>
                      </div>
                      <div id="lote-solucao" class="smax-textarea" contenteditable="true" placeholder="Digite a solução que será aplicada em todos os chamados da lista..." style="height: 140px; border-radius: 0 0 4px 4px; border-top: none;"></div>
                  </div>

                  <div style="display: flex; justify-content: flex-end;">
                      <button id="btn-executar-lote" class="btn btn-primary">Resolver Tudo</button>
                   </div>

                  <div style="margin-top: 5px;">
                      <label style="font-weight: bold; color: #2c3e50; display: block; margin-bottom: 5px; font-size: 12px;">Terminal de Execução:</label>
                      <div id="lote-terminal" style="background: #1e272e; color: #2ecc71; font-family: monospace; font-size: 12px; padding: 10px; border-radius: 4px; height: 150px; overflow-y: auto; white-space: pre-wrap; line-height: 1.5;">Aguardando IDs e Solução...</div>
                  </div>
              </div>
          </div>
      `;

        document.body.appendChild(modal);
        document.getElementById('close-lote').onclick = () => modal.remove();

        const textIds = document.getElementById('lote-ids');
        const countVisor = document.getElementById('lote-count');
        const btnExecutar = document.getElementById('btn-executar-lote');
        const terminal = document.getElementById('lote-terminal');
        const solucaoEditor = document.getElementById('lote-solucao');

        // Funcionalidade do Rich Text Editor
        modal.querySelectorAll('.toolbar-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                const cmd = btn.getAttribute('data-cmd');
                solucaoEditor.focus();
                if (cmd === 'createlink') {
                    const url = prompt("URL do link:", "https://");
                    if (url) document.execCommand(cmd, false, url);
                } else {
                    document.execCommand(cmd, false, null);
                }
            };
        });

        const log = (msg, color = '#2ecc71') => {
            terminal.innerHTML += `<br><span style="color: ${color}">> ${msg}</span>`;
            terminal.scrollTop = terminal.scrollHeight;
        };

        textIds.addEventListener('input', () => {
            const raw = textIds.value.trim();
            const ids = raw.split(/[\s,]+/).filter(id => id.match(/^\d+$/));
            countVisor.innerText = `${ids.length} detectado(s)`;
        });

        btnExecutar.onclick = async () => {
            const rawIds = textIds.value.trim();
            const chamadosIds = [...new Set(rawIds.split(/[\s,]+/).filter(id => id.match(/^\d+$/)))];
            let solucaoHTML = solucaoEditor.innerHTML.trim();

            if (chamadosIds.length === 0) return alert("Digite pelo menos um ID de chamado!");
            if (!solucaoHTML || solucaoHTML === '<br>') return alert("A solução não pode estar vazia!");

            const confirmacao = confirm(`ATENÇÃO: Você está prestes a aplicar esta solução e RESOLVER ${chamadosIds.length} chamado(s).\n\nDeseja prosseguir com a operação?`);
            if (!confirmacao) return;

            btnExecutar.disabled = true;
            btnExecutar.innerText = "Processando...";
            textIds.disabled = true;
            solucaoEditor.contentEditable = "false";

            terminal.innerHTML = `> INICIANDO RESOLUÇÃO EM LOTE...`;

            // Tenta descobrir o ID do operador para assinar o chamado
            let meuIdOperador = null;
            try {
                const minhaMatricula = getMinhaMatricula();
                const resPerson = await fetch(`/rest/213963628/ems/Person?filter=Upn='${minhaMatricula}'&layout=Id&size=1`, { headers: { 'Accept': 'application/json' } });
                const dataPerson = await resPerson.json();
                if (dataPerson.entities && dataPerson.entities.length > 0) {
                    meuIdOperador = dataPerson.entities[0].properties.Id;
                }
            } catch(e) {
                log("Aviso: Não foi possível obter seu ID de analista. O chamado será resolvido mantendo o dono atual.", "#f39c12");
            }

            let sucessos = 0; let falhas = 0;

            for (const ticketId of chamadosIds) {
                log(`Processando chamado #${ticketId}...`, '#f1c40f');

                const payload = {
                    "entities": [{
                        "entity_type": "Request",
                        "properties": {
                            "Id": ticketId,
                            "Solution": solucaoHTML,
                            "CompletionCode": "CompletionCodeIncidentResolved"
                        }
                    }],
                    "operation": "UPDATE"
                };

                if (meuIdOperador) {
                    payload.entities[0].properties.ExpertAssignee = meuIdOperador;
                }

                try {
                    const resposta = await fetch('/rest/213963628/ems/bulk', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                            'X-XSRF-TOKEN': getCsrfToken()
                        },
                        body: JSON.stringify(payload)
                    });

                    const dados = await resposta.json();

                    if ((dados.meta && dados.meta.completion_status === "OK") ||
                        (dados.entity_result_list && dados.entity_result_list[0] && dados.entity_result_list[0].completion_status === "OK")) {
                        log(`#${ticketId} resolvido com sucesso!`);
                        sucessos++;
                    } else {
                        const errMsg = dados.meta?.errorDetailsMeta?.targetEntityDetails?.[0]?.errorDetails || "Rejeitado pelo SMAX";
                        throw new Error(errMsg);
                    }
                } catch (err) {
                    log(`Erro no #${ticketId}: ${err.message}`, '#e74c3c');
                    falhas++;
                }
                await sleep(400); // Respiro obrigatório da API
            }

            log(`\n=================================`, '#3498db');
            log(`OPERAÇÃO FINALIZADA!`, '#3498db');
            log(`Sucessos: ${sucessos} | Falhas: ${falhas}`, '#3498db');

            btnExecutar.innerText = "Operação Concluída";
            setTimeout(() => {
                btnExecutar.innerText = "Resolver Tudo";
                btnExecutar.disabled = false;
                textIds.disabled = false;
                solucaoEditor.contentEditable = "true";
            }, 3000);
        };
    }

    // =========================================================================
    // COPIAR ID DO CHAMADO NO CABEÇALHO
    // =========================================================================
    function initCopyableTicketId() {
        // MUDANÇA: Agora busca tanto a classe com 'pl-' quanto a sem 'pl-'
        const idElements = document.querySelectorAll('.pl-entity-page-header-id, .entity-page-header-id');

        if (!CONFIG.features.enableIdCopier) {
            idElements.forEach(el => {
                el.style.cursor = '';
                el.title = '';
                el.style.transition = '';
                el.style.color = '';
            });
            return;
        }

        // Aplica o visual
        idElements.forEach(el => {
            if (el.dataset.styleBound === 'true') return;
            el.dataset.styleBound = 'true';

            el.style.cursor = 'pointer';
            el.title = 'Clique para copiar o ID';
            el.style.transition = 'color 0.2s ease';

            el.addEventListener('mouseenter', () => {
                if (CONFIG.features.enableIdCopier && el.innerText !== 'Copiado!');
            });
            el.addEventListener('mouseleave', () => {
                if (CONFIG.features.enableIdCopier && el.innerText !== 'Copiado!') el.style.color = '';
            });
        });

        // Delegação de Evento Global
        if (window.smaxIdCopierBound) return;
        window.smaxIdCopierBound = true;

        document.addEventListener('click', (e) => {
            if (!CONFIG.features.enableIdCopier) return;

            // O clique também aceita as duas classes
            const target = e.target.closest('.pl-entity-page-header-id, .entity-page-header-id');

            if (target) {
                e.preventDefault();
                e.stopPropagation();

                const textToCopy = target.innerText.replace('Copiado!', '').trim();

                navigator.clipboard.writeText(textToCopy).then(() => {
                    const originalColor = target.style.color;

                    target.innerText = 'Copiado!';
                    target.style.color = '#27ae60';

                    setTimeout(() => {
                        target.innerText = textToCopy;
                        target.style.color = originalColor;
                    }, 1500);
                }).catch(err => {
                });
            }
        });
    }

    // =========================================================================
    // COPIAR IDs FILHOS (REGISTROS RELACIONADOS)
    // =========================================================================

    // Função que contém a sua lógica de extração
    async function executarCopiaDeIds(btnElement) {
        // 1. Pega o ID global dinamicamente da URL do SMAX
        const matchUrl = window.location.href.match(/\/saw\/Request\/(\d+)/);
        if (!matchUrl) {
            alert("Abra um chamado específico primeiro!");
            return;
        }
        const globalId = matchUrl[1];

        // 2. Feedback visual no botão
        const textoOriginal = btnElement.innerHTML;
        btnElement.dataset.feedbackAtivo = "1";
        btnElement.innerHTML = "Copiando...";
        btnElement.disabled = true;
        btnElement.style.opacity = "0.7";

        try {
            const pageSize = 1000;

            function getTenantId() {
                return document.cookie.match(/TENANTID=(\d+)/)?.[1] || "213963628";
            }

            function extrairIds(json) {
                const ids = new Set();
                function walk(value) {
                    if (!value) return;
                    if (Array.isArray(value)) {
                        value.forEach(walk);
                        return;
                    }
                    if (typeof value === "object") {
                        const props = value.properties || value.Properties || value;
                        if (props.Id && /^\d+$/.test(String(props.Id))) {
                            ids.add(String(props.Id));
                        }
                        if (value.entity?.properties?.Id) {
                            ids.add(String(value.entity.properties.Id));
                        }
                        Object.values(value).forEach(walk);
                    }
                }
                walk(json);
                ids.delete(String(globalId));
                return [...ids];
            }

            async function fetchJson(url) {
                const res = await fetch(url, {
                    credentials: "include",
                    headers: { Accept: "application/json" }
                });
                const text = await res.text();
                let json;
                try {
                    json = text ? JSON.parse(text) : {};
                } catch {
                    json = { raw: text };
                }
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
                }
                return json;
            }

            function mostrarNenhumIdEncontrado() {
                btnElement.disabled = false;
                btnElement.innerHTML = "Nenhum ID";
                btnElement.style.backgroundColor = "#fff4f2";
                btnElement.style.borderColor = "#f39c12";
                btnElement.style.color = "#8a5a00";
                btnElement.style.opacity = "1";
                btnElement.title = "Nenhum registro relacionado encontrado para copiar.";
}

            function montarUrl(baseUrl, paramName, start) {
                const url = new URL(baseUrl, location.origin);
                url.searchParams.set("layout", "Id,DisplayLabel,PhaseId,Status");
                url.searchParams.set("size", String(pageSize));
                if (paramName) {
                    url.searchParams.set(paramName, String(start));
                }
                return url.pathname + url.search;
            }

            const tenantId = getTenantId();
            const baseUrl = `/rest/${tenantId}/ems/Request/${encodeURIComponent(globalId)}/associations/RequestCausedByRequest`;
            const paginationParams = ["startIndex", "skip", "offset", "start", "from"];

            const primeiraUrl = montarUrl(baseUrl, null, 0);
            const primeiraJson = await fetchJson(primeiraUrl);
            const primeiraIds = extrairIds(primeiraJson);

            if (primeiraIds.length < pageSize) {
                if (primeiraIds.length === 0) {
                    mostrarNenhumIdEncontrado();
                    return;
                }

                await navigator.clipboard.writeText(primeiraIds.join(", "));
            } else {
                let paramCorreto = null;
                for (const param of paginationParams) {
                    try {
                        const testeUrl = montarUrl(baseUrl, param, pageSize);
                        const testeJson = await fetchJson(testeUrl);
                        const testeIds = extrairIds(testeJson);
                        const novos = testeIds.filter((id) => !primeiraIds.includes(id));
                        if (novos.length > 0) {
                            paramCorreto = param;
                            break;
                        }
                    } catch (error) {
                    }
                }

                if (!paramCorreto) {
                    if (primeiraIds.length === 0) {
                        mostrarNenhumIdEncontrado();
                        return;
                    }

                    await navigator.clipboard.writeText(primeiraIds.join(", "));
                } else {
                    const todos = new Set(primeiraIds);
                    for (let start = pageSize; ; start += pageSize) {
                        const url = montarUrl(baseUrl, paramCorreto, start);
                        const json = await fetchJson(url);
                        const idsPagina = extrairIds(json);

                        let novos = 0;
                        for (const id of idsPagina) {
                            if (!todos.has(id)) {
                                todos.add(id);
                                novos++;
                            }
                        }
                        if (idsPagina.length < pageSize || novos === 0) {
                            break;
                        }
                        await new Promise((resolve) => setTimeout(resolve, 250));
                    }
                    const resultado = [...todos];

                    if (resultado.length === 0) {
                        mostrarNenhumIdEncontrado();
                        return;
                    }

                    await navigator.clipboard.writeText(resultado.join(", "));
                }
            }

            // Sucesso visual
            btnElement.disabled = false;
            btnElement.innerHTML = "Copiado!";
            btnElement.style.backgroundColor = "#27ae60";
            btnElement.style.borderColor = "#27ae60";
            btnElement.style.color = "white";
            btnElement.style.opacity = "1";

        } catch (e) {
            btnElement.disabled = false;
            btnElement.innerHTML = "Erro";
            btnElement.style.backgroundColor = "#e74c3c";
            btnElement.style.borderColor = "#e74c3c";
            btnElement.style.color = "white";
            btnElement.style.opacity = "1";
        } finally {
            // Retorna o botão ao estado normal após 3 segundos
            setTimeout(() => {
                btnElement.innerHTML = textoOriginal;
                btnElement.disabled = false;

                delete btnElement.dataset.feedbackAtivo;

                btnElement.style.opacity = "";
                btnElement.style.backgroundColor = "";
                btnElement.style.color = "";
                btnElement.style.borderColor = "";
                btnElement.style.boxShadow = "";
                btnElement.title = "";
            }, 3000);
        }
    }

    // =========================================================================
    // INJETOR DO BOTÃO NA TELA (BARRA DE FERRAMENTAS - REGISTROS RELACIONADOS)
    // =========================================================================

    function injetarBotaoCopiarFilhos() {
    if (!CONFIG.features.enableContextualCopiarFilhos) {
        document.getElementById('btn-smax-copiar-filhos')?.closest('.tool-bar-item')?.remove();
        return;
    }

    // Garante que só rola na tela de chamados
    if (!window.location.href.includes('/saw/Request/')) {
        document.getElementById('btn-smax-copiar-filhos')?.closest('.tool-bar-item')?.remove();
        return;
    }

    if (document.getElementById('btn-smax-copiar-filhos')) return;

        // Busca especificamente o botão "Colunas" que está DENTRO da grid de "Registros Relacionados".
        const botaoColunas = document.querySelector('div[grid="relatedRecordsGrid"] [data-aid="tool-bar-main-dd-btn-column-picker"]');

        if (botaoColunas) {
            // No SMAX, os botões ficam dentro de um <span> organizador.
            // Subimos até esse span para colar o nosso botão do lado de fora dele.
            const toolbarItemPai = botaoColunas.closest('.tool-bar-item');

            if (toolbarItemPai && toolbarItemPai.parentNode) {

                // 1. Cria a caixa invisível em volta do botão (imita o padrão do SMAX)
                const nossoWrapper = document.createElement('span');
                nossoWrapper.className = 'tool-bar-item';

                // 2. Cria o botão em si
                const btn = document.createElement('button');
                btn.id = 'btn-smax-copiar-filhos';
                // Adicionamos 'btn-secondary' para tentar herdar o CSS nativo do sistema
                btn.className = 'btn btn-secondary plToolbarItem';
                btn.innerHTML = 'Copiar IDs';

                // Estilo "Secondary Button"
                btn.style.cssText = `
                    margin-left: 5px;
                    font-family: inherit;
                    font-size: 16px;       /* Ajustado para o tamanho dos menus SMAX */
                    font-weight: 400;      /* Peso mais leve para botões secundários */
                    color: #333333;        /* Cor do texto padrão */
                    background-color: #ffffff;
                    border: 1px solid #b7c1cc; /* Borda levemente mais escura que o fundo */
                    border-radius: 2px;
                    padding: 4px 12px;     /* Padding proporcional */
                    height: 28px;          /* Altura um pouco menor que o padrão */
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                `;

                btn.onmouseover = () => {
                    if (btn.dataset.feedbackAtivo === "1") return;
                    btn.style.backgroundColor = '#f3f4f6';
                    btn.style.borderColor = '#9aa5b1';
                };

                btn.onmouseout = () => {
                    if (btn.dataset.feedbackAtivo === "1") return;
                    btn.style.backgroundColor = '#ffffff';
                    btn.style.borderColor = '#b7c1cc';
                };

                btn.onmousedown = () => {
                    if (btn.dataset.feedbackAtivo === "1") return;
                    btn.style.backgroundColor = '#e5e7eb';
                    btn.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.1)';
                };

                btn.onmouseup = () => {
                    if (btn.dataset.feedbackAtivo === "1") return;
                    btn.style.backgroundColor = '#f3f4f6';
                    btn.style.boxShadow = 'none';
                };

                btn.onclick = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    executarCopiaDeIds(this);
                };

                // Monta o botão dentro do wrapper
                nossoWrapper.appendChild(btn);

                // Insere o nosso bloco EXATAMENTE após o bloco do botão "Colunas"
                toolbarItemPai.parentNode.insertBefore(nossoWrapper, toolbarItemPai.nextSibling);
            }
        }
    }

    // =========================================================================
    // A.R.I.A. — INTEGRAÇÃO GEMINI NOTEBOOK
    //
    // Este bloco reúne, dentro do userscript, tudo o que antes estava dividido
    // em manifest.json + background.js + content.js + content.css + notebook_bot.js.
    //
    // Equivalências:
    //   background.js (service worker)     -> ponte GM_setValue/GM_addValueChangeListener
    //   chrome.tabs.create/query           -> GM_openInTab + heartbeat por PING
    //   chrome.scripting (world MAIN)      -> acesso direto ao CKEDITOR (userscript já roda na página)
    //   fetch sem CORS no background       -> GM_xmlhttpRequest (@connect)
    //   content_scripts do notebook.google -> @match + roteador no topo do arquivo
    // =========================================================================

    GM_addStyle(`
      #aria-notebooklm-button-wrapper, #aria-notebooklm-button-wrapper .item-text { cursor: pointer; }

      #aria-modal-overlay { position: fixed; inset: 0; z-index: 999998; display: none; align-items: center; justify-content: center; background: rgba(0,0,0,0.42); font-family: inherit; }
      #aria-modal-overlay.aria-visible { display: flex; }
      #aria-modal { width: min(1180px, calc(100vw - 48px)); height: min(760px, calc(100vh - 48px)); background: #fff; border: 1px solid #c8c8c8; box-shadow: 0 8px 24px rgba(0,0,0,0.28); display: flex; flex-direction: column; overflow: hidden; }

      .aria-modal-header { min-height: 48px; padding: 0 16px; background: #f7f7f7; color: #333; border-bottom: 1px solid #d8d8d8; display: flex; align-items: center; justify-content: space-between; }
      .aria-modal-title { font-family: inherit; font-size: 15px; font-weight: 400; color: #333; }
      .aria-modal-close { min-width: 72px; height: 30px; padding: 0 14px; border: 1px solid #a7a7a7; background: #fff; color: #333; font: inherit; font-size: 13px; line-height: 28px; cursor: pointer; border-radius: 2px; text-align: center; }
      .aria-modal-close:hover { background: #eee; }
      .aria-modal-close:active { background: #e2e2e2; }
      .aria-modal-body { flex: 1; min-height: 0; display: grid; grid-template-columns: 360px 1fr; background: #f5f7fa; }

      .aria-panel-left { border-right: 1px solid #d8d8d8; background: #fff; padding: 16px; overflow: auto; }
      .aria-panel-right { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
      .aria-field-group { margin-bottom: 16px; }
      .aria-label { display: block; margin-bottom: 6px; font-size: 13px; color: #333; }
      .aria-help { margin-top: 6px; color: #666; font-size: 12px; line-height: 1.35; }

      .aria-input, .aria-textarea { width: 100%; box-sizing: border-box; border: 1px solid #b8b8b8; background: #fff; color: #333; font: inherit; font-size: 13px; outline: none; }
      .aria-input { height: 32px; padding: 0 8px; }
      .aria-textarea { min-height: 72px; resize: vertical; padding: 8px; line-height: 1.4; }
      .aria-input:focus, .aria-textarea:focus { border-color: #0073e7; box-shadow: 0 0 0 1px #0073e7; }
      .aria-prompt-textarea { min-height: 72px; max-height: 120px; }

      .aria-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
      .aria-btn { min-height: 32px; padding: 0 14px; border: 1px solid transparent; font: inherit; font-size: 13px; cursor: pointer; background: #fff; }
      .aria-btn:disabled { opacity: 0.55; cursor: not-allowed; }
      .aria-btn-primary { background: #0073e7; color: #fff; border-color: #0073e7; }
      .aria-btn-primary:hover:not(:disabled) { background: #005fbf; border-color: #005fbf; }
      .aria-btn-secondary { background: #fff; color: #333; border-color: #a7a7a7; }
      .aria-btn-secondary:hover:not(:disabled) { background: #eee; }
      .aria-btn-danger { background: #fff; color: #c0392b; border-color: #c0392b; }
      .aria-btn-danger:hover:not(:disabled) { background: #fdecea; }

      .aria-terminal-wrap { padding: 12px 16px; border-bottom: 1px solid #d8d8d8; background: #fff; }
      .aria-terminal-title { margin-bottom: 8px; font-size: 13px; color: #333; }
      #aria-terminal { height: 150px; padding: 10px; overflow: auto; background: #1f252d; color: #2ecc71; border: 1px solid #111820; font-family: Consolas, Monaco, monospace; font-size: 12px; line-height: 1.45; white-space: pre-wrap; }

      .aria-results { flex: 1; min-height: 0; padding: 16px; overflow: auto; }
      .aria-empty-state { height: 100%; min-height: 180px; border: 1px dashed #c8c8c8; background: #fff; color: #666; display: flex; align-items: center; justify-content: center; text-align: center; padding: 24px; box-sizing: border-box; }

      .aria-card { margin-bottom: 14px; border: 1px solid #c8c8c8; background: #fff; }
      .aria-card-header { min-height: 40px; padding: 0 12px; background: #edf3fb; border-bottom: 1px solid #c8c8c8; color: #333; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
      .aria-card-title { display: flex; align-items: center; gap: 6px; font-weight: 400; font-size: 14px; }
      .aria-card-actions { display: flex; gap: 6px; }
      .aria-card-body { padding: 12px; font-size: 13px; line-height: 1.45; }
      .aria-card-error .aria-card-header { background: #fdecea; color: #c0392b; }
      .aria-card-error { border-color: #e2a8a0; }
      .aria-editable { padding: 8px; border: 1px solid transparent; outline: none; }
      .aria-editable[contenteditable="true"] { border: 1px dashed #0073e7; background: #fff; }

      .aria-summary { margin-top: 18px; padding: 14px; border: 1px solid #c8c8c8; background: #fff; font-family: inherit; font-size: 13px; }
      .aria-summary-title { margin: 0 0 12px 0; color: #333; font-size: 13px; font-weight: 400; font-family: inherit; }
      .aria-summary-row { display: grid; grid-template-columns: 110px 1fr auto; gap: 8px; align-items: center; margin-bottom: 10px; }
      .aria-summary-label-success { color: #1f8a5b; font-weight: 600; }
      .aria-summary-label-error { color: #c0392b; font-weight: 600; }

      .aria-suggestion-bar { width: 100%; margin-top: 8px; margin-bottom: 12px; padding: 6px 0; display: flex; align-items: center; gap: 8px; box-sizing: border-box; font-family: inherit; }
      .aria-suggestion-input { flex: 1; min-width: 260px; height: 32px; padding: 4px 8px; border: 1px solid #b8b8b8; background: #fff; color: #333; font: inherit; font-size: 15px; outline: none; box-sizing: border-box; }
      .aria-suggestion-input:focus { border-color: #0073e7; box-shadow: 0 0 0 1px #0073e7; }

      /* Só geometria: cor, hover e estado desabilitado ficam por conta do CSS
         nativo do SMAX (classes .btn / .btn-primary), como no botão Designar. */
      .aria-suggestion-btn { min-height: 32px; padding-left: 20px; padding-right: 20px; margin-top: 5px; margin-bottom: 5px; position: relative; z-index: 2; font-size: 16px; white-space: nowrap; }
      .aria-suggestion-gear { min-height: 32px; margin-top: 5px; margin-bottom: 5px; padding: 0 10px; position: relative; z-index: 2; display: inline-flex; align-items: center; justify-content: center; }
      .aria-suggestion-gear i { line-height: 1; }

      .aria-sig-toolbar { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding: 6px; border: 1px solid #b8b8b8; border-bottom: none; background: #f4f6f8; }
      .aria-sig-tool { min-width: 32px; height: 28px; padding: 0 9px; border: 1px solid #c8c8c8; background: #fff; color: #333; font-family: inherit; font-size: 13px; line-height: 1; cursor: pointer; border-radius: 2px; }
      .aria-sig-tool:hover { background: #e8eef5; border-color: #0073e7; }
      .aria-sig-tool:active { background: #d9e4ef; }
      .aria-sig-tool-sep { width: 1px; height: 20px; background: #c8c8c8; margin: 0 2px; }
      .aria-sig-editor { width: 100%; box-sizing: border-box; min-height: 190px; max-height: 320px; overflow: auto; padding: 10px; border: 1px solid #b8b8b8; background: #fff; color: #333; font-family: inherit; font-size: 13px; line-height: 1.55; outline: none; }
      .aria-sig-editor:focus { border-color: #0073e7; box-shadow: 0 0 0 1px #0073e7; }
      .aria-sig-editor a { color: #0073e7; text-decoration: underline; }
      .aria-sig-editor:empty::before { content: attr(data-placeholder); color: #a4b0be; }
      .aria-sig-code { width: 100%; box-sizing: border-box; min-height: 190px; max-height: 320px; padding: 10px; border: 1px solid #b8b8b8; font-family: Consolas, Monaco, monospace; font-size: 12px; line-height: 1.45; resize: vertical; display: none; }

      .aria-ticket-view-btn { border: none; background: transparent; padding: 0; margin: 0; font-family: inherit; font-size: 12px; color: #0073e7; cursor: pointer; text-decoration: underline; }
      .aria-ticket-view-btn:hover { color: #005fbf; }
      .aria-ticket-view-btn:focus, .aria-ticket-view-btn:focus-visible, .aria-ticket-view-btn:active { outline: none; box-shadow: none; }
      .aria-ticket-desc-mini-overlay { position: fixed; inset: 0; z-index: 999999; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.20); font-family: inherit; }
      .aria-ticket-desc-mini-modal { width: min(540px, calc(100vw - 48px)); max-height: min(360px, calc(100vh - 80px)); background: #fff4f2; border: 1px solid #d8d8d8; box-shadow: 0 8px 20px rgba(0,0,0,0.20); display: flex; flex-direction: column; overflow: hidden; }
      .aria-ticket-desc-mini-header { min-height: 38px; padding: 0 10px; border-bottom: 1px solid #e2d1cd; background: #fff4f2; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .aria-ticket-desc-mini-title { font-family: inherit; font-size: 13px; color: #333; }
      .aria-ticket-desc-mini-close { min-height: 26px; padding: 0 10px; border: 1px solid #c8c8c8; background: #fff; color: #333; font-family: inherit; font-size: 12px; cursor: pointer; }
      .aria-ticket-desc-mini-close:hover { background: #eee; }
      .aria-ticket-desc-mini-body { padding: 10px; overflow: auto; white-space: pre-wrap; font-family: inherit; font-size: 12px; line-height: 1.45; color: #333; }
    `);

    const ARIA_BUTTON_ID = 'aria-notebooklm-button-wrapper';
    const ARIA_MODAL_ID = 'aria-modal-overlay';
    const ARIA_SUGGESTION_BAR_ID = 'aria-solution-suggestion-bar';
    const ARIA_ASSINATURA_KEY = 'aria_assinatura_v1';

    let ariaExecutando = false;
    let ariaCancelado = false;
    let cacheAria = {};
    let ariaIdsSucesso = [];
    let ariaIdsFalha = [];
    let ariaIdsGravados = [];
    let ariaTenantIdCache = null;

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------
    const ariaEscapeHtml = (valor) => String(valor)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

    function ariaIsRequestDetailPage() {
        return /^\/saw\/Request\/\d+(?:\/|$)/.test(location.pathname || '');
    }

    // -------------------------------------------------------------------------
    // ASSINATURA
    // Cada analista tem a sua. O Gemini Notebook devolve só o corpo da resposta;
    // a assinatura é colada aqui, no navegador de quem está atendendo.
    // -------------------------------------------------------------------------
    function ariaCarregarAssinatura() {
        const padrao = { ativa: true, html: ariaBridgeConfig().ASSINATURA };

        try {
            const salvo = localStorage.getItem(ARIA_ASSINATURA_KEY);
            if (!salvo) return padrao;

            const config = JSON.parse(salvo);

            return {
                ativa: config.ativa !== false,
                html: typeof config.html === 'string' ? config.html : padrao.html
            };
        } catch {
            return padrao;
        }
    }

    function ariaSalvarAssinatura(config) {
        localStorage.setItem(ARIA_ASSINATURA_KEY, JSON.stringify(config));
    }

    // Último portão antes do CKEditor. Reaplica as garantias de formatação em
    // cima do que veio da outra aba e anexa a assinatura deste analista.
    function ariaAplicarAssinatura(corpo) {
        const cfg = ariaBridgeConfig();
        const assinatura = ariaCarregarAssinatura();
        const usar = assinatura.ativa && assinatura.html.trim();

        let texto = String(corpo || '');

        // Só cortamos a assinatura que o modelo escreveu quando há uma
        // configurada para pôr no lugar — do contrário a resposta ficaria sem
        // fecho nenhum.
        if (usar) texto = ariaCortarAssinatura(texto, cfg.MARCAS_ASSINATURA);

        texto = ariaCompactarListas(ariaNormalizarQuebras(texto)).replace(/(<br>\s*)+$/g, '').trim();

        return usar ? `${texto}<br><br>${assinatura.html.trim()}` : texto;
    }

    // O SMAX esconde checkboxes nativos para desenhar os dele. Sem estas
    // declarações o input some da tela — é a mesma receita do painel
    // Configurações, que já convivia com isso.
    const ARIA_ESTILO_CHECKBOX = [
        '-webkit-appearance: checkbox !important',
        'appearance: auto !important',
        'width: 16px !important',
        'height: 16px !important',
        'display: inline-block !important',
        'opacity: 1 !important',
        'visibility: visible !important',
        'position: static !important',
        'margin: 0 !important',
        'flex: none !important',
        'cursor: pointer'
    ].join('; ');

    function abrirConfigAssinatura() {
        document.getElementById('aria-sig-modal')?.remove();

        const atual = ariaCarregarAssinatura();

        const modal = document.createElement('div');
        modal.id = 'aria-sig-modal';
        modal.className = 'smax-modal';

        modal.innerHTML = `
          <div class="smax-modal-content" style="width: 780px;">
            <div class="smax-modal-header">
              <span>Assinatura</span>
              <button class="smax-close-btn" id="aria-sig-close" type="button">&times;</button>
            </div>

            <div class="smax-modal-body">
              <p style="font-size:12px; color:#7f8c8d; margin-top:0;">
                Escreva abaixo o texto que deve ser anexado ao final de toda resposta gerada
                pela ARIA. Use os botões para formatar.
                A assinatura é sua e fica salva apenas neste navegador.
              </p>

              <label style="display:flex; align-items:center; gap:8px; margin-bottom:14px; cursor:pointer; font-size:13px; color:#2f3640;">
                <input type="checkbox" id="aria-sig-ativa" ${atual.ativa ? 'checked' : ''} style="${ARIA_ESTILO_CHECKBOX}">
                Anexar a assinatura automaticamente
              </label>

              <div class="aria-sig-toolbar">
                <button class="aria-sig-tool" data-cmd="bold" type="button" title="Negrito"><b>N</b></button>
                <button class="aria-sig-tool" data-cmd="italic" type="button" title="Itálico"><i>I</i></button>
                <div class="aria-sig-tool-sep"></div>
                <button class="aria-sig-tool" id="aria-sig-link" type="button" title="Inserir link">Inserir link</button>
                <button class="aria-sig-tool" data-cmd="unlink" type="button" title="Limpar link">Limpar link</button>
                <div class="aria-sig-tool-sep"></div>
                <button class="aria-sig-tool" data-cmd="removeFormat" type="button" title="Limpar formatação">Limpar formatação</button>
                <div style="flex:1;"></div>
                <button class="aria-sig-tool" id="aria-sig-toggle" type="button" title="Alternar entre o editor visual e o HTML">Ver HTML</button>
              </div>

              <div id="aria-sig-editor" class="aria-sig-editor" contenteditable="true"
                   data-placeholder="Ex.: Atenciosamente, Equipe de Suporte"></div>

              <textarea id="aria-sig-html" class="aria-sig-code" spellcheck="false"></textarea>

              <div style="margin-top:20px; display:flex; justify-content:space-between; align-items:center;">
                <button id="aria-sig-clear" class="btn" type="button">Limpar assinatura</button>
                <button id="aria-sig-save" class="btn btn-primary" type="button" style="padding: 8px 20px;">Salvar</button>
              </div>
            </div>
          </div>
        `;

        document.body.appendChild(modal);

        const editor = modal.querySelector('#aria-sig-editor');
        const codigo = modal.querySelector('#aria-sig-html');
        const chkAtiva = modal.querySelector('#aria-sig-ativa');
        const btnToggle = modal.querySelector('#aria-sig-toggle');

        let modoHtml = false;

        editor.innerHTML = atual.html;

        // Sem isso o Chrome formata com <span style="font-weight:bold">, que o
        // SMAX descarta. Com styleWithCSS desligado ele gera <b> e <i>.
        try {
            document.execCommand('styleWithCSS', false, false);
        } catch {
            // Navegador sem suporte: o serializador ainda dá conta do que sair.
        }

        // Enter insere uma quebra simples (o padrão criaria <div>, que vira
        // parágrafo). Duas quebras = parágrafo, igual ao resto do sistema.
        editor.addEventListener('keydown', (evento) => {
            if (evento.key === 'Enter') {
                evento.preventDefault();
                document.execCommand('insertLineBreak');
            }
        });

        // Colar de Word/Outlook traz uma montanha de markup. Normalizamos na
        // entrada para o que aparece na tela ser o que será gravado.
        editor.addEventListener('paste', (evento) => {
            evento.preventDefault();

            const dados = evento.clipboardData;
            if (!dados) return;

            const html = dados.getData('text/html');

            if (html) {
                const temporario = document.createElement('div');
                temporario.innerHTML = html;
                document.execCommand('insertHTML', false, ariaElementoParaHtmlSmax(temporario));
                return;
            }

            document.execCommand('insertText', false, dados.getData('text/plain'));
        });

        // O editor visual é a fonte da verdade; o HTML é só uma visão dele.
        const lerEditor = () => ariaElementoParaHtmlSmax(editor);

        const alternarModo = () => {
            modoHtml = !modoHtml;

            if (modoHtml) {
                codigo.value = lerEditor();
                editor.style.display = 'none';
                codigo.style.display = 'block';
                btnToggle.textContent = 'Ver editor';
            } else {
                editor.innerHTML = codigo.value;
                codigo.style.display = 'none';
                editor.style.display = 'block';
                btnToggle.textContent = 'Ver HTML';
            }
        };

        modal.querySelectorAll('.aria-sig-tool[data-cmd]').forEach((botao) => {
            botao.addEventListener('mousedown', (evento) => evento.preventDefault());
            botao.addEventListener('click', () => {
                if (modoHtml) return;
                editor.focus();
                document.execCommand(botao.getAttribute('data-cmd'), false, null);
            });
        });

        modal.querySelector('#aria-sig-link').addEventListener('mousedown', (evento) => evento.preventDefault());
        modal.querySelector('#aria-sig-link').addEventListener('click', () => {
            if (modoHtml) return;

            const selecao = String(window.getSelection() || '').trim();

            if (!selecao) {
                alert('Selecione primeiro o texto que deve virar link.');
                return;
            }

            const url = prompt('Endereço do link (começando com https://):', 'https://');

            if (!url || !/^https?:\/\//i.test(url.trim())) return;

            editor.focus();
            document.execCommand('createLink', false, url.trim());

            // execCommand não abre em nova aba; o SMAX espera target="_blank".
            editor.querySelectorAll('a').forEach((link) => link.setAttribute('target', '_blank'));
        });

        btnToggle.addEventListener('click', alternarModo);

        modal.querySelector('#aria-sig-clear').addEventListener('click', () => {
            editor.innerHTML = '';
            codigo.value = '';
            if (modoHtml) alternarModo();
            editor.focus();
        });

        modal.querySelector('#aria-sig-close').addEventListener('click', () => modal.remove());

        modal.addEventListener('click', (evento) => {
            if (evento.target === modal) modal.remove();
        });

        modal.querySelector('#aria-sig-save').addEventListener('click', () => {
            if (modoHtml) alternarModo();

            ariaSalvarAssinatura({ ativa: chkAtiva.checked, html: lerEditor() });
            modal.remove();
        });

        editor.focus();
    }

    function ariaLogTerminal(mensagem, isErro = false) {
        const terminal = document.getElementById('aria-terminal');
        if (!terminal) return;

        const cor = isErro ? '#ff5f56' : '#2ecc71';
        terminal.innerHTML += `<br><span style="color:${cor}">&gt; ${ariaEscapeHtml(mensagem)}</span>`;
        terminal.scrollTop = terminal.scrollHeight;
    }

    // -------------------------------------------------------------------------
    // PONTE COM A ABA DO Gemini Notebook
    // Substitui o background.js: em vez de chrome.tabs.sendMessage, gravamos um
    // pedido no armazenamento do Tampermonkey; a outra aba recebe o evento de
    // mudança de valor (que, ao contrário de setTimeout, não sofre throttling).
    // -------------------------------------------------------------------------
    function ariaNbEnviar(mensagem, timeoutMs) {
        const cfg = ariaBridgeConfig();

        return new Promise((resolve, reject) => {
            const idRequisicao = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

            let finalizado = false;
            let idListener = null;
            let idListenerLog = null;
            let timer = null;

            const encerrar = () => {
                if (idListener !== null) GM_removeValueChangeListener(idListener);
                if (idListenerLog !== null) GM_removeValueChangeListener(idListenerLog);
                if (timer !== null) clearTimeout(timer);
            };

            idListener = GM_addValueChangeListener(cfg.KEY_RES, (nome, anterior, novo) => {
                if (finalizado || !novo || novo.id !== idRequisicao) return;
                finalizado = true;
                encerrar();

                if (novo.sucesso) resolve(novo);
                else reject(new Error(novo.erro || 'Falha não informada pelo Gemini Notebook.'));
            });

            idListenerLog = GM_addValueChangeListener(cfg.KEY_LOG, (nome, anterior, novo) => {
                if (finalizado || !novo || novo.id !== idRequisicao) return;
                ariaLogTerminal(`[Gemini Notebook] ${novo.msg}`);
            });

            timer = setTimeout(() => {
                if (finalizado) return;
                finalizado = true;
                encerrar();
                reject(new Error('A aba do Gemini Notebook não respondeu no tempo esperado.'));
            }, timeoutMs);

            GM_setValue(cfg.KEY_REQ, { id: idRequisicao, ...mensagem, t: Date.now() });
        });
    }

    async function ariaNbPing(timeoutMs) {
        try {
            return await ariaNbEnviar({ acao: 'PING' }, timeoutMs);
        } catch {
            return null;
        }
    }

    async function ariaNbGarantirAba() {
        const cfg = ariaBridgeConfig();

        let ping = await ariaNbPing(cfg.TIMEOUT_PING);

        if (!ping) {
            ariaLogTerminal('Abrindo a aba do Gemini Notebook em segundo plano...');
            GM_openInTab(cfg.NOTEBOOK_URL, { active: false, insert: true, setParent: true });

            for (let tentativa = 0; tentativa < 45 && !ping; tentativa++) {
                await sleep(2000);
                ping = await ariaNbPing(3000);
            }

            if (!ping) {
                throw new Error('A aba do Gemini Notebook demorou muito para responder. Verifique se você está logado no Google.');
            }

            // O Gemini Notebook ainda hidrata a interface depois do primeiro paint.
            await sleep(8000);
        }

        // O Tampermonkey só troca o código de uma aba no recarregamento. Uma aba
        // do Gemini Notebook aberta desde antes da atualização continua rodando o
        // agente antigo — e devolve texto com a formatação velha e a assinatura
        // já embutida. Melhor recusar do que gravar resposta torta no chamado.
        if (ping.versao !== cfg.VERSAO) {
            throw new Error(
                `A aba do Gemini Notebook está com uma versão antiga da ARIA (${ping.versao || 'anterior à 4.1'}, esperada ${cfg.VERSAO}). `
                + 'Recarregue aquela aba com F5 e tente novamente.'
            );
        }

        return true;
    }

    // -------------------------------------------------------------------------
    // PORTEIRO (Cloudflare Worker)
    // GM_xmlhttpRequest evita depender do CORS do Worker.
    // -------------------------------------------------------------------------
    function ariaRequisicaoCloudflare(corpo, timeoutMs = 45000) {
        const cfg = ariaBridgeConfig();

        if (typeof GM_xmlhttpRequest !== 'function') {
            return fetch(cfg.CLOUDFLARE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(corpo)
            }).then((r) => {
                if (!r.ok) throw new Error(`Falha no Porteiro Cloudflare: HTTP ${r.status}`);
                return r.json();
            });
        }

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: cfg.CLOUDFLARE_URL,
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(corpo),
                timeout: timeoutMs,
                onload: (resposta) => {
                    if (resposta.status < 200 || resposta.status >= 300) {
                        reject(new Error(`Falha no Porteiro Cloudflare: HTTP ${resposta.status}`));
                        return;
                    }
                    try {
                        resolve(JSON.parse(resposta.responseText || '{}'));
                    } catch {
                        reject(new Error('O Porteiro Cloudflare devolveu um JSON inválido.'));
                    }
                },
                onerror: () => reject(new Error('Não foi possível falar com o Porteiro Cloudflare.')),
                ontimeout: () => reject(new Error('O Porteiro Cloudflare demorou demais para responder.'))
            });
        });
    }

    // -------------------------------------------------------------------------
    // API DO SMAX
    // -------------------------------------------------------------------------
    function ariaDescobrirTenantId() {
        if (ariaTenantIdCache) return ariaTenantIdCache;

        const fontes = [location.href];

        document.querySelectorAll('[src], [href], [data-url], [ng-src]').forEach((el) => {
            fontes.push(
                el.getAttribute('src') || '',
                el.getAttribute('href') || '',
                el.getAttribute('data-url') || '',
                el.getAttribute('ng-src') || ''
            );
        });

        for (const fonte of fontes) {
            const achou = String(fonte || '').match(/(?:\.\.)?\/rest\/(\d+)\//);
            if (achou) {
                ariaTenantIdCache = achou[1];
                return ariaTenantIdCache;
            }
        }

        const achouNoHtml = (document.documentElement.innerHTML || '').match(/\/rest\/(\d+)\//);
        if (achouNoHtml) {
            ariaTenantIdCache = achouNoHtml[1];
            return ariaTenantIdCache;
        }

        // Último recurso: o tenant fixo já usado no restante do script.
        ariaTenantIdCache = '213963628';
        return ariaTenantIdCache;
    }

    function ariaHtmlParaTexto(html) {
        if (!html) return '';

        const div = document.createElement('div');
        div.innerHTML = String(html);
        div.querySelectorAll('script, style, img').forEach((el) => el.remove());

        return (div.innerText || div.textContent || '')
            .replace(/ /g, ' ')
            .replace(/[ \t]+/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    function ariaNormalizarRespostaTicket(json) {
        if (!json) return null;
        if (json.entity && json.entity.properties) return json.entity;
        if (Array.isArray(json.entities) && json.entities.length > 0) return json.entities[0];
        if (json.properties) return json;
        if (json.data && json.data.properties) return json.data;
        if (json.data && Array.isArray(json.data.entities) && json.data.entities.length > 0) return json.data.entities[0];
        return null;
    }

    async function ariaBuscarTicket(ticketId) {
        const tenantId = ariaDescobrirTenantId();

        const layout = [
            'Id', 'DisplayLabel', 'Description', 'PhaseId', 'Status',
            'StatusSCCDSMAX_c', 'LastUpdateTime', 'UserOptions', 'NumeroRejeicoes_c'
        ].join(',');

        const urls = [
            `/rest/${tenantId}/ems/Request/${encodeURIComponent(ticketId)}?layout=${encodeURIComponent(layout)}`,
            `/rest/${tenantId}/ems/Request?filter=${encodeURIComponent(`Id='${ticketId}'`)}&layout=${encodeURIComponent(layout)}`
        ];

        let ultimoErro = null;

        for (const url of urls) {
            try {
                const resposta = await fetch(url, {
                    method: 'GET',
                    credentials: 'include',
                    headers: { Accept: 'application/json' }
                });

                if (!resposta.ok) {
                    ultimoErro = new Error(`HTTP ${resposta.status} em ${url}`);
                    continue;
                }

                const entidade = ariaNormalizarRespostaTicket(await resposta.json());
                if (entidade) return entidade.properties || entidade.Properties || {};

                ultimoErro = new Error(`Resposta sem entidade Request válida em ${url}`);
            } catch (erro) {
                ultimoErro = erro;
            }
        }

        throw new Error(`Não foi possível consultar o chamado ${ticketId} na API do SMAX. ${ultimoErro ? ultimoErro.message : ''}`);
    }

    function ariaValidarBarreiras({ descricaoSmax, faseAtual, numeroRejeicoes, userOptions, textoLimpo }) {
        const BARRAR_REJEITADOS = false;
        const BARRAR_ANEXOS = false;
        const BARRAR_IMAGENS = false;
        const BARRAR_CNJ = false;

        const fase = String(faseAtual || '').toUpperCase();

        if (fase === 'RESOLVED' || fase === 'LOG') {
            throw new Error('ABORTADO: Já consta como Resolvido ou Fechado.');
        }

        if (BARRAR_REJEITADOS) {
            if (fase === 'REVIEW' || fase === 'REVISAR') {
                throw new Error('ABORTADO: Está na fase Revisar.');
            }
            if (numeroRejeicoes > 0) {
                throw new Error(`ABORTADO: Possui histórico de rejeição (${numeroRejeicoes} vez(es)).`);
            }
        }

        if (BARRAR_ANEXOS && (userOptions.includes('"file_name"') || userOptions.includes('"file_extension"'))) {
            throw new Error('ABORTADO: Possui arquivos anexados.');
        }

        if (BARRAR_IMAGENS && descricaoSmax.includes('<img')) {
            throw new Error('ABORTADO: Contém imagem colada.');
        }

        if (!textoLimpo || textoLimpo.length < 1) {
            throw new Error('Descrição muito curta ou vazia.');
        }

        const cnjRegex = /\b\d{7}[-.\s]?\d{2}[-.\s]?(?:19|20)\d{2}[-.\s]?\d{1,2}[-.\s]?\d{2}[-.\s]?\d{4}\b/;
        let temCnj = cnjRegex.test(textoLimpo);

        if (!temCnj && userOptions) {
            try {
                const opcoes = JSON.parse(userOptions);
                for (const chave in opcoes) {
                    const valor = opcoes[chave];
                    if (typeof valor === 'string'
                        && !valor.includes('complexTypeProperties')
                        && !valor.includes('{"')
                        && cnjRegex.test(valor)) {
                        temCnj = true;
                        break;
                    }
                }
            } catch {
                // UserOptions nem sempre é JSON válido.
            }
        }

        if (BARRAR_CNJ && temCnj) {
            throw new Error('ABORTADO: Contém número de processo CNJ.');
        }
    }

    async function ariaProcessarTicket(ticketId, promptPersonalizado) {
        const cfg = ariaBridgeConfig();

        const propriedades = await ariaBuscarTicket(ticketId);
        const descricaoSmax = propriedades.Description || '';
        const textoLimpo = ariaHtmlParaTexto(descricaoSmax);

        if (!textoLimpo || textoLimpo.length < 3) {
            throw new Error(`Chamado ${ticketId} retornou sem descrição suficiente para análise.`);
        }

        ariaValidarBarreiras({
            descricaoSmax,
            faseAtual: propriedades.PhaseId || '',
            numeroRejeicoes: parseInt(propriedades.NumeroRejeicoes_c, 10) || 0,
            userOptions: propriedades.UserOptions || '',
            textoLimpo
        });

        const porteiro = await ariaRequisicaoCloudflare({
            action: 'filtrar_automacao',
            textoChamado: textoLimpo
        });

        const decisao = porteiro.decisao || 'ABORTAR_AUTO';

        if (decisao.includes('ABORTAR')) {
            throw new Error(`Porteiro bloqueou. Motivo: ${porteiro.motivo || 'Não informado.'}`);
        }

        await ariaNbGarantirAba();

        const resposta = await ariaNbEnviar({
            acao: 'RODAR_NOTEBOOKLM',
            textoChamado: textoLimpo,
            instrucaoExtra: (promptPersonalizado && promptPersonalizado.trim()) || cfg.PROMPT_PADRAO
        }, cfg.TIMEOUT_RODAR);

        return {
            html: ariaAplicarAssinatura(resposta.texto || ''),
            descricao: textoLimpo,
            lastUpdate: propriedades.LastUpdateTime || null,
            expertAssignee: null
        };
    }

    async function ariaGravarTicketNaApi({ ticketId, lastUpdate, solucaoHtml, expertAssignee }) {
        if (!ticketId) throw new Error('ID do chamado não informado para gravação.');
        if (!lastUpdate) throw new Error(`LastUpdateTime não encontrado para o chamado ${ticketId}.`);
        if (!solucaoHtml || !String(solucaoHtml).trim()) throw new Error(`Solução vazia para o chamado ${ticketId}.`);

        const tenantId = ariaDescobrirTenantId();

        const propriedades = {
            Id: String(ticketId),
            LastUpdateTime: lastUpdate,
            Solution: solucaoHtml,
            CompletionCode: 'CompletionCodeIncidentResolved'
        };

        if (expertAssignee) propriedades.ExpertAssignee = expertAssignee;

        const payload = {
            entities: [{ entity_type: 'Request', properties: propriedades }],
            operation: 'UPDATE'
        };

        const cabecalhos = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        };

        const token = getCsrfToken();
        if (token) {
            cabecalhos['X-XSRF-TOKEN'] = token;
            cabecalhos['X-CSRF-TOKEN'] = token;
        }

        const urls = [`/rest/${tenantId}/ems/bulk`, `/rest/${tenantId}/ems/bulk/`, `/rest/${tenantId}/ems/Request`];
        let ultimoErro = null;

        for (const url of urls) {
            try {
                const resposta = await fetch(url, {
                    method: 'POST',
                    credentials: 'include',
                    headers: cabecalhos,
                    body: JSON.stringify(payload)
                });

                const texto = await resposta.text();

                if (!resposta.ok) {
                    ultimoErro = new Error(`HTTP ${resposta.status} em ${url}: ${texto.slice(0, 300)}`);
                    continue;
                }

                return true;
            } catch (erro) {
                ultimoErro = erro;
            }
        }

        throw new Error(`Não foi possível gravar o chamado ${ticketId}. ${ultimoErro ? ultimoErro.message : ''}`);
    }

    // -------------------------------------------------------------------------
    // ESCRITA NO CKEDITOR DO CAMPO "SOLUÇÃO"
    // A extensão precisava de chrome.scripting no mundo MAIN; o userscript já
    // roda no contexto da página, então basta falar com o CKEDITOR direto.
    // -------------------------------------------------------------------------
    function ariaLocalizarEditorSolucao() {
        if (typeof CKEDITOR === 'undefined' || !CKEDITOR.instances) return null;

        // Só é o editor de Solução quem está DENTRO do campo de Solução.
        // A versão anterior aceitava o nome "plCkeditor0" como prova, e esse
        // índice pertence a quem foi criado primeiro — muitas vezes a
        // Descrição. Daí a resposta ia parar na caixa errada.
        const ehSolucao = (editor) => {
            if (!editor) return false;

            if (String(editor.name || '').includes('onlyResolution_Solution')) return true;

            const original = editor.element && editor.element.$;

            if (original) {
                const idNome = `${original.id || ''} ${original.name || ''}`;
                if (idNome.includes('onlyResolution_Solution')) return true;
                if (original.closest(ARIA_SEL_SOLUCAO)) return true;
            }

            const container = editor.container && editor.container.$;

            return Boolean(container && container.closest(ARIA_SEL_SOLUCAO));
        };

        const editores = Object.values(CKEDITOR.instances);

        const visivel = editores.find((editor) => {
            const container = editor && editor.container && editor.container.$;
            return ehSolucao(editor) && container && container.getBoundingClientRect().height > 0;
        });

        return visivel || editores.find(ehSolucao) || null;
    }


    function ariaDefinirValorNativo(elemento, valor) {
        if (!elemento || !('value' in elemento)) return;

        const prototipo = elemento instanceof HTMLTextAreaElement
            ? HTMLTextAreaElement.prototype
            : HTMLInputElement.prototype;
        const descritor = Object.getOwnPropertyDescriptor(prototipo, 'value');

        if (descritor && descritor.set) descritor.set.call(elemento, valor);
        else elemento.value = valor;
    }

    function ariaNotificarAngular(elemento) {
        const ng = (typeof unsafeWindow !== 'undefined' ? unsafeWindow.angular : null) || window.angular;
        if (!elemento || !ng) return;

        try {
            const wrapped = ng.element(elemento);

            if (wrapped && typeof wrapped.triggerHandler === 'function') {
                ['input', 'change', 'blur'].forEach((evento) => wrapped.triggerHandler(evento));
            }

            const scope = wrapped && (
                (typeof wrapped.scope === 'function' && wrapped.scope())
                || (typeof wrapped.isolateScope === 'function' && wrapped.isolateScope())
            );

            if (scope) {
                if (typeof scope.$applyAsync === 'function') scope.$applyAsync();
                else if (!scope.$phase && typeof scope.$apply === 'function') scope.$apply();
            }
        } catch {
            // O SMAX nem sempre expõe o escopo Angular; falhar aqui é inofensivo.
        }
    }

    function ariaSincronizarEditor(editor, html) {
        const textarea = editor && editor.element && editor.element.$;

        if (textarea) {
            ariaDefinirValorNativo(textarea, html);
            ['input', 'change', 'keyup', 'blur'].forEach((evento) => {
                textarea.dispatchEvent(new Event(evento, { bubbles: true, cancelable: true }));
            });
            ariaNotificarAngular(textarea);
        }

        const container = editor && editor.container && editor.container.$;

        if (container) {
            ['input', 'change', 'keyup', 'blur'].forEach((evento) => {
                container.dispatchEvent(new Event(evento, { bubbles: true, cancelable: true }));
            });
            ariaNotificarAngular(container);
        }
    }

    // Escreve com insertHtml sobre o editor esvaziado, imitando o caminho do
    // Banco de Soluções (insertSmartHtml), que é o que comprovadamente grava
    // neste SMAX. setData() troca o documento por fora do pipeline de edição do
    // CKEditor, e é por isso que o texto aparecia na tela mas sumia ao salvar.
    function ariaEscreverNoEditor(editor, htmlFinal) {
        return new Promise((resolve, reject) => {
            let inseriu = false;
            let concluiu = false;

            const conteudoDoEditor = () => {
                const textarea = editor.element && editor.element.$;

                if (textarea && typeof textarea.value === 'string' && textarea.value.trim()) {
                    return textarea.value;
                }

                try {
                    return String(editor.getData ? editor.getData() : '');
                } catch {
                    return '';
                }
            };

            const concluir = () => {
                if (concluiu) return;
                concluiu = true;

                try {
                    if (typeof editor.updateElement === 'function') editor.updateElement();

                    if (typeof editor.fire === 'function') {
                        editor.fire('saveSnapshot');
                        editor.fire('change');
                        editor.fire('blur');
                    }

                    ariaSincronizarEditor(editor, htmlFinal);
                } catch {
                    // Os eventos são complemento; o conteúdo já foi aplicado.
                }

                // Confere se o texto REALMENTE ficou no campo que vai ser
                // enviado. Sem isto, uma falha silenciosa virava "gravei" na
                // tela e nada no chamado.
                if (conteudoDoEditor().replace(/<[^>]+>/g, '').trim().length < 3) {
                    reject(new Error('O editor de Solução exibiu o texto mas não o reteve. Clique dentro da caixa de Solução e tente de novo.'));
                    return;
                }

                resolve(true);
            };

            const inserir = () => {
                if (inseriu) return;
                inseriu = true;

                try {
                    editor.insertHtml(htmlFinal, 'unfiltered_html');
                } catch {
                    try {
                        editor.insertHtml(htmlFinal);
                    } catch {
                        try {
                            editor.setData(htmlFinal);
                        } catch {
                            // Cai na verificação de concluir(), que rejeita.
                        }
                    }
                }

                setTimeout(concluir, 80);
            };

            try {
                if (typeof editor.focus === 'function') editor.focus();

                if (typeof editor.setData === 'function') {
                    editor.setData('', { callback: inserir });
                    // Rede: nem toda build do CKEditor chama o callback.
                    setTimeout(inserir, 700);
                    return;
                }

                inserir();
            } catch {
                inserir();
            }
        });
    }

    function ariaDefinirSolucaoNoEditor(html) {
        const htmlFinal = String(html || '');

        if (htmlFinal.trim().length < 3) {
            return Promise.reject(new Error('A resposta gerada está vazia.'));
        }

        const editor = ariaLocalizarEditorSolucao();

        if (editor) return ariaEscreverNoEditor(editor, htmlFinal);


        const wysiwyg = document.querySelector('#onlyResolution_Solution_container .cke_wysiwyg_div');

        if (wysiwyg) {
            wysiwyg.innerHTML = htmlFinal;
            ['input', 'keyup', 'change'].forEach((evento) => {
                wysiwyg.dispatchEvent(new Event(evento, { bubbles: true }));
            });
            return Promise.resolve(true);
        }

        // Sempre a partir do campo Solução. Um getElementById('plCkeditor0')
        // solto pega quem foi criado primeiro, que costuma ser a Descrição.
        const textarea = document.querySelector('#onlyResolution_Solution_container textarea')
            || document.querySelector("[data-aid='onlyResolution_Solution'] textarea")
            || document.querySelector("textarea[name*='Solution'], textarea[id*='Solution']");

        if (textarea) {
            ariaDefinirValorNativo(textarea, htmlFinal);
            ['input', 'change', 'keyup', 'blur'].forEach((evento) => {
                textarea.dispatchEvent(new Event(evento, { bubbles: true, cancelable: true }));
            });
            ariaNotificarAngular(textarea);
            return Promise.resolve(true);
        }

        return Promise.reject(new Error('Não foi possível localizar o editor de Solução do SMAX.'));
    }

    // -------------------------------------------------------------------------
    // BOTÃO NO SUBMENU + BARRA "SUGERIR SOLUÇÃO"
    // -------------------------------------------------------------------------
    function initAriaHeaderButton() {
        if (CONFIG.features.enableAriaNotebook === false) {
            document.getElementById(ARIA_BUTTON_ID)?.remove();
            return;
        }

        const ponto = document.querySelector('.sub-menu-items-tabs.show-items-tabs');
        if (!ponto || document.getElementById(ARIA_BUTTON_ID)) return;

        const wrapper = document.createElement('div');
        wrapper.id = ARIA_BUTTON_ID;
        wrapper.className = 'subitem-link aria-subitem-link';
        wrapper.setAttribute('data-aid', 'aria-automatizar-notebooklm');
        wrapper.setAttribute('role', 'button');
        wrapper.setAttribute('tabindex', '0');
        wrapper.setAttribute('title', 'Assistente');

        const link = document.createElement('a');
        link.className = 'item-text';
        link.href = 'javascript:void(0)';
        link.title = 'Assistente';
        link.textContent = 'Assistente';
        wrapper.appendChild(link);

        wrapper.addEventListener('click', (evento) => {
            evento.preventDefault();
            evento.stopPropagation();
            setTimeout(abrirModalAria, 50);
        });

        wrapper.addEventListener('keydown', (evento) => {
            if (evento.key === 'Enter' || evento.key === ' ') {
                evento.preventDefault();
                abrirModalAria();
            }
        });

        ponto.appendChild(wrapper);
    }

    // Seletores do CAMPO Solução. São a única âncora confiável: o CKEditor
    // numera as instâncias por ordem de criação, e o editor da Descrição
    // costuma ficar com o índice 0. Partir de #cke_plCkeditor0 era o motivo de
    // a barra às vezes nascer na caixa de cima.
    const ARIA_SEL_SOLUCAO = "#onlyResolution_Solution_container, [data-aid='onlyResolution_Solution']";

    function ariaLocalizarCampoSolucao() {
        return document.getElementById('onlyResolution_Solution_container')
            || document.querySelector('[data-aid="onlyResolution_Solution"]');
    }

    function initAriaSuggestionBar() {
        if (CONFIG.features.enableAriaNotebook === false || !ariaIsRequestDetailPage()) {
            document.getElementById(ARIA_SUGGESTION_BAR_ID)?.remove();
            return;
        }

        const campo = ariaLocalizarCampoSolucao();
        const barraExistente = document.getElementById(ARIA_SUGGESTION_BAR_ID);

        if (!campo) {
            barraExistente?.remove();
            return;
        }

        // Auto-conserto: se a barra ficou pendurada fora do campo Solução
        // (tela montada fora de ordem), tira dali e injeta no lugar certo.
        if (barraExistente) {
            if (campo.contains(barraExistente)) return;
            barraExistente.remove();
        }

        const ckeditor = campo.querySelector('.cke_chrome') || campo.querySelector('.cke');
        if (!ckeditor) return;

        const barra = document.createElement('div');
        barra.id = ARIA_SUGGESTION_BAR_ID;
        barra.className = 'aria-suggestion-bar';

        barra.innerHTML = `
          <input id="aria-suggestion-prompt" class="aria-suggestion-input" type="text" placeholder="Prompt opcional." autocomplete="off">
          <button id="aria-suggestion-btn" class="btn btn-primary aria-suggestion-btn" type="button">Sugerir solução</button>
          <button id="aria-suggestion-config" class="btn aria-suggestion-gear" type="button" title="Configurar assinatura">
            <i class="icon-settings"></i>
          </button>
        `;

        ckeditor.insertAdjacentElement('afterend', barra);

        barra.querySelector('#aria-suggestion-btn').addEventListener('click', executarSugestaoDeSolucao);
        barra.querySelector('#aria-suggestion-config').addEventListener('click', abrirConfigAssinatura);
    }


    async function executarSugestaoDeSolucao() {
        const botao = document.getElementById('aria-suggestion-btn');
        const campoPrompt = document.getElementById('aria-suggestion-prompt');
        const ticketId = getCurrentTicketId();

        if (!ticketId) {
            alert('Não foi possível identificar o ID do chamado pela URL.');
            return;
        }

        // Mesmo comportamento do botão Designar: só troca o texto e desabilita.
        // O cinza de "processando" vem do CSS nativo do SMAX.
        const textoOriginal = botao.innerHTML;
        botao.disabled = true;
        botao.innerHTML = '&nbsp;Gerando...';

        try {
            const resultado = await ariaProcessarTicket(ticketId, campoPrompt?.value?.trim() || '');
            await ariaDefinirSolucaoNoEditor(resultado.html);

            try {
                await fillSelect2ByExactLabel('Código de conclusão', 'Incidente resolvido', 3000);
            } catch {
                // Preencher o código de conclusão é um conforto, não um requisito.
            }
        } catch (erro) {
            alert('Erro ao gerar sugestão de solução: ' + erro.message);
        } finally {
            botao.disabled = false;
            botao.innerHTML = textoOriginal;
        }
    }

    // -------------------------------------------------------------------------
    // MODAL DE LOTE
    // -------------------------------------------------------------------------
    function criarModalAriaSeNecessario() {
        if (document.getElementById(ARIA_MODAL_ID)) return;

        const overlay = document.createElement('div');
        overlay.id = ARIA_MODAL_ID;

        overlay.innerHTML = `
          <div id="aria-modal" role="dialog" aria-modal="true" aria-labelledby="aria-modal-title">
            <div class="aria-modal-header">
              <div id="aria-modal-title" class="aria-modal-title">Assistente de Resoluções Integradas e Automações</div>
              <div style="display:flex; align-items:center; gap:8px;">
                <button id="aria-btn-assinatura" class="aria-btn aria-btn-secondary aria-modal-close" type="button" title="Configurar assinatura" style="min-width:0; padding:0 12px;">
                  <i class="icon-settings"></i>
                </button>
                <button id="aria-btn-fechar" class="aria-btn aria-btn-secondary aria-modal-close" type="button" title="Fechar">Fechar</button>
              </div>
            </div>

            <div class="aria-modal-body">
              <div class="aria-panel-left">
                <div class="aria-field-group">
                  <label class="aria-label" for="aria-ticket-ids">IDs dos chamados</label>
                  <textarea id="aria-ticket-ids" class="aria-textarea" placeholder=""></textarea>
                  <div class="aria-help">Separe os IDs por vírgula, espaço ou quebra de linha.</div>
                </div>

                <div class="aria-field-group">
                  <label class="aria-label" for="aria-custom-prompt">Prompt personalizado</label>
                  <textarea id="aria-custom-prompt" class="aria-textarea aria-prompt-textarea" placeholder="Opcional. Se preenchido, substituirá o prompt padrão."></textarea>
                  <div class="aria-help">Deixe em branco para usar o prompt padrão.</div>
                </div>

                <div class="aria-actions">
                  <button id="aria-btn-run" class="aria-btn aria-btn-primary" type="button">Simular</button>
                  <button id="aria-btn-stop" class="aria-btn aria-btn-danger" type="button" disabled>Parar</button>
                  <button id="aria-btn-clear" class="aria-btn aria-btn-secondary" type="button">Limpar</button>
                </div>
              </div>

              <div class="aria-panel-right">
                <div class="aria-terminal-wrap">
                  <div class="aria-terminal-title">Terminal de execução</div>
                  <div id="aria-terminal">&gt; Aguardando execução...</div>
                </div>

                <div id="aria-results" class="aria-results">
                  <div class="aria-empty-state">
                    As respostas geradas pelo Gemini Notebook aparecerão aqui para revisão, edição e gravação.
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;

        document.body.appendChild(overlay);

        overlay.addEventListener('click', (evento) => {
            if (evento.target === overlay) evento.stopPropagation();
        });

        document.getElementById('aria-btn-fechar').addEventListener('click', fecharModalAria);
        document.getElementById('aria-btn-assinatura').addEventListener('click', abrirConfigAssinatura);
        document.getElementById('aria-btn-run').addEventListener('click', rodarLoteAria);
        document.getElementById('aria-btn-stop').addEventListener('click', solicitarCancelamentoAria);
        document.getElementById('aria-btn-clear').addEventListener('click', limparModalAria);
    }

    function abrirModalAria() {
        criarModalAriaSeNecessario();

        const modal = document.getElementById(ARIA_MODAL_ID);
        if (!modal) return;

        const ticketAtual = getCurrentTicketId();
        const campoIds = document.getElementById('aria-ticket-ids');

        if (ticketAtual && campoIds && !campoIds.value.trim()) {
            campoIds.value = ticketAtual;
        }

        modal.classList.add('aria-visible');
    }

    function fecharModalAria() {
        if (ariaExecutando) {
            ariaLogTerminal('Não é possível fechar durante a execução. Clique em Parar primeiro.', true);
            return;
        }

        document.getElementById(ARIA_MODAL_ID)?.classList.remove('aria-visible');
    }

    function limparModalAria() {
        if (ariaExecutando) {
            ariaLogTerminal('Não é possível limpar durante a execução. Clique em Parar primeiro.', true);
            return;
        }

        const campoIds = document.getElementById('aria-ticket-ids');
        const campoPrompt = document.getElementById('aria-custom-prompt');
        const terminal = document.getElementById('aria-terminal');
        const resultados = document.getElementById('aria-results');

        if (campoIds) campoIds.value = '';
        if (campoPrompt) campoPrompt.value = '';
        if (terminal) terminal.innerHTML = '&gt; Aguardando execução...';
        if (resultados) {
            resultados.innerHTML = `
              <div class="aria-empty-state">
                As respostas geradas pelo Gemini Notebook aparecerão aqui para revisão, edição e gravação.
              </div>
            `;
        }

        cacheAria = {};
        ariaIdsSucesso = [];
        ariaIdsFalha = [];
        ariaIdsGravados = [];
    }

    function atualizarBotoesAria() {
        const btnRun = document.getElementById('aria-btn-run');
        const btnStop = document.getElementById('aria-btn-stop');

        if (!btnRun || !btnStop) return;

        btnRun.disabled = ariaExecutando;
        btnStop.disabled = !ariaExecutando;
    }

    function solicitarCancelamentoAria() {
        if (!ariaExecutando) return;

        ariaCancelado = true;
        ariaLogTerminal('Cancelamento solicitado pelo operador...', true);
        atualizarBotoesAria();
    }

    function checarCancelamentoAria() {
        if (ariaCancelado) throw new Error('Automação interrompida pelo usuário.');
    }

    function ariaObterIdsDigitados() {
        const valor = document.getElementById('aria-ticket-ids').value;
        return [...new Set(valor.split(/[\s,;]+/).map((id) => id.trim()).filter(Boolean))];
    }

    async function rodarLoteAria() {
        const ids = ariaObterIdsDigitados();

        if (ids.length === 0) {
            ariaLogTerminal('Digite pelo menos um ID válido.', true);
            return;
        }

        const promptPersonalizado = document.getElementById('aria-custom-prompt')?.value?.trim() || '';

        ariaCancelado = false;
        ariaExecutando = true;
        atualizarBotoesAria();

        cacheAria = {};
        ariaIdsSucesso = [];
        ariaIdsFalha = [];
        ariaIdsGravados = [];

        document.getElementById('aria-terminal').innerHTML = `&gt; INICIANDO PROCESSAMENTO (${ids.length} chamado(s))...`;
        document.getElementById('aria-results').innerHTML = '';

        try {
            for (const ticketId of ids) {
                checarCancelamentoAria();

                ariaLogTerminal('======================================');
                ariaLogTerminal(`PROCESSANDO CHAMADO #${ticketId}`);

                try {
                    const resultado = await ariaProcessarTicket(ticketId, promptPersonalizado);
                    checarCancelamentoAria();

                    cacheAria[ticketId] = {
                        html: resultado.html,
                        descricao: resultado.descricao,
                        lastUpdate: resultado.lastUpdate,
                        expertAssignee: resultado.expertAssignee,
                        salvo: false
                    };

                    ariaIdsSucesso.push(ticketId);
                    renderizarCardSucesso(ticketId, resultado.html, resultado.descricao);
                    ariaLogTerminal(`SUCESSO: chamado #${ticketId} simulado e aguardando revisão.`);
                } catch (erro) {
                    ariaIdsFalha.push(ticketId);
                    renderizarCardErro(ticketId, erro.message);
                    ariaLogTerminal(erro.message, true);
                }

                if (ids.length > 1) await sleep(1200);
            }
        } finally {
            ariaExecutando = false;
            atualizarBotoesAria();
            ariaLogTerminal('Processamento finalizado.');
            renderizarResumoEfetivacao();
        }
    }

    function renderizarCardSucesso(ticketId, htmlFinal, descricaoChamado = '') {
        const resultados = document.getElementById('aria-results');

        const card = document.createElement('div');
        card.className = 'aria-card';

        card.innerHTML = `
          <div class="aria-card-header">
            <div class="aria-card-title">
              <span>Chamado #${ariaEscapeHtml(ticketId)}</span>
              <button class="aria-ticket-view-btn" type="button" title="Ver descrição do chamado">ver</button>
            </div>
            <div class="aria-card-actions">
              <button class="aria-btn aria-btn-secondary aria-btn-edit" type="button">Editar</button>
              <button class="aria-btn aria-btn-primary aria-btn-save" type="button">Gravar</button>
            </div>
          </div>

          <div class="aria-card-body">
            <div class="aria-editable" contenteditable="false">${htmlFinal}</div>
          </div>
        `;

        resultados.appendChild(card);

        const btnEditar = card.querySelector('.aria-btn-edit');
        const btnGravar = card.querySelector('.aria-btn-save');
        const divConteudo = card.querySelector('.aria-editable');

        card.querySelector('.aria-ticket-view-btn')?.addEventListener('click', () => {
            abrirDescricaoChamadoMiniModal(ticketId, descricaoChamado);
        });

        btnEditar.addEventListener('click', () => {
            const editando = divConteudo.getAttribute('contenteditable') === 'true';

            if (editando) {
                divConteudo.setAttribute('contenteditable', 'false');
                btnEditar.textContent = 'Editar';
                cacheAria[ticketId].html = divConteudo.innerHTML;
            } else {
                divConteudo.setAttribute('contenteditable', 'true');
                btnEditar.textContent = 'Concluir edição';
                divConteudo.focus();
            }
        });

        btnGravar.addEventListener('click', () => {
            gravarTicketIndividual(ticketId, btnGravar, btnEditar, divConteudo);
        });
    }

    function renderizarCardErro(ticketId, mensagem) {
        const resultados = document.getElementById('aria-results');

        const card = document.createElement('div');
        card.className = 'aria-card aria-card-error';

        card.innerHTML = `
          <div class="aria-card-header">
            <div class="aria-card-title">Chamado #${ariaEscapeHtml(ticketId)} barrado</div>
          </div>
          <div class="aria-card-body">${ariaEscapeHtml(mensagem)}</div>
        `;

        resultados.appendChild(card);
    }

    function abrirDescricaoChamadoMiniModal(ticketId, descricaoChamado = '') {
        document.getElementById('aria-ticket-desc-mini-overlay')?.remove();

        const overlay = document.createElement('div');
        overlay.id = 'aria-ticket-desc-mini-overlay';
        overlay.className = 'aria-ticket-desc-mini-overlay';

        overlay.innerHTML = `
          <div class="aria-ticket-desc-mini-modal" role="dialog" aria-modal="true">
            <div class="aria-ticket-desc-mini-header">
              <div class="aria-ticket-desc-mini-title">Chamado #${ariaEscapeHtml(ticketId)}</div>
              <button id="aria-ticket-desc-mini-close" class="aria-ticket-desc-mini-close" type="button">Fechar</button>
            </div>
            <div class="aria-ticket-desc-mini-body">${ariaEscapeHtml(descricaoChamado || 'Descrição não disponível.')}</div>
          </div>
        `;

        document.body.appendChild(overlay);

        document.getElementById('aria-ticket-desc-mini-close')?.addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (evento) => {
            if (evento.target === overlay) overlay.remove();
        });
    }

    async function gravarTicketIndividual(ticketId, btnGravar, btnEditar, divConteudo) {
        if (!cacheAria[ticketId] || cacheAria[ticketId].salvo) return;

        if (divConteudo.getAttribute('contenteditable') === 'true') btnEditar.click();

        cacheAria[ticketId].html = divConteudo.innerHTML;

        btnGravar.disabled = true;
        btnEditar.disabled = true;
        btnGravar.textContent = 'Gravando...';

        ariaLogTerminal(`[#${ticketId}] Gravando solução individual...`);

        try {
            const dados = cacheAria[ticketId];

            await ariaGravarTicketNaApi({
                ticketId,
                lastUpdate: dados.lastUpdate,
                solucaoHtml: dados.html,
                expertAssignee: dados.expertAssignee
            });

            cacheAria[ticketId].salvo = true;
            ariaIdsGravados.push(ticketId);

            btnGravar.textContent = 'Gravado';
            ariaLogTerminal(`[#${ticketId}] CHAMADO GRAVADO COM SUCESSO.`);
        } catch (erro) {
            btnGravar.disabled = false;
            btnEditar.disabled = false;
            btnGravar.textContent = 'Tentar novamente';
            ariaLogTerminal(`[#${ticketId}] ERRO: ${erro.message}`, true);
        }
    }

    function renderizarResumoEfetivacao() {
        const resultados = document.getElementById('aria-results');
        if (!resultados) return;

        document.getElementById('aria-summary')?.remove();

        const strSucesso = ariaIdsSucesso.join(', ');
        const strFalha = ariaIdsFalha.join(', ');

        const resumo = document.createElement('div');
        resumo.id = 'aria-summary';
        resumo.className = 'aria-summary';

        resumo.innerHTML = `
          <h4 class="aria-summary-title">Relatório do lote</h4>

          <div class="aria-summary-row">
            <div class="aria-summary-label-success">Sucesso (${ariaIdsSucesso.length})</div>
            <input id="aria-copy-success-value" class="aria-input" type="text" readonly value="${ariaEscapeHtml(strSucesso)}">
            <button id="aria-copy-success" class="aria-btn aria-btn-secondary" type="button">Copiar IDs</button>
          </div>

          <div class="aria-summary-row">
            <div class="aria-summary-label-error">Falha (${ariaIdsFalha.length})</div>
            <input id="aria-copy-error-value" class="aria-input" type="text" readonly value="${ariaEscapeHtml(strFalha)}">
            <button id="aria-copy-error" class="aria-btn aria-btn-secondary" type="button">Copiar IDs</button>
          </div>

          ${ariaIdsSucesso.length > 0 ? `
            <div style="text-align:right; margin-top:14px;">
              <button id="aria-btn-gravar-lote" class="aria-btn aria-btn-primary" type="button">Gravar Todos</button>
            </div>
          ` : ''}
        `;

        resultados.appendChild(resumo);

        const copiar = async (texto) => {
            if (!texto) return;
            await navigator.clipboard.writeText(texto);
            ariaLogTerminal('IDs copiados para a área de transferência.');
        };

        document.getElementById('aria-copy-success')?.addEventListener('click', () => copiar(strSucesso));
        document.getElementById('aria-copy-error')?.addEventListener('click', () => copiar(strFalha));
        document.getElementById('aria-btn-gravar-lote')?.addEventListener('click', efetivarLoteRestante);
    }

    async function efetivarLoteRestante() {
        const pendentes = ariaIdsSucesso.filter((id) => cacheAria[id] && !cacheAria[id].salvo);

        if (pendentes.length === 0) {
            ariaLogTerminal('Nenhum chamado pendente para gravação.');
            return;
        }

        const confirmar = confirm(
            `Tem certeza que deseja aplicar a solução gerada em ${pendentes.length} chamado(s) real(is) no SMAX?`
        );

        if (!confirmar) {
            ariaLogTerminal('Gravação em lote cancelada pelo operador.', true);
            return;
        }

        const botao = document.getElementById('aria-btn-gravar-lote');
        if (botao) {
            botao.disabled = true;
            botao.textContent = 'Gravando lote...';
        }

        ariaLogTerminal('INICIANDO GRAVAÇÃO EM LOTE DOS CHAMADOS...');

        for (const ticketId of pendentes) {
            try {
                const dados = cacheAria[ticketId];

                await ariaGravarTicketNaApi({
                    ticketId,
                    lastUpdate: dados.lastUpdate,
                    solucaoHtml: dados.html,
                    expertAssignee: dados.expertAssignee
                });

                cacheAria[ticketId].salvo = true;
                ariaIdsGravados.push(ticketId);
                ariaLogTerminal(`[#${ticketId}] GRAVADO COM SUCESSO NO SMAX.`);
            } catch (erro) {
                ariaLogTerminal(`[#${ticketId}] FALHA AO GRAVAR: ${erro.message}`, true);
            }

            await sleep(1000);
        }

        if (botao) botao.textContent = 'Gravação finalizada';
        ariaLogTerminal('GRAVAÇÃO EM MASSA CONCLUÍDA.');
    }


    // =========================================================================
    // A.R.I.A. — CONFIGURAÇÃO DA PONTE (usada pelos DOIS lados)
    //
    // Precisa ser uma `function` declarada: o agente do Gemini Notebook roda no topo
    // do arquivo, antes de qualquer `const` deste script ser inicializado.
    // =========================================================================
    function ariaBridgeConfig() {
        return {
            // Trocar quando o protocolo/formatação mudar: a aba do SMAX recusa
            // conversar com uma aba do Gemini Notebook que ficou aberta com a versão
            // anterior do script (Tampermonkey só troca o código no F5).
            VERSAO: '4.5',

            KEY_REQ: 'aria_nb_req',
            KEY_RES: 'aria_nb_res',
            KEY_LOG: 'aria_nb_log',

            NOTEBOOK_URL: 'https://notebook.google.com/notebook/ae5b4179-bf03-48a1-997a-016229cf9fe8',
            CLOUDFLARE_URL: 'https://smax-ai.felipywf.workers.dev/',

            PROMPT_PADRAO: 'Analise a base de conhecimento e forneça a solução técnica exata para o chamado.',

            TIMEOUT_PING: 5000,

            // Teto total de uma execução (20 min). Precisa ser maior que
            // TENTATIVAS_INICIO + a digitação da resposta.
            TIMEOUT_RODAR: 1200000,

            // Segundos que o agente espera a IA COMEÇAR a responder. Era 90,
            // e o Gemini Notebook passou a demorar mais que isso com
            // frequência — era esta a caixa de timeout que aparecia.
            TENTATIVAS_INICIO: 420,

            // Não há assinatura padrão: cada analista monta a sua na engrenagem
            // da barra "Sugerir solução" (ver ariaCarregarAssinatura). Quem não
            // configurar nada recebe a resposta terminando na última orientação.
            ASSINATURA: '',

            // Onde uma assinatura começa. Serve para CORTAR o que o modelo tenha
            // escrito por conta própria — mas só quando há assinatura configurada
            // para colar no lugar, senão o corte deixaria a resposta sem fecho.
            MARCAS_ASSINATURA: [
                '📖 Já conhece',
                '⚠️ Caso a situação',
                '📢 Sua opinião',
                'Agradecemos o contato',
                'Atenciosamente'
            ]
        };
    }

    // =========================================================================
    // A.R.I.A. — FORMATAÇÃO COMPARTILHADA
    //
    // Usadas pelos dois lados, então são `function` declaradas e não dependem
    // de nenhuma constante do script. O lado do SMAX aplica de novo, por cima
    // do que veio do Gemini Notebook: é lá que o HTML é consumido, então é lá que as
    // garantias precisam valer.
    // =========================================================================

    // "1. ", "2) ", "- ", "• " — tolerando negrito/itálico grudado na frente.
    function ariaEhItemDeLista(linha) {
        return /^\s*(?:<\/?[bi]>\s*)*(?:\d{1,3}[.)]|[-–—•])(?:\s|<|$)/.test(String(linha || ''));
    }

    function ariaEscaparTextoHtml(texto) {
        return String(texto)
            .split('&').join('&amp;')
            .split('<').join('&lt;')
            .split('>').join('&gt;');
    }

    // Converte QUALQUER DOM para o subconjunto de HTML que o SMAX aceita:
    // <b>, <i>, <br> e <a href target="_blank">. Serve tanto para a resposta
    // do Gemini NotebookM quanto para o editor de assinatura — mesma saída, mesmas
    // garantias, uma implementação só.
    function ariaNodeParaHtmlSmax(node, ctx) {
        if (!node) return '';
        if (node.nodeType === Node.TEXT_NODE) return ariaEscaparTextoHtml(node.textContent);
        if (node.nodeType !== Node.ELEMENT_NODE) return '';

        const descartadas = [
            'script', 'style', 'sup', 'button', 'svg', 'mat-icon', 'chat-actions',
            'follow-up', 'mat-card-actions', 'source-button', 'citation-marker', 'noscript'
        ];

        const tag = node.tagName.toLowerCase();

        if (descartadas.indexOf(tag) !== -1) return '';
        if (node.getAttribute && node.getAttribute('role') === 'button') return '';

        const filhos = () => Array.from(node.childNodes)
            .map((filho) => ariaNodeParaHtmlSmax(filho, ctx))
            .join('');

        switch (tag) {
            case 'b':
            case 'strong':
                return `<b>${filhos()}</b>`;

            case 'i':
            case 'em':
                return `<i>${filhos()}</i>`;

            case 'br':
                return '<br>';

            case 'a': {
                const href = node.getAttribute('href') || '';
                const texto = filhos().trim();

                if (/^https?:\/\//i.test(href)) {
                    return `<a href="${ariaEscaparTextoHtml(href)}" target="_blank">${texto || ariaEscaparTextoHtml(href)}</a>`;
                }

                return texto;
            }

            case 'ul':
            case 'ol': {
                const anterior = ctx.lista;
                ctx.lista = { tipo: tag, indice: 0 };
                const html = filhos();
                ctx.lista = anterior;
                ctx.ultimoFoiItem = false;
                return html + '<br>';
            }

            case 'li': {
                let marcador = '- ';

                if (ctx.lista && ctx.lista.tipo === 'ol') {
                    ctx.lista.indice += 1;
                    marcador = `${ctx.lista.indice}. `;
                }

                const interno = filhos()
                    .replace(/(<br>\s*){2,}/g, '<br>')
                    .replace(/(<br>\s*)+$/, '')
                    .trim();

                return `${marcador}${interno}<br>`;
            }

            case 'h1':
            case 'h2':
            case 'h3':
            case 'h4':
            case 'h5':
            case 'h6':
                return `<b>${filhos().trim()}</b><br><br>`;

            case 'th':
            case 'td':
                return `${filhos().trim()} | `;

            case 'tr':
                return `${filhos().replace(/\s*\|\s*$/, '')}<br>`;

            case 'code':
            case 'pre':
                return `<b>${filhos()}</b>`;

            case 'p':
            case 'div':
            case 'section':
            case 'article':
            case 'blockquote':
            case 'table':
            case 'thead':
            case 'tbody':
            case 'paragraph-element-view': {
                // O modelo nem sempre escreve a lista como <ol>/<ul>: às vezes
                // manda "1." e "2." como parágrafos soltos. Entre itens fica
                // uma quebra só; ao entrar e sair da lista, quebra dupla.
                const anteriorFoiItem = ctx.ultimoFoiItem === true;
                const interno = filhos();
                const ehItem = ariaEhItemDeLista(interno);

                ctx.ultimoFoiItem = ehItem;

                const prefixo = (!ehItem && anteriorFoiItem) ? '<br>' : '';
                return `${prefixo}${interno}${ehItem ? '<br>' : '<br><br>'}`;
            }

            default:
                return filhos();
        }
    }

    // Ponto de entrada para converter um elemento inteiro (editor, resposta...).
    function ariaElementoParaHtmlSmax(elemento) {
        const html = ariaNodeParaHtmlSmax(elemento, { lista: null, ultimoFoiItem: false });
        return ariaCompactarListas(ariaNormalizarQuebras(html)).replace(/(<br>\s*)+$/g, '').trim();
    }

    function ariaNormalizarQuebras(html) {
        return String(html || '')
            .replace(/\s*\n\s*/g, ' ')
            .replace(/[ \t]{2,}/g, ' ')
            .replace(/\s+(<br>)/g, '$1')
            .replace(/(<br>)\s+/g, '$1')
            .replace(/(<br>\s*){3,}/g, '<br><br>')
            .trim();
    }

    // Entre dois itens de lista, uma quebra só. Ao ENTRAR e ao SAIR da lista,
    // a quebra dupla de parágrafo é mantida. Trabalha sobre o texto final, então
    // funciona independentemente de o modelo ter usado <ol> ou parágrafos soltos.
    function ariaCompactarListas(html) {
        const partes = String(html || '').split(/((?:<br>){1,2})/);

        for (let i = 1; i < partes.length; i += 2) {
            if (partes[i] !== '<br><br>') continue;

            if (ariaEhItemDeLista(partes[i - 1]) && ariaEhItemDeLista(partes[i + 1] || '')) {
                partes[i] = '<br>';
            }
        }

        return partes.join('');
    }

    // Corta a assinatura que já estiver no texto — venha ela do modelo ou de
    // uma aba antiga. Sem isso, anexar a assinatura configurada duplicaria.
    function ariaCortarAssinatura(html, marcas) {
        let texto = String(html || '');
        let corte = -1;

        for (const marca of marcas) {
            const idx = texto.indexOf(marca);
            if (idx !== -1 && (corte === -1 || idx < corte)) corte = idx;
        }

        if (corte > 40) texto = texto.slice(0, corte);

        return texto
            .replace(/(<br>\s*)+$/g, '')
            .replace(/(<(?:b|i|u)>\s*|<a[^>]*>\s*)+$/g, '')
            .trim();
    }

    // =========================================================================
    // ARIA — AGENTE DO GEMINI NOTEBOOK
    //
    // Roda apenas em notebook(lm).google.com. É autocontido de propósito: como
    // o roteador no topo do arquivo dá `return` antes das constantes globais,
    // nada aqui pode depender delas.
    // =========================================================================
    function ariaBootNotebookAgent() {
        const cfg = ariaBridgeConfig();
        const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

        let idRequisicaoAtual = null;

        // ---------------------------------------------------------------------
        // Anti-hibernação da aba em segundo plano
        // ---------------------------------------------------------------------
        try {
            Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
            Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
            window.dispatchEvent(new Event('visibilitychange'));
        } catch {
            // Alguns navegadores travam essas propriedades; seguimos sem o spoof.
        }

        function manterAcordado() {
            try {
                document.dispatchEvent(new Event('visibilitychange'));
                window.dispatchEvent(new Event('resize'));
                window.dispatchEvent(new Event('focus'));
            } catch {
                // Nada a fazer: é só um empurrãozinho no ciclo de eventos.
            }
        }

        function ativarAudioFantasma() {
            if (window.ariaAudioFantasmaAtivado) return;

            function iniciar() {
                const alvo = document.body || document.documentElement;

                if (!alvo) {
                    setTimeout(iniciar, 200);
                    return;
                }

                try {
                    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

                    if (!AudioContextClass) {
                        criarBotaoInteracao();
                        return;
                    }

                    const audioCtx = new AudioContextClass();
                    const gainNode = audioCtx.createGain();
                    const oscilador = audioCtx.createOscillator();
                    const destino = audioCtx.createMediaStreamDestination();

                    oscilador.type = 'sine';
                    oscilador.frequency.value = 440;
                    gainNode.gain.setValueAtTime(0.01, audioCtx.currentTime);

                    oscilador.connect(gainNode);
                    gainNode.connect(destino);
                    oscilador.start();

                    const audioEl = document.createElement('audio');
                    audioEl.srcObject = destino.stream;
                    audioEl.loop = true;
                    audioEl.volume = 0.01;
                    audioEl.muted = false;
                    audioEl.setAttribute('aria-hidden', 'true');
                    audioEl.style.display = 'none';

                    alvo.appendChild(audioEl);

                    const promessa = audioEl.play();

                    if (promessa !== undefined) {
                        promessa
                            .then(() => {
                                window.ariaAudioFantasmaAtivado = true;
                                window.ariaAudioFantasmaContext = audioCtx;
                                document.getElementById('aria-btn-audio')?.remove();

                                setInterval(() => {
                                    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
                                }, 3000);
                            })
                            .catch(() => criarBotaoInteracao());
                    }
                } catch {
                    criarBotaoInteracao();
                }
            }

            function criarBotaoInteracao() {
                if (document.getElementById('aria-btn-audio')) return;

                const alvo = document.body || document.documentElement;
                if (!alvo) return;

                if (!document.getElementById('aria-btn-audio-style')) {
                    const style = document.createElement('style');
                    style.id = 'aria-btn-audio-style';
                    style.textContent = '@keyframes pulsarAria { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }';
                    (document.head || alvo).appendChild(style);
                }

                const botao = document.createElement('button');
                botao.id = 'aria-btn-audio';
                botao.type = 'button';
                botao.textContent = 'Ativar Anti-Throttling';
                botao.style.cssText = [
                    'position: fixed', 'bottom: 30px', 'left: 30px', 'z-index: 2147483647',
                    'background: #0073e7', 'color: white', 'padding: 12px 22px', 'font-size: 14px',
                    'font-weight: 600', 'border: 2px solid white', 'border-radius: 4px', 'cursor: pointer',
                    'box-shadow: 0 8px 20px rgba(0,0,0,0.35)', 'animation: pulsarAria 1.5s infinite',
                    'font-family: Arial, sans-serif'
                ].join(';');

                botao.onclick = () => {
                    botao.textContent = 'Ativando...';
                    iniciar();
                };

                alvo.appendChild(botao);
            }

            const aoInteragir = () => {
                if (!window.ariaAudioFantasmaAtivado) iniciar();
                else if (window.ariaAudioFantasmaContext && window.ariaAudioFantasmaContext.state === 'suspended') {
                    window.ariaAudioFantasmaContext.resume();
                }

                document.removeEventListener('click', aoInteragir);
                document.removeEventListener('keydown', aoInteragir);
            };

            document.addEventListener('click', aoInteragir);
            document.addEventListener('keydown', aoInteragir);

            iniciar();

            setInterval(() => {
                if (!window.ariaAudioFantasmaAtivado) criarBotaoInteracao();
                else if (window.ariaAudioFantasmaContext && window.ariaAudioFantasmaContext.state === 'suspended') {
                    window.ariaAudioFantasmaContext.resume();
                }
            }, 3000);
        }

        // ---------------------------------------------------------------------
        // Interação com a interface do Gemini Notebook
        // ---------------------------------------------------------------------
        function estaVisivel(elemento) {
            if (!elemento) return false;

            const rect = elemento.getBoundingClientRect();
            const estilo = window.getComputedStyle(elemento);

            return rect.width > 0 && rect.height > 0 && estilo.visibility !== 'hidden' && estilo.display !== 'none';
        }

        function encontrarCaixaChat() {
            const textareas = Array.from(document.querySelectorAll('textarea'));

            for (let i = textareas.length - 1; i >= 0; i--) {
                const textarea = textareas[i];
                const placeholder = (textarea.getAttribute('placeholder') || '').toLowerCase();

                if (estaVisivel(textarea) && !placeholder.includes('pesquisar') && !placeholder.includes('search')) {
                    return textarea;
                }
            }

            const editaveis = Array.from(document.querySelectorAll('[contenteditable="true"], div[role="textbox"]'));

            for (let i = editaveis.length - 1; i >= 0; i--) {
                if (estaVisivel(editaveis[i])) return editaveis[i];
            }

            return null;
        }

        function preencherCampoChat(campo, texto) {
            campo.focus();

            if (campo.tagName.toLowerCase() === 'textarea') {
                campo.value = '';
                campo.dispatchEvent(new Event('input', { bubbles: true }));
                campo.value = texto;
                campo.dispatchEvent(new Event('input', { bubbles: true }));
                campo.dispatchEvent(new Event('change', { bubbles: true }));
                return;
            }

            campo.textContent = '';
            campo.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }));
            campo.textContent = texto;
            campo.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: texto }));
        }

        function clicarEnviar(campo) {
            const seletores = [
                'button[aria-label*="Enviar"]:not([disabled])',
                'button[aria-label*="Send"]:not([disabled])',
                'button[aria-label*="enviar"]:not([disabled])',
                'button[aria-label*="send"]:not([disabled])',
                'button[type="submit"]:not([disabled])'
            ];

            for (const seletor of seletores) {
                const botao = document.querySelector(seletor);
                if (botao && estaVisivel(botao)) {
                    botao.click();
                    return;
                }
            }

            campo.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true
            }));
        }

        function obterChats() {
            const seletores = ['chat-message', "[data-testid*='chat-message']", "[class*='chat-message']"];

            for (const seletor of seletores) {
                const elementos = document.querySelectorAll(seletor);
                if (elementos.length > 0) return elementos;
            }

            return document.querySelectorAll('chat-message');
        }

        function temBotaoCopiar(elemento) {
            if (!elemento) return false;

            return Boolean(elemento.querySelector([
                'button[aria-label*="Copiar"]',
                'button[aria-label*="Copy"]',
                'button[aria-label*="copiar"]',
                'button[aria-label*="copy"]'
            ].join(',')));
        }

        function ehNossoPrompt(texto) {
            return texto.includes('Contexto:') || texto.includes('Instrução:');
        }

        // ---------------------------------------------------------------------
        // EXTRAÇÃO: DOM renderizado -> HTML aceito pelo SMAX
        //
        // O Gemini Notebook renderiza Markdown. Lemos o resultado JÁ RENDERIZADO e
        // convertemos para o subconjunto que o SMAX aceita (<b>, <i>, <br>, <a>).
        // Assim a resposta continua bonita na tela do Gemini Notebook.
        // ---------------------------------------------------------------------
        // Tolerância ao prompt antigo: se o modelo escreveu <b>/<br>/<a> como
        // TEXTO, o escape acima virou &lt;b&gt;. Devolvemos as tags permitidas.
        function restaurarTagsLiterais(html) {
            return html
                .replace(/&lt;(\/?)(b|strong|i|em|u|br)\s*\/?&gt;/gi, (todo, barra, tag) => {
                    const nome = tag.toLowerCase();
                    const alvo = nome === 'strong' ? 'b' : (nome === 'em' ? 'i' : nome);
                    return `<${barra}${alvo}>`;
                })
                .replace(/&lt;a\s+href="(https?:\/\/[^"]+)"[^&]*&gt;/gi, '<a href="$1" target="_blank">')
                .replace(/&lt;\/a&gt;/gi, '</a>');
        }

        // Resíduos de Markdown que o Gemini Notebook porventura não tenha renderizado.
        function converterMarkdownResidual(html) {
            return html
                .replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
                .replace(/\*\*\*(.+?)\*\*\*/g, '<b><i>$1</i></b>')
                .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
                .replace(/(^|[\s(>])\*(?!\s)([^*\n]+?)\*(?=[\s.,;:!?)<]|$)/g, '$1<i>$2</i>')
                .replace(/(^|[\s(>])__(?!\s)([^_\n]+?)__(?=[\s.,;:!?)<]|$)/g, '$1<b>$2</b>');
        }

        function normalizarEspacos(html) {
            return ariaNormalizarQuebras(String(html).replace(/&nbsp;/g, ' '));
        }

        // Devolve só o CORPO da resposta. A assinatura é anexada do lado do SMAX
        // (ariaAplicarAssinatura), porque lá é onde mora a preferência do usuário.
        // Devolve o corpo COM o que o modelo escreveu, inclusive uma eventual
        // assinatura. Quem decide cortar é o lado do SMAX, que sabe se existe
        // assinatura configurada para colocar no lugar.
        function finalizarCorpo(html) {
            let texto = html;

            const inicio = texto.indexOf('Prezado(a)');
            if (inicio > 0) texto = texto.slice(inicio);

            texto = texto.replace(/^(?:\s|<br>)+/g, '').trim();

            if (!texto.startsWith('Prezado(a)')) texto = `Prezado(a),<br><br>${texto}`;

            return ariaCompactarListas(normalizarEspacos(texto))
                .replace(/(<br>\s*)+$/g, '')
                .trim();
        }

        function extrairRespostaHtml(elementoChat) {
            const clone = elementoChat.cloneNode(true);

            clone.querySelectorAll([
                'chat-actions', 'follow-up', 'button', 'mat-card-actions', 'sup',
                "[role='button']", '[aria-label*="Copiar"]', '[aria-label*="Copy"]',
                'mat-icon', 'svg', 'source-button'
            ].join(',')).forEach((el) => el.remove());

            let html = ariaNodeParaHtmlSmax(clone, { lista: null, ultimoFoiItem: false });

            html = restaurarTagsLiterais(html);
            html = converterMarkdownResidual(html);

            // Marcadores de citação do Gemini Notebook ("[1]", "[chat_history]"...).
            html = html
                .replace(/\s*\[(?:user_instruction|chat_history|[\d\s,]+)\]/gi, '')
                .replace(/<sup[^>]*>.*?<\/sup>/gi, '');

            html = normalizarEspacos(html);

            // Rede de segurança: se a varredura do DOM não produziu nada útil,
            // caímos no texto puro e convertemos o Markdown na mão.
            if (html.replace(/<[^>]+>/g, '').trim().length < 40) {
                const puro = (elementoChat.innerText || '').trim();

                html = normalizarEspacos(converterMarkdownResidual(
                    ariaEscaparTextoHtml(puro)
                        .replace(/\n{2,}/g, '<br><br>')
                        .replace(/\n/g, '<br>')
                ));
            }

            return finalizarCorpo(html);
        }

        // ---------------------------------------------------------------------
        // Execução principal
        // ---------------------------------------------------------------------
        function logarParaSmax(mensagem) {
            if (!idRequisicaoAtual) return;
            GM_setValue(cfg.KEY_LOG, { id: idRequisicaoAtual, msg: mensagem, t: Date.now() });
        }

        async function executarRobo(textoChamado, instrucaoExtra) {
            if (!textoChamado || !String(textoChamado).trim()) {
                throw new Error('Texto do chamado vazio.');
            }

            const promptCompleto = `Contexto:\n${textoChamado}\n\nInstrução:\n${instrucaoExtra || 'Sugira uma resposta'}`;

            const STATUS_REGEX = /(Reading your inputs|Looking at sources|Checking your uploads|Finding relevant info|Getting the gist|Gathering the facts|Coletando os fatos|Analisando fontes|Digging into|Mergulhando|Pensando|Thinking)/i;

            manterAcordado();

            const chatsAntes = obterChats();
            const textoVelho = chatsAntes.length > 0
                ? (chatsAntes[chatsAntes.length - 1].innerText || '').trim()
                : '';

            const caixaChat = encontrarCaixaChat();

            if (!caixaChat) throw new Error('Caixa de chat não encontrada na tela do Gemini Notebook.');

            preencherCampoChat(caixaChat, promptCompleto);
            await esperar(1000);
            clicarEnviar(caixaChat);

            logarParaSmax('Prompt enviado. Aguardando a IA começar a responder...');

            let ultimoChatValido = null;

            const limiteInicio = cfg.TENTATIVAS_INICIO || 420;

            for (let tentativa = 0; tentativa < limiteInicio; tentativa++) {
                if (tentativa > 0 && tentativa % 30 === 0) {
                    logarParaSmax(`aguardando a IA começar a responder (${tentativa}s de ${limiteInicio}s)...`);
                }

                const chats = obterChats();

                if (chats.length > 0) {
                    const ultimo = chats[chats.length - 1];
                    const texto = (ultimo.innerText || '').trim();

                    const respostaNova = texto !== textoVelho
                        && !ehNossoPrompt(texto)
                        && temBotaoCopiar(ultimo)
                        && texto.length > 20
                        && !STATUS_REGEX.test(texto);

                    if (respostaNova) {
                        ultimoChatValido = ultimo;
                        break;
                    }
                }

                manterAcordado();
                await esperar(1000);
            }

            if (!ultimoChatValido) {
                throw new Error(`A IA não começou a responder em ${Math.round(limiteInicio / 60)} minuto(s). Verifique a aba do Gemini Notebook — pode haver um aviso de limite de uso ou uma pergunta pendente na tela.`);
            }

            logarParaSmax('Resposta iniciada. Aguardando o fim da digitação...');

            let tamanhoAnterior = 0;
            let iguaisSeguidos = 0;
            let rodadas = 0;

            do {
                await esperar(2000);
                rodadas += 1;

                if (rodadas % 15 === 0) {
                    logarParaSmax(`resposta em andamento (${tamanhoAnterior} caracteres até agora)...`);
                }

                const chats = obterChats();
                if (!chats.length) throw new Error('Resposta do Gemini Notebook desapareceu da tela.');

                ultimoChatValido = chats[chats.length - 1];

                const tamanhoAtual = (ultimoChatValido.innerText || '').trim().length;

                if (tamanhoAtual === tamanhoAnterior && tamanhoAtual > 20) iguaisSeguidos += 1;
                else iguaisSeguidos = 0;

                tamanhoAnterior = tamanhoAtual;
                manterAcordado();
            } while (iguaisSeguidos < 2);

            const html = extrairRespostaHtml(ultimoChatValido);

            if (!html || html.replace(/<[^>]+>/g, '').trim().length < 40) {
                throw new Error('Não foi possível extrair uma resposta válida do Gemini Notebook.');
            }

            logarParaSmax('Resposta extraída e formatada para o SMAX.');
            return html;
        }

        // ---------------------------------------------------------------------
        // Ponte: escuta os pedidos vindos da aba do SMAX
        // ---------------------------------------------------------------------
        const idsProcessados = new Set();

        function responder(id, corpo) {
            GM_setValue(cfg.KEY_RES, { id, t: Date.now(), ...corpo });
        }

        GM_addValueChangeListener(cfg.KEY_REQ, (nome, anterior, requisicao) => {
            if (!requisicao || !requisicao.id || !requisicao.acao) return;
            if (idsProcessados.has(requisicao.id)) return;

            idsProcessados.add(requisicao.id);

            if (requisicao.acao === 'PING') {
                responder(requisicao.id, { sucesso: true, versao: cfg.VERSAO });
                return;
            }

            if (requisicao.acao !== 'RODAR_NOTEBOOKLM') return;

            idRequisicaoAtual = requisicao.id;

            executarRobo(requisicao.textoChamado, requisicao.instrucaoExtra)
                .then((texto) => responder(requisicao.id, { sucesso: true, texto }))
                .catch((erro) => responder(requisicao.id, { sucesso: false, erro: erro.message || String(erro) }))
                .finally(() => {
                    idRequisicaoAtual = null;
                });
        });

        // O listener acima já está registrado neste ponto, e a aba do SMAX só
        // manda o pedido real depois do PING responder — não há corrida.
        ativarAudioFantasma();
        setInterval(manterAcordado, 30000);
    }


    // =========================================================================
    // CICLO DE INTERFACE
    // =========================================================================
    let refreshInProgress = false;

    const runTask = (task) => Promise.resolve()
        .then(task)
        .catch(() => undefined);

    const dynamicDomTasks = [
        moveAttachmentsIntoForm, applyAttachmentsFix, initHeaderTools,
        applyAutoHeightComments, checkEscalarAlert, checkFollowerAlert,
        autoExpandShowMore, checkDefPubVIP, autoCollapseSccd,
        initDuplicityRadar, applyZenMode, updatePrivateNotebook,
        initContextualSolutionBank, initContextualDiscussionBank,
        initContextualAssignButton, initContextualOfertaButton,
        initContextualConclusaoButton, initContextualLinker,
        initBotaoLoteNative, initCopyableTicketId, injetarBotaoCopiarFilhos,
        initAriaHeaderButton, initAriaSuggestionBar
    ];

    function syncDynamicDom() {
        dynamicDomTasks.forEach(task => {
            try {
                task();
            } catch { }
        });
    }

    async function refreshInterface() {
        if (refreshInProgress) return;
        refreshInProgress = true;

        try {
            CONFIG.features = loadSettings().features;
            autoDetectLoggedUser();
            syncDynamicDom();
            await Promise.all([runTask(scanGridForRevisar), runTask(autoCheckDuplicity)]);
        } finally {
            refreshInProgress = false;
        }
    }

    function initOrchestrator() {
        CONFIG.features = loadSettings().features;
        initDarkModeEngine();
        initFlagUsersSkull();
        initAttachmentsPreview();

        // O SMAX recria componentes com frequência; agrupar mutações evita reprocessamento por nó.
        new MutationObserver(debounce(syncDynamicDom, 150))
            .observe(document.body, { childList: true, subtree: true });

        refreshInterface();
        setInterval(refreshInterface, 1500);
    }

    // START
    initOrchestrator();

})();