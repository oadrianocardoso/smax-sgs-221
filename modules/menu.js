(function (root) {
  'use strict';

  const SMAX = root.SMAX = root.SMAX || {};
  const STORAGE_KEY = 'SMAX_SGS221_CONFIG';

  // Definição das preferências que vão aparecer no menu
  const PREF_DEFS = [
    { key: 'highlightsOn',      label: 'Destaques (palavras coloridas)' },
    { key: 'nameBadgesOn',      label: 'Badges por finais de ID' },
    { key: 'magistradoOn',      label: 'Destacar Magistrado em "Solicitado por"' },
    { key: 'autoTagsOn',        label: 'Tags automáticas na Descrição' },
    { key: 'enlargeCommentsOn', label: 'Comentários com altura automática' },
    { key: 'collapseOn',        label: 'Recolher "Oferta de Catálogo" / remover seções' }
    // se quiser depois: anexos/detratores etc podem virar prefs também
  ];

  /* ==========================
   * Persistência de config
   * ========================= */

  function loadConfig() {
    const base = SMAX.config || {};
    let persisted = {};
    try {
      const raw = root.localStorage.getItem(STORAGE_KEY);
      if (raw) persisted = JSON.parse(raw);
    } catch (e) {
      console.warn('[SMAX menu] Erro ao ler config do localStorage:', e);
    }

    // Mescla prefs padrão + gravadas
    const mergedPrefs = Object.assign(
      {},
      base.prefs || {},
      persisted.prefs || {}
    );

    const finalConfig = Object.assign({}, base, { prefs: mergedPrefs });
    SMAX.config = finalConfig;
    return finalConfig;
  }

  function saveConfig() {
    try {
      const cfg = SMAX.config || {};
      const toSave = {
        prefs: cfg.prefs || {}
      };
      root.localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.warn('[SMAX menu] Erro ao salvar config no localStorage:', e);
    }
  }

  /* ==========================
   * UI (botão + painel)
   * ========================= */

  function injectCss() {
    if (typeof GM_addStyle === 'function') {
      GM_addStyle(`
        .smax-menu-btn {
          position: fixed;
          bottom: 16px;
          right: 16px;
          z-index: 999998;
          padding: 6px 10px;
          border-radius: 20px;
          border: 1px solid #ccc;
          background: #ffffff;
          color: #333;
          font-size: 12px;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
        }
        .smax-menu-btn:hover {
          background: #f5f5f5;
        }
        .smax-menu-panel {
          position: fixed;
          bottom: 48px;
          right: 16px;
          width: 260px;
          max-height: 360px;
          overflow: auto;
          z-index: 999999;
          background: #ffffff;
          border-radius: 8px;
          border: 1px solid #ccc;
          box-shadow: 0 4px 12px rgba(0,0,0,0.35);
          font-size: 12px;
          font-family: "Segoe UI", Tahoma, sans-serif;
        }
        .smax-menu-header {
          padding: 8px 10px;
          border-bottom: 1px solid #e0e0e0;
          font-weight: 600;
          background: #f3f3f3;
        }
        .smax-menu-body {
          padding: 8px 10px;
        }
        .smax-menu-row {
          display: flex;
          align-items: center;
          margin-bottom: 6px;
        }
        .smax-menu-row input[type="checkbox"] {
          margin-right: 6px;
        }
        .smax-menu-footer {
          padding: 6px 10px 8px;
          border-top: 1px solid #e0e0e0;
          text-align: right;
          font-size: 11px;
          color: #666;
        }
      `);
    }
  }

  function createButton() {
    const doc = root.document;
    if (doc.querySelector('.smax-menu-btn')) return;

    const btn = doc.createElement('button');
    btn.className = 'smax-menu-btn';
    btn.type = 'button';
    btn.textContent = 'SMAX ??';

    btn.addEventListener('click', () => {
      const existing = doc.querySelector('.smax-menu-panel');
      if (existing) {
        existing.remove();
      } else {
        createPanel();
      }
    });

    doc.body.appendChild(btn);
  }

  function createPanel() {
    const doc = root.document;
    const cfg = SMAX.config || {};
    const prefs = cfg.prefs || {};

    const panel = doc.createElement('div');
    panel.className = 'smax-menu-panel';

    const header = doc.createElement('div');
    header.className = 'smax-menu-header';
    header.textContent = 'SMAX SGS 221 ? Config';

    const body = doc.createElement('div');
    body.className = 'smax-menu-body';

    PREF_DEFS.forEach(def => {
      const row = doc.createElement('div');
      row.className = 'smax-menu-row';

      const cb = doc.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!prefs[def.key];
      cb.dataset.prefKey = def.key;

      cb.addEventListener('change', () => {
        const k = cb.dataset.prefKey;
        if (!cfg.prefs) cfg.prefs = {};
        cfg.prefs[k] = cb.checked;
        saveConfig();
        // pede para o orquestrador reprocessar
        if (SMAX.orchestrator && typeof SMAX.orchestrator.forceRun === 'function') {
          SMAX.orchestrator.forceRun();
        }
      });

      const label = doc.createElement('label');
      label.textContent = def.label;

      row.appendChild(cb);
      row.appendChild(label);
      body.appendChild(row);
    });

    const footer = doc.createElement('div');
    footer.className = 'smax-menu-footer';
    footer.textContent = 'As alterações são salvas automaticamente.';

    panel.appendChild(header);
    panel.appendChild(body);
    panel.appendChild(footer);

    // fecha painel ao clicar fora
    const closeOnOutsideClick = (e) => {
      if (!panel.contains(e.target) && !e.target.closest('.smax-menu-btn')) {
        panel.remove();
        doc.removeEventListener('mousedown', closeOnOutsideClick, true);
      }
    };
    doc.addEventListener('mousedown', closeOnOutsideClick, true);

    doc.body.appendChild(panel);
  }

  function init() {
    const doc = root.document;
    loadConfig();
    injectCss();

    if (doc.readyState === 'loading') {
      doc.addEventListener('DOMContentLoaded', createButton);
    } else {
      createButton();
    }

    console.log('[SMAX menu] módulo de menu carregado');
  }

  SMAX.menu = { init, loadConfig, saveConfig };

})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
