(function (root) {
  'use strict';

  const SMAX   = root.SMAX = root.SMAX || {};
  const utils  = SMAX.utils || {};
  const config = SMAX.config || {};
  const prefs  = config.prefs || {};

  const debounce      = utils.debounce      || (fn => fn);
  const getViewport   = utils.getGridViewport || (d => (d || root.document));
  const normalizeText = utils.normalizeText || (s => (s || '').toLowerCase());

  // Defini��o dos filtros r�pidos
  const QUICK_FILTERS = [
    {
      id: 'CEMAN',
      label: 'CEMAN',
      tag: 'CEMAN',
      keywords: ['mandado', 'oficial de justiça', 'central de mandados']
    },
    {
      id: 'MIGRADOR',
      label: 'MIGRADOR',
      tag: 'MIGRADOR',
      keywords: ['migrado', 'migração', 'migrador', 'migrar']
    },
    {
      id: 'DJEN',
      label: 'DJEN',
      tag: 'DJEN',
      keywords: ['djen', 'diário da justiça eletrônico', 'diário da justica']
    },
    {
      id: 'ATP',
      label: 'ATP',
      tag: 'ATP',
      keywords: ['atp', 'automatização', 'automação', 'regra de atp', 'regra de automatização']
    },
    {
      id: 'LOGIN',
      label: 'LOGIN',
      tag: 'LOGIN',
      keywords: ['login', 'acesso', 'senha', 'autenticador', 'dois fatores', '2fa']
    }
  ];

  let activeFilterId = null;

  function injectCss() {
    if (typeof GM_addStyle !== 'function') return;

    GM_addStyle(`
      .smax-qf-bar {
        display: flex;
        gap: 6px;
        padding: 4px 8px;
        background: #f7f7f7;
        border-bottom: 1px solid #ddd;
        font-size: 11px;
        align-items: center;
      }
      .smax-qf-label {
        font-weight: 600;
        margin-right: 4px;
      }
      .smax-qf-btn {
        padding: 2px 6px;
        border-radius: 4px;
        border: 1px solid #ccc;
        background: #fff;
        cursor: pointer;
      }
      .smax-qf-btn:hover {
        background: #f0f0f0;
      }
      .smax-qf-btn.active {
        background: #1976d2;
        color: #fff;
        border-color: #1565c0;
      }

      /* Destaque de linhas filtradas */
      .smax-qf-row-match {
        box-shadow: inset 3px 0 0 0 #1976d2;
        background-color: #e3f2fd;
      }
    `);
  }

  function buildBar() {
    const doc = root.document;
    if (doc.querySelector('.smax-qf-bar')) return;

    const header = doc.querySelector('.slick-header');
    if (!header || !header.parentElement) return;

    const bar = doc.createElement('div');
    bar.className = 'smax-qf-bar';

    const label = doc.createElement('span');
    label.className = 'smax-qf-label';
    label.textContent = 'Filtros r�pidos:';
    bar.appendChild(label);

    QUICK_FILTERS.forEach(f => {
      const btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = 'smax-qf-btn';
      btn.textContent = f.label;
      btn.dataset.filterId = f.id;

      btn.addEventListener('click', () => {
        const current = activeFilterId;
        activeFilterId = (current === f.id) ? null : f.id;
        updateButtonsState(bar);
        applyQuickFilter();
      });

      bar.appendChild(btn);
    });

    header.parentElement.insertBefore(bar, header);
  }

  function updateButtonsState(bar) {
    bar.querySelectorAll('.smax-qf-btn').forEach(btn => {
      if (btn.dataset.filterId === activeFilterId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function rowMatchesFilter(row, filterDef) {
    // 1) Tentar pela TAG [CEMAN] etc.
    const tagEls = row.querySelectorAll('.tag-smax');
    for (const el of tagEls) {
      const txt = (el.textContent || '').trim().toUpperCase();
      if (txt === filterDef.tag || txt === `[${filterDef.tag}]`) {
        return true;
      }
    }

    // 2) Fallback: busca por palavras-chave no texto da linha
    const textNorm = normalizeText(row.textContent || '');
    return filterDef.keywords.some(k => textNorm.includes(normalizeText(k)));
  }

  function clearRowMarks(viewport) {
    viewport.querySelectorAll('.slick-row.smax-qf-row-match').forEach(r => {
      r.classList.remove('smax-qf-row-match');
    });
  }

  function applyQuickFilter() {
    const doc = root.document;
    const viewport = getViewport(doc);

    clearRowMarks(viewport);
    if (!activeFilterId) return;

    const filterDef = QUICK_FILTERS.find(f => f.id === activeFilterId);
    if (!filterDef) return;

    viewport.querySelectorAll('.slick-row').forEach(row => {
      if (rowMatchesFilter(row, filterDef)) {
        row.classList.add('smax-qf-row-match');
      }
    });
  }

  const debouncedApply = debounce(applyQuickFilter, 120);

  function init() {
    injectCss();
    const doc = root.document;
    const start = () => {
      buildBar();
      debouncedApply();
      console.log('[SMAX filters] módulo de filtros rápidos carregado');
    };

    if (doc.readyState === 'loading') {
      doc.addEventListener('DOMContentLoaded', start);
    } else {
      start();
    }
  }

  // Exposto para o orquestrador
  SMAX.filters = {
    init,
    apply: debouncedApply
  };

  try {
    init();
  } catch (e) {
    console.error('[SMAX filters] erro no init:', e);
  }

})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
