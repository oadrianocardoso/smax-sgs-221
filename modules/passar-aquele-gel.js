// ==UserScript==
// @name         Passar aquele GEL! (+ Citação)
// @namespace    https://github.com/oadrianocardoso
// @version      4.5
// @description  Adiciona um botão "Formatar" e um botão "Citação" em todas as instâncias CKEditor, aplicando ajuste em <p> e <img> de forma segura (getData/setData).
// @author       ADRIANO / ChatGPT
// @match        https://suporte.tjsp.jus.br/saw/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const root = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
  const doc  = root.document || document;

  const CUSTOM_BTN_ID_BASE = 'cke_meubotao';
  const ICON_URL           = 'https://suporte.tjsp.jus.br/v30/lib/ckeditor/prod/plugins/icons.png?t=O0B2';
  const ICON_POS_FORMATAR  = '0 -528px';
  const ICON_POS_QUOTE     = '0 -192px';

  function getButtonIdForEditor(editor) {
    return `${CUSTOM_BTN_ID_BASE}_${editor.name}`;
  }

  function configureButtonAppearance(btn, btnId) {
    if (!btn) return;

    btn.id = btnId;
    btn.classList.remove('cke_button_disabled');
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
      icon.style.backgroundPosition = ICON_POS_FORMATAR;
      icon.style.filter = "invert(32%) sepia(95%) saturate(2500%) hue-rotate(200deg)";
    }
  }

  function configureQuoteButtonAppearance(btn, quoteId) {
    if (!btn) return;

    btn.id = quoteId;
    btn.classList.remove('cke_button_disabled');
    btn.setAttribute('aria-disabled', 'false');
    btn.classList.add('cke_button_off');
    btn.setAttribute('href', 'javascript:void(0)');
    btn.setAttribute('title', 'Citação');

    const label = btn.querySelector('.cke_button_label');
    if (label) {
      label.id = quoteId + '_label';
      label.textContent = 'Citação';
    }

    const icon = btn.querySelector('.cke_button_icon');
    if (icon) {
      icon.className = icon.className.replace(/__\w+_icon/, '__blockquote_icon');
      icon.style.backgroundImage = `url("${ICON_URL}")`;
      icon.style.backgroundPosition = ICON_POS_QUOTE;
    }
  }

  function addCustomButtonForEditor(editor) {
    try {
      const container = editor.container && editor.container.$;
      if (!container) return;

      const btnId    = getButtonIdForEditor(editor);
      const quoteId  = btnId + '_blockquote';

      // ============================ //
      // 1) BOTÃO "Citação"
      // ============================ //
      let quoteBtn = container.querySelector('#' + quoteId);

      if (!quoteBtn) {

        const lastToolbar = container.querySelector('.cke_toolbar_last');
        if (!lastToolbar) return;

        const groups = lastToolbar.querySelectorAll('.cke_toolgroup');
        if (!groups.length) return;

        const lastGroup = groups[groups.length - 1];
        const refBtn = lastGroup.querySelector('.cke_button');
        if (!refBtn) return;

        quoteBtn = refBtn.cloneNode(true);
        quoteBtn.removeAttribute('onclick');
        quoteBtn.removeAttribute('onkeydown');
        quoteBtn.removeAttribute('onfocus');

        configureQuoteButtonAppearance(quoteBtn, quoteId);

        quoteBtn.addEventListener('click', function (e) {
          e.preventDefault();
          console.log('[GEL] Aplicando blockquote no editor:', editor.name);

          try {
            editor.execCommand('blockquote');
          } catch (err) {
            console.error('[GEL] Erro ao aplicar blockquote:', err);
          }
        });

        lastGroup.appendChild(quoteBtn);
      } else {
        configureQuoteButtonAppearance(quoteBtn, quoteId);
      }

      // ============================ //
      // 2) BOTÃO "Formatar"
      // ============================ //
      let formatBtn = container.querySelector('#' + btnId);

      if (!formatBtn && quoteBtn) {
        formatBtn = quoteBtn.cloneNode(true);

        formatBtn.removeAttribute('onclick');
        formatBtn.removeAttribute('onkeydown');
        formatBtn.removeAttribute('onfocus');

        configureButtonAppearance(formatBtn, btnId);

        // ============================
        // NOVO HANDLER → usa getData/setData
        // ============================
        formatBtn.addEventListener('click', function (e) {
          e.preventDefault();
          console.log('[GEL] Formatando conteúdo no editor:', editor.name);

          // pega HTML "oficial" do CKEditor
          let html = editor.getData() || '';

          // adiciona style no começo da tag, preservando atributos
          html = html.replace(
            /<p(?![^>]*\bstyle=)([^>]*)>/gi,
            '<p style="margin-bottom: 1em;"$1>'
          );

          html = html.replace(
            /<img(?![^>]*\bstyle=)([^>]*?)\/?>/gi,
            '<img style="border: 3px solid #000;"$1>'
          );

          editor.setData(html);
          if (editor.updateElement) editor.updateElement();

          console.log('[GEL] Formatação aplicada com sucesso via setData().');
        });

        quoteBtn.parentNode.insertBefore(formatBtn, quoteBtn.nextSibling);
      } else {
        configureButtonAppearance(formatBtn, btnId);
      }

    } catch (e) {
      console.error('[GEL] ERRO ao inserir botões para o editor', editor.name, e);
    }
  }

  function hookCkeditor() {
    if (!root.CKEDITOR) return;

    // novas instâncias
    root.CKEDITOR.on('instanceReady', evt => {
      setTimeout(() => addCustomButtonForEditor(evt.editor), 300);
    });

    // existentes
    Object.values(root.CKEDITOR.instances).forEach(editor => {
      setTimeout(() => addCustomButtonForEditor(editor), 300);
    });
  }

  function init() {
    console.log('[GEL] Script inicializado.');

    const interval = setInterval(() => {
      if (root.CKEDITOR) {
        clearInterval(interval);
        hookCkeditor();
      }
    }, 500);
  }

  if (doc.readyState !== 'loading') init();
  else doc.addEventListener('DOMContentLoaded', init);

})();
