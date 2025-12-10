// ==UserScript==
// @name         Passar aquele GEL! (+ Citação)
// @namespace    https://github.com/oadrianocardoso
// @version      7.0
// @description  Adiciona botões "Formatar" e "Citação" na barra do CKEditor (plCkeditorX), formatando <p> e <img> via getData/setData e aplicando blockquote com um clique, sem quebrar outros scripts (ES5 only).
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
    var QUICK_ICONS = [
      // 1 — ALERTA / ERRO
      '⚠️','❗','‼️','🚨','🔥','❌','🛑','⛔','☢️','☣️',
    
      // 2 — AVISO / ATENÇÃO
      '🔔','🔕','📢','📣','📯','🔊','🔉','🔈','💬','🗨️',
    
      // 3 — INFORMAÇÃO
      'ℹ️','💡','📌','📍','🔎','🔍','📝','🧾','📄','📘',
    
      // 4 — SUCESSO / OK
      '✅','✔️','☑️','👌','👍','🙌','🎯','🏆','🥇','💯',
    
      // 5 — TEMPO / STATUS
      '⏳','⌛','🕒','🕑','🕐','🗓️','📅','🗂️','🔄','🔁',
    
      // 6 — PROCESSO / AÇÕES
      '⚙️','🛠️','🔧','🔨','🧰','🔗','📎','🖇️','🧷','📌',
    
      // 7 — ORGANIZAÇÃO / DOCUMENTOS
      '📁','📂','🗃️','🗄️','📊','📈','📉','📋','🗒️','📚',
    
      // 8 — DIREÇÃO / PASSOS
      '👉','➡️','⬅️','⬆️','⬇️','🔜','🔙','🔛','🔝','🔚',
    
      // 9 — DESTAQUES / IMPORTANTE
      '⭐','🌟','✨','💫','💥','🎉','🎊','🎈','🎗️','🎀',
    
      // 10 — TÉCNICO / SISTEMA
      '💻','🖥️','🖱️','⌨️','🛡️','🔒','🔓','🔑','🧪','🧬'
    ];

    // ==========================================================
    //  FUNÇÃO PRINCIPAL: FORMATAR <P> E <IMG> DO EDITOR
    // ==========================================================
    function formatEditorContent(editor) {
      try {
        if (!editor || typeof editor.getData !== 'function') return;

        var html = editor.getData() || '';
        if (!html) return;

        var wrapper = doc.createElement('div');
        wrapper.innerHTML = html;

        // 1) Envelopar TEXT NODES de topo em <p>
        var node = wrapper.firstChild;
        while (node) {
          var next = node.nextSibling;
          if (node.nodeType === 3) { // TEXT_NODE
            if (node.nodeValue && /[^\s\u00A0]/.test(node.nodeValue)) {
              var p = doc.createElement('p');
              p.appendChild(node.cloneNode(true));
              wrapper.replaceChild(p, node);
            } else {
              wrapper.removeChild(node);
            }
          }
          node = next;
        }

        // 2) Ajustar <p> com margin-bottom: 1em;
        var paragraphs = wrapper.getElementsByTagName('p');
        var i, pEl, style;
        for (i = 0; i < paragraphs.length; i++) {
          pEl = paragraphs[i];
          style = pEl.getAttribute('style') || '';
          if (style.indexOf('margin-bottom') === -1) {
            if (style && style.charAt(style.length - 1) !== ';') {
              style += ';';
            }
            style += ' margin-bottom: 1em;';
          }
          pEl.setAttribute('style', style);
        }

        // 3) Ajustar <img> (responsivo, centralizado)
        var imgs = wrapper.getElementsByTagName('img');

        function addRule(styleStr, prop, value) {
          if (styleStr.indexOf(prop) === -1) {
            if (styleStr && styleStr.charAt(styleStr.length - 1) !== ';') {
              styleStr += ';';
            }
            styleStr += ' ' + prop + ': ' + value + ';';
          }
          return styleStr;
        }

        for (i = 0; i < imgs.length; i++) {
          var imgEl = imgs[i];
          var s2 = imgEl.getAttribute('style') || '';

          s2 = addRule(s2, 'max-width', '100%');
          s2 = addRule(s2, 'height', 'auto');
          s2 = addRule(s2, 'display', 'block');
          s2 = addRule(s2, 'margin', '10px auto');

          imgEl.setAttribute('style', s2);
        }

        var newHtml = wrapper.innerHTML;
        if (newHtml && newHtml !== html) {
          editor.setData(newHtml);
          if (typeof editor.updateElement === 'function') {
            editor.updateElement();
          }
        }
      } catch (e) {
        console.error('[CKE GEL] formatEditorContent falhou:', e);
      }
    }

    // Handler de clique do botão "Formatar"
    function attachFormatClick(editor, formatBtn) {
      if (!formatBtn) return;
      formatBtn.onclick = function (e) {
        try {
          if (e && e.preventDefault) e.preventDefault();
        } catch (er) {}
        console.log('[CKE GEL] Clique no botão "Formatar" para editor:', editor && editor.name);
        formatEditorContent(editor);
      };
    }

    function getButtonIdForEditor(editor) {
      return CUSTOM_BTN_ID_BASE + '_' + editor.name;
    }

    // Aparência do botão "Formatar"
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

    // Aparência do botão "Citação"
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
          icon.style.filter = '';
        }
      } catch (err) {
        console.error('[CKE GEL] configureQuoteButtonAppearance falhou:', err);
      }
    }

    // ==========================================================
    //  INSERÇÃO DOS BOTÕES NA TOOLBAR DO CKEDITOR
    // ==========================================================
    function addCustomButtonForEditor(editor) {
      try {
        var container = editor && editor.container && editor.container.$;
        if (!container) {
          console.warn('[CKE GEL] Container do editor não encontrado para:', editor && editor.name);
          return;
        }

        var btnId   = getButtonIdForEditor(editor);
        var quoteId = btnId + '_blockquote';

        // 1) BOTÃO "Citação"
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

          // Observador para reconstrução da toolbar
          try {
            if (typeof MutationObserver !== 'undefined' && !lastGroup._ckeGelObserver) {
              lastGroup._ckeGelObserver = true;
              var mo = new MutationObserver(function () {
                setTimeout(function () {
                  try {
                    addCustomButtonForEditor(editor);
                  } catch (e) {
                    console.error('[CKE GEL] reinserção via MutationObserver falhou:', e);
                  }
                }, 100);
              });
              mo.observe(lastGroup, { childList: true });
            }
          } catch (e) {}
        } else {
          configureQuoteButtonAppearance(quoteBtn, quoteId);
        }

        // 2) BOTÃO "Formatar"
        var formatBtn = container.querySelector('#' + btnId);

        if (!formatBtn && quoteBtn) {
          formatBtn = quoteBtn.cloneNode(true);
          formatBtn.removeAttribute('onclick');
          formatBtn.removeAttribute('onkeydown');
          formatBtn.removeAttribute('onfocus');
          configureButtonAppearance(formatBtn, btnId);
          attachFormatClick(editor, formatBtn);

          // handler do botão Formatar: aplica alterações em <p> e <img>
          try {
            if (!formatBtn._ckeGelFormatHandler) {
              formatBtn.addEventListener('click', function (e) {
                e.preventDefault();
                try {
                  console.log('[CKE GEL] Formatando conteúdo no editor:', editor && editor.name);
                  var html = editor.getData ? (editor.getData() || '') : '';

                  html = html.replace(/<p(?![^>]*\bstyle=)([^>]*)>/gi, '<p style="margin-bottom: 1em;"$1>');

                  html = html.replace(/<img(?![^>]*\bstyle=)([^>]*?)\/?\>/gi, '<img style="border: 3px solid #000;"$1>');

                  if (typeof editor.setData === 'function') {
                    editor.setData(html);
                  }
                  if (typeof editor.updateElement === 'function') {
                    editor.updateElement();
                  }
                  console.log('[CKE GEL] Formatação aplicada com sucesso via setData().');
                } catch (err) {
                  console.error('[CKE GEL] Erro no handler de formatação:', err);
                }
              });
              formatBtn._ckeGelFormatHandler = true;
            }
          } catch (e) {
            console.error('[CKE GEL] Não foi possível anexar handler de formatação:', e);
          }

          // cria o botão de ícone (não inserido ainda)
          iconBtn = quoteBtn.cloneNode(true);
          iconBtn.removeAttribute('onclick');
          iconBtn.removeAttribute('onkeydown');
          iconBtn.removeAttribute('onfocus');
          configureIconButtonAppearance(iconBtn, iconBtnId);

          // handler do botão de ícone: abre popup de seleção
          iconBtn.addEventListener('click', function (e) {
            e.preventDefault();
            try {
              var popup = createIconPickerPopup(editor, iconBtn, iconBtnId);
              if (popup && typeof popup.openMenu === 'function') popup.openMenu();
            } catch (err) {
              console.error('[CKE GEL] Erro ao abrir seletor de ícones:', err);
            }
          });

          // insere os botões: quoteBtn -> iconBtn -> formatBtn
          quoteBtn.parentNode.insertBefore(formatBtn, quoteBtn.nextSibling);
        } else if (formatBtn) {
          configureButtonAppearance(formatBtn, btnId);
          attachFormatClick(editor, formatBtn);
        }

      } catch (e) {
        console.error('[CKE GEL] Erro ao adicionar botões no editor', editor && editor.name, e);
      }
    }

    // Hook no CKEDITOR
    function hookCkeditor() {
      try {
        if (!root.CKEDITOR) {
          console.warn('[CKE GEL] CKEDITOR ainda não está disponível.');
          return;
        }

        root.CKEDITOR.on('instanceReady', function (evt) {
          var editor = evt && evt.editor;
          if (!editor) return;
          setTimeout(function () {
            try { addCustomButtonForEditor(editor); } catch (err) { console.error('[CKE GEL] instanceReady callback falhou:', err); }
          }, 300);
        });

        var instances = root.CKEDITOR.instances || {};
        var name;
        for (name in instances) {
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
    try { console.error('[CKE GEL] Erro fatal no script:', err); } catch (e) {}
  }

})();