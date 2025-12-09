// ==UserScript==
// @name         Passar aquele GEL! (+ Citação)
// @namespace    https://github.com/oadrianocardoso
// @version      5.0
// @description  Adiciona um botão "Formatar" e um botão "Citação" na barra de ferramentas de todas as instâncias CKEditor (plCkeditorX), aplicando ajuste em <p> e <img> via getData/setData e permitindo aplicar blockquote com um clique, sem quebrar outros scripts (ES5 only).
// @author       ADRIANO / ChatGPT
// @match        https://suporte.tjsp.jus.br/saw/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  var root = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
  var doc  = root.document || document;

  var CUSTOM_BTN_ID_BASE = 'cke_meubotao';
  var ICON_URL           = 'https://suporte.tjsp.jus.br/v30/lib/ckeditor/prod/plugins/icons.png?t=O0B2';
  var ICON_POS_FORMATAR  = '0 -528px'; // bandeirinha (GEL)
  var ICON_POS_QUOTE     = '0 -192px'; // ícone de Citação (blockquote)

  function getButtonIdForEditor(editor) {
    return CUSTOM_BTN_ID_BASE + '_' + editor.name;
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

    var label = btn.querySelector('.cke_button_label');
    if (label) {
      label.id = btnId + '_label';
      label.textContent = 'Formatar';
    }

    var icon = btn.querySelector('.cke_button_icon');
    if (icon) {
      icon.className = icon.className.replace(/__\w+_icon/, '__meubotao_icon');
      icon.style.backgroundImage = 'url("' + ICON_URL + '")';
      icon.style.backgroundPosition = ICON_POS_FORMATAR;
      icon.style.backgroundSize = 'auto';
      icon.style.filter = 'invert(32%) sepia(95%) saturate(2500%) hue-rotate(200deg) brightness(95%) contrast(90%)';
    }
  }

  function configureQuoteButtonAppearance(btn, quoteId) {
    if (!btn) return;

    btn.id = quoteId;
    btn.classList.remove('cke_button_disabled');
    btn.removeAttribute('aria-disabled');
    btn.setAttribute('aria-disabled', 'false');
    btn.classList.add('cke_button_off');

    btn.setAttribute('href', 'javascript:void(0)');
    btn.setAttribute('title', 'Citação');

    var label = btn.querySelector('.cke_button_label');
    if (label) {
      label.id = quoteId + '_label';
      label.textContent = 'Citação';
    }

    var icon = btn.querySelector('.cke_button_icon');
    if (icon) {
      icon.className = icon.className.replace(/__\w+_icon/, '__blockquote_icon');
      icon.style.backgroundImage = 'url("' + ICON_URL + '")';
      icon.style.backgroundPosition = ICON_POS_QUOTE;
      icon.style.backgroundSize = 'auto';
      icon.style.filter = ''; // mantém padrão
    }
  }

  function addCustomButtonForEditor(editor) {
    try {
      var container = editor.container && editor.container.$;
      if (!container) {
        console.warn('[CKE GEL] Container do editor não encontrado para:', editor.name);
        return;
      }

      var btnId   = getButtonIdForEditor(editor);
      var quoteId = btnId + '_blockquote';

      // ======================
      // 1) BOTÃO "Formatar"
      // ======================
      var formatBtn = container.querySelector('#' + btnId);

      if (!formatBtn) {
        var lastToolbar = container.querySelector('.cke_toolbar_last');
        if (!lastToolbar) {
          console.warn('[CKE GEL] .cke_toolbar_last não encontrado para:', editor.name);
          return;
        }

        var groups = lastToolbar.querySelectorAll('.cke_toolgroup');
        if (!groups.length) {
          console.warn('[CKE GEL] Nenhum .cke_toolgroup na última toolbar para:', editor.name);
          return;
        }

        var lastGroup = groups[groups.length - 1];
        var refBtn = lastGroup.querySelector('.cke_button');
        if (!refBtn) {
          console.warn('[CKE GEL] Nenhum .cke_button no último grupo para:', editor.name);
          return;
        }

        formatBtn = refBtn.cloneNode(true);
        formatBtn.className = refBtn.className.replace(/__\w+/, '__meubotao');
        formatBtn.removeAttribute('onclick');
        formatBtn.removeAttribute('onkeydown');
        formatBtn.removeAttribute('onfocus');

        configureButtonAppearance(formatBtn, btnId);

        formatBtn.addEventListener('click', function (e) {
          e.preventDefault();
          console.log('[CKE GEL] Clique no botão de formatação para editor:', editor.name);

          // Usa API oficial do CKEditor
          var html = editor.getData() || '';

          // <p> sem style -> adiciona margin-bottom, preservando atributos
          html = html.replace(
            /<p(?![^>]*\bstyle=)([^>]*)>/gi,
            '<p style="margin-bottom: 1em;"$1>'
          );

          // <img> sem style -> adiciona borda, preservando atributos
          html = html.replace(
            /<img(?![^>]*\bstyle=)([^>]*?)\/?>/gi,
            '<img style="border: 3px solid #000;"$1>'
          );

          editor.setData(html);
          if (typeof editor.updateElement === 'function') {
            editor.updateElement();
          }

          console.log('[CKE GEL] Formatação aplicada via getData/setData no editor:', editor.name);
        });

        lastGroup.appendChild(formatBtn);
        console.log('[CKE GEL] Botão "Formatar" adicionado no editor:', editor.name);
      } else {
        configureButtonAppearance(formatBtn, btnId);
      }

      // ======================
      // 2) BOTÃO "Citação"
      // ======================
      var quoteBtn = container.querySelector('#' + quoteId);
      if (!quoteBtn && formatBtn) {
        quoteBtn = formatBtn.cloneNode(true);

        quoteBtn.removeAttribute('onclick');
        quoteBtn.removeAttribute('onkeydown');
        quoteBtn.removeAttribute('onfocus');

        configureQuoteButtonAppearance(quoteBtn, quoteId);

        quoteBtn.addEventListener('click', function (e) {
          e.preventDefault();
          console.log('[CKE GEL] Clique no botão "Citação" para editor:', editor.name);
          try {
            editor.execCommand('blockquote');
          } catch (err) {
            console.error('[CKE GEL] Erro ao aplicar blockquote no editor:', editor.name, err);
          }
        });

        // insere logo depois do "Formatar"
        if (formatBtn.parentNode) {
          formatBtn.parentNode.insertBefore(quoteBtn, formatBtn.nextSibling);
        }

        console.log('[CKE GEL] Botão "Citação" adicionado no editor:', editor.name);
      } else if (quoteBtn) {
        configureQuoteButtonAppearance(quoteBtn, quoteId);
      }

    } catch (e) {
      console.error('[CKE GEL] Erro ao adicionar botões no editor', editor && editor.name, e);
    }
  }

  function hookCkeditor() {
    if (!root.CKEDITOR) {
      console.warn('[CKE GEL] CKEDITOR ainda não está disponível.');
      return;
    }

    // novas instâncias
    root.CKEDITOR.on('instanceReady', function (evt) {
      var editor = evt.editor;
      if (!editor) return;
      setTimeout(function () {
        addCustomButtonForEditor(editor);
      }, 300);
    });

    // instâncias já existentes
    var instances = root.CKEDITOR.instances || {};
    for (var name in instances) {
      if (!instances.hasOwnProperty(name)) continue;
      (function (ed) {
        setTimeout(function () {
          addCustomButtonForEditor(ed);
        }, 300);
      })(instances[name]);
    }
  }

  function init() {
    console.log('[CKE GEL] Script Tampermonkey iniciado (GEL + Citação, ES5).');

    var interval = root.setInterval(function () {
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
