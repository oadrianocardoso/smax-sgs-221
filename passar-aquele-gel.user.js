// ==UserScript==
// @name         Passar aquele GEL!
// @namespace    https://github.com/oadrianocardoso
// @version      4.1
// @description  Adiciona um botão "Formatar" na última barra de ferramentas de todas as instâncias CKEditor (plCkeditorX), aplicando ajuste em <p> e <img> em cada editor separadamente.
// @author       ADRIANO / ChatGPT
// @match        https://suporte.tjsp.jus.br/saw/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // 🔑 PONTO CRÍTICO:
  // Quando rodar como @require dentro de um script com @grant,
  // precisamos usar unsafeWindow para acessar o CKEDITOR da página.
  const root = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
  const doc  = root.document || document;

  const CUSTOM_BTN_ID_BASE = 'cke_meubotao';
  const ICON_URL           = 'https://suporte.tjsp.jus.br/v30/lib/ckeditor/prod/plugins/icons.png?t=O0B2';
  const ICON_POS           = '0 -528px'; // bandeirinha

  function getButtonIdForEditor(editor) {
    return `${CUSTOM_BTN_ID_BASE}_${editor.name}`;
  }

  function configureButtonAppearance(btn, btnId) {
    if (!btn) return;

    btn.id = btnId;

    btn.classList.remove('cke_button_disabled');
    btn.removeAttribute('aria-disabled');
    btn.setAttribute('aria-disabled', 'false');
    btn.classList.add('cke_button_off');

    btn.setAttribute('href', 'javascript:void(0)');
    btn.setAttribute('title', 'Passar aquele GEL!');

    const label = btn.querySelector('.cke_button_label');
    if (label) {
      label.id = btnId + '_label';
      label.textContent = 'Formatar';
    }

    const icon = btn.querySelector('.cke_button_icon');
    if (icon) {
      icon.className = icon.className.replace(/__\w+_icon/, '__meubotao_icon');
      icon.style.backgroundImage = `url("${ICON_URL}")`;
      icon.style.backgroundPosition = ICON_POS;
      icon.style.backgroundSize = 'auto';
      icon.style.filter = "invert(32%) sepia(95%) saturate(2500%) hue-rotate(200deg) brightness(95%) contrast(90%)";
    }
  }

  function addCustomButtonForEditor(editor) {
    try {
      const container = editor.container && editor.container.$;
      if (!container) {
        console.warn('[CKE Botão Custom] Container do editor não encontrado para:', editor.name);
        return;
      }

      const btnId = getButtonIdForEditor(editor);

      // Já existe nesse editor? só reconfigura
      const existing = container.querySelector('#' + btnId);
      if (existing) {
        configureButtonAppearance(existing, btnId);
        return;
      }

      const lastToolbar = container.querySelector('.cke_toolbar_last');
      if (!lastToolbar) {
        console.warn('[CKE Botão Custom] .cke_toolbar_last não encontrado para:', editor.name);
        return;
      }

      const groups = lastToolbar.querySelectorAll('.cke_toolgroup');
      if (!groups.length) {
        console.warn('[CKE Botão Custom] Nenhum .cke_toolgroup na última toolbar para:', editor.name);
        return;
      }

      const lastGroup = groups[groups.length - 1];
      const refBtn = lastGroup.querySelector('.cke_button');
      if (!refBtn) {
        console.warn('[CKE Botão Custom] Nenhum .cke_button no último grupo para:', editor.name);
        return;
      }

      const newBtn = refBtn.cloneNode(true);

      newBtn.className = refBtn.className.replace(/__\w+/, '__meubotao');
      newBtn.removeAttribute('onclick');
      newBtn.removeAttribute('onkeydown');
      newBtn.removeAttribute('onfocus');

      configureButtonAppearance(newBtn, btnId);

      newBtn.addEventListener('click', function (e) {
        e.preventDefault();
        console.log('[CKE Botão Custom] Clique no botão de formatação para editor:', editor.name);

        const editable = container.querySelector('.cke_wysiwyg_div[contenteditable="true"]');
        if (!editable) {
          console.warn('[CKE Botão Custom] Área editável não encontrada para:', editor.name);
          return;
        }

        let html = editable.innerHTML || '';

        html = html.replace(/<p(?![^>]*\bstyle=)/g, '<p style="margin-bottom: 1em;"');
        html = html.replace(/<img(?![^>]*\bstyle=)/g, '<img style="border: 3px solid #000;"');

        editable.innerHTML = html;

        console.log('[CKE Botão Custom] Formatação aplicada em <p> e <img> no editor:', editor.name);
      });

      lastGroup.appendChild(newBtn);

      console.log('[CKE Botão Custom] Botão "Formatar" adicionado no editor:', editor.name);
    } catch (e) {
      console.error('[CKE Botão Custom] Erro ao adicionar botão no editor', editor && editor.name, e);
    }
  }

  function hookCkeditor() {
    if (!root.CKEDITOR) {
      console.warn('[CKE Botão Custom] CKEDITOR ainda não está disponível.');
      return;
    }

    // novas instâncias
    root.CKEDITOR.on('instanceReady', function (evt) {
      const editor = evt.editor;
      if (!editor) return;

      setTimeout(function () {
        addCustomButtonForEditor(editor);
      }, 300);
    });

    // instâncias já existentes
    Object.keys(root.CKEDITOR.instances).forEach(name => {
      const editor = root.CKEDITOR.instances[name];
      if (!editor) return;

      setTimeout(function () {
        addCustomButtonForEditor(editor);
      }, 300);
    });
  }

  function init() {
    console.log('[CKE Botão Custom] Script Tampermonkey iniciado (todas as instâncias CKEditor).');

    const interval = root.setInterval(function () {
      if (root.CKEDITOR) {
        root.clearInterval(interval);
        hookCkeditor();
      }
    }, 500);
  }

  if (doc.readyState === 'complete' || doc.readyState === 'interactive') {
    init();
  } else {
    doc.addEventListener('DOMContentLoaded', init);
  }
})();
