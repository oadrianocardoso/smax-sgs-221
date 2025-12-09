// ==UserScript==
// @name         Passar aquele GEL! (+ Citação + Ícones)
// @namespace    https://github.com/oadrianocardoso
// @version      4.7
// @description  Adiciona botões "Formatar", "Citação" e "Ícones" em todas as instâncias CKEditor, ajustando <p>, <img> e permitindo inserir ícones/emoji usados nos textos do ChatGPT de forma rápida e segura (getData/setData/insertHtml).
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
  const ICON_POS_FORMATAR  = '0 -528px'; // bandeirinha
  const ICON_POS_QUOTE     = '0 -192px'; // blockquote
  const ICON_POS_ICONS     = '0 -96px';  // ícone genérico p/ "Ícones" (ajuste visual)

  // Ícones/emoji usados com frequência nas respostas
  const QUICK_ICONS = [
    '✅', '⚠️', '❗', 'ℹ️',
    '💡', '📌', '👉', '📝',
    '🔎', '📎', '🚨', '🔧'
  ];

  let iconPaletteEl = null;
  let currentEditorForIcons = null;

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

  function configureIconsButtonAppearance(btn, iconBtnId) {
    if (!btn) return;

    btn.id = iconBtnId;
    btn.classList.remove('cke_button_disabled');
    btn.setAttribute('aria-disabled', 'false');
    btn.classList.add('cke_button_off');
    btn.setAttribute('href', 'javascript:void(0)');
    btn.setAttribute('title', 'Inserir ícones rápidos');

    const label = btn.querySelector('.cke_button_label');
    if (label) {
      label.id = iconBtnId + '_label';
      label.textContent = 'Ícones';
    }

    const icon = btn.querySelector('.cke_button_icon');
    if (icon) {
      icon.className = icon.className.replace(/__\w+_icon/, '__meubotao_icons_icon');
      icon.style.backgroundImage = `url("${ICON_URL}")`;
      icon.style.backgroundPosition = ICON_POS_ICONS;
      icon.style.filter = ''; // padrão
    }
  }

  // Cria (uma vez) o painel flutuante de seleção de ícones
  function createIconPalette() {
    if (iconPaletteEl) return iconPaletteEl;

    const palette = doc.createElement('div');
    palette.id = 'gel-icon-palette';
    palette.style.position = 'fixed';
    palette.style.bottom = '20px';
    palette.style.right = '20px';
    palette.style.zIndex = '99999';
    palette.style.background = '#ffffff';
    palette.style.border = '1px solid #ccc';
    palette.style.borderRadius = '6px';
    palette.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    palette.style.padding = '8px 10px';
    palette.style.fontFamily = 'Segoe UI, Arial, sans-serif';
    palette.style.fontSize = '13px';
    palette.style.display = 'none';

    const title = doc.createElement('div');
    title.textContent = 'Ícones rápidos';
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '6px';
    palette.appendChild(title);

    const iconsContainer = doc.createElement('div');
    iconsContainer.style.display = 'flex';
    iconsContainer.style.flexWrap = 'wrap';
    iconsContainer.style.gap = '4px';

    QUICK_ICONS.forEach(iconChar => {
      const btn = doc.createElement('button');
      btn.type = 'button';
      btn.textContent = iconChar;
      btn.style.cursor = 'pointer';
      btn.style.border = '1px solid #ddd';
      btn.style.borderRadius = '4px';
      btn.style.background = '#f7f7f7';
      btn.style.padding = '2px 6px';
      btn.style.fontSize = '16px';
      btn.style.lineHeight = '1.2';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (currentEditorForIcons) {
          try {
            currentEditorForIcons.insertHtml(iconChar + ' ');
            currentEditorForIcons.focus();
          } catch (err) {
            console.error('[GEL] Erro ao inserir ícone no editor:', err);
          }
        }
      });
      iconsContainer.appendChild(btn);
    });

    palette.appendChild(iconsContainer);

    const footer = doc.createElement('div');
    footer.style.textAlign = 'right';
    footer.style.marginTop = '6px';

    const closeBtn = doc.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = 'Fechar';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.border = '1px solid #ccc';
    closeBtn.style.borderRadius = '4px';
    closeBtn.style.background = '#eee';
    closeBtn.style.padding = '2px 6px';
    closeBtn.style.fontSize = '11px';
    closeBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      palette.style.display = 'none';
    });

    footer.appendChild(closeBtn);
    palette.appendChild(footer);

    doc.body.appendChild(palette);
    iconPaletteEl = palette;
    return palette;
  }

  function toggleIconPalette(editor) {
    const palette = createIconPalette();
    currentEditorForIcons = editor;

    if (palette.style.display === 'none' || palette.style.display === '') {
      palette.style.display = 'block';
    } else {
      palette.style.display = 'none';
    }
  }

  function addCustomButtonForEditor(editor) {
    try {
      const container = editor.container && editor.container.$;
      if (!container) return;

      const btnId     = getButtonIdForEditor(editor);
      const quoteId   = btnId + '_blockquote';
      const iconsId   = btnId + '_icons';

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

        formatBtn.addEventListener('click', function (e) {
          e.preventDefault();
          console.log('[GEL] Formatando conteúdo no editor:', editor.name);

          let html = editor.getData() || '';

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

        // coloca o "Formatar" logo depois do "Citação"
        quoteBtn.parentNode.insertBefore(formatBtn, quoteBtn.nextSibling);
      } else if (formatBtn) {
        configureButtonAppearance(formatBtn, btnId);
      }

      // ============================ //
      // 3) BOTÃO "Ícones"
      // ============================ //
      let iconsBtn = container.querySelector('#' + iconsId);

      // só cria se houver o botão "Formatar" como referência
      if (!iconsBtn && formatBtn) {
        iconsBtn = formatBtn.cloneNode(true);

        iconsBtn.removeAttribute('onclick');
        iconsBtn.removeAttribute('onkeydown');
        iconsBtn.removeAttribute('onfocus');

        configureIconsButtonAppearance(iconsBtn, iconsId);

        iconsBtn.addEventListener('click', function (e) {
          e.preventDefault();
          console.log('[GEL] Abrindo painel de ícones para editor:', editor.name);
          toggleIconPalette(editor);
        });

        // insere logo após o botão "Formatar"
        formatBtn.parentNode.insertBefore(iconsBtn, formatBtn.nextSibling);
      } else if (iconsBtn) {
        configureIconsButtonAppearance(iconsBtn, iconsId);
      }

    } catch (e) {
      console.error('[GEL] ERRO ao inserir botões para o editor', editor && editor.name, e);
    }
  }

  function hookCkeditor() {
    if (!root.CKEDITOR) return;

    // novas instâncias
    root.CKEDITOR.on('instanceReady', evt => {
      setTimeout(() => addCustomButtonForEditor(evt.editor), 300);
    });

    // instâncias já existentes
    Object.values(root.CKEDITOR.instances || {}).forEach(editor => {
      setTimeout(() => addCustomButtonForEditor(editor), 300);
    });
  }

  function init() {
    console.log('[GEL] Script inicializado (GEL + Citação + Ícones).');

    const interval = setInterval(() => {
      if (root.CKEDITOR) {
        clearInterval(interval);
        hookCkeditor();
      }
    }, 500);
