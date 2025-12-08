(function (root) {
  'use strict';

  const SMAX   = root.SMAX = root.SMAX || {};
  const utils  = SMAX.utils || {};
  const config = SMAX.config || {};

  const debounce      = utils.debounce      || (fn => fn);
  const getViewport   = utils.getGridViewport || (d => (d || root.document));
  const normalizeText = utils.normalizeText || (s => (s || '').toLowerCase());

  function injectCss() {
    if (typeof GM_addStyle !== 'function') return;

    GM_addStyle(`
      .smax-dash-panel {
        position: fixed;
        top: 80px;
        right: 16px;
        z-index: 999997;
        width: 240px;
        max-height: 60vh;
        background: #ffffff;
        border-radius: 8px;
        border: 1px solid #ccc;
        box-shadow: 0 4px 14px rgba(0,0,0,0.35);
        font-family: "Segoe UI", Tahoma, sans-serif;
        font-size: 11px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .smax-dash-header {
        padding: 6px 8px;
        background: #f3f3f3;
        border-bottom: 1px solid #ddd;
        font-weight: 600;
      }
      .smax-dash-body {
        padding: 6px 8px;
        overflow: auto;
      }
      .smax-dash-section-title {
        font-weight: 600;
        margin: 4px 0 2px;
      }
      .smax-dash-list {
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .smax-dash-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 2px;
      }
      .smax-dash-chip {
        display: inline-flex;
        align-items: center;
        max-width: 160px;
      }
      .smax-dash-color {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        margin-right: 4px;
        border: 1px solid rgba(0,0,0,0.2);
        flex-shrink: 0;
      }
      .smax-dash-name {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .smax-dash-count {
        font-weight: 600;
        margin-left: 4px;
      }
      .smax-dash-critical {
        color: #c62828;
        font-weight: 600;
      }
    `);
  }

  function ensurePanel() {
    const doc = root.document;
    let panel = doc.querySelector('.smax-dash-panel');
    if (panel) return panel;

    panel = doc.createElement('div');
    panel.className = 'smax-dash-panel';

    const header = doc.createElement('div');
    header.className = 'smax-dash-header';
    header.textContent = 'SMAX ? Mini-dashboard';

    const body = doc.createElement('div');
    body.className = 'smax-dash-body';

    panel.appendChild(header);
    panel.appendChild(body);
    doc.body.appendChild(panel);
    return panel;
  }

  // Descobre índice da coluna pelo data-aid ou pelo texto do cabeçalho
  function getColumnIndexByAidOrTitle(aidCandidates, textCandidates) {
    const headers = Array.from(root.document.querySelectorAll('.slick-header-columns .slick-header-column'));
    if (!headers.length) return -1;

    // 1) Tenta pelos data-aid sugeridos
    if (aidCandidates && aidCandidates.length) {
      for (let i = 0; i < headers.length; i++) {
        const aid = headers[i].getAttribute('data-aid') || '';
        if (aidCandidates.includes(aid)) return i;
      }
    }

    // 2) Fallback: tenta pelo texto do cabeçalho
    if (textCandidates && textCandidates.length) {
      for (let i = 0; i < headers.length; i++) {
        const txt = normalizeText(headers[i].textContent || '');
        if (!txt) continue;
        if (textCandidates.some(t => txt.includes(normalizeText(t)))) {
          return i;
        }
      }
    }

    return -1;
  }

  function getCellByIndex(row, idx) {
    if (!row || idx < 0) return null;
    const sel = `.slick-cell.l${idx}.r${idx}`;
    return row.querySelector(sel);
  }

  function isCriticalStatus(text) {
    const raw = text || '';
    const norm = normalizeText(raw);
    if (!raw && !norm) return false;

    if (norm.includes('urgente') || norm.includes('plantao') || norm.includes('plantão')) {
      return true;
    }
    if (raw.includes('ERRO_') || raw.includes('Erro ao') || raw.includes('ERRO ')) {
      return true;
    }

    return false;
  }

  function updateDashboard() {
    const doc = root.document;
    const viewport = getViewport(doc);
    const panel = ensurePanel();
    const body = panel.querySelector('.smax-dash-body');
    if (!body) return;

    const idxPerson = getColumnIndexByAidOrTitle(
      [
        'grid_header_AssignedToPerson.DisplayLabel',
        'grid_header_AssignedToPerson.DisplayName',
        'grid_header_AssignedToPerson'
      ],
      ['atribuído a', 'atribuido a', 'responsável', 'responsavel', 'pessoa']
    );

    const idxGroup = getColumnIndexByAidOrTitle(
      [
        'grid_header_AssignedToGroup.DisplayLabel',
        'grid_header_AssignedToGroup.DisplayName',
        'grid_header_AssignedToGroup'
      ],
      ['atribuído para grupo', 'grupo']
    );

    const idxStatus = getColumnIndexByAidOrTitle(
      [
        'grid_header_Status.DisplayLabel',
        'grid_header_Status.DisplayName',
        'grid_header_Status'
      ],
      ['status', 'situação', 'situacao']
    );

    const countsByName = new Map();
    let criticalCount = 0;

    const rows = viewport.querySelectorAll('.slick-row');
    rows.forEach(row => {
      const cellPerson = getCellByIndex(row, idxPerson);
      const cellGroup  = getCellByIndex(row, idxGroup);
      const cellStatus = getCellByIndex(row, idxStatus);

      const person = (cellPerson && cellPerson.textContent || '').trim();
      const group  = (cellGroup && cellGroup.textContent  || '').trim();
      const status = (cellStatus && cellStatus.textContent|| '').trim();

      const keyName = person || group || 'Sem responsável';
      if (!countsByName.has(keyName)) countsByName.set(keyName, 0);
      countsByName.set(keyName, countsByName.get(keyName) + 1);

      if (isCriticalStatus(status)) {
        criticalCount++;
      }
    });

    const badgesCfg = (SMAX.badges && typeof SMAX.badges.getConfig === 'function')
      ? SMAX.badges.getConfig()
      : { nameColors: {} };

    const nameColors = badgesCfg.nameColors || {};

    const sorted = Array.from(countsByName.entries())
      .sort((a, b) => b[1] - a[1]);

    body.innerHTML = '';

    const sec1Title = doc.createElement('div');
    sec1Title.className = 'smax-dash-section-title';
    sec1Title.textContent = 'Chamados por pessoa/grupo';
    body.appendChild(sec1Title);

    const list = doc.createElement('ul');
    list.className = 'smax-dash-list';

    sorted.forEach(([name, count]) => {
      const li = doc.createElement('li');
      li.className = 'smax-dash-item';

      const chip = doc.createElement('div');
      chip.className = 'smax-dash-chip';

      const colorDot = doc.createElement('span');
      colorDot.className = 'smax-dash-color';

      const c = nameColors[name.toUpperCase()] || null;
      if (c) {
        colorDot.style.backgroundColor = c.bg || '#ffffff';
        colorDot.style.borderColor = 'rgba(0,0,0,0.3)';
      } else {
        colorDot.style.backgroundColor = '#eeeeee';
      }

      const nameSpan = doc.createElement('span');
      nameSpan.className = 'smax-dash-name';
      nameSpan.textContent = name;

      const countSpan = doc.createElement('span');
      countSpan.className = 'smax-dash-count';
      countSpan.textContent = count;

      chip.appendChild(colorDot);
      chip.appendChild(nameSpan);

      li.appendChild(chip);
      li.appendChild(countSpan);
      list.appendChild(li);
    });

    body.appendChild(list);

    const sec2Title = doc.createElement('div');
    sec2Title.className = 'smax-dash-section-title';
    sec2Title.textContent = 'Críticos (urg./plantão/ERRO)';
    body.appendChild(sec2Title);

    const criticalInfo = doc.createElement('div');
    criticalInfo.className = 'smax-dash-critical';
    criticalInfo.textContent = `${criticalCount} chamado(s) crítico(s) na visão atual.`;
    body.appendChild(criticalInfo);
  }

  const debouncedUpdate = debounce(updateDashboard, 150);

  function init() {
    injectCss();
    const doc = root.document;
    const start = () => {
      ensurePanel();
      debouncedUpdate();
      console.log('[SMAX dashboard] mini-dashboard carregado');
    };

    if (doc.readyState === 'loading') {
      doc.addEventListener('DOMContentLoaded', start);
    } else {
      start();
    }
  }

  SMAX.dashboard = {
    init,
    update: debouncedUpdate
  };

  try {
    init();
  } catch (e) {
    console.error('[SMAX dashboard] erro no init:', e);
  }

})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
