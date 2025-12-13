// ==UserScript==
// @name         SMAX - Exportar chamados EMS (sem limite de 10k, 1000 em 1000 + barra)
// @namespace    https://github.com/oadrianocardoso/smax
// @version      3.1
// @description  Exporta todos os chamados da view atual via EMS, quebrando o intervalo de CreateTime se passar de 10k entidades, carregando 1000 em 1000 na memória e gerando 1 CSV ao final. Exporta todos os comentários.
// @match        https://suporte.tjsp.jus.br/saw/*
// @run-at       document-start
// @grant        unsafeWindow
// @grant        GM_addStyle
// ==/UserScript==

(function () {
  'use strict';

  const EMS_TENANT_ID = '213963628';
  const PAGE_SIZE = 1000;
  const DETAIL_BATCH_SIZE = 300;

  // Layout EMS com todos os campos que vamos usar
  const EMS_LAYOUT = [
    'Id',
    'CreateTime',
    'RequestedForPerson',
    'Description',
    'Solution',
    'ExpertAssignee',
    'StatusSCCDSMAX_c',
    'Status',
    'CloseTime',
    'Comments',
    'AssignedToGroup',
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
    'ExpertAssignee.Name',
    'ExpertAssignee.Avatar',
    'ExpertAssignee.Location',
    'ExpertAssignee.IsVIP',
    'ExpertAssignee.OrganizationalGroup',
    'ExpertAssignee.Upn',
    'ExpertAssignee.IsDeleted',
    'ExpertGroup',
    'RELATION_LAYOUT.item'
  ].join(',');

  // Cabeçalho fixo do CSV
  const CSV_COLUMNS = [
    { key: 'Id',                     header: 'ID' },
    { key: 'CreateTimeFmt',          header: 'Hora de Criação' },
    { key: 'RequestedForPersonName', header: 'Solicitado para' },
    { key: 'GrupoResponsavel',       header: 'Grupo responsável' },
    { key: 'Description',            header: 'Descrição' },
    { key: 'Solution',               header: 'Solução' },
    { key: 'ExpertAssigneeName',     header: 'Designado especialista' },
    { key: 'ExpertGroup',            header: 'Grupo de Especialistas' },
    { key: 'StatusSCCDSMAX_c',       header: 'Status Operacional' },
    { key: 'Status',                 header: 'Status' },
    { key: 'CloseTimeFmt',           header: 'Hora de fechamento' },
    { key: 'AllCommentsBody',        header: 'Comentários' }
  ];

  // ==========================
  // CAPTURA DO Request?filter=
  // ==========================

  let lastRequestFilterUrl = null;

  function captureIfRequestFilter(url) {
    if (!url) return;
    try {
      const full = new URL(url, unsafeWindow.location.origin);
      if (full.pathname.endsWith('/Request') && full.searchParams.has('filter')) {
        lastRequestFilterUrl = full;
        console.log('[SMAX EMS] Capturado Request?filter =', full.toString());
      }
    } catch (e) {
      // ignore
    }
  }

  try {
    const XHR = unsafeWindow.XMLHttpRequest;
    if (XHR && XHR.prototype) {
      const origOpen = XHR.prototype.open;
      XHR.prototype.open = function (method, url) {
        captureIfRequestFilter(url);
        return origOpen.apply(this, arguments);
      };
      console.log('[SMAX EMS] Hook XHR ativo');
    }
  } catch (e) {
    console.warn('[SMAX EMS] Falha hook XHR', e);
  }

  try {
    const w = unsafeWindow;
    if (w.fetch) {
      const origFetch = w.fetch;
      w.fetch = function (resource, init) {
        try {
          const url = typeof resource === 'string' ? resource : resource && resource.url;
          captureIfRequestFilter(url);
        } catch (e) {}
        return origFetch.apply(this, arguments);
      };
      console.log('[SMAX EMS] Hook fetch ativo');
    }
  } catch (e) {
    console.warn('[SMAX EMS] Falha hook fetch', e);
  }

  // ==========================
  // UI: Botão + barra de progresso
  // ==========================

  GM_addStyle(`
    #smax-ems-export-btn {
      position: fixed;
      bottom: 16px;
      left: 16px;
      padding: 8px 12px;
      font-size: 12px;
      background: #0078d4;
      color: #fff;
      border-radius: 4px;
      cursor: pointer;
      z-index: 999999;
      box-shadow: 0 2px 6px rgba(0,0,0,.25);
    }
    #smax-ems-export-btn:hover {
      background: #005a9e;
    }
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
  `);

  window.addEventListener('load', () => {
    setTimeout(() => {
      if (document.getElementById('smax-ems-export-btn')) return;
      const btn = document.createElement('button');
      btn.id = 'smax-ems-export-btn';
      btn.textContent = 'Exportar EMS CSV';
      btn.title = 'Exportar todos os registros desta view via EMS (1000 em 1000, sem limite 10k)';
      btn.addEventListener('click', startExport);
      document.body.appendChild(btn);
    }, 1500);
  });

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
    barBg.className = 'w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700';

    const barInner = document.createElement('div');
    barInner.id = 'smax-ems-progress-bar-inner';
    barInner.className = 'bg-blue-600 h-2.5 rounded-full';
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
      if (t > 0) {
        text.textContent = `Baixando ${c} de ${t} registros (${pct}%)...`;
      } else {
        text.textContent = `Baixando ${c} registros...`;
      }
    }

    function done(finalCount, total) {
      update(finalCount, total);
      title.textContent = 'Exportação concluída';
      text.textContent = `Total baixado: ${finalCount} registro(s).`;
      barInner.style.width = '100%';
    }

    function error(msg) {
      title.textContent = 'Erro na exportação';
      text.textContent = msg || 'Verifique o console (F12) para detalhes.';
      barInner.style.background = '#dc2626';
      barInner.style.width = '100%';
    }

    return { update, done, error };
  }

  // ==========================
  // FLUXO PRINCIPAL
  // ==========================

  async function startExport() {
    if (!lastRequestFilterUrl) {
      alert('Ainda não capturei o Request?filter= do grid.\nAtualize a view e espere carregar primeiro.');
      return;
    }

    const origin = unsafeWindow.location.origin;
    const progressUI = createProgressUI();

    try {
      // Filtro original (decodificado)
      const originalFilterEncoded = lastRequestFilterUrl.searchParams.get('filter');
      const decodedFilter = decodeURIComponent(originalFilterEncoded || '');

      // Precisamos de CreateTime btw (a,b)
      const ctRegex = /CreateTime\s+btw\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/i;
      const match = ctRegex.exec(decodedFilter);
      if (!match) {
        progressUI.error('Filtro não contém CreateTime btw(...). A divisão automática >10k não é possível.');
        alert('O filtro atual não tem "CreateTime btw (...)".\nPara superar o limite de 10.000, use um filtro por CreateTime.');
        return;
      }

      let ctStart = Number(match[1]);
      let ctEnd   = Number(match[2]);

      console.log('[SMAX EMS] Intervalo CreateTime original:', ctStart, ctEnd);

      const filterTemplate = decodedFilter;
      const emsBase = `${origin}/rest/${EMS_TENANT_ID}/ems/Request`;
      const emsBaseUrl = new URL(emsBase);

      // Copia todos os params, exceto filter, para a base EMS
      for (const [k, v] of lastRequestFilterUrl.searchParams.entries()) {
        if (k === 'filter') continue;
        emsBaseUrl.searchParams.set(k, v);
      }

      emsBaseUrl.searchParams.set('layout', EMS_LAYOUT);
      emsBaseUrl.searchParams.set('meta', 'totalCount');
      emsBaseUrl.searchParams.delete('size');
      emsBaseUrl.searchParams.delete('skip');

      console.log('[SMAX EMS] URL base EMS:', emsBaseUrl.toString());

      const allRaw = [];
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

      if (!allRaw.length) {
        progressUI.done(0, 0);
        alert('Nenhum registro retornado pela EMS.');
        return;
      }

      // ==========================
      // REMOVER DUPLICADOS POR ID
      // ==========================
      const byId = {};
      const duplicates = [];
      for (const ent of allRaw) {
        if (!ent) continue;
        const id =
          (ent.properties && ent.properties.Id) ||
          ent.Id ||
          null;
        if (!id) continue;
        if (byId[id]) {
          duplicates.push(id);
        }
        byId[id] = ent; // o último prevalece (não importa, pq devem ser iguais)
      }
      const uniqueRaw = Object.values(byId);
      console.log('[SMAX EMS] Total bruto recebido da EMS:', allRaw.length);
      console.log('[SMAX EMS] Total após remover duplicados por Id:', uniqueRaw.length);
      if (duplicates.length) {
        console.warn('[SMAX EMS] IDs duplicados detectados:', Array.from(new Set(duplicates)));
      }

      // Normaliza
      const normalized = uniqueRaw.map(normalizeEntity);

      // Grupo responsável (AssignedToGroup -> PersonGroup.Name)
      const groupIdsSet = new Set(
        normalized.map(e => e.AssignedToGroup).filter(v => v && typeof v === 'string')
      );
      const groupIds = Array.from(groupIdsSet);
      let groupMap = {};
      if (groupIds.length) {
        groupMap = await fetchPersonGroupsInBatches(origin, groupIds);
      }

      for (const e of normalized) {
        const gid = e.AssignedToGroup;
        e.GrupoResponsavel = gid && groupMap[gid] ? groupMap[gid] : '';
      }

      // Log de ExpertGroup
      const expertGroupsSet = new Set(
        normalized.map(e => e.ExpertGroup).filter(v => v && typeof v === 'string')
      );
      console.log('[SMAX EMS] ExpertGroup distintos a serem exportados:', Array.from(expertGroupsSet));
      console.table(
        normalized.map(e => ({
          Id: e.Id,
          ExpertGroup: e.ExpertGroup || ''
        }))
      );

      // CSV único
      const csv = buildCsv(normalized);
      downloadCsv(csv, 'smax_ems_requests.csv');

      progressUI.done(normalized.length, normalized.length);
      alert(`Exportação concluída.\nRegistros baixados (únicos): ${normalized.length}`);
    } catch (e) {
      console.error('[SMAX EMS] ERRO na exportação:', e);
      progressUI.error('Erro ao exportar via EMS. Veja o console (F12).');
      alert('Erro ao exportar via EMS. Veja o console (F12) para detalhes.');
    }
  }

  // ==========================
  // DIVISÃO DE INTERVALO (para superar 10k)
  // ==========================

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

    console.log(`[SMAX EMS][Depth=${depth}] Tentando intervalo: ${startMs} - ${endMs}`);

    try {
      const result = await fetchAllPagesSingleUrl(urlBase, pageSize, onProgress);
      collector.push(...result.entities);
    } catch (err) {
      if (err.messageKey === 'query.num.of.entities.exceeded' && startMs < endMs) {
        // Divide o intervalo em dois e tenta de novo
        const mid = Math.floor((startMs + endMs) / 2);
        console.warn(
          `[SMAX EMS] Intervalo excedeu 10k entidades. Dividindo: [${startMs},${mid}] e [${mid + 1},${endMs}]`
        );
        await fetchIntervalRecursive(
          emsBaseUrl,
          filterTemplate,
          startMs,
          mid,
          pageSize,
          collector,
          onProgress,
          depth + 1
        );
        await fetchIntervalRecursive(
          emsBaseUrl,
          filterTemplate,
          mid + 1,
          endMs,
          pageSize,
          collector,
          onProgress,
          depth + 1
        );
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

      console.log(`[SMAX EMS] Página (raw) skip=${skip}`);

      const resp = await fetch(pageUrl.toString(), { credentials: 'include' });
      const text = await resp.text();

      if (!resp.ok) {
        let errJson = null;
        try {
          errJson = JSON.parse(text);
        } catch (e) {}
        const err = new Error(
          errJson && errJson.message_key
            ? errJson.message_key
            : `HTTP ${resp.status} ao chamar ${pageUrl}`
        );
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
        if (apiTotal !== null) {
          console.log('[SMAX EMS] Total detectado (raw):', apiTotal);
        }
      }

      all.push(...items);

      if (onProgress) {
        onProgress(all.length, apiTotal || null);
      }

      // NOVA LÓGICA DE PARADA:
      // apenas para se count == 0 ou count < pageSize
      if (!count || count < pageSize) break;

      skip += pageSize;
      if (skip > 500000) {
        console.warn('[SMAX EMS] skip muito alto, abortando por segurança.');
        break;
      }
    }

    return { entities: all, total: apiTotal || all.length };
  }

  // ==========================
  // PERSONGROUP (Grupo responsável)
  // ==========================

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
    const url =
      `${base}?filter=${encodeURIComponent(filterExpr)}` +
      `&layout=Id,Name&meta=totalCount`;

    console.log('[SMAX EMS] Buscando PersonGroup:', url);

    const resp = await fetch(url, { credentials: 'include' });
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

  // ==========================
  // NORMALIZAÇÃO + DATAS + COMENTÁRIOS + ExpertGroup
  // ==========================

  function normalizeEntity(ent) {
    const base = ent && ent.properties ? { ...ent.properties } : { ...(ent || {}) };

    if (ent && ent.related_properties && ent.related_properties.RequestedForPerson) {
      const rp = ent.related_properties.RequestedForPerson;
      if (rp && rp.Name) base.RequestedForPersonName = rp.Name;
    }
    if (ent && ent.related_properties && ent.related_properties.ExpertAssignee) {
      const ea = ent.related_properties.ExpertAssignee;
      if (ea && ea.Name) base.ExpertAssigneeName = ea.Name;
    }

    // ExpertGroup: já vem em properties (por causa do EMS_LAYOUT),
    // mas se algum dia vier também em related_properties, aproveitamos:
    if (ent && ent.related_properties && ent.related_properties.ExpertGroup) {
      const eg = ent.related_properties.ExpertGroup;
      base.ExpertGroup = eg.Name || eg.Id || base.ExpertGroup || '';
    }

    // Todos os comentários
    if (base.Comments) {
      try {
        const parsed = JSON.parse(base.Comments);
        const arr = parsed.Comment || [];
        if (Array.isArray(arr) && arr.length > 0) {
          base.AllCommentsBody = arr
            .map(c => c.CommentBody || '')
            .join('<hr />');
        }
      } catch (e) {
        console.warn('[SMAX EMS] Erro ao parsear Comments JSON:', e);
      }
    }

    base.CreateTimeFmt = formatDate(base.CreateTime);
    base.CloseTimeFmt = formatDate(base.CloseTime);

    return base;
  }

  function formatDate(ms) {
    if (!ms || typeof ms !== 'number') return '';
    const d = new Date(ms);
    if (isNaN(d.getTime())) return '';
    const pad = n => String(n).padStart(2, '0');
    const dia  = pad(d.getDate());
    const mes  = pad(d.getMonth() + 1);
    const ano  = d.getFullYear();
    const hora = pad(d.getHours());
    const min  = pad(d.getMinutes());
    return `${dia}/${mes}/${ano} ${hora}:${min}`;
  }

  // ==========================
  // CSV
  // ==========================

  function buildCsv(entities) {
    const lines = [];
    lines.push(CSV_COLUMNS.map(c => c.header).join(';'));
    for (const e of entities) {
      const row = CSV_COLUMNS.map(col => csvEscape(e[col.key]));
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

})();
