(function (root) {
  'use strict';

  const SMAX = root.SMAX = root.SMAX || {};
  const CONFIG = SMAX.config || {};

  const PREF_FIELDS = [
    { key: 'highlightsOn', label: 'Palavras destacadas' },
    { key: 'nameBadgesOn', label: 'Especialistas por finais de ID' },
    { key: 'magistradoOn', label: 'Destaque de magistrado' },
    { key: 'collapseOn', label: 'Recolher seções automáticas' },
    { key: 'enlargeCommentsOn', label: 'Comentários com altura automática' },
    { key: 'autoTagsOn', label: 'Tags automáticas na descrição' }
  ];

  const SECTION_ORDER = ['geral', 'especialistas', 'palavras', 'tags', 'detratores', 'exportacao'];
  const TEAM_OPTIONS = ['SGS 2.2.1', 'SGS 2.2.2'];
  const PERSON_LAYOUT = 'Name,Avatar,Location,IsVIP,OrganizationalGroup,Upn,IsDeleted,FirstName,LastName,EmployeeNumber,Email';
  const PERSON_META = 'totalCount,ddParentTypeIsRequest,ddParentIdIs74319902';
  const PERSON_ORDER = 'Name asc';
  let panelState = null;
  let savingInProgress = false;
  let openingOverlay = false;
  let saveFeedbackTimer = null;
  const peopleByTeam = {};
  const peopleFetchPromiseByTeam = {};

  function getKnownTeamCodes() {
    return uniq(
      []
        .concat(TEAM_OPTIONS)
        .concat(Object.keys(isPlainObject(CONFIG.teams) ? CONFIG.teams : {}))
        .concat(Object.keys(isPlainObject(CONFIG.teamGroupIds) ? CONFIG.teamGroupIds : {}))
        .concat(Object.keys(isPlainObject(panelState?.teams) ? panelState.teams : {}))
        .concat(Object.keys(isPlainObject(panelState?.teamGroupIds) ? panelState.teamGroupIds : {}))
        .map(v => String(v || '').trim())
        .filter(Boolean)
    );
  }

  function isPlainObject(v) {
    return Object.prototype.toString.call(v) === '[object Object]';
  }

  function cloneValue(value) {
    if (Array.isArray(value)) return value.map(cloneValue);
    if (isPlainObject(value)) {
      const out = {};
      Object.keys(value).forEach(k => {
        out[k] = cloneValue(value[k]);
      });
      return out;
    }
    return value;
  }

  function normalizeHex(value, fallback) {
    const raw = String(value || '').trim();
    if (!raw) return fallback;

    if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toUpperCase();
    if (/^#[0-9a-f]{3}$/i.test(raw)) {
      const h = raw.slice(1);
      return (`#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`).toUpperCase();
    }
    return fallback;
  }

  function inferFg(bg) {
    const v = normalizeHex(bg, '#777777');
    const r = parseInt(v.slice(1, 3), 16);
    const g = parseInt(v.slice(3, 5), 16);
    const b = parseInt(v.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.62 ? '#111111' : '#FFFFFF';
  }

  function uniq(arr) {
    return Array.from(new Set(arr));
  }

  function parseLines(value) {
    return uniq(
      String(value || '')
        .split(/\r?\n/)
        .map(s => s.trim())
        .filter(Boolean)
    );
  }

  function parseFinals(value) {
    const parts = String(value || '')
      .split(/[,\s;]+/)
      .map(s => s.trim())
      .filter(Boolean);

    const nums = [];
    parts.forEach(p => {
      const n = Number(p);
      if (!Number.isInteger(n) || n < 0 || n > 99) return;
      nums.push(n);
    });
    return uniq(nums);
  }

  function getTeamGroupId(teamCode) {
    const code = normalizeTeamName(teamCode);
    const fromPanel = Number(panelState?.teamGroupIds?.[code]);
    if (Number.isInteger(fromPanel) && fromPanel > 0) return fromPanel;
    const fromConfig = Number(CONFIG.teamGroupIds?.[code]);
    if (Number.isInteger(fromConfig) && fromConfig > 0) return fromConfig;
    return null;
  }

  function buildPersonRequestUrl(groupId) {
    const base = `${root.location.origin}/rest/213963628/ems/Person`;
    const p = new URLSearchParams();
    p.set('filter', `(PersonToGroup[Id in (${groupId})])`);
    p.set('layout', PERSON_LAYOUT);
    p.set('meta', PERSON_META);
    p.set('order', PERSON_ORDER);
    return `${base}?${p.toString()}`;
  }

  function parsePersonEntities(payload) {
    const entities = Array.isArray(payload?.entities) ? payload.entities : [];
    return entities
      .map(e => isPlainObject(e?.properties) ? e.properties : {})
      .map(p => ({
        id: Number(p.Id),
        name: String(p.Name || '').trim(),
        location: String(p.Location || '').trim()
      }))
      .filter(p => Number.isInteger(p.id) && !!p.name)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }

  async function fetchTeamPeople(teamCode, groupIdOverride) {
    const code = normalizeTeamName(teamCode);
    const override = Number(groupIdOverride);
    const groupId = Number.isInteger(override) && override > 0 ? override : getTeamGroupId(code);
    const cacheKey = `${code}:${groupId || 'none'}`;
    if (Array.isArray(peopleByTeam[cacheKey])) return peopleByTeam[cacheKey];
    if (peopleFetchPromiseByTeam[cacheKey]) return peopleFetchPromiseByTeam[cacheKey];

    peopleFetchPromiseByTeam[cacheKey] = (async () => {
      if (!groupId) {
        peopleByTeam[cacheKey] = [];
        return peopleByTeam[cacheKey];
      }

      const url = buildPersonRequestUrl(groupId);
      const res = await root.fetch(url, { method: 'GET', credentials: 'include', cache: 'no-store' });
      if (!res.ok) throw new Error(`Falha ao buscar pessoas do SMAX (${res.status})`);
      const payload = await res.json().catch(() => null);
      peopleByTeam[cacheKey] = parsePersonEntities(payload);
      return peopleByTeam[cacheKey];
    })().finally(() => {
      delete peopleFetchPromiseByTeam[cacheKey];
    });

    return peopleFetchPromiseByTeam[cacheKey];
  }

  function getSnapshot() {
    if (typeof CONFIG.snapshot === 'function') return CONFIG.snapshot();
    return cloneValue({
      prefs: CONFIG.prefs || {},
      teamName: CONFIG.teamName || TEAM_OPTIONS[0],
      teams: CONFIG.teams || {},
      teamGroupIds: CONFIG.teamGroupIds || {},
      nameGroups: CONFIG.nameGroups || {},
      nameAliases: CONFIG.nameAliases || {},
      nameColors: CONFIG.nameColors || {},
      ausentes: CONFIG.ausentes || [],
      personMeta: CONFIG.personMeta || {},
      detratores: CONFIG.detratores || [],
      highlightGroups: CONFIG.highlightGroups || {},
      autoTagRules: CONFIG.autoTagRules || []
    });
  }

  function normalizeTeamName(name) {
    const raw = String(name || '').trim();
    const known = getKnownTeamCodes();
    return known.includes(raw) ? raw : (known[0] || TEAM_OPTIONS[0]);
  }

  function getTeamCodeFromOption(optionEl) {
    if (!optionEl) return '';
    return String(optionEl.getAttribute('data-team-code') || '').trim();
  }

  function getSelectedTeamCode() {
    const select = root.document.getElementById('smax-team-select');
    const selected = select?.options?.[select.selectedIndex] || null;
    const fromOption = getTeamCodeFromOption(selected);
    const fromData = String(select?.getAttribute('data-team-code') || '').trim();
    return normalizeTeamName(fromOption || fromData || panelState?.teamName || '');
  }

  function getSelectedTeamGroupId() {
    const select = root.document.getElementById('smax-team-select');
    const groupId = Number(select?.value);
    return Number.isInteger(groupId) && groupId > 0 ? groupId : null;
  }

  function cloneTeamData(data) {
    const src = isPlainObject(data) ? data : {};
    const srcMeta = isPlainObject(src.personMeta) ? src.personMeta : {};
    const personMeta = {};
    Object.keys(srcMeta).forEach(name => {
      const key = String(name || '').trim().toUpperCase();
      if (!key) return;
      const m = isPlainObject(srcMeta[name]) ? srcMeta[name] : {};
      const personId = Number(m.id ?? m.personId);
      personMeta[key] = {
        id: Number.isInteger(personId) ? personId : null,
        location: String(m.location || '').trim(),
        name: String(m.name || '').trim()
      };
    });

    return {
      nameGroups: isPlainObject(src.nameGroups) ? cloneValue(src.nameGroups) : {},
      nameAliases: isPlainObject(src.nameAliases) ? cloneValue(src.nameAliases) : {},
      nameColors: isPlainObject(src.nameColors) ? cloneValue(src.nameColors) : {},
      ausentes: Array.isArray(src.ausentes) ? src.ausentes.map(v => String(v || '').trim().toUpperCase()).filter(Boolean) : [],
      personMeta
    };
  }

  function ensureTeamModel(snapshot) {
    const selected = normalizeTeamName(snapshot.teamName);
    const sourceGroupIds = isPlainObject(snapshot.teamGroupIds)
      ? snapshot.teamGroupIds
      : (isPlainObject(CONFIG.teamGroupIds) ? CONFIG.teamGroupIds : {});
    const knownCodes = uniq(
      getKnownTeamCodes()
        .concat(Object.keys(isPlainObject(snapshot.teams) ? snapshot.teams : {}))
        .concat(Object.keys(isPlainObject(sourceGroupIds) ? sourceGroupIds : {}))
    );
    const teamCodes = knownCodes.length ? knownCodes : TEAM_OPTIONS.slice();
    const teamGroupIds = {};
    const teams = {};
    teamCodes.forEach(team => {
      teams[team] = { nameGroups: {}, nameAliases: {}, nameColors: {}, ausentes: [], personMeta: {} };
      const groupId = Number(sourceGroupIds[team]);
      if (Number.isInteger(groupId) && groupId > 0) teamGroupIds[team] = groupId;
    });

    if (isPlainObject(snapshot.teams)) {
      teamCodes.forEach(team => {
        if (isPlainObject(snapshot.teams[team])) {
          teams[team] = cloneTeamData(snapshot.teams[team]);
        }
      });
    }

    const selectedTeam = cloneTeamData(teams[selected]);
    teams[selected] = selectedTeam;
    const selectedTeamHasData =
      Object.keys(selectedTeam.nameGroups).length ||
      Object.keys(selectedTeam.nameAliases).length ||
      Object.keys(selectedTeam.nameColors).length ||
      selectedTeam.ausentes.length ||
      Object.keys(selectedTeam.personMeta).length;

    if (!selectedTeamHasData) {
      teams[selected] = cloneTeamData({
        nameGroups: snapshot.nameGroups,
        nameAliases: snapshot.nameAliases,
        nameColors: snapshot.nameColors,
        ausentes: snapshot.ausentes,
        personMeta: snapshot.personMeta
      });
    }

    return { teamName: selected, teams, teamGroupIds };
  }

  function buildPanelState(snapshot) {
    const model = ensureTeamModel(snapshot || {});
    return {
      teamName: model.teamName,
      teams: model.teams,
      teamGroupIds: model.teamGroupIds
    };
  }

  function getSpecialists(teamData) {
    const groups = isPlainObject(teamData?.nameGroups) ? teamData.nameGroups : {};
    const aliases = isPlainObject(teamData?.nameAliases) ? teamData.nameAliases : {};
    const colors = isPlainObject(teamData?.nameColors) ? teamData.nameColors : {};
    const personMeta = isPlainObject(teamData?.personMeta) ? teamData.personMeta : {};
    const ausentes = new Set((Array.isArray(teamData?.ausentes) ? teamData.ausentes : []).map(v => String(v).trim().toUpperCase()));

    const names = uniq(
      [
        ...Object.keys(groups || {}),
        ...Object.keys(aliases || {}),
        ...Object.keys(colors || {}),
        ...Object.keys(personMeta || {}),
        ...Array.from(ausentes)
      ]
      .map(v => String(v || '').trim().toUpperCase())
      .filter(Boolean)
    ).sort((a, b) => a.localeCompare(b, 'pt-BR'));

    return names.map(name => {
      const c = isPlainObject(colors[name]) ? colors[name] : {};
      const m = isPlainObject(personMeta[name]) ? personMeta[name] : {};
      const personId = Number(m.id ?? m.personId);
      return {
        name,
        alias: typeof aliases[name] === 'string' ? aliases[name] : '',
        finals: Array.isArray(groups[name]) ? groups[name].join(', ') : '',
        bg: normalizeHex(c.bg, '#E2E8F0'),
        fg: normalizeHex(c.fg, inferFg(c.bg)),
        ausente: ausentes.has(name),
        personId: Number.isInteger(personId) ? personId : null,
        personLocation: String(m.location || '').trim(),
        personName: String(m.name || '').trim()
      };
    });
  }

  function ensureCss() {
    if (root.document.getElementById('smax-config-menu-style')) return;
    const style = root.document.createElement('style');
    style.id = 'smax-config-menu-style';
    style.textContent = `
      #smax-config-fab {
        position: fixed;
        right: 24px;
        bottom: 24px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 56px;
        height: 56px;
        border: 0;
        border-radius: 50%;
        background: #135bec;
        color: #fff;
        font-size: 26px;
        cursor: pointer;
        z-index: 2147483000;
        box-shadow: 0 10px 24px rgba(19, 91, 236, 0.42);
      }
      #smax-config-fab:hover { filter: brightness(1.06); }
      #smax-config-fab.smax-loading {
        width: auto;
        min-width: 56px;
        padding: 0 16px;
        border-radius: 999px;
        cursor: wait;
        opacity: 0.95;
      }
      #smax-config-fab.smax-loading:hover { filter: none; }
      #smax-config-overlay {
        position: fixed;
        inset: 0;
        z-index: 2147483646;
        background: #f3f5f9;
        font-family: "Segoe UI", "Noto Sans", sans-serif;
        color: #0f172a;
        display: none;
      }
      #smax-config-overlay.is-open { display: block; }
      #smax-config-overlay .smax-shell {
        width: 100%;
        height: 100%;
        display: flex;
      }
      #smax-config-overlay .smax-sidebar {
        width: 280px;
        border-right: 1px solid #dbe1ea;
        background: #ffffff;
        display: flex;
        flex-direction: column;
      }
      #smax-config-overlay .smax-brand {
        padding: 26px 20px;
        border-bottom: 1px solid #edf1f6;
        font-size: 29px;
        font-weight: 700;
        color: #135bec;
        letter-spacing: 0.5px;
      }
      #smax-config-overlay .smax-brand small {
        display: block;
        margin-top: 5px;
        font-size: 11px;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      #smax-config-overlay .smax-nav {
        padding: 14px;
        display: grid;
        gap: 6px;
      }
      #smax-config-overlay .smax-nav-btn {
        border: 0;
        border-radius: 10px;
        text-align: left;
        background: transparent;
        color: #334155;
        font-size: 17px;
        padding: 14px 12px;
        cursor: pointer;
      }
      #smax-config-overlay .smax-nav-btn.active {
        background: #dce7ff;
        color: #135bec;
        font-weight: 600;
      }
      #smax-config-overlay .smax-main {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
      }
      #smax-config-overlay .smax-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        padding: 24px 28px;
        border-bottom: 1px solid #dde3ed;
        background: linear-gradient(180deg, #f8fafd 0%, #f3f5f9 100%);
      }
      #smax-config-overlay .smax-header h2 {
        margin: 0;
        font-size: 40px;
        line-height: 1.1;
      }
      #smax-config-overlay .smax-header p {
        margin: 6px 0 0;
        color: #64748b;
        font-size: 18px;
      }
      #smax-config-overlay .smax-btn {
        border: 1px solid #cdd7e4;
        background: #fff;
        color: #1e293b;
        border-radius: 10px;
        padding: 11px 16px;
        cursor: pointer;
      }
      #smax-config-overlay .smax-btn.primary {
        background: #135bec;
        border-color: #135bec;
        color: #fff;
      }
      #smax-config-overlay .smax-scroll {
        flex: 1;
        overflow: auto;
        padding: 26px 28px 14px;
      }
      #smax-config-overlay .smax-section {
        display: none;
      }
      #smax-config-overlay .smax-section.active {
        display: block;
      }
      #smax-config-overlay .smax-card {
        background: #fff;
        border: 1px solid #d8e0eb;
        border-radius: 14px;
        margin-bottom: 14px;
        overflow: hidden;
      }
      #smax-config-overlay .smax-card-h {
        padding: 16px 20px;
        border-bottom: 1px solid #edf2f7;
        font-size: 25px;
        font-weight: 700;
      }
      #smax-config-overlay .smax-card-b {
        padding: 16px 20px;
      }
      #smax-config-overlay .smax-team-picker {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
      }
      #smax-config-overlay .smax-team-picker label {
        font-size: 21px;
        font-weight: 600;
      }
      #smax-config-overlay .smax-team-picker select {
        min-width: 220px;
        border: 1px solid #c9d4e2;
        border-radius: 8px;
        font-size: 17px;
        padding: 7px 10px;
        background: #fff;
      }
      #smax-config-overlay .smax-person-picker {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 8px;
        margin-bottom: 12px;
      }
      #smax-config-overlay .smax-person-picker select {
        min-width: 320px;
        border: 1px solid #c9d4e2;
        border-radius: 8px;
        font-size: 14px;
        padding: 7px 10px;
        background: #fff;
      }
      #smax-config-overlay .smax-specialists-head {
        margin-bottom: 8px;
        background: #eef2f8;
      }
      #smax-config-overlay .smax-specialists-head span {
        font-size: 20px;
        font-weight: 700;
        color: #0f172a;
      }
      #smax-config-overlay .smax-row {
        display: grid;
        gap: 10px;
        grid-template-columns: 1fr 1fr 1fr 110px 110px 120px 40px;
        align-items: center;
        border: 1px solid #ecf1f7;
        background: #f8fafc;
        border-radius: 10px;
        padding: 9px;
        margin-bottom: 8px;
      }
      #smax-config-overlay .smax-row.smax-row-head {
        background: #ffffff;
        border-color: #cfd8e4;
      }
      #smax-config-overlay .smax-row.smax-row-head span {
        font-size: 18px;
        font-weight: 600;
        display: block;
        width: 100%;
        text-align: center;
      }
      #smax-config-overlay .smax-tag-row {
        grid-template-columns: 180px 1fr 40px;
      }
      #smax-config-overlay .smax-detrator-row {
        grid-template-columns: 70px 1fr 40px;
      }
      #smax-config-overlay .smax-row-order {
        font-size: 12px;
        color: #475569;
        text-align: center;
        font-weight: 600;
      }
      #smax-config-overlay .smax-row input[type="text"],
      #smax-config-overlay .smax-row textarea,
      #smax-config-overlay textarea.smax-textarea,
      #smax-config-overlay input.smax-input {
        width: 100%;
        border: 1px solid #c9d4e2;
        border-radius: 8px;
        font-size: 13px;
        padding: 8px 9px;
        box-sizing: border-box;
      }
      #smax-config-overlay .smax-row input[type="color"] {
        width: 100%;
        height: 37px;
        border: 1px solid #c9d4e2;
        background: #fff;
        border-radius: 8px;
        padding: 2px;
      }
      #smax-config-overlay .smax-row .smax-row-del {
        border: 0;
        background: #fee2e2;
        color: #b91c1c;
        border-radius: 7px;
        height: 37px;
        cursor: pointer;
      }
      #smax-config-overlay .smax-absent-wrap {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        font-size: 14px;
        color: #1e293b;
        user-select: none;
      }
      #smax-config-overlay .smax-absent-wrap input[type="checkbox"] {
        -webkit-appearance: checkbox !important;
        appearance: checkbox !important;
        width: 18px;
        height: 18px;
        min-width: 18px;
        min-height: 18px;
        margin: 0;
        padding: 0;
        opacity: 1 !important;
        visibility: visible !important;
        display: inline-block !important;
        position: static !important;
        accent-color: #135bec;
        background: #fff;
        border: 1px solid #94a3b8;
        cursor: pointer;
      }
      #smax-config-overlay .smax-pref-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 14px;
        border: 1px solid #ecf1f7;
        border-radius: 10px;
        padding: 12px 14px;
        margin-bottom: 8px;
        background: #f8fafc;
      }
      #smax-config-overlay .smax-pref-row label { font-weight: 600; }
      #smax-config-overlay .smax-pref-row input { width: 19px; height: 19px; }
      #smax-config-overlay .smax-grid-2 {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      #smax-config-overlay .smax-highlight-list {
        display: grid;
        gap: 10px;
      }
      #smax-config-overlay .smax-highlight-row {
        border: 1px solid #e1e8f3;
        border-radius: 10px;
        padding: 10px;
        background: #f8fafc;
      }
      #smax-config-overlay .smax-highlight-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        align-items: start;
      }
      #smax-config-overlay .smax-highlight-col {
        min-width: 0;
      }
      #smax-config-overlay .smax-highlight-col h4 {
        margin: 0 0 8px;
        font-size: 16px;
      }
      #smax-config-overlay .smax-highlight-col .smax-highlight-spacer {
        visibility: hidden;
      }
      #smax-config-overlay .smax-highlight-col small {
        display: block;
        margin-bottom: 8px;
        color: #64748b;
      }
      #smax-config-overlay .smax-highlight-col textarea {
        min-height: 96px;
      }
      #smax-config-overlay textarea.smax-textarea {
        min-height: 120px;
        resize: vertical;
      }
      #smax-config-overlay .smax-footer {
        border-top: 1px solid #dbe2ed;
        padding: 15px 28px;
        background: #f8fafc;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
      }
      #smax-config-overlay .smax-footer-actions {
        display: inline-flex;
        align-items: center;
        gap: 10px;
      }
      #smax-config-overlay .smax-save-feedback {
        min-height: 20px;
        font-size: 13px;
        color: #334155;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        opacity: 0;
        transition: opacity .15s ease;
      }
      #smax-config-overlay .smax-save-feedback.show { opacity: 1; }
      #smax-config-overlay .smax-save-feedback.success { color: #166534; }
      #smax-config-overlay .smax-save-feedback.error { color: #b91c1c; }
      #smax-config-overlay .smax-save-spinner {
        width: 14px;
        height: 14px;
        border: 2px solid #cbd5e1;
        border-top-color: #135bec;
        border-radius: 50%;
        display: none;
      }
      #smax-config-overlay .smax-save-feedback.loading .smax-save-spinner {
        display: inline-block;
        animation: smax-spin .8s linear infinite;
      }
      #smax-config-overlay .smax-btn[disabled] {
        opacity: .64;
        cursor: not-allowed;
      }
      #smax-config-overlay .smax-muted {
        color: #64748b;
        font-size: 13px;
        margin: 0 0 8px;
      }
      #smax-config-overlay .smax-export-status {
        border: 1px solid #d5deea;
        background: #f8fafc;
        border-radius: 10px;
        padding: 10px 12px;
        color: #334155;
        font-size: 13px;
        margin-bottom: 12px;
        word-break: break-word;
      }
      #smax-config-overlay .smax-export-actions {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      #smax-config-overlay .smax-export-progress {
        margin-top: 12px;
        border: 1px solid #d5deea;
        background: #ffffff;
        border-radius: 10px;
        padding: 10px 12px;
      }
      #smax-config-overlay .smax-export-progress[hidden] {
        display: none !important;
      }
      #smax-config-overlay .smax-export-progress-text {
        font-size: 12px;
        color: #334155;
        margin-bottom: 8px;
      }
      #smax-config-overlay .smax-export-progress-bar {
        width: 100%;
        height: 10px;
        border-radius: 999px;
        background: #e2e8f0;
        overflow: hidden;
      }
      #smax-config-overlay .smax-export-progress-fill {
        display: block;
        height: 100%;
        width: 0%;
        border-radius: 999px;
        background: #135bec;
        transition: width .2s ease-out;
      }
      #smax-config-overlay .smax-export-progress.is-error .smax-export-progress-fill {
        background: #dc2626;
      }
      #smax-config-overlay .smax-export-progress.is-error .smax-export-progress-text {
        color: #b91c1c;
      }
      body.smax-config-lock-scroll { overflow: hidden !important; }
      @keyframes smax-spin { to { transform: rotate(360deg); } }

      @media (max-width: 1100px) {
        #smax-config-overlay .smax-sidebar { width: 92px; }
        #smax-config-overlay .smax-brand { font-size: 0; }
        #smax-config-overlay .smax-brand::before {
          content: "SMAX";
          font-size: 22px;
        }
        #smax-config-overlay .smax-brand small { display: none; }
        #smax-config-overlay .smax-nav-btn {
          text-align: center;
          font-size: 11px;
          line-height: 1.2;
          padding: 10px 6px;
        }
        #smax-config-overlay .smax-header h2 { font-size: 25px; }
      }
      @media (max-width: 860px) {
        #smax-config-overlay .smax-row {
          grid-template-columns: 1fr;
        }
        #smax-config-overlay .smax-row.smax-row-head {
          display: none;
        }
        #smax-config-overlay .smax-team-picker {
          flex-direction: column;
          align-items: flex-start;
        }
        #smax-config-overlay .smax-grid-2 { grid-template-columns: 1fr; }
        #smax-config-overlay .smax-highlight-grid { grid-template-columns: 1fr; }
      }
    `;
    root.document.head.appendChild(style);
  }

  function buildDom() {
    if (root.document.getElementById('smax-config-overlay')) return;

    const doc = root.document;
    const fab = doc.createElement('button');
    fab.id = 'smax-config-fab';
    fab.type = 'button';
    fab.title = 'Configuracoes SMAX';
    fab.textContent = '\u2699';

    const overlay = doc.createElement('div');
    overlay.id = 'smax-config-overlay';
    overlay.innerHTML = `
      <div class="smax-shell">
        <aside class="smax-sidebar">
          <div class="smax-brand">SMAX<small>Tools</small></div>
          <nav class="smax-nav">
            <button class="smax-nav-btn active" type="button" data-target="geral">Geral</button>
            <button class="smax-nav-btn" type="button" data-target="especialistas">Especialistas</button>
            <button class="smax-nav-btn" type="button" data-target="palavras">Palavras Destacadas</button>
            <button class="smax-nav-btn" type="button" data-target="tags">Tags</button>
            <button class="smax-nav-btn" type="button" data-target="detratores">Detratores</button>
            <button class="smax-nav-btn" type="button" data-target="exportacao">Exportação de Chamados</button>
          </nav>
        </aside>
        <div class="smax-main">
          <header class="smax-header">
            <div>
              <h2>Configurações - SMAX</h2>
              <p>Gerencie os recursos do script diretamente na tela.</p>
            </div>
            <button class="smax-btn" type="button" id="smax-close-top">Fechar</button>
          </header>
          <div class="smax-scroll">
            <section class="smax-section active" data-section="geral">
              <div class="smax-card">
                <div class="smax-card-h">Recursos Gerais</div>
                <div class="smax-card-b" id="smax-pref-list"></div>
              </div>
            </section>
            <section class="smax-section" data-section="especialistas">
              <div class="smax-card">
                <div class="smax-card-h">Lista de Especialistas</div>
                <div class="smax-card-b">
                  <p class="smax-muted">Configure nome, finais de ID, cor e status de ausencia.</p>
                  <div class="smax-team-picker">
                    <label for="smax-team-select">Equipe:</label>
                    <select id="smax-team-select"></select>
                  </div>
                  <div class="smax-person-picker">
                    <select id="smax-person-select">
                      <option value="">Selecione um especialista do SMAX...</option>
                    </select>
                    <button class="smax-btn" type="button" id="smax-add-person">+ Inserir do SMAX</button>
                  </div>
                  <div class="smax-row smax-row-head">
                    <span>Nome</span>
                    <span>Apelido</span>
                    <span>Finais</span>
                    <span>Cor</span>
                    <span>Texto</span>
                    <span>Situacao</span>
                  </div>
                  <div id="smax-specialists-list"></div>
                </div>
              </div>
            </section>
            <section class="smax-section" data-section="palavras">
              <div class="smax-card">
                <div class="smax-card-h">Palavras Destacadas</div>
                <div class="smax-card-b">
                  <p class="smax-muted">Uma palavra por linha em cada bloco.</p>
                  <div id="smax-highlight-groups" class="smax-highlight-list"></div>
                </div>
              </div>
            </section>
            <section class="smax-section" data-section="tags">
              <div class="smax-card">
                <div class="smax-card-h">Tags Automaticas</div>
                <div class="smax-card-b">
                  <p class="smax-muted">Defina a tag e as palavras-chave separadas por virgula.</p>
                  <div class="smax-row smax-row-head smax-tag-row">
                    <span>Tag</span>
                    <span>Palavras-chave</span>
                  </div>
                  <div id="smax-tags-list"></div>
                  <button class="smax-btn" type="button" id="smax-add-tag">+ Adicionar regra</button>
                </div>
              </div>
            </section>
            <section class="smax-section" data-section="detratores">
              <div class="smax-card">
                <div class="smax-card-h">Usuarios Detratores</div>
                <div class="smax-card-b">
                  <p class="smax-muted">Cadastre os nomes para alerta de usuario detrator.</p>
                  <div class="smax-row smax-row-head smax-detrator-row">
                    <span>Ordem</span>
                    <span>Nome Completo</span>
                  </div>
                  <div id="smax-detratores-list"></div>
                  <button class="smax-btn" type="button" id="smax-add-detrator">+ Adicionar detrator</button>
                </div>
              </div>
            </section>
            <section class="smax-section" data-section="exportacao">
              <div class="smax-card">
                <div class="smax-card-h">Exportacao de Chamados (EMS)</div>
                <div class="smax-card-b">
                  <p class="smax-muted">Exporta os chamados da view atual em CSV, com divisao automatica de intervalo quando houver limite de 10k.</p>
                  <div class="smax-export-status" id="smax-export-status">Status: verificando modulo de exportacao...</div>
                  <div class="smax-export-actions">
                    <button class="smax-btn primary" type="button" id="smax-export-ems-run">Exportar CSV da View Atual</button>
                  </div>
                  <div class="smax-export-progress" id="smax-export-progress" hidden>
                    <div class="smax-export-progress-text" id="smax-export-progress-text">Preparando download...</div>
                    <div class="smax-export-progress-bar">
                      <span class="smax-export-progress-fill" id="smax-export-progress-fill"></span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
          <footer class="smax-footer">
            <div class="smax-save-feedback" id="smax-save-feedback" aria-live="polite">
              <span class="smax-save-spinner" aria-hidden="true"></span>
              <span id="smax-save-feedback-text"></span>
            </div>
            <div class="smax-footer-actions">
              <button class="smax-btn" type="button" id="smax-cancel">Cancelar</button>
              <button class="smax-btn primary" type="button" id="smax-save">Salvar alteracoes</button>
            </div>
          </footer>
        </div>
      </div>
    `;

    doc.body.appendChild(fab);
    doc.body.appendChild(overlay);
  }

  function renderPrefs(snapshot) {
    const prefsRoot = root.document.getElementById('smax-pref-list');
    if (!prefsRoot) return;
    const prefs = isPlainObject(snapshot.prefs) ? snapshot.prefs : {};

    prefsRoot.innerHTML = '';
    PREF_FIELDS.forEach(field => {
      const row = root.document.createElement('div');
      row.className = 'smax-pref-row';
      row.innerHTML = `
        <label>${field.label}</label>
        <input type="checkbox" data-pref-key="${field.key}">
      `;
      const input = row.querySelector('input');
      input.checked = !!prefs[field.key];
      prefsRoot.appendChild(row);
    });
  }

  function parseSpecialistsFromDom() {
    const doc = root.document;
    const nameGroups = {};
    const nameAliases = {};
    const nameColors = {};
    const ausentes = [];
    const personMeta = {};

    doc.querySelectorAll('.smax-specialist-row').forEach(row => {
      const rawName = row.querySelector('.smax-name')?.value || '';
      const name = rawName.trim().toUpperCase();
      if (!name) return;
      const alias = (row.querySelector('.smax-alias')?.value || '').trim();

      const finals = parseFinals(row.querySelector('.smax-finals')?.value || '');
      const bg = normalizeHex(row.querySelector('.smax-bg')?.value, '#E2E8F0');
      const fg = normalizeHex(row.querySelector('.smax-fg')?.value, inferFg(bg));
      const ausente = !!row.querySelector('.smax-ausente')?.checked;
      const personIdRaw = row.querySelector('.smax-person-id')?.value || '';
      const personLocation = String(row.querySelector('.smax-person-location')?.value || '').trim();
      const personName = String(row.querySelector('.smax-person-name')?.value || '').trim();
      const personId = Number(personIdRaw);

      nameGroups[name] = finals;
      nameAliases[name] = alias;
      nameColors[name] = { bg, fg };
      if (ausente) ausentes.push(name);
      if (Number.isInteger(personId) || personLocation || personName) {
        personMeta[name] = {
          id: Number.isInteger(personId) ? personId : null,
          location: personLocation,
          name: personName
        };
      }
    });

    return { nameGroups, nameAliases, nameColors, ausentes, personMeta };
  }

  function persistCurrentTeamRows() {
    if (!panelState) return;
    const currentTeam = normalizeTeamName(panelState.teamName);
    panelState.teams[currentTeam] = parseSpecialistsFromDom();
  }

  function applyActiveTeamToRuntimeConfig(teamCode) {
    if (!panelState) return;
    const code = normalizeTeamName(teamCode || panelState.teamName);
    const teamData = cloneTeamData(panelState.teams?.[code]);

    CONFIG.teamName = code;
    CONFIG.teams = isPlainObject(CONFIG.teams) ? CONFIG.teams : {};
    CONFIG.teams[code] = cloneValue(teamData);

    CONFIG.nameGroups = cloneValue(teamData.nameGroups || {});
    CONFIG.nameAliases = cloneValue(teamData.nameAliases || {});
    CONFIG.nameColors = cloneValue(teamData.nameColors || {});
    CONFIG.ausentes = Array.isArray(teamData.ausentes) ? teamData.ausentes.slice() : [];
    CONFIG.personMeta = cloneValue(teamData.personMeta || {});
  }

  function renderTeamOptions(activeTeamCode) {
    const select = root.document.getElementById('smax-team-select');
    if (!select || !panelState) return;

    const teamCodes = uniq(
      getKnownTeamCodes().concat(Object.keys(isPlainObject(panelState.teams) ? panelState.teams : {}))
    );
    const activeTeam = normalizeTeamName(activeTeamCode || panelState.teamName);

    select.innerHTML = '';
    teamCodes.forEach(code => {
      const groupId = getTeamGroupId(code);
      const opt = root.document.createElement('option');
      opt.value = Number.isInteger(groupId) && groupId > 0 ? String(groupId) : '';
      opt.textContent = code;
      opt.setAttribute('data-team-code', code);
      if (code === activeTeam) opt.selected = true;
      select.appendChild(opt);
    });

    const selected = select.options[select.selectedIndex];
    const selectedTeamCode = getTeamCodeFromOption(selected);
    if (selectedTeamCode) {
      panelState.teamName = selectedTeamCode;
      select.setAttribute('data-team-code', selectedTeamCode);
    }
  }

  async function renderPersonOptionsForTeam(teamCode) {
    const code = normalizeTeamName(teamCode || getSelectedTeamCode());
    const select = root.document.getElementById('smax-person-select');
    if (!select) return;

    const groupId = getSelectedTeamGroupId() || getTeamGroupId(code);
    if (!groupId) {
      select.innerHTML = '<option value="">Defina id_smax_grupo da equipe no banco.</option>';
      return;
    }

    select.innerHTML = '<option value="">Carregando especialistas do SMAX...</option>';
    try {
      const people = await fetchTeamPeople(code, groupId);
      if (!Array.isArray(people) || !people.length) {
        select.innerHTML = '<option value="">Nenhum especialista encontrado no grupo.</option>';
        return;
      }
      select.innerHTML = '<option value="">Selecione um especialista do SMAX...</option>';
      people.forEach(p => {
        const opt = root.document.createElement('option');
        opt.value = String(p.id);
        opt.textContent = `${p.name} | ${p.location || '-'} | ID ${p.id}`;
        select.appendChild(opt);
      });
    } catch (e) {
      console.error('[SMAX menu] Falha ao carregar especialistas do SMAX:', e);
      select.innerHTML = '<option value="">Falha ao carregar especialistas do SMAX.</option>';
    }
  }

  function addSelectedSmaxPerson() {
    const doc = root.document;
    const host = doc.getElementById('smax-specialists-list');
    const select = doc.getElementById('smax-person-select');
    if (!host || !select || !panelState) return;

    const personId = Number(select.value);
    const currentTeam = normalizeTeamName(panelState.teamName);
    const groupId = getSelectedTeamGroupId() || getTeamGroupId(currentTeam);
    const cacheKey = `${currentTeam}:${groupId || 'none'}`;
    const people = Array.isArray(peopleByTeam[cacheKey]) ? peopleByTeam[cacheKey] : [];
    const person = people.find(p => p.id === personId);
    if (!person) return;

    const existingRows = Array.from(doc.querySelectorAll('.smax-specialist-row'));
    const alreadyExists = existingRows.some(row => {
      const rowPersonId = Number(row.querySelector('.smax-person-id')?.value || '');
      const rowName = String(row.querySelector('.smax-name')?.value || '').trim().toUpperCase();
      return (Number.isInteger(rowPersonId) && rowPersonId === person.id) || rowName === person.name.trim().toUpperCase();
    });
    if (alreadyExists) {
      root.alert('Este especialista ja esta na lista da equipe selecionada.');
      return;
    }

    host.appendChild(createSpecialistRow({
      name: person.name.toUpperCase(),
      alias: '',
      finals: '',
      bg: '#E2E8F0',
      fg: '#111111',
      ausente: false,
      personId: person.id,
      personLocation: person.location || '',
      personName: person.name
    }));
  }

  async function renderSpecialists() {
    const doc = root.document;
    const host = doc.getElementById('smax-specialists-list');
    const select = doc.getElementById('smax-team-select');
    if (!host || !select || !panelState) return;

    const currentTeam = normalizeTeamName(panelState.teamName);
    panelState.teamName = currentTeam;
    renderTeamOptions(currentTeam);
    const selectedTeamCode = getSelectedTeamCode();
    panelState.teamName = selectedTeamCode;

    const teamData = panelState.teams[selectedTeamCode] || { nameGroups: {}, nameAliases: {}, nameColors: {}, ausentes: [], personMeta: {} };
    const list = getSpecialists(teamData);

    host.innerHTML = '';
    list.forEach(item => host.appendChild(createSpecialistRow(item)));
    if (!list.length) host.appendChild(createSpecialistRow());

    await renderPersonOptionsForTeam(selectedTeamCode);
  }

  function createSpecialistRow(item) {
    const data = item || {
      name: '',
      alias: '',
      finals: '',
      bg: '#E2E8F0',
      fg: '#111111',
      ausente: false,
      personId: null,
      personLocation: '',
      personName: ''
    };

    const row = root.document.createElement('div');
    row.className = 'smax-row smax-specialist-row';
    row.innerHTML = `
      <input type="text" class="smax-name" placeholder="Nome (ex: ADRIANO)" value="${escapeHtml(data.name)}">
      <input type="text" class="smax-alias" placeholder="Apelido" value="${escapeHtml(data.alias)}">
      <input type="text" class="smax-finals" placeholder="Finais (ex: 0,1,2)" value="${escapeHtml(data.finals)}">
      <input type="color" class="smax-bg" value="${normalizeHex(data.bg, '#E2E8F0')}">
      <input type="color" class="smax-fg" value="${normalizeHex(data.fg, '#111111')}">
      <label class="smax-absent-wrap"><input type="checkbox" class="smax-ausente" ${data.ausente ? 'checked' : ''}> <span>Ausente</span></label>
      <input type="hidden" class="smax-person-id" value="${Number.isInteger(Number(data.personId)) ? Number(data.personId) : ''}">
      <input type="hidden" class="smax-person-location" value="${escapeHtml(data.personLocation || '')}">
      <input type="hidden" class="smax-person-name" value="${escapeHtml(data.personName || '')}">
      <button type="button" class="smax-row-del" title="Remover">x</button>
    `;
    return row;
  }

  function renderHighlightGroups(snapshot) {
    const host = root.document.getElementById('smax-highlight-groups');
    if (!host) return;

    const groups = isPlainObject(snapshot.highlightGroups) ? snapshot.highlightGroups : {};
    const names = uniq(['vermelho', 'rosa', 'verde', 'azul', 'amarelo'].concat(Object.keys(groups)));

    host.innerHTML = '';
    names.forEach(name => {
      const g = isPlainObject(groups[name]) ? groups[name] : {};
      const card = root.document.createElement('div');
      card.className = 'smax-highlight-row';
      card.setAttribute('data-group', name);
      card.innerHTML = `
        <div class="smax-highlight-grid">
          <div class="smax-highlight-col">
            <h4>${capitalize(name)}</h4>
            <small>Palavras exatas (1 por linha)</small>
            <textarea class="smax-textarea smax-whole">${Array.isArray(g.whole) ? escapeHtml(g.whole.join('\n')) : ''}</textarea>
          </div>
          <div class="smax-highlight-col">
            <h4 class="smax-highlight-spacer" aria-hidden="true">.</h4>
            <small>Trechos/parciais (1 por linha)</small>
            <textarea class="smax-textarea smax-substr">${Array.isArray(g.substr) ? escapeHtml(g.substr.join('\n')) : ''}</textarea>
          </div>
        </div>
      `;
      host.appendChild(card);
    });
  }

  function parseKeywords(value) {
    return uniq(
      String(value || '')
        .split(/[,\n;]+/)
        .map(v => v.trim())
        .filter(Boolean)
    );
  }

  function sortTagRules(rules) {
    const list = Array.isArray(rules) ? rules.slice() : [];
    list.sort((a, b) => {
      const tagA = String(a?.tag || '').trim();
      const tagB = String(b?.tag || '').trim();
      return tagA.localeCompare(tagB, 'pt-BR', { sensitivity: 'base' });
    });
    return list;
  }

  function createTagRow(rule) {
    const data = rule || { tag: '', palavras: [] };
    const row = root.document.createElement('div');
    row.className = 'smax-row smax-tag-row';
    row.innerHTML = `
      <input type="text" class="smax-tag-name" placeholder="TAG" value="${escapeHtml(data.tag || '')}">
      <input type="text" class="smax-tag-words" placeholder="palavra1, palavra2" value="${escapeHtml(Array.isArray(data.palavras) ? data.palavras.join(', ') : '')}">
      <button type="button" class="smax-row-del smax-tag-del" title="Remover">x</button>
    `;
    return row;
  }

  function renderTags(snapshot) {
    const host = root.document.getElementById('smax-tags-list');
    if (!host) return;

    const rules = sortTagRules(Array.isArray(snapshot.autoTagRules) ? snapshot.autoTagRules : []);
    host.innerHTML = '';
    rules.forEach(rule => host.appendChild(createTagRow(rule)));
    if (!rules.length) host.appendChild(createTagRow());
  }

  function collectTags() {
    const out = [];
    root.document.querySelectorAll('#smax-tags-list .smax-tag-row').forEach(row => {
      const tag = String(row.querySelector('.smax-tag-name')?.value || '').trim();
      const palavras = parseKeywords(row.querySelector('.smax-tag-words')?.value || '');
      if (!tag || !palavras.length) return;
      out.push({ tag, palavras });
    });
    return sortTagRules(out);
  }

  function renderDetratores(snapshot) {
    const host = root.document.getElementById('smax-detratores-list');
    if (!host) return;

    const rows = Array.isArray(snapshot.detratores) ? snapshot.detratores : [];
    host.innerHTML = '';
    rows.forEach((name, idx) => host.appendChild(createDetratorRow(name, idx + 1)));
    if (!rows.length) host.appendChild(createDetratorRow('', 1));
  }

  function renderExportStatus() {
    const statusEl = root.document.getElementById('smax-export-status');
    const runBtn = root.document.getElementById('smax-export-ems-run');
    if (!statusEl || !runBtn) return;

    const exporter = SMAX.exportChamados;
    if (!exporter || typeof exporter.startExport !== 'function') {
      statusEl.textContent = 'Status: modulo de exportacao nao carregado.';
      runBtn.disabled = true;
      return;
    }

    try {
      if (typeof exporter.init === 'function') exporter.init();
    } catch (e) {
      statusEl.textContent = 'Status: falha ao inicializar modulo de exportacao.';
      runBtn.disabled = true;
      return;
    }

    const state = typeof exporter.getState === 'function' ? exporter.getState() : {};
    const hasFilter = !!state?.hasFilter;
    const isExporting = !!state?.exporting;
    runBtn.disabled = isExporting;

    if (isExporting) {
      statusEl.textContent = 'Status: exportacao em andamento.';
      return;
    }

    if (!hasFilter) {
      statusEl.textContent = 'Status: filtro da view ainda nao capturado. Atualize/filtre o grid e tente novamente.';
      return;
    }

    const filterUrl = typeof exporter.getLastFilterUrl === 'function' ? exporter.getLastFilterUrl() : '';
    const compactUrl = filterUrl.length > 220 ? `${filterUrl.slice(0, 220)}...` : filterUrl;
    statusEl.textContent = compactUrl
      ? `Status: pronto para exportar. Filtro capturado: ${compactUrl}`
      : 'Status: pronto para exportar.';
  }

  function setExportProgress(message, pct, isError) {
    const host = root.document.getElementById('smax-export-progress');
    const text = root.document.getElementById('smax-export-progress-text');
    const fill = root.document.getElementById('smax-export-progress-fill');
    if (!host || !text || !fill) return;

    host.hidden = false;
    host.classList.toggle('is-error', !!isError);
    text.textContent = String(message || 'Preparando download...');
    const safePct = Math.max(0, Math.min(100, Number(pct) || 0));
    fill.style.width = `${safePct}%`;
  }

  function createMenuExportUi() {
    let lastTotal = null;
    return {
      update(current, total) {
        if (typeof total === 'number' && total > 0) lastTotal = total;
        const t = lastTotal || total || current || 0;
        const c = current || 0;
        const pct = t > 0 ? Math.min(100, Math.round((c / t) * 100)) : 0;
        const message = t > 0
          ? `Baixando ${c} de ${t} registros (${pct}%)...`
          : (c > 0 ? `Baixando ${c} registros...` : 'Preparando download...');
        setExportProgress(message, pct, false);
      },
      done(finalCount, total) {
        const t = total || finalCount || 0;
        const c = finalCount || 0;
        const pct = t > 0 ? Math.min(100, Math.round((c / t) * 100)) : 100;
        setExportProgress(`Total baixado: ${c} registro(s).`, pct, false);
      },
      error(msg) {
        setExportProgress(msg || 'Erro ao exportar via EMS.', 100, true);
      }
    };
  }

  function createDetratorRow(name, order) {
    const row = root.document.createElement('div');
    row.className = 'smax-row smax-detrator-row';
    row.innerHTML = `
      <span class="smax-row-order">${Number(order) || 1}</span>
      <input type="text" class="smax-detrator-name" placeholder="Nome completo" value="${escapeHtml(name || '')}">
      <button type="button" class="smax-row-del smax-detrator-del" title="Remover">x</button>
    `;
    return row;
  }

  function refreshDetratorOrder() {
    root.document.querySelectorAll('#smax-detratores-list .smax-detrator-row').forEach((row, idx) => {
      const orderEl = row.querySelector('.smax-row-order');
      if (orderEl) orderEl.textContent = String(idx + 1);
    });
  }

  function collectDetratores() {
    const out = [];
    root.document.querySelectorAll('#smax-detratores-list .smax-detrator-row').forEach(row => {
      const name = String(row.querySelector('.smax-detrator-name')?.value || '').trim();
      if (!name) return;
      out.push(name);
    });
    return uniq(out);
  }

  function collectPayload() {
    const doc = root.document;

    const prefs = {};
    doc.querySelectorAll('#smax-pref-list [data-pref-key]').forEach(el => {
      prefs[el.getAttribute('data-pref-key')] = !!el.checked;
    });

    persistCurrentTeamRows();

    const activeTeam = getSelectedTeamCode();
    const teams = isPlainObject(panelState?.teams) ? cloneValue(panelState.teams) : {};
    uniq(getKnownTeamCodes().concat(Object.keys(teams))).forEach(team => {
      if (!isPlainObject(teams[team])) teams[team] = { nameGroups: {}, nameAliases: {}, nameColors: {}, ausentes: [], personMeta: {} };
    });
    const teamGroupIds = isPlainObject(panelState?.teamGroupIds) ? cloneValue(panelState.teamGroupIds) : {};
    const activeTeamData = cloneTeamData(teams[activeTeam]);

    const oldGroups = isPlainObject(CONFIG.highlightGroups) ? CONFIG.highlightGroups : {};
    const highlightGroups = {};
    doc.querySelectorAll('#smax-highlight-groups [data-group]').forEach(card => {
      const name = card.getAttribute('data-group');
      const old = isPlainObject(oldGroups[name]) ? oldGroups[name] : {};
      highlightGroups[name] = {
        cls: typeof old.cls === 'string' ? old.cls : '',
        whole: parseLines(card.querySelector('.smax-whole')?.value || ''),
        substr: parseLines(card.querySelector('.smax-substr')?.value || ''),
        regex: Array.isArray(old.regex) ? cloneValue(old.regex) : []
      };
    });

    const detratores = collectDetratores();
    const autoTagRules = collectTags();

    return {
      prefs,
      teamName: activeTeam,
      teamGroupIds,
      teams,
      nameGroups: activeTeamData.nameGroups,
      nameAliases: activeTeamData.nameAliases,
      nameColors: activeTeamData.nameColors,
      ausentes: activeTeamData.ausentes,
      personMeta: activeTeamData.personMeta,
      autoTagRules,
      detratores,
      highlightGroups
    };
  }

  function escapeHtml(v) {
    return String(v || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function capitalize(v) {
    if (!v) return '';
    return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
  }

  function setActiveSection(section) {
    const next = SECTION_ORDER.includes(section) ? section : 'geral';
    root.document.querySelectorAll('#smax-config-overlay .smax-nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-target') === next);
    });
    root.document.querySelectorAll('#smax-config-overlay .smax-section').forEach(sec => {
      sec.classList.toggle('active', sec.getAttribute('data-section') === next);
    });
  }

  function getActiveSection() {
    const active = root.document.querySelector('#smax-config-overlay .smax-section.active');
    return active ? active.getAttribute('data-section') : 'geral';
  }

  function renderPanel(snapshot, section) {
    const snap = snapshot || getSnapshot();
    panelState = buildPanelState(snap);
    renderPrefs(snap);
    renderSpecialists();
    renderHighlightGroups(snap);
    renderTags(snap);
    renderDetratores(snap);
    renderExportStatus();
    setActiveSection(section || 'geral');
  }

  function setSaveFeedback(type, message, sticky) {
    const doc = root.document;
    const host = doc.getElementById('smax-save-feedback');
    const text = doc.getElementById('smax-save-feedback-text');
    if (!host || !text) return;

    if (saveFeedbackTimer) {
      root.clearTimeout(saveFeedbackTimer);
      saveFeedbackTimer = null;
    }

    host.classList.remove('loading', 'success', 'error', 'show');
    text.textContent = '';

    if (!message) return;

    if (type) host.classList.add(type);
    host.classList.add('show');
    text.textContent = String(message);

    if (!sticky && type !== 'loading') {
      saveFeedbackTimer = root.setTimeout(() => {
        host.classList.remove('loading', 'success', 'error', 'show');
        text.textContent = '';
      }, 2600);
    }
  }

  function setSavingUi(isSaving) {
    savingInProgress = !!isSaving;
    const doc = root.document;
    const ids = ['smax-save', 'smax-cancel', 'smax-close-top', 'smax-team-select', 'smax-person-select', 'smax-add-person', 'smax-add-tag', 'smax-add-detrator', 'smax-export-ems-run'];
    ids.forEach(id => {
      const el = doc.getElementById(id);
      if (el) el.disabled = savingInProgress;
    });
  }

  function closeOverlay() {
    if (savingInProgress) return;
    const overlay = root.document.getElementById('smax-config-overlay');
    if (!overlay) return;
    overlay.classList.remove('is-open');
    root.document.body.classList.remove('smax-config-lock-scroll');
  }

  function setFabLoading(isLoading) {
    const fab = root.document.getElementById('smax-config-fab');
    if (!fab) return;
    const loading = !!isLoading;
    fab.disabled = loading;
    fab.classList.toggle('smax-loading', loading);
    fab.setAttribute('aria-busy', loading ? 'true' : 'false');
    fab.title = loading ? 'Carregando...' : 'Configuracoes SMAX';
    fab.textContent = loading ? 'Carregando...' : '\u2699';
  }

  async function openOverlay() {
    const overlay = root.document.getElementById('smax-config-overlay');
    if (!overlay) return;

    if (SMAX.supabase && typeof SMAX.supabase.load === 'function') {
      try {
        await SMAX.supabase.load();
      } catch (e) {
        console.warn('[SMAX menu] Falha ao recarregar dados do Supabase:', e);
      }
    }

    setSavingUi(false);
    setSaveFeedback('', '');
    renderPanel(getSnapshot(), 'geral');

    overlay.classList.add('is-open');
    root.document.body.classList.add('smax-config-lock-scroll');
  }

  function bindEvents() {
    const doc = root.document;
    const overlay = doc.getElementById('smax-config-overlay');
    const fab = doc.getElementById('smax-config-fab');
    if (!overlay || !fab || overlay.dataset.bound === '1') return;
    overlay.dataset.bound = '1';

    fab.addEventListener('click', async () => {
      if (openingOverlay) return;
      openingOverlay = true;
      setFabLoading(true);
      try {
        await openOverlay();
      } finally {
        openingOverlay = false;
        setFabLoading(false);
      }
    });

    overlay.querySelectorAll('.smax-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => setActiveSection(btn.getAttribute('data-target')));
    });

    doc.getElementById('smax-close-top')?.addEventListener('click', closeOverlay);
    doc.getElementById('smax-cancel')?.addEventListener('click', closeOverlay);
    doc.getElementById('smax-team-select')?.addEventListener('change', async e => {
      if (!panelState) return;
      persistCurrentTeamRows();
      const selected = e.target.options[e.target.selectedIndex] || null;
      panelState.teamName = normalizeTeamName(getTeamCodeFromOption(selected));
      e.target.setAttribute('data-team-code', panelState.teamName);
      await renderSpecialists();
    });

    doc.getElementById('smax-add-person')?.addEventListener('click', () => {
      addSelectedSmaxPerson();
    });

    doc.getElementById('smax-add-tag')?.addEventListener('click', () => {
      const host = doc.getElementById('smax-tags-list');
      if (!host) return;
      host.appendChild(createTagRow());
    });

    doc.getElementById('smax-add-detrator')?.addEventListener('click', () => {
      const host = doc.getElementById('smax-detratores-list');
      if (!host) return;
      const count = host.querySelectorAll('.smax-detrator-row').length;
      host.appendChild(createDetratorRow('', count + 1));
    });

    doc.getElementById('smax-export-ems-run')?.addEventListener('click', async () => {
      const exporter = SMAX.exportChamados;
      if (!exporter || typeof exporter.startExport !== 'function') {
        renderExportStatus();
        return;
      }

      try {
        if (typeof exporter.init === 'function') exporter.init();
      } catch (e) {
        console.warn('[SMAX menu] Falha ao inicializar exportador EMS:', e);
      }

      renderExportStatus();
      try {
        setExportProgress('Preparando download...', 0, false);
        await exporter.startExport({ ui: createMenuExportUi() });
      } finally {
        renderExportStatus();
      }
    });

    overlay.addEventListener('click', e => {
      const del = e.target.closest('.smax-row-del');
      if (!del) return;
      if (del.classList.contains('smax-tag-del')) {
        const tagRow = del.closest('.smax-tag-row');
        if (tagRow) tagRow.remove();
        return;
      }
      if (del.classList.contains('smax-detrator-del')) {
        const detRow = del.closest('.smax-detrator-row');
        if (detRow) detRow.remove();
        refreshDetratorOrder();
        return;
      }
      const row = del.closest('.smax-specialist-row');
      if (!row) return;
      row.remove();
    });

    overlay.addEventListener('change', e => {
      if (!e.target.classList.contains('smax-ausente')) return;
      persistCurrentTeamRows();
      applyActiveTeamToRuntimeConfig(getSelectedTeamCode());
      try {
        SMAX.badges?.apply?.();
      } catch (err) {
        console.warn('[SMAX menu] Falha ao reaplicar regra de ausentes:', err);
      }
    });

    doc.getElementById('smax-save')?.addEventListener('click', async () => {
      if (savingInProgress) return;
      const currentSection = getActiveSection();
      const payload = collectPayload();
      setSavingUi(true);
      setSaveFeedback('loading', 'Salvando no banco de dados...', true);

      try {
        if (SMAX.supabase && typeof SMAX.supabase.saveAll === 'function' && SMAX.supabase.enabled) {
          await SMAX.supabase.saveAll(payload);
        } else if (typeof CONFIG.update === 'function') {
          CONFIG.update(payload);
        } else {
          Object.assign(CONFIG, payload);
        }
      } catch (e) {
        setSavingUi(false);
        setSaveFeedback('error', 'Falha ao salvar no banco de dados.');
        console.error('[SMAX menu] Erro ao salvar configuracoes:', e);
        root.alert(`Falha ao salvar no Supabase.\n${e?.message || 'Verifique o console para detalhes.'}`);
        return;
      }

      setSavingUi(false);
      renderPanel(getSnapshot(), currentSection);
      try {
        SMAX.badges?.apply?.();
        SMAX.highlights?.apply?.();
        SMAX.tags?.apply?.();
        SMAX.detratores?.refresh?.();
      } catch (e) {
        console.warn('[SMAX menu] Falha ao reaplicar modulos apos salvar:', e);
      }
      setSaveFeedback('success', 'Alteracoes salvas no banco de dados.');
    });

    root.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeOverlay();
    });
  }

  function init() {
    if (!root.document.body || !root.document.head) return;
    ensureCss();
    buildDom();
    bindEvents();
  }

  if (root.document.readyState === 'loading') {
    root.document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  SMAX.menuConfig = { init, openOverlay, closeOverlay };

})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
