(function (root) {
  'use strict';

  const SMAX = root.SMAX = root.SMAX || {};
  const CONFIG = SMAX.config || {};

  const DEFAULT_SUPABASE_URL = 'https://hzjlgwuorhexkzcoxmay.supabase.co';
  const DEFAULT_PUBLISHABLE_KEY = 'sb_publishable_edgxgG6UACiJClDmH5eoiQ_h4D-i4wG';
  const DEFAULT_TEAM_CODE = 'SGS 2.2.1';
  const PERSON_ME_PATH = '/rest/213963628/personalization/person/me';
  const PERSON_TEAM_CACHE_TTL_MS = 5 * 60 * 1000;
  let personTeamCache = { teamCode: '', ts: 0 };
  let personTeamPromise = null;

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

  function replaceObjectInPlace(target, source) {
    const dst = isPlainObject(target) ? target : {};
    Object.keys(dst).forEach(k => delete dst[k]);
    Object.keys(source || {}).forEach(k => {
      dst[k] = source[k];
    });
    return dst;
  }

  function replaceArrayInPlace(target, source) {
    const dst = Array.isArray(target) ? target : [];
    dst.splice(0, dst.length, ...(Array.isArray(source) ? source : []));
    return dst;
  }

  function uniq(arr) {
    return Array.from(new Set(arr));
  }

  function normalizeRule(rule) {
    const tag = String(rule?.tag || '').trim();
    if (!tag) return null;
    const palavras = uniq(
      (Array.isArray(rule?.palavras) ? rule.palavras : [])
        .map(v => String(v || '').trim())
        .filter(Boolean)
    );
    return { tag, palavras };
  }

  function normalizeText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase();
  }

  function inferTeamCodeFromRawText(rawText, availableCodes) {
    const text = normalizeText(rawText);
    if (!text || !Array.isArray(availableCodes) || !availableCodes.length) return '';

    for (const code of availableCodes) {
      const teamCode = String(code || '').trim();
      if (!teamCode) continue;
      const normalizedCode = normalizeText(teamCode);
      if (normalizedCode && text.includes(normalizedCode)) return teamCode;
    }

    const genericMatch = text.match(/SGS\s*2[.,]?\s*2[.,]?\s*\d+/i);
    if (genericMatch) {
      const m = normalizeText(genericMatch[0]).replace(/\s+/g, ' ');
      const target = m.replace(/[,]/g, '.').replace(/\s*/g, '');
      for (const code of availableCodes) {
        const c = normalizeText(code).replace(/\s*/g, '');
        if (c === target) return code;
      }
    }

    return '';
  }

  function inferTeamCodeFromPerson(personProps, availableCodes) {
    const props = isPlainObject(personProps) ? personProps : {};
    const candidates = [
      props.HomeLocation,
      props.GrupoUa_c,
      props.GroupUa_c,
      props.Department,
      props.LocationName
    ];

    for (const raw of candidates) {
      const match = inferTeamCodeFromRawText(raw, availableCodes);
      if (match) return match;
    }
    return '';
  }

  function inferTeamCodeFromGroups(groupsValue, teamCodeByGroupId) {
    const codeByGroup = isPlainObject(teamCodeByGroupId) ? teamCodeByGroupId : {};
    const groups = Array.isArray(groupsValue) ? groupsValue : [];
    if (!groups.length) return '';

    for (const g of groups) {
      const groupId = String(g || '').trim();
      if (!groupId) continue;
      if (codeByGroup[groupId]) return codeByGroup[groupId];
    }

    return '';
  }

  async function detectLoggedUserTeam(availableCodes, teamGroupIdsByCode) {
    const codes = Array.isArray(availableCodes) ? availableCodes.filter(Boolean) : [];
    if (!codes.length) return '';

    const teamCodeByGroupId = {};
    if (isPlainObject(teamGroupIdsByCode)) {
      Object.keys(teamGroupIdsByCode).forEach(code => {
        const groupId = Number(teamGroupIdsByCode[code]);
        if (!codes.includes(code)) return;
        if (!Number.isInteger(groupId) || groupId <= 0) return;
        teamCodeByGroupId[String(groupId)] = code;
      });
    }

    const now = Date.now();
    if (
      personTeamCache.teamCode &&
      (now - personTeamCache.ts) < PERSON_TEAM_CACHE_TTL_MS &&
      codes.includes(personTeamCache.teamCode)
    ) {
      return personTeamCache.teamCode;
    }

    if (personTeamPromise) return personTeamPromise;

    personTeamPromise = (async () => {
      try {
        const fetchImpl = (root && typeof root.fetch === 'function')
          ? root.fetch.bind(root)
          : (typeof fetch === 'function' ? fetch : null);
        if (!fetchImpl || !root.location?.origin) return '';

        const url = new URL(PERSON_ME_PATH, root.location.origin).toString();
        const res = await fetchImpl(url, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store'
        });
        if (!res.ok) return '';

        const payload = await res.json().catch(() => null);
        const entity = Array.isArray(payload?.entities) ? payload.entities[0] : null;
        const props = isPlainObject(entity?.properties) ? entity.properties : {};
        const fromGroups = inferTeamCodeFromGroups(props.Groups, teamCodeByGroupId);
        const teamCode = fromGroups || inferTeamCodeFromPerson(props, codes);

        if (teamCode) {
          personTeamCache = { teamCode, ts: Date.now() };
          if (fromGroups) {
            console.log('[SMAX Supabase] Equipe detectada por Groups/id_smax_grupo:', teamCode);
          }
          return teamCode;
        }
      } catch (e) {
        console.warn('[SMAX Supabase] Nao foi possivel detectar equipe do usuario logado:', e);
      } finally {
        personTeamPromise = null;
      }
      return '';
    })();

    return personTeamPromise;
  }

  function readSupabaseRuntime() {
    const cfg = isPlainObject(CONFIG.supabase) ? CONFIG.supabase : {};
    const storedUrl = root.localStorage && root.localStorage.getItem('smax_supabase_url');
    const storedKey = root.localStorage && root.localStorage.getItem('smax_supabase_key');

    const url = String(storedUrl || cfg.url || DEFAULT_SUPABASE_URL || '').trim();
    const key = String(storedKey || cfg.publishableKey || cfg.anonKey || DEFAULT_PUBLISHABLE_KEY || '').trim();
    const disabled = cfg.enabled === false;

    CONFIG.supabase = CONFIG.supabase || {};
    CONFIG.supabase.url = url;
    CONFIG.supabase.publishableKey = key;
    CONFIG.supabase.enabled = !disabled && !!url && !!key;

    return {
      url,
      key,
      enabled: CONFIG.supabase.enabled
    };
  }

  const runtime = readSupabaseRuntime();

  function getGmRequestFn() {
    if (typeof GM_xmlhttpRequest === 'function') return GM_xmlhttpRequest;
    if (typeof root.GM_xmlhttpRequest === 'function') return root.GM_xmlhttpRequest;
    if (typeof GM !== 'undefined' && GM && typeof GM.xmlHttpRequest === 'function') return GM.xmlHttpRequest.bind(GM);
    if (root.GM && typeof root.GM.xmlHttpRequest === 'function') return root.GM.xmlHttpRequest.bind(root.GM);
    return null;
  }

  async function doHttpRequest(url, method, headers, body) {
    const gmRequest = getGmRequestFn();
    if (gmRequest) {
      return new Promise((resolve, reject) => {
        gmRequest({
          method,
          url,
          headers,
          data: body,
          timeout: 45000,
          onload: (res) => {
            const status = Number(res && res.status) || 0;
            const text = typeof res?.responseText === 'string' ? res.responseText : '';
            resolve({
              ok: status >= 200 && status < 300,
              status,
              text
            });
          },
          onerror: (err) => {
            reject(new Error(`[Supabase ${method}] Falha de rede via GM_xmlhttpRequest: ${err?.error || err?.message || 'erro desconhecido'}`));
          },
          ontimeout: () => {
            reject(new Error(`[Supabase ${method}] Timeout na requisicao`));
          }
        });
      });
    }

    const fetchImpl = (root && typeof root.fetch === 'function') ? root.fetch.bind(root) : (typeof fetch === 'function' ? fetch : null);
    if (!fetchImpl) throw new Error('Nenhum cliente HTTP disponivel (GM_xmlhttpRequest/fetch).');

    const res = await fetchImpl(url, { method, headers, body });
    return {
      ok: !!res.ok,
      status: Number(res.status) || 0,
      text: await res.text()
    };
  }

  async function request(path, options) {
    const opts = options || {};
    if (!runtime.enabled) throw new Error('Supabase desabilitado');

    const method = opts.method || 'GET';
    const url = `${runtime.url.replace(/\/+$/, '')}/rest/v1/${path.replace(/^\/+/, '')}`;
    const headers = Object.assign({
      apikey: runtime.key,
      Authorization: `Bearer ${runtime.key}`
    }, opts.headers || {});

    let body;
    if (typeof opts.body !== 'undefined') {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(opts.body);
    }

    const res = await doHttpRequest(url, method, headers, body);
    const text = res.text || '';

    if (!res.ok) {
      throw new Error(`[Supabase ${method} ${path}] ${res.status} ${text}`);
    }

    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  function buildTeamState(teamsRows, specialistsRows, finalsRows) {
    const teams = {};
    const teamCodeById = {};
    const teamGroupIds = {};
    (teamsRows || []).forEach(t => {
      const code = String(t.code || '').trim();
      if (!code) return;
      teams[code] = { nameGroups: {}, nameAliases: {}, nameColors: {}, ausentes: [], personMeta: {} };
      teamCodeById[t.id] = code;
      const groupId = Number(t.id_smax_grupo);
      if (Number.isInteger(groupId) && groupId > 0) {
        teamGroupIds[code] = groupId;
      }
    });

    const finalsBySpecialist = {};
    (finalsRows || []).forEach(f => {
      const sid = Number(f.specialist_id);
      if (!Number.isFinite(sid)) return;
      if (!Array.isArray(finalsBySpecialist[sid])) finalsBySpecialist[sid] = [];
      const n = Number(f.final);
      if (Number.isInteger(n) && n >= 0 && n <= 99) finalsBySpecialist[sid].push(n);
    });

    Object.keys(finalsBySpecialist).forEach(sid => {
      finalsBySpecialist[sid] = uniq(finalsBySpecialist[sid]).sort((a, b) => a - b);
    });

    (specialistsRows || []).forEach(s => {
      const code = teamCodeById[s.team_id];
      if (!code || !teams[code]) return;
      const name = String(s.name || '').trim().toUpperCase();
      if (!name) return;
      const bg = normalizeHex(s.bg_color, '#E2E8F0');
      const fg = normalizeHex(s.fg_color, inferFg(bg));
      const sid = Number(s.id);

      teams[code].nameGroups[name] = finalsBySpecialist[sid] || [];
      teams[code].nameAliases[name] = String(s.nickname || '').trim();
      teams[code].nameColors[name] = { bg, fg };
      if (s.is_absent) teams[code].ausentes.push(name);
      const personId = Number(s.smax_person_id);
      const personLocation = String(s.smax_location || '').trim();
      const personName = String(s.smax_person_name || s.name || '').trim();
      if (Number.isInteger(personId) || personLocation || personName) {
        teams[code].personMeta[name] = {
          id: Number.isInteger(personId) ? personId : null,
          location: personLocation,
          name: personName
        };
      }
    });

    Object.keys(teams).forEach(code => {
      teams[code].ausentes = uniq(teams[code].ausentes);
    });

    return { teams, teamGroupIds };
  }

  function buildHighlightState(groupsRows, termsRows) {
    const groups = {};
    const keyById = {};

    (groupsRows || [])
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .forEach(g => {
        const key = String(g.group_key || '').trim().toLowerCase();
        if (!key) return;
        groups[key] = {
          cls: String(g.css_class || '').trim(),
          whole: [],
          substr: [],
          regex: []
        };
        keyById[g.id] = key;
      });

    (termsRows || [])
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .forEach(t => {
        const key = keyById[t.group_id];
        if (!key || !groups[key]) return;
        const kind = String(t.match_type || '').trim();
        const term = String(t.term || '').trim();
        if (!term) return;
        if (kind === 'whole') groups[key].whole.push(term);
        else if (kind === 'substr') groups[key].substr.push(term);
        else if (kind === 'regex') {
          groups[key].regex.push({
            pattern: term,
            flags: String(t.regex_flags || 'giu').trim() || 'giu'
          });
        }
      });

    return groups;
  }

  function applyLoadedState(payload) {
    const teamCodes = Object.keys(payload.teams || {});
    const teamName = teamCodes.includes(payload.teamName) ? payload.teamName : (teamCodes[0] || DEFAULT_TEAM_CODE);
    const active = payload.teams[teamName] || { nameGroups: {}, nameAliases: {}, nameColors: {}, ausentes: [], personMeta: {} };

    CONFIG.prefs = replaceObjectInPlace(CONFIG.prefs || {}, payload.prefs || {});
    CONFIG.teams = replaceObjectInPlace(CONFIG.teams || {}, payload.teams || {});
    CONFIG.teamGroupIds = replaceObjectInPlace(CONFIG.teamGroupIds || {}, payload.teamGroupIds || {});
    CONFIG.teamName = teamName;

    CONFIG.nameGroups = replaceObjectInPlace(CONFIG.nameGroups || {}, active.nameGroups || {});
    CONFIG.nameAliases = replaceObjectInPlace(CONFIG.nameAliases || {}, active.nameAliases || {});
    CONFIG.nameColors = replaceObjectInPlace(CONFIG.nameColors || {}, active.nameColors || {});
    CONFIG.ausentes = replaceArrayInPlace(CONFIG.ausentes || [], active.ausentes || []);
    CONFIG.personMeta = replaceObjectInPlace(CONFIG.personMeta || {}, active.personMeta || {});

    CONFIG.highlightGroups = replaceObjectInPlace(CONFIG.highlightGroups || {}, payload.highlightGroups || {});
    CONFIG.detratores = replaceArrayInPlace(CONFIG.detratores || [], payload.detratores || []);
    CONFIG.autoTagRules = replaceArrayInPlace(CONFIG.autoTagRules || [], payload.autoTagRules || []);
    CONFIG.loadedFromSupabaseAt = new Date().toISOString();

    if (typeof CONFIG.save === 'function') {
      try { CONFIG.save(); } catch (e) { /* ignore */ }
    }
  }

  function buildPayloadFromSnapshot(snapshot) {
    const safe = isPlainObject(snapshot) ? snapshot : {};
    const teams = isPlainObject(safe.teams) ? cloneValue(safe.teams) : {};
    const teamName = String(safe.teamName || CONFIG.teamName || DEFAULT_TEAM_CODE).trim() || DEFAULT_TEAM_CODE;
    const teamGroupIds = isPlainObject(safe.teamGroupIds)
      ? cloneValue(safe.teamGroupIds)
      : cloneValue(CONFIG.teamGroupIds || {});

    if (!teams[teamName]) {
      teams[teamName] = {
        nameGroups: cloneValue(safe.nameGroups || {}),
        nameAliases: cloneValue(safe.nameAliases || {}),
        nameColors: cloneValue(safe.nameColors || {}),
        ausentes: cloneValue(safe.ausentes || []),
        personMeta: cloneValue(safe.personMeta || {})
      };
    }

    return {
      prefs: cloneValue(safe.prefs || CONFIG.prefs || {}),
      teamName,
      teamGroupIds,
      teams,
      highlightGroups: cloneValue(safe.highlightGroups || CONFIG.highlightGroups || {}),
      detratores: cloneValue(safe.detratores || CONFIG.detratores || []),
      autoTagRules: cloneValue(safe.autoTagRules || CONFIG.autoTagRules || [])
    };
  }

  async function loadFromDb() {
    if (!runtime.enabled) return false;

    const requests = [
      request('smax_teams?select=id,code,name,id_smax_grupo,is_active&is_active=eq.true&order=code.asc'),
      request('smax_specialists?select=id,team_id,name,nickname,bg_color,fg_color,is_absent,sort_order,smax_person_id,smax_location,smax_person_name&order=team_id.asc,sort_order.asc,name.asc'),
      request('smax_specialist_finals?select=specialist_id,final&order=specialist_id.asc,final.asc'),
      request('smax_highlight_groups?select=id,group_key,label,css_class,sort_order,is_active&is_active=eq.true&order=sort_order.asc,group_key.asc'),
      request('smax_highlight_terms?select=group_id,match_type,term,regex_flags,sort_order,is_active&is_active=eq.true&order=group_id.asc,sort_order.asc,id.asc'),
      request('smax_detractors?select=full_name,sort_order,is_active&is_active=eq.true&order=sort_order.asc,id.asc'),
      request('smax_feature_prefs?id=eq.1&select=highlights_on,name_badges_on,magistrado_on,collapse_on,enlarge_comments_on,auto_tags_on'),
      request('smax_auto_tag_rules?select=tag_label,keywords,sort_order,is_active&is_active=eq.true&order=sort_order.asc,id.asc').catch(() => null)
    ];

    const [
      teamsRows,
      specialistsRows,
      finalsRows,
      groupsRows,
      termsRows,
      detratoresRows,
      prefsRows,
      autoTagRows
    ] = await Promise.all(requests);

    const prefsRow = Array.isArray(prefsRows) && prefsRows[0] ? prefsRows[0] : {};
    const currentPrefs = isPlainObject(CONFIG.prefs) ? CONFIG.prefs : {};
    const prefs = {
      highlightsOn: typeof prefsRow.highlights_on === 'boolean' ? prefsRow.highlights_on : !!currentPrefs.highlightsOn,
      nameBadgesOn: typeof prefsRow.name_badges_on === 'boolean' ? prefsRow.name_badges_on : !!currentPrefs.nameBadgesOn,
      magistradoOn: typeof prefsRow.magistrado_on === 'boolean' ? prefsRow.magistrado_on : !!currentPrefs.magistradoOn,
      collapseOn: typeof prefsRow.collapse_on === 'boolean' ? prefsRow.collapse_on : !!currentPrefs.collapseOn,
      enlargeCommentsOn: typeof prefsRow.enlarge_comments_on === 'boolean' ? prefsRow.enlarge_comments_on : !!currentPrefs.enlargeCommentsOn,
      autoTagsOn: typeof prefsRow.auto_tags_on === 'boolean' ? prefsRow.auto_tags_on : !!currentPrefs.autoTagsOn
    };

    const teamState = buildTeamState(teamsRows, specialistsRows, finalsRows);
    const teams = teamState.teams || {};
    const teamGroupIds = teamState.teamGroupIds || {};
    const configuredTeamName = String(CONFIG.teamName || '').trim();
    const availableCodes = Object.keys(teams);
    const detectedTeamName = await detectLoggedUserTeam(availableCodes, teamGroupIds);
    const teamName = availableCodes.includes(detectedTeamName)
      ? detectedTeamName
      : (availableCodes.includes(configuredTeamName) ? configuredTeamName : (availableCodes[0] || DEFAULT_TEAM_CODE));
    if (detectedTeamName && teamName === detectedTeamName) {
      console.log('[SMAX Supabase] Equipe detectada pelo perfil do usuario:', detectedTeamName);
    }

    const highlightGroups = buildHighlightState(groupsRows, termsRows);
    const detratores = (detratoresRows || []).map(r => String(r.full_name || '').trim()).filter(Boolean);

    const autoTagRules = [];
    if (Array.isArray(autoTagRows)) {
      autoTagRows.forEach(row => {
        const rule = normalizeRule({
          tag: row.tag_label,
          palavras: Array.isArray(row.keywords)
            ? row.keywords
            : String(row.keywords || '').split(',').map(v => v.trim()).filter(Boolean)
        });
        if (rule) autoTagRules.push(rule);
      });
    }

    applyLoadedState({
      prefs,
      teamName,
      teams,
      teamGroupIds,
      highlightGroups,
      detratores,
      autoTagRules
    });

    return true;
  }

  function buildSpecialistsForTeam(teamData) {
    const groups = isPlainObject(teamData?.nameGroups) ? teamData.nameGroups : {};
    const aliases = isPlainObject(teamData?.nameAliases) ? teamData.nameAliases : {};
    const colors = isPlainObject(teamData?.nameColors) ? teamData.nameColors : {};
    const personMeta = isPlainObject(teamData?.personMeta) ? teamData.personMeta : {};
    const ausSet = new Set((Array.isArray(teamData?.ausentes) ? teamData.ausentes : []).map(v => String(v || '').trim().toUpperCase()));

    const names = uniq(
      [
        ...Object.keys(groups),
        ...Object.keys(aliases),
        ...Object.keys(colors),
        ...Object.keys(personMeta),
        ...Array.from(ausSet)
      ]
        .map(v => String(v || '').trim().toUpperCase())
        .filter(Boolean)
    );

    return names
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .map((name, idx) => {
        const c = isPlainObject(colors[name]) ? colors[name] : {};
        const meta = isPlainObject(personMeta[name]) ? personMeta[name] : {};
        const personId = Number(meta.id ?? meta.personId);
        const bg = normalizeHex(c.bg, '#E2E8F0');
        const fg = normalizeHex(c.fg, inferFg(bg));
        const finals = Array.isArray(groups[name])
          ? uniq(groups[name].map(n => Number(n)).filter(n => Number.isInteger(n) && n >= 0 && n <= 99)).sort((a, b) => a - b)
          : [];
        return {
          name,
          nickname: String(aliases[name] || '').trim(),
          bg_color: bg,
          fg_color: fg,
          is_absent: ausSet.has(name),
          sort_order: idx + 1,
          smax_person_id: Number.isInteger(personId) ? personId : null,
          smax_location: String(meta.location || '').trim(),
          smax_person_name: String(meta.name || '').trim(),
          finals
        };
      });
  }

  function validateTeamFinalAssignments(teamCode, specialists) {
    const finalOwner = new Map();
    const conflicts = [];

    (Array.isArray(specialists) ? specialists : []).forEach(spec => {
      const owner = String(spec?.name || '').trim().toUpperCase();
      const finals = Array.isArray(spec?.finals) ? spec.finals : [];
      finals.forEach(n => {
        const finalNum = Number(n);
        if (!Number.isInteger(finalNum) || finalNum < 0 || finalNum > 99) return;
        if (!finalOwner.has(finalNum)) {
          finalOwner.set(finalNum, owner);
          return;
        }
        const prev = finalOwner.get(finalNum);
        if (prev !== owner) {
          conflicts.push({
            teamCode,
            final: finalNum,
            owners: [prev, owner]
          });
        }
      });
    });

    return conflicts;
  }

  async function upsertFinalsRows(finalsBody) {
    if (!Array.isArray(finalsBody) || !finalsBody.length) return;

    try {
      await request('smax_specialist_finals?on_conflict=team_id,final', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: finalsBody
      });
      return;
    } catch (e) {
      const msg = String(e?.message || '');
      const legacySchema =
        msg.includes('team_id') ||
        msg.includes('on_conflict') ||
        msg.includes('PGRST');

      if (!legacySchema) throw e;

      const legacyBody = finalsBody.map(row => ({
        specialist_id: row.specialist_id,
        final: row.final
      }));

      await request('smax_specialist_finals?on_conflict=specialist_id,final', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: legacyBody
      });
    }
  }

  async function saveAllToDb(snapshot) {
    if (!runtime.enabled) throw new Error('Supabase desabilitado');
    const payload = buildPayloadFromSnapshot(snapshot);

    const teamCodes = uniq(
      Object.keys(payload.teams || {})
        .concat(payload.teamName || [])
        .map(v => String(v || '').trim())
        .filter(Boolean)
    );

    if (!teamCodes.length) teamCodes.push(DEFAULT_TEAM_CODE);

    const teamsBody = teamCodes.map(code => ({
      code,
      name: code,
      id_smax_grupo: Number.isInteger(Number(payload.teamGroupIds?.[code])) ? Number(payload.teamGroupIds[code]) : null,
      is_active: true
    }));

    await request('smax_teams?on_conflict=code', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: teamsBody
    });

    const teamsRows = await request('smax_teams?select=id,code&is_active=eq.true');
    const teamIdByCode = {};
    (teamsRows || []).forEach(t => {
      const code = String(t.code || '').trim();
      if (code) teamIdByCode[code] = Number(t.id);
    });

    for (const code of teamCodes) {
      const teamId = teamIdByCode[code];
      if (!teamId) continue;

      const data = payload.teams[code] || { nameGroups: {}, nameAliases: {}, nameColors: {}, ausentes: [], personMeta: {} };
      const specialists = buildSpecialistsForTeam(data);
      const conflicts = validateTeamFinalAssignments(code, specialists);
      if (conflicts.length) {
        const details = conflicts
          .slice(0, 8)
          .map(c => `${String(c.final).padStart(2, '0')}: ${c.owners.join(' x ')}`)
          .join(', ');
        throw new Error(`Finais duplicados na equipe ${code}. Cada final deve pertencer a um unico especialista na equipe. Conflitos: ${details}`);
      }

      await request(`smax_specialists?team_id=eq.${teamId}`, {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' }
      });

      if (!specialists.length) continue;

      const specBody = specialists.map(s => ({
        team_id: teamId,
        name: s.name,
        nickname: s.nickname,
        bg_color: s.bg_color,
        fg_color: s.fg_color,
        is_absent: !!s.is_absent,
        smax_person_id: Number.isInteger(Number(s.smax_person_id)) ? Number(s.smax_person_id) : null,
        smax_location: String(s.smax_location || '').trim(),
        smax_person_name: String(s.smax_person_name || '').trim(),
        sort_order: s.sort_order
      }));

      const inserted = await request('smax_specialists?select=id,name,team_id', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: specBody
      });

      const specIdByName = {};
      (inserted || []).forEach(s => {
        const name = String(s.name || '').trim().toUpperCase();
        if (name) specIdByName[name] = Number(s.id);
      });

      const finalsBody = [];
      specialists.forEach(s => {
        const sid = specIdByName[s.name];
        if (!sid) return;
        s.finals.forEach(n => {
          finalsBody.push({ team_id: teamId, specialist_id: sid, final: n });
        });
      });

      await upsertFinalsRows(finalsBody);
    }

    await request('smax_highlight_terms?id=gte.0', { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
    await request('smax_highlight_groups?id=gte.0', { method: 'DELETE', headers: { Prefer: 'return=minimal' } });

    const hlSource = isPlainObject(payload.highlightGroups) ? payload.highlightGroups : {};
    const defaultOrder = ['vermelho', 'rosa', 'amarelo', 'verde', 'azul'];
    const hlKeys = uniq(defaultOrder.concat(Object.keys(hlSource)));
    const groupsBody = hlKeys
      .filter(k => isPlainObject(hlSource[k]))
      .map((key, idx) => {
        const g = hlSource[key];
        return {
          group_key: key,
          label: key.charAt(0).toUpperCase() + key.slice(1).toLowerCase(),
          css_class: String(g.cls || '').trim(),
          sort_order: idx + 1,
          is_active: true
        };
      });

    let groupsInserted = [];
    if (groupsBody.length) {
      groupsInserted = await request('smax_highlight_groups?select=id,group_key', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: groupsBody
      });
    }

    const groupIdByKey = {};
    (groupsInserted || []).forEach(g => {
      const key = String(g.group_key || '').trim();
      if (key) groupIdByKey[key] = Number(g.id);
    });

    const termBody = [];
    hlKeys.forEach(key => {
      const gid = groupIdByKey[key];
      const g = hlSource[key];
      if (!gid || !isPlainObject(g)) return;

      const whole = Array.isArray(g.whole) ? g.whole : [];
      const substr = Array.isArray(g.substr) ? g.substr : [];
      const regex = Array.isArray(g.regex) ? g.regex : [];

      whole.forEach((term, idx) => {
        const t = String(term || '').trim();
        if (!t) return;
        termBody.push({ group_id: gid, match_type: 'whole', term: t, regex_flags: '', sort_order: idx + 1, is_active: true });
      });
      substr.forEach((term, idx) => {
        const t = String(term || '').trim();
        if (!t) return;
        termBody.push({ group_id: gid, match_type: 'substr', term: t, regex_flags: '', sort_order: idx + 1, is_active: true });
      });
      regex.forEach((entry, idx) => {
        const pattern = String(entry?.pattern || entry || '').trim();
        if (!pattern) return;
        const flags = String(entry?.flags || 'giu').trim() || 'giu';
        termBody.push({ group_id: gid, match_type: 'regex', term: pattern, regex_flags: flags, sort_order: idx + 1, is_active: true });
      });
    });

    if (termBody.length) {
      await request('smax_highlight_terms?on_conflict=group_id,match_type,term,regex_flags', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: termBody
      });
    }

    await request('smax_detractors?id=gte.0', { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
    const detrBody = (Array.isArray(payload.detratores) ? payload.detratores : [])
      .map((name, idx) => ({
        full_name: String(name || '').trim(),
        sort_order: idx + 1,
        is_active: true
      }))
      .filter(row => row.full_name);
    if (detrBody.length) {
      await request('smax_detractors?on_conflict=full_name', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: detrBody
      });
    }

    try {
      await request('smax_auto_tag_rules?id=gte.0', { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      const tagBody = (Array.isArray(payload.autoTagRules) ? payload.autoTagRules : [])
        .map((rule, idx) => normalizeRule(rule))
        .filter(Boolean)
        .map((rule, idx) => ({
          tag_label: rule.tag,
          keywords: rule.palavras,
          sort_order: idx + 1,
          is_active: true
        }));
      if (tagBody.length) {
        await request('smax_auto_tag_rules?on_conflict=tag_label', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: tagBody
        });
      }
    } catch (e) {
      console.warn('[SMAX Supabase] Falha ao salvar regras de tags:', e);
    }

    const p = payload.prefs || {};
    await request('smax_feature_prefs?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: [{
        id: 1,
        highlights_on: !!p.highlightsOn,
        name_badges_on: !!p.nameBadgesOn,
        magistrado_on: !!p.magistradoOn,
        collapse_on: !!p.collapseOn,
        enlarge_comments_on: !!p.enlargeCommentsOn,
        auto_tags_on: !!p.autoTagsOn
      }]
    });

    await loadFromDb();
    return true;
  }

  const ready = runtime.enabled
    ? loadFromDb().catch(err => {
      console.error('[SMAX Supabase] Erro ao carregar dados do banco:', err);
      return false;
    })
    : Promise.resolve(false);

  SMAX.supabase = {
    enabled: runtime.enabled,
    url: runtime.url,
    ready,
    load: loadFromDb,
    saveAll: saveAllToDb,
    request
  };

})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
