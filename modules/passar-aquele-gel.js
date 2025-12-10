(function () {
  'use strict';

  try {
    var root = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
    var doc  = root.document || document;

    var CUSTOM_BTN_ID_BASE = 'cke_meubotao';
    var ICON_URL           = 'https://suporte.tjsp.jus.br/v30/lib/ckeditor/prod/plugins/icons.png?t=O0B2';
    var ICON_POS_FORMATAR  = '0 -528px'; // bandeirinha (GEL)
    var ICON_POS_QUOTE     = '0 -192px'; // ícone de Citação (blockquote)

    // Ícones que vão aparecer no popup
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

    // ---------- Helpers de ID / Aparência ----------

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
          icon.style.filter = 'invert(26%) sepia(96%) saturate(2580%) hue-rotate(195deg) brightness(90%) contrast(95%)';
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
          icon.style.filter = '';
        }
      } catch (err) {
        console.error('[CKE GEL] configureQuoteButtonAppearance falhou:', err);
      }
    }

    function configureIconButtonAppearance(btn, iconId) {
      if (!btn) return;

      try {
        btn.id = iconId;
        btn.classList.remove('cke_button_disabled');
        btn.removeAttribute('aria-disabled');
        btn.setAttribute('aria-disabled', 'false');
        btn.classList.add('cke_button_off');
        btn.setAttribute('href', 'javascript:void(0)');
        btn.setAttribute('title', 'Inserir ícone');

        var label = btn.querySelector('.cke_button_label');
        if (label) {
          label.id = iconId + '_label';
          label.textContent = 'Ícone';
        }

        var icon = btn.querySelector('.cke_button_icon');
        if (icon) {
          try {
            icon.className = icon.className.replace(/__\w+_icon/, '__iconpicker_icon');
          } catch (e) {}
          icon.style.backgroundImage = 'none';
          icon.style.backgroundPosition = '';
          icon.style.backgroundSize = '';
          icon.style.fontSize = '16px';
          icon.style.lineHeight = '18px';
          icon.style.textAlign = 'center';
          icon.style.padding = '0';
          icon.textContent = '💡';
          icon.style.filter = '';

        }

        // aparência de botão "expandable" (com setinha)
        try {
          btn.classList.add('cke_button_expandable');
          if (!btn.querySelector('.cke_button_arrow')) {
            var arr = document.createElement('span');
            arr.className = 'cke_button_arrow';
            btn.appendChild(arr);
          }
        } catch (e) {}
      } catch (err) {
        console.error('[CKE GEL] configureIconButtonAppearance falhou:', err);
      }
    }

    // ---------- Lógica de formatação (p / img) ----------

    function applyFormatToEditor(editor) {
      try {
        if (!editor || typeof editor.getData !== 'function') return;
        var html = editor.getData() || '';

        // <p> sem style recebe margin-bottom
        try {
          html = html.replace(/<p(?![^>]*\bstyle=)([^>]*)>/gi, '<p style="margin-bottom: 1em;"$1>');
        } catch (e1) {}

        // <img> sem style recebe borda
        try {
          html = html.replace(/<img(?![^>]*\bstyle=)([^>]*?)\/?\>/gi, '<img style="border: 3px solid #000;"$1>');
        } catch (e2) {}

        if (typeof editor.setData === 'function') {
          editor.setData(html);
        }
        if (typeof editor.updateElement === 'function') {
          editor.updateElement();
        }
      } catch (err) {
        console.error('[CKE GEL] applyFormatToEditor erro:', err);
      }
    }

    function configureFormatButtonBehavior(btn, editor) {
      try {
        if (!btn || !editor) return;
        if (btn._ckeGelFormatHandlerAttached) return;
        btn._ckeGelFormatHandlerAttached = true;

        btn.addEventListener('click', function (e) {
          try { e.preventDefault(); } catch (er) {}
          console.log('[CKE GEL] Aplicando formatação (p/img) no editor:', editor && editor.name);
          applyFormatToEditor(editor);
        });
      } catch (err) {
        console.error('[CKE GEL] configureFormatButtonBehavior falhou:', err);
      }
    }

    // ---------- Inserção de ícones / popup ----------

    function insertIconToEditor(editor, chosen) {
      try {
        if (!chosen || !editor) return;

        if (typeof editor.insertHtml === 'function') {
          editor.insertHtml(chosen + ' ');
        } else if (typeof editor.insertText === 'function') {
          editor.insertText(chosen + ' ');
        } else {
          var html = editor.getData() || '';
          editor.setData(html + chosen + ' ');
          if (typeof editor.updateElement === 'function') editor.updateElement();
        }
      } catch (err) {
        console.error('[CKE GEL] insertIconToEditor falhou:', err);
      }
    }

    function createIconPickerPopup(editor, anchorBtn, iconBtnId) {
      try {
        var menuId = iconBtnId + '_menu';
        var existing = doc.getElementById(menuId);
        if (existing) return existing;

        var menu = doc.createElement('div');
        menu.id = menuId;
        menu.setAttribute('role', 'listbox');
        menu.style.position = 'absolute';
        menu.style.zIndex = 99999;
        menu.style.background = '#fff';
        menu.style.border = '1px solid #ccc';
        menu.style.padding = '6px';
        menu.style.display = 'none';
        menu.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
        menu.style.borderRadius = '2px';
        menu.style.whiteSpace = 'nowrap';
        menu.style.display = 'none';
        menu.style.gridTemplateColumns = 'repeat(10, 28px)';
        menu.style.gap = '4px';
        menu.style.alignItems = 'center';

        // torna realmente grid quando abrir
        menu.style.display = 'none';

        var i, ico;
        for (i = 0; i < QUICK_ICONS.length; i++) {
          (function (ico) {
            var b = doc.createElement('button');
            b.type = 'button';
            b.setAttribute('role', 'option');
            b.style.width = '28px';
            b.style.height = '28px';
            b.style.margin = '0';
            b.style.padding = '0';
            b.style.fontSize = '16px';
            b.style.lineHeight = '28px';
            b.style.cursor = 'pointer';
            b.style.border = '1px solid transparent';
            b.style.background = 'transparent';
            b.style.textAlign = 'center';
            b.textContent = ico;

            b.addEventListener('click', function (ev) {
              ev.preventDefault();
              insertIconToEditor(editor, ico);
              menu.style.display = 'none';
            });

            menu.appendChild(b);
          })(QUICK_ICONS[i]);
        }

        doc.body.appendChild(menu);

        function openMenu() {
          try {
            var rect = anchorBtn.getBoundingClientRect();
            menu.style.display = 'grid';
            menu.style.left = (rect.left + window.pageXOffset) + 'px';
            menu.style.top  = (rect.bottom + window.pageYOffset + 4) + 'px';
          } catch (e) {}
        }

        function onDocClick(e) {
          if (!menu.contains(e.target) && e.target !== anchorBtn && !anchorBtn.contains(e.target)) {
            menu.style.display = 'none';
          }
        }
        doc.addEventListener('click', onDocClick);

        menu.openMenu = openMenu;
        return menu;
      } catch (err) {
        console.error('[CKE GEL] createIconPickerPopup falhou:', err);
        return null;
      }
    }

    // ---------- Criação dos botões por editor ----------

    function addCustomButtonForEditor(editor) {
      try {
        var container = editor && editor.container && editor.container.$;
        if (!container) {
          console.warn('[CKE GEL] Container do editor não encontrado para:', editor && editor.name);
          return;
        }

        var btnId    = getButtonIdForEditor(editor);
        var quoteId  = btnId + '_blockquote';
        var iconBtnId = btnId + '_iconpicker';

        // --- CITAÇÃO ---
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
              console.error('[CKE GEL] Erro ao aplicar blockquote:', err);
            }
          });

          lastGroup.appendChild(quoteBtn);
        } else {
          configureQuoteButtonAppearance(quoteBtn, quoteId);
        }

        // --- FORMATAR ---
        var formatBtn = container.querySelector('#' + btnId);
        if (!formatBtn && quoteBtn) {
          formatBtn = quoteBtn.cloneNode(true);
          formatBtn.removeAttribute('onclick');
          formatBtn.removeAttribute('onkeydown');
          formatBtn.removeAttribute('onfocus');
          configureButtonAppearance(formatBtn, btnId);
          configureFormatButtonBehavior(formatBtn, editor);
          quoteBtn.parentNode.insertBefore(formatBtn, quoteBtn.nextSibling);
        } else if (formatBtn) {
          configureButtonAppearance(formatBtn, btnId);
          configureFormatButtonBehavior(formatBtn, editor);
        }

        // --- ÍCONE ---
        var iconBtn = container.querySelector('#' + iconBtnId);
        if (!iconBtn && formatBtn && formatBtn.parentNode) {
          iconBtn = formatBtn.cloneNode(true);
          iconBtn.removeAttribute('onclick');
          iconBtn.removeAttribute('onkeydown');
          iconBtn.removeAttribute('onfocus');
          configureIconButtonAppearance(iconBtn, iconBtnId);

          iconBtn.addEventListener('click', function (e) {
            e.preventDefault();
            try {
              var popup = createIconPickerPopup(editor, iconBtn, iconBtnId);
              if (popup && typeof popup.openMenu === 'function') {
                popup.openMenu();
              }
            } catch (err) {
              console.error('[CKE GEL] Erro ao abrir seletor de ícones:', err);
            }
          });

          // ordem: Citação, Ícone, Formatar
          formatBtn.parentNode.insertBefore(iconBtn, formatBtn);
        } else if (iconBtn) {
          configureIconButtonAppearance(iconBtn, iconBtnId);
        }

      } catch (e) {
        console.error('[CKE GEL] Erro ao adicionar botões no editor', editor && editor.name, e);
      }
    }

    // ---------- Hook CKEditor ----------

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
            addCustomButtonForEditor(editor);
          }, 300);
        });

        // instâncias já existentes
        var instances = root.CKEDITOR.instances || {};
        var name;
        for (name in instances) {
          if (!instances.hasOwnProperty(name)) continue;
          (function (ed) {
            setTimeout(function () {
              addCustomButtonForEditor(ed);
            }, 300);
          })(instances[name]);
        }
      } catch (err) {
        console.error('[CKE GEL] hookCkeditor falhou:', err);
      }
    }

    function init() {
      try {
        console.log('[CKE GEL] Script Tampermonkey iniciado (GEL + Citação + Ícones, ES5).');

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
