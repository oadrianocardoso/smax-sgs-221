(function (root) {
  'use strict';

  const SMAX = root.SMAX = root.SMAX || {};

  const EMS_TENANT_ID = '213963628';
  const PAGE_SIZE = 250;
  const DETAIL_BATCH_SIZE = 300;
  const LOG_PREFIX = '[SMAX EMS]';

  const EMS_LAYOUT = [
    'Id',
    'CreateTime',
    'CloseTime',
    'StatusSCCDSMAX_c',
    'Status',
    'RequestedForPerson',
    'Description',
    'Solution',
    'AssignedToGroup',
    'ExpertGroup',
    'ExpertAssignee',
    'AtendidoPor_c',
    'GlobalId_c.Id',
    'GlobalId_c',
    'IsGlobal_c',
    'NumeroRejeicoes_c',
    'Comments',
    'PhaseId',
    'ProcessId',
    'SLT.SLATargetDate',
    'SLT.OLATargetDate',
    'RequestedForPerson.Name',
    'RequestedForPerson.Avatar',
    'RequestedForPerson.Location',
    'RequestedForPerson.IsVIP',
    'RequestedForPerson.OrganizationalGroup',
    'RequestedForPerson.Upn',
    'RequestedForPerson.IsDeleted',
    'AssignedToGroup.Name',
    'AssignedToGroup.IsDeleted',
    'ExpertGroup.Name',
    'ExpertGroup.IsDeleted',
    'ExpertAssignee.Name',
    'ExpertAssignee.Avatar',
    'ExpertAssignee.Location',
    'ExpertAssignee.IsVIP',
    'ExpertAssignee.OrganizationalGroup',
    'ExpertAssignee.Upn',
    'ExpertAssignee.IsDeleted',
    'AtendidoPor_c.Name',
    'AtendidoPor_c.Avatar',
    'AtendidoPor_c.Location',
    'AtendidoPor_c.IsVIP',
    'AtendidoPor_c.OrganizationalGroup',
    'AtendidoPor_c.Upn',
    'AtendidoPor_c.IsDeleted',
    'GlobalId_c.Id',
    'GlobalId_c.DisplayLabel',
    'GlobalId_c.IsDeleted',
    'RELATION_LAYOUT.item'
  ].join(',');

  const EMS_ORDER = 'ExpertAssignee.Name asc,ExpertAssignee.Location asc,ExpertAssignee.IsVIP asc,ExpertAssignee.OrganizationalGroup asc,ExpertAssignee.Upn asc';

  let lastRequestFilterUrl = null;
  let hooksInstalled = false;
  let stylesInstalled = false;
  let initialized = false;
  let exporting = false;

  function captureIfRequestFilter(url) {
    if (!url) return;
    if (exporting) return;
    try {
      const full = new URL(url, root.location.origin);
      const emsRequestPath = `/rest/${EMS_TENANT_ID}/ems/Request`;
      if (full.pathname.includes(emsRequestPath) && full.searchParams.has('filter')) {
        lastRequestFilterUrl = full;
        console.log(`${LOG_PREFIX} Capturado Request?filter =`, full.toString());
      }
    } catch (e) {
      // ignore
    }
  }

  function recoverFilterFromPerformance() {
    try {
      if (!root.performance || typeof root.performance.getEntriesByType !== 'function') return null;
      const entries = root.performance.getEntriesByType('resource') || [];
      for (let i = entries.length - 1; i >= 0; i -= 1) {
        const name = String(entries[i] && entries[i].name || '');
        if (!name || name.indexOf('filter=') === -1 || name.indexOf(`/rest/${EMS_TENANT_ID}/ems/Request`) === -1) continue;
        try {
          const full = new URL(name, root.location.origin);
          const emsRequestPath = `/rest/${EMS_TENANT_ID}/ems/Request`;
          if (full.pathname.includes(emsRequestPath) && full.searchParams.has('filter')) {
            return full;
          }
        } catch (e) {
          // ignore entry
        }
      }
    } catch (e) {
      // ignore
    }
    return null;
  }

  function ensureFilterCaptured() {
    if (lastRequestFilterUrl) return true;
    const recovered = recoverFilterFromPerformance();
    if (recovered) {
      lastRequestFilterUrl = recovered;
      console.log(`${LOG_PREFIX} Filtro recuperado via performance:`, recovered.toString());
      return true;
    }
    return false;
  }

  function hookNetworkOnce() {
    if (hooksInstalled) return;
    hooksInstalled = true;

    try {
      const XHR = root.XMLHttpRequest;
      if (XHR && XHR.prototype) {
        const origOpen = XHR.prototype.open;
        XHR.prototype.open = function (method, url) {
          captureIfRequestFilter(url);
          return origOpen.apply(this, arguments);
        };
        console.log(`${LOG_PREFIX} Hook XHR ativo`);
      }
    } catch (e) {
      console.warn(`${LOG_PREFIX} Falha hook XHR`, e);
    }

    try {
      if (root.fetch) {
        const origFetch = root.fetch;
        root.fetch = function (resource, init) {
          try {
            const url = typeof resource === 'string' ? resource : resource && resource.url;
            captureIfRequestFilter(url);
          } catch (e) {
            // ignore
          }
          return origFetch.apply(this, arguments);
        };
        console.log(`${LOG_PREFIX} Hook fetch ativo`);
      }
    } catch (e) {
      console.warn(`${LOG_PREFIX} Falha hook fetch`, e);
    }
  }

  function ensureStyles() {
    if (stylesInstalled) return;
    stylesInstalled = true;

    const css = `
      #smax-ems-progress-wrapper {
        position: fixed;
        bottom: 16px;
        right: 16px;
        width: 320px;
        z-index: 999999;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      #smax-ems-progress-card {
        background: #ffffff;
        border-radius: 0.75rem;
        padding: 12px 14px;
        box-shadow: 0 10px 15px rgba(0,0,0,0.1);
        border: 1px solid #e5e7eb;
      }
      #smax-ems-progress-title {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 6px;
      }
      #smax-ems-progress-text {
        font-size: 12px;
        color: #4b5563;
        margin-bottom: 8px;
      }
      #smax-ems-progress-bar-bg {
        width: 100%;
        background: #e5e7eb;
        border-radius: 9999px;
        height: 10px;
        overflow: hidden;
      }
      #smax-ems-progress-bar-inner {
        height: 10px;
        border-radius: 9999px;
        background: #2563eb;
        width: 0%;
        transition: width 0.2s ease-out;
      }
      #smax-ems-progress-close {
        margin-top: 6px;
        font-size: 11px;
        color: #6b7280;
        cursor: pointer;
        text-align: right;
      }
      #smax-ems-progress-close:hover {
        color: #111827;
      }
    `;

    if (typeof GM_addStyle === 'function') {
      GM_addStyle(css);
      return;
    }

    if (document.getElementById('smax-ems-export-style')) return;
    const style = document.createElement('style');
    style.id = 'smax-ems-export-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function createProgressUI() {
    let wrapper = document.getElementById('smax-ems-progress-wrapper');
    if (wrapper) wrapper.remove();

    wrapper = document.createElement('div');
    wrapper.id = 'smax-ems-progress-wrapper';

    const card = document.createElement('div');
    card.id = 'smax-ems-progress-card';

    const title = document.createElement('div');
    title.id = 'smax-ems-progress-title';
    title.textContent = 'Exportando chamados EMS...';

    const text = document.createElement('div');
    text.id = 'smax-ems-progress-text';
    text.textContent = 'Preparando...';

    const barBg = document.createElement('div');
    barBg.id = 'smax-ems-progress-bar-bg';

    const barInner = document.createElement('div');
    barInner.id = 'smax-ems-progress-bar-inner';
    barBg.appendChild(barInner);

    const close = document.createElement('div');
    close.id = 'smax-ems-progress-close';
    close.textContent = 'Fechar';
    close.addEventListener('click', () => wrapper.remove());

    card.appendChild(title);
    card.appendChild(text);
    card.appendChild(barBg);
    card.appendChild(close);
    wrapper.appendChild(card);
    document.body.appendChild(wrapper);

    let lastTotal = null;

    function update(current, total) {
      if (typeof total === 'number' && total > 0) lastTotal = total;
      const t = lastTotal || total || current || 0;
      const c = current || 0;
      const pct = t > 0 ? Math.min(100, Math.round((c / t) * 100)) : 0;
      barInner.style.width = pct + '%';
      text.textContent = t > 0
        ? `Baixando ${c} de ${t} registros (${pct}%)...`
        : `Baixando ${c} registros...`;
    }

    function done(finalCount, total) {
      update(finalCount, total);
      title.textContent = 'Exportacao concluida';
      text.textContent = `Total baixado: ${finalCount} registro(s).`;
      barInner.style.width = '100%';
    }

    function error(msg) {
      title.textContent = 'Erro na exportacao';
      text.textContent = msg || 'Verifique o console (F12) para detalhes.';
      barInner.style.background = '#dc2626';
      barInner.style.width = '100%';
    }

    return { update, done, error };
  }

  async function startExport(options) {
    const opts = options && typeof options === 'object' ? options : {};
    const externalUi = opts.ui && typeof opts.ui === 'object' ? opts.ui : null;

    if (exporting) {
      if (externalUi && typeof externalUi.error === 'function') {
        externalUi.error('A exportacao ja esta em execucao.');
      }
      alert('A exportacao ja esta em execucao.');
      return;
    }

    if (!ensureFilterCaptured()) {
      if (externalUi && typeof externalUi.error === 'function') {
        externalUi.error('Filtro da view nao foi capturado ainda.');
      }
      alert('Ainda nao capturei o Request?filter= do grid.\nAtualize a view e espere carregar primeiro.');
      return;
    }

    exporting = true;
    const origin = root.location.origin;
    const progressUI = externalUi || createProgressUI();
    if (progressUI && typeof progressUI.update === 'function') {
      progressUI.update(0, 0);
    }

    try {
      const originalFilterEncoded = lastRequestFilterUrl.searchParams.get('filter');
      const decodedFilter = decodeURIComponent(originalFilterEncoded || '');

      const ctRegex = /CreateTime\s+btw\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/i;
      const match = ctRegex.exec(decodedFilter);
      const hasCreateTimeRange = !!match;
      const ctStart = hasCreateTimeRange ? Number(match[1]) : 0;
      const ctEnd = hasCreateTimeRange ? Number(match[2]) : 0;

      const filterTemplate = decodedFilter;
      const emsBase = `${origin}/rest/${EMS_TENANT_ID}/ems/Request`;
      const emsBaseUrl = new URL(emsBase);

      for (const [k, v] of lastRequestFilterUrl.searchParams.entries()) {
        if (k === 'filter') continue;
        emsBaseUrl.searchParams.set(k, v);
      }

      emsBaseUrl.searchParams.set('layout', EMS_LAYOUT);
      emsBaseUrl.searchParams.set('meta', 'totalCount');
      emsBaseUrl.searchParams.set('order', EMS_ORDER);
      emsBaseUrl.searchParams.delete('size');
      emsBaseUrl.searchParams.delete('skip');

      const allRaw = [];
      if (hasCreateTimeRange) {
        await fetchIntervalRecursive(
          emsBaseUrl,
          filterTemplate,
          ctStart,
          ctEnd,
          PAGE_SIZE,
          allRaw,
          progressUI.update,
          0
        );
      } else {
        const directUrl = new URL(emsBaseUrl.toString());
        directUrl.searchParams.set('filter', filterTemplate);
        try {
          const result = await fetchAllPagesSingleUrl(directUrl, PAGE_SIZE, progressUI.update);
          allRaw.push(...result.entities);
        } catch (err) {
          if (err && err.messageKey === 'query.num.of.entities.exceeded') {
            progressUI.error('Sem CreateTime btw no filtro e consulta excedeu 10k.');
            alert('A consulta excedeu 10.000 registros e nao foi possivel dividir automaticamente porque o filtro nao contem CreateTime btw (...).');
            return;
          }
          throw err;
        }
      }

      if (!allRaw.length) {
        if (progressUI && typeof progressUI.done === 'function') progressUI.done(0, 0);
        alert('Nenhum registro retornado pela EMS.');
        return;
      }

      const byId = {};
      for (const ent of allRaw) {
        if (!ent) continue;
        const id = (ent.properties && ent.properties.Id) || ent.Id || null;
        if (!id) continue;
        byId[id] = ent;
      }
      const uniqueRaw = Object.values(byId);

      const normalized = uniqueRaw.map(normalizeEntity);

      const groupIdsSet = new Set();
      normalized.forEach(e => {
        const gid = String(e?.AssignedToGroup || e?.['AssignedToGroup.Id'] || '').trim();
        if (gid) groupIdsSet.add(gid);
      });
      const groupIds = Array.from(groupIdsSet);
      let groupMap = {};
      if (groupIds.length) {
        groupMap = await fetchPersonGroupsInBatches(origin, groupIds);
      }

      for (const e of normalized) {
        const gid = String(e?.AssignedToGroup || e?.['AssignedToGroup.Id'] || '').trim();
        e.GrupoResponsavel = gid && groupMap[gid] ? groupMap[gid] : '';
      }

      const csv = buildCsv(normalized);
      downloadCsv(csv, 'smax_ems_requests.csv');

      if (progressUI && typeof progressUI.done === 'function') {
        progressUI.done(normalized.length, normalized.length);
      }
      alert(`Exportacao concluida.\nRegistros baixados (unicos): ${normalized.length}`);
    } catch (e) {
      console.error(`${LOG_PREFIX} ERRO na exportacao:`, e);
      if (progressUI && typeof progressUI.error === 'function') {
        progressUI.error('Erro ao exportar via EMS. Veja o console (F12).');
      }
      alert('Erro ao exportar via EMS. Veja o console (F12).');
    } finally {
      exporting = false;
    }
  }

  function buildFilterForRange(template, startMs, endMs) {
    return template.replace(
      /CreateTime\s+btw\s*\(\s*\d+\s*,\s*\d+\s*\)/i,
      `CreateTime btw (${startMs},${endMs})`
    );
  }

  async function fetchIntervalRecursive(
    emsBaseUrl,
    filterTemplate,
    startMs,
    endMs,
    pageSize,
    collector,
    onProgress,
    depth
  ) {
    const filterStr = buildFilterForRange(filterTemplate, startMs, endMs);
    const urlBase = new URL(emsBaseUrl.toString());
    urlBase.searchParams.set('filter', filterStr);

    try {
      const result = await fetchAllPagesSingleUrl(urlBase, pageSize, onProgress);
      collector.push(...result.entities);
    } catch (err) {
      if (err.messageKey === 'query.num.of.entities.exceeded' && startMs < endMs) {
        const mid = Math.floor((startMs + endMs) / 2);
        await fetchIntervalRecursive(emsBaseUrl, filterTemplate, startMs, mid, pageSize, collector, onProgress, depth + 1);
        await fetchIntervalRecursive(emsBaseUrl, filterTemplate, mid + 1, endMs, pageSize, collector, onProgress, depth + 1);
      } else {
        throw err;
      }
    }
  }

  async function fetchAllPagesSingleUrl(urlBase, pageSize, onProgress) {
    const all = [];
    let skip = 0;
    let apiTotal = null;

    while (true) {
      const pageUrl = new URL(urlBase.toString());
      pageUrl.searchParams.set('size', String(pageSize));
      pageUrl.searchParams.set('skip', String(skip));

      const resp = await root.fetch(pageUrl.toString(), { credentials: 'include' });
      const text = await resp.text();

      if (!resp.ok) {
        let errJson = null;
        try { errJson = JSON.parse(text); } catch (e) {}
        const err = new Error(errJson && errJson.message_key ? errJson.message_key : `HTTP ${resp.status}`);
        err.status = resp.status;
        err.rawBody = text;
        err.messageKey = errJson && errJson.message_key ? errJson.message_key : undefined;
        throw err;
      }

      let data = null;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Falha ao parsear JSON da EMS.');
      }

      const items = data.entities || data.members || data.content || [];
      const count = items.length;

      if (apiTotal === null) {
        if (typeof data.total_count === 'number') apiTotal = data.total_count;
        else if (data.meta && typeof data.meta.total_count === 'number') apiTotal = data.meta.total_count;
        else if (data.Query && typeof data.Query.total_count === 'number') apiTotal = data.Query.total_count;
        else if (data.metadata && typeof data.metadata.totalCount === 'number') apiTotal = data.metadata.totalCount;
      }

      all.push(...items);
      if (onProgress) onProgress(all.length, apiTotal || null);

      if (!count || count < pageSize) break;

      skip += pageSize;
      if (skip > 500000) break;
    }

    return { entities: all, total: apiTotal || all.length };
  }

  async function fetchPersonGroupsInBatches(origin, ids) {
    const map = {};
    const BATCH = DETAIL_BATCH_SIZE || 200;
    for (let i = 0; i < ids.length; i += BATCH) {
      const batch = ids.slice(i, i + BATCH);
      const partial = await fetchPersonGroup(origin, batch);
      Object.assign(map, partial);
    }
    return map;
  }

  async function fetchPersonGroup(origin, ids) {
    if (!ids.length) return {};
    const base = `${origin}/rest/${EMS_TENANT_ID}/ems/PersonGroup`;
    const filterExpr = ids.map(id => `(Id='${id}')`).join(' or ');
    const url = `${base}?filter=${encodeURIComponent(filterExpr)}&layout=Id,Name&meta=totalCount`;

    const resp = await root.fetch(url, { credentials: 'include' });
    const text = await resp.text();
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status} ao chamar PersonGroup: ${text}`);
    }

    let data = null;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error('Falha ao parsear JSON de PersonGroup.');
    }

    const entities = data.entities || data.members || data.content || [];
    const m = {};
    for (const ent of entities) {
      const p = ent.properties || {};
      if (p.Id) m[p.Id] = p.Name || '';
    }
    return m;
  }

  function normalizeEntity(ent) {
    const props = ent && ent.properties ? { ...ent.properties } : { ...(ent || {}) };
    const related = ent && ent.related_properties && typeof ent.related_properties === 'object'
      ? ent.related_properties
      : {};
    const row = {};

    flattenToRow('', props, row);
    Object.keys(related).forEach(relKey => {
      flattenToRow(relKey, related[relKey], row);
    });

    row.RequestedForPersonName = String(
      row.RequestedForPersonName ||
      row['RequestedForPerson.Name'] ||
      row.Name ||
      ''
    );
    row.ExpertAssigneeName = String(
      row.ExpertAssigneeName ||
      row['ExpertAssignee.Name'] ||
      ''
    );
    row.ExpertGroupName = String(
      row.ExpertGroupName ||
      row['ExpertGroup.Name'] ||
      row.ExpertGroup ||
      ''
    );

    if (row.Comments) {
      try {
        const parsed = JSON.parse(row.Comments);
        const arr = parsed.Comment || [];
        if (Array.isArray(arr) && arr.length > 0) {
          row.AllCommentsBody = arr.map(c => c.CommentBody || '').join('<hr />');
        }
      } catch (e) {
        console.warn(`${LOG_PREFIX} Erro ao parsear Comments JSON:`, e);
      }
    }

    row.CreateTimeFmt = formatDate(Number(row.CreateTime));
    row.CloseTimeFmt = formatDate(Number(row.CloseTime));

    return row;
  }

  function isPlainObject(value) {
    return Object.prototype.toString.call(value) === '[object Object]';
  }

  function normalizeCellValue(value) {
    if (value === null || typeof value === 'undefined') return '';
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value) || isPlainObject(value)) {
      try {
        return JSON.stringify(value);
      } catch (e) {
        return String(value);
      }
    }
    return value;
  }

  function flattenToRow(prefix, value, out) {
    if (!out || typeof out !== 'object') return;

    if (Array.isArray(value)) {
      if (prefix) out[prefix] = normalizeCellValue(value);
      return;
    }

    if (isPlainObject(value)) {
      const keys = Object.keys(value);
      if (!keys.length) {
        if (prefix) out[prefix] = '';
        return;
      }

      keys.forEach(key => {
        const nextKey = prefix ? `${prefix}.${key}` : key;
        flattenToRow(nextKey, value[key], out);
      });
      return;
    }

    if (!prefix) return;
    out[prefix] = normalizeCellValue(value);
  }

  function getCsvColumns(rows) {
    const preferred = [
      'Id',
      'CreateTime',
      'CreateTimeFmt',
      'CloseTime',
      'CloseTimeFmt',
      'StatusSCCDSMAX_c',
      'Status',
      'RequestedForPersonName',
      'RequestedForPerson.Name',
      'Description',
      'Solution',
      'AssignedToGroup',
      'AssignedToGroup.Id',
      'AssignedToGroup.Name',
      'GrupoResponsavel',
      'ExpertGroup',
      'ExpertGroupName',
      'ExpertGroup.Name',
      'ExpertAssignee',
      'ExpertAssigneeName',
      'ExpertAssignee.Name',
      'AtendidoPor_c',
      'AtendidoPor_c.Name',
      'GlobalId_c',
      'GlobalId_c.Id',
      'GlobalId_c.DisplayLabel',
      'IsGlobal_c',
      'NumeroRejeicoes_c',
      'Comments',
      'AllCommentsBody',
      'PhaseId',
      'ProcessId',
      'SLT.SLATargetDate',
      'SLT.OLATargetDate'
    ];

    const all = new Set();
    (rows || []).forEach(row => {
      Object.keys(row || {}).forEach(key => all.add(key));
    });

    const tail = Array.from(all)
      .filter(key => preferred.indexOf(key) === -1)
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));

    return preferred.filter(key => all.has(key)).concat(tail);
  }

  function formatDate(ms) {
    if (!ms || typeof ms !== 'number') return '';
    const d = new Date(ms);
    if (isNaN(d.getTime())) return '';
    const pad = n => String(n).padStart(2, '0');
    const dia = pad(d.getDate());
    const mes = pad(d.getMonth() + 1);
    const ano = d.getFullYear();
    const hora = pad(d.getHours());
    const min = pad(d.getMinutes());
    return `${dia}/${mes}/${ano} ${hora}:${min}`;
  }

  function buildCsv(entities) {
    const rows = Array.isArray(entities) ? entities : [];
    const columns = getCsvColumns(rows);
    const lines = [];
    lines.push(columns.map(c => csvEscape(c)).join(';'));
    for (const e of rows) {
      const row = columns.map(col => csvEscape(e[col]));
      lines.push(row.join(';'));
    }
    return '\uFEFF' + lines.join('\r\n');
  }

  function csvEscape(val) {
    if (val === null || val === undefined) return '""';
    let s = String(val);
    s = s.replace(/"/g, '""').replace(/\r?\n/g, ' ');
    return `"${s}"`;
  }

  function downloadCsv(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  function init() {
    if (initialized) return;
    initialized = true;
    ensureStyles();
    hookNetworkOnce();
  }

  SMAX.exportChamados = {
    init,
    startExport,
    hasCapturedFilter() {
      return ensureFilterCaptured();
    },
    getLastFilterUrl() {
      ensureFilterCaptured();
      return lastRequestFilterUrl ? lastRequestFilterUrl.toString() : '';
    },
    getState() {
      return {
        initialized,
        exporting,
        hasFilter: ensureFilterCaptured()
      };
    }
  };

  init();

})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);

