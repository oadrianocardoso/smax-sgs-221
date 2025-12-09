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

  try {
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

      try {
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
      } catch (err) {
        console.error('[CKE GEL] configureButtonAppearance falhou:', err);
      }
    }

    function configureQuoteButtonAppearance(btn, quoteId) {
      if (!btn) return;

      try {
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
      } catch (err) {
        console.error('[CKE GEL] configureQuoteButtonAppearance falhou:', err);
      }
    }

    function addCustomButtonForEditor(editor) {
      try {
        var container = editor && editor.container && editor.container.$;
        if (!container) {
          console.warn('[CKE GEL] Container do editor não encontrado para:', editor && editor.name);
          return;
        }

        var btnId   = getButtonIdForEditor(editor);
        var quoteId = btnId + '_blockquote';

        // ======================
        // 1) BOTÃO "Citação"
        // ======================
        var quoteBtn = container.querySelector('#' + quoteId);

        if (!quoteBtn) {
          var lastToolbar = container.querySelector('.cke_toolbar_last');
          if (!lastToolbar) return;

          var groups = lastToolbar.querySelectorAll('.cke_toolgroup');
          if (!groups.length) return;

          var lastGroup = groups[groups.length - 1];
          var refBtn = lastGroup.querySelector('.cke_button');
          if (!refBtn) return;

          quoteBtn = refBtn.cloneNode(true);
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

          lastGroup.appendChild(quoteBtn);
        } else {
          configureQuoteButtonAppearance(quoteBtn, quoteId);
        }

        // ======================
        // 2) BOTÃO "Formatar"
        // ======================
        var formatBtn = container.querySelector('#' + btnId);

        if (!formatBtn && quoteBtn) {
          formatBtn = quoteBtn.cloneNode(true);

          formatBtn.removeAttribute('onclick');
          formatBtn.removeAttribute('onkeydown');
          formatBtn.removeAttribute('onfocus');

          configureButtonAppearance(formatBtn, btnId);

          formatBtn.addEventListener('click', function (e) {
            e.preventDefault();
            console.log('[CKE GEL] Clique no botão de formatação para editor:', editor.name);

            try {
              var html = editor.getData() || '';

              html = html.replace(
                /<p(?![^>]*\bstyle=)([^>]*)>/gi,
                '<p style="margin-bottom: 1em;"$1>'
              );

              html = html.replace(
                /<img(?![^>]*\bstyle=)([^>]*?)\/?\>/gi,
                '<img style="border: 3px solid #000;"$1>'
              );

              editor.setData(html);
              if (typeof editor.updateElement === 'function') {
                editor.updateElement();
              }
            } catch (err) {
              console.error('[CKE GEL] Erro no handler de formatação:', err);
            }
          });

          quoteBtn.parentNode.insertBefore(formatBtn, quoteBtn.nextSibling);
        } else {
          configureButtonAppearance(formatBtn, btnId);
        }

      } catch (e) {
        console.error('[CKE GEL] Erro ao adicionar botões no editor', editor && editor.name, e);
      }
    }

    function hookCkeditor() {
      try {
        if (!root.CKEDITOR) {
          console.warn('[CKE GEL] CKEDITOR ainda não está disponível.');
          return;
        }

        // novas instâncias
        root.CKEDITOR.on('instanceReady', function (evt) {
          var editor = evt && evt.editor;
          if (!editor) return;
          setTimeout(function () {
            try { addCustomButtonForEditor(editor); } catch (err) { console.error('[CKE GEL] instanceReady callback falhou:', err); }
          }, 300);
        });

        // instâncias já existentes
        var instances = root.CKEDITOR.instances || {};
        for (var name in instances) {
          if (!instances.hasOwnProperty(name)) continue;
          (function (ed) {
            setTimeout(function () {
              try { addCustomButtonForEditor(ed); } catch (err) { console.error('[CKE GEL] addCustomButtonForEditor falhou:', err); }
            }, 300);
          })(instances[name]);
        }
      } catch (err) {
        console.error('[CKE GEL] hookCkeditor falhou:', err);
      }
    }

    function init() {
      try {
        console.log('[CKE GEL] Script Tampermonkey iniciado (GEL + Citação, ES5).');

        var interval = root.setInterval(function () {
          try {
            if (root.CKEDITOR) {
              root.clearInterval(interval);
              hookCkeditor();
            }
          } catch (err) {
            console.error('[CKE GEL] Erro no intervalo de inicialização:', err);
          }
        }, 500);
      } catch (err) {
        console.error('[CKE GEL] init falhou:', err);
      }
    }

    if (doc.readyState === 'complete' || doc.readyState === 'interactive') {
      init();
    } else {
      doc.addEventListener('DOMContentLoaded', init);
    }

  } catch (err) {
    // Erro fatal de execução — evita quebrar outros scripts da página
    try { console.error('[CKE GEL] Erro fatal no script:', err); } catch (e) {}
  }

})();
