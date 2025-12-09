// ==UserScript==
// @name         Passar aquele GEL! (+ Citação)
// @namespace    https://github.com/oadrianocardoso
// @version      5.7
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
    var QUICK_ICONS = ['✅','⚠️','❗','ℹ️','💡','👉','📝','🔎','📌','🚨'];

    // Insere o ícone no editor usando as mesmas estratégias já usadas antes
    function insertIconToEditor(editor, chosen) {
      try {
        if (!chosen) return;
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

    // Cria um popup de seleção de ícones (dropdown) similar ao botão de bgcolor
    function createIconPickerPopup(editor, anchorBtn, iconBtnId) {
      try {
        var menuId = iconBtnId + '_menu';
        // evita recriar
        var existing = document.getElementById(menuId);
        if (existing) return existing;

        var menu = document.createElement('div');
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

        // cria botões
        for (var i = 0; i < QUICK_ICONS.length; i++) {
          (function (ico) {
            var b = document.createElement('button');
            b.type = 'button';
            b.setAttribute('role', 'option');
            b.style.margin = '2px';
            b.style.padding = '4px 6px';
            b.style.fontSize = '16px';
            b.style.cursor = 'pointer';
            b.style.border = '1px solid transparent';
            b.style.background = 'transparent';
            b.textContent = ico;
            b.addEventListener('click', function (ev) {
              ev.preventDefault();
              try {
                insertIconToEditor(editor, ico);
              } catch (e) { console.error(e); }
              menu.style.display = 'none';
            });
            menu.appendChild(b);
          })(QUICK_ICONS[i]);
        }

        document.body.appendChild(menu);

        // positionador simples
        function openMenu() {
          try {
            var rect = anchorBtn.getBoundingClientRect();
            menu.style.display = 'block';
            // posiciona abaixo do botão
            menu.style.left = (rect.left + window.pageXOffset) + 'px';
            menu.style.top = (rect.bottom + window.pageYOffset + 4) + 'px';
          } catch (e) {}
        }

        // fecha ao clicar fora
        function onDocClick(e) {
          if (!menu.contains(e.target) && e.target !== anchorBtn && !anchorBtn.contains(e.target)) {
            menu.style.display = 'none';
          }
        }
        document.addEventListener('click', onDocClick);

        // anexa função utilitária ao menu para abrir
        menu.openMenu = openMenu;
        return menu;
      } catch (err) {
        console.error('[CKE GEL] createIconPickerPopup falhou:', err);
        return null;
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
          // Exibir emoji diretamente (evita sprite invisível)
          try {
            icon.className = icon.className.replace(/__\w+_icon/, '__iconpicker_icon');
          } catch (e) {}
          try {
            icon.style.backgroundImage = 'none';
            icon.style.backgroundPosition = '';
            icon.style.backgroundSize = '';
            icon.style.fontSize = '16px';
            icon.style.lineHeight = '18px';
            icon.style.textAlign = 'center';
            icon.style.padding = '0';
            // conteúdo visível padrão para o botão de ícone
            icon.textContent = '🔣';
          } catch (e) {
            // falha silenciosa
          }
        }
        // deixa o botão com aparência expansível (seta) como o bgcolor
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
          // Observador para garantir reinserção caso a toolbar seja reconstruída
          try {
            if (typeof MutationObserver !== 'undefined' && !lastGroup._ckeGelObserver) {
              lastGroup._ckeGelObserver = true;
              var mo = new MutationObserver(function (mutations) {
                // atraso pequeno para evitar loops durante mutações em lote
                setTimeout(function () {
                  try {
                    addCustomButtonForEditor(editor);
                  } catch (e) {
                    console.error('[CKE GEL] reinserção via MutationObserver falhou:', e);
                  }
                }, 100);
              });
              try { mo.observe(lastGroup, { childList: true }); } catch (e) {}
            }
          } catch (e) {}
        } else {
          configureQuoteButtonAppearance(quoteBtn, quoteId);
        }

        // ======================
        // 2) BOTÃO "Formatar" +  ÍCONE à ESQUERDA
        // ======================
        var formatBtn = container.querySelector('#' + btnId);
        var iconBtnId = btnId + '_iconpicker';
        var iconBtn = container.querySelector('#' + iconBtnId);

        if (!formatBtn && quoteBtn) {
          formatBtn = quoteBtn.cloneNode(true);
          formatBtn.removeAttribute('onclick');
          formatBtn.removeAttribute('onkeydown');
          formatBtn.removeAttribute('onfocus');
          configureButtonAppearance(formatBtn, btnId);

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
          formatBtn.parentNode.insertBefore(iconBtn, formatBtn);
        } else {
          // se formatBtn já existe, garante que o iconBtn exista e esteja configurado
          configureButtonAppearance(formatBtn, btnId);
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
                if (popup && typeof popup.openMenu === 'function') popup.openMenu();
              } catch (err) {
                console.error('[CKE GEL] Erro ao abrir seletor de ícones:', err);
              }
            });
            formatBtn.parentNode.insertBefore(iconBtn, formatBtn);
          } else if (iconBtn) {
            configureIconButtonAppearance(iconBtn, iconBtnId);
          }
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
