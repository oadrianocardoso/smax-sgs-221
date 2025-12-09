// ==UserScript==
// @name         Passar aquele GEL! (+ Citação + Ícones)
// @namespace    https://github.com/oadrianocardoso
// @version      6.3
// @description  Adiciona botões "Formatar", "Citação" e um seletor de ícones na barra do CKEditor (plCkeditorX), formatando <p> e <img> via getData/setData e aplicando blockquote e emojis sem quebrar outros scripts (ES5 only).
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
        var imgEl, s2;

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
          imgEl = imgs[i];
          s2 = imgEl.getAttribute('style') || '';

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

    // ==========================================================
    //  INSERIR ÍCONE NO EDITOR
    // ==========================================================
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

    // Popup (dropdown) de seleção de ícones em grade 10x10
    function createIconPickerPopup(editor, anchorBtn, iconBtnId) {
      try {
        var menuId = iconBtnId + '_menu';
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
        menu.style.boxShadow = '0 2px 6px rgba
