(function () {
  'use strict';

  var LOG        = '[SMAX] Módulo Dados eProc';
  var MAX_TRIES  = 40;
  var INTERVAL   = 500;

  var capturedData  = null;
  var blockInserted = false;
  var automatizadoresState = {
    loaded: false,
    names: new Set(),
    namesList: [],
    loadingPromise: null
  };

  function log() {
    try { console.log.apply(console, [LOG].concat([].slice.call(arguments))); } catch (e) {}
  }

  function normalizeName(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase();
  }

  function getSmaxRoot() {
    return (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
  }

  function getDetratoresNormalized() {
    var root = getSmaxRoot();
    var cfg = (root && root.SMAX && root.SMAX.config) ? root.SMAX.config : {};
    var list = Array.isArray(cfg.detratores) ? cfg.detratores : [];
    return list.map(normalizeName).filter(Boolean);
  }

  function isDetratorName(rawName, normalizedDetratores) {
    var key = normalizeName(rawName);
    if (!key) return false;

    var set = new Set(normalizedDetratores || []);
    if (set.has(key)) return true;

    if (key.length < 8) return false;
    for (var i = 0; i < normalizedDetratores.length; i++) {
      var flag = normalizedDetratores[i];
      if (!flag) continue;
      if (key.indexOf(flag) !== -1 || flag.indexOf(key) !== -1) return true;
    }

    return false;
  }

  function buildTag(label, bg, color) {
    return ''
      + '<span style="display:inline-flex; align-items:center; height:20px; padding:0 8px; border-radius:999px;'
      + ' font-size:11px; font-weight:700; letter-spacing:.2px; background:' + bg + '; color:' + color + ';">'
      + escapeHtml(label)
      + '</span>';
  }

  function buildUserTagsHtml(rawUserName) {
    var name = String(rawUserName || '').trim();
    if (!name) return '';

    var detratores = getDetratoresNormalized();
    var isDetrator = isDetratorName(name, detratores);
    var isAutomatizador = isAutomatizadorName(name);

    var tags = [];
    if (isDetrator) tags.push(buildTag('DETRATOR', '#FEE2E2', '#991B1B'));
    if (isAutomatizador) tags.push(buildTag('AUTOMATIZADOR', '#DBEAFE', '#1E40AF'));
    return tags.join('');
  }

  function isAutomatizadorName(rawName) {
    var key = normalizeName(rawName);
    if (!key) return false;

    if (automatizadoresState.names.has(key)) return true;

    var list = Array.isArray(automatizadoresState.namesList) ? automatizadoresState.namesList : [];
    if (key.length < 8) return false;

    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      if (!item) continue;
      if (key.indexOf(item) !== -1 || item.indexOf(key) !== -1) return true;
    }

    return false;
  }

  function renderUserTagsInCurrentBlock(rawUserName) {
    try {
      var block = document.getElementById('initdata_eproc_block');
      if (!block) return;
      var host = block.querySelector('.smax-eproc-user-tags');
      if (!host) return;
      host.innerHTML = buildUserTagsHtml(rawUserName);
    } catch (e) {}
  }

  function refreshUserTagsWithRetry(rawUserName) {
    // Dados de detratores/automatizadores podem chegar em tempos diferentes.
    var delays = [0, 800, 1800, 3200];
    for (var i = 0; i < delays.length; i++) {
      (function (delay) {
        setTimeout(function () {
          renderUserTagsInCurrentBlock(rawUserName);
        }, delay);
      })(delays[i]);
    }
  }

  function ensureAutomatizadoresLoaded() {
    if (automatizadoresState.loaded && automatizadoresState.names.size > 0) {
      return Promise.resolve(true);
    }
    if (automatizadoresState.loadingPromise) return automatizadoresState.loadingPromise;

    automatizadoresState.loadingPromise = (async function () {
      try {
        var root = getSmaxRoot();
        var supabase = root && root.SMAX ? root.SMAX.supabase : null;
        if (!supabase || typeof supabase.request !== 'function' || !supabase.enabled) {
          return false;
        }

        if (supabase.ready && typeof supabase.ready.then === 'function') {
          try { await supabase.ready; } catch (eReady) {}
        }

        var candidates = [
          'smax_automatizadores?select=nome&limit=5000',
          'smax_automatizadores?select=nome,full_name,name&limit=5000',
          'smax_automatizadores?select=*&limit=5000'
        ];
        var rows = [];
        for (var i = 0; i < candidates.length; i++) {
          try {
            rows = await supabase.request(candidates[i]);
            if (Array.isArray(rows) && rows.length) break;
          } catch (eAlt) {
            rows = [];
          }
        }

        var names = new Set();
        (Array.isArray(rows) ? rows : []).forEach(function (r) {
          var n = normalizeName((r && (r.nome || r.full_name || r.name || r.nome_completo)) || '');
          if (n) names.add(n);
        });

        automatizadoresState.names = names;
        automatizadoresState.namesList = Array.from(names);
        automatizadoresState.loaded = names.size > 0;
        if (!automatizadoresState.loaded) {
          console.warn(LOG, 'Tabela de automatizadores retornou vazia ou sem acesso de leitura.');
        }
        return automatizadoresState.loaded;
      } catch (e) {
        automatizadoresState.loaded = false;
        console.warn(LOG, 'Falha ao carregar automatizadores:', e);
        return false;
      } finally {
        automatizadoresState.loadingPromise = null;
      }
    })();

    return automatizadoresState.loadingPromise;
  }

  // ============================================================
  // 0) Copiar para clipboard + handler dos botões
  // ============================================================
  function copiarTexto(texto) {
    texto = (texto == null) ? '' : String(texto);

    if (navigator.clipboard && window.isSecureContext) {
      try { return navigator.clipboard.writeText(texto); } catch (e) {}
    }

    try {
      var ta = document.createElement('textarea');
      ta.value = texto;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try { document.execCommand('copy'); } catch (e2) {}
      document.body.removeChild(ta);
    } catch (e3) {}
  }

  function installCopyHandlerOnce() {
    if (installCopyHandlerOnce._done) return;
    installCopyHandlerOnce._done = true;

    document.addEventListener('click', function (ev) {
      try {
        var btn = ev.target && ev.target.closest ? ev.target.closest('button[data-initdata-copy="1"]') : null;
        if (!btn) return;

        ev.preventDefault();
        ev.stopPropagation();

        var payload = btn.getAttribute('data-copy') || '';
        copiarTexto(payload);

        btn.setAttribute('title', 'Copiado!');
        setTimeout(function () {
          try { btn.setAttribute('title', 'Copiar'); } catch (e) {}
        }, 800);
      } catch (e) {}
    }, true);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/`/g, '&#96;');
  }

  function buildCopyButton(rawValue) {
    var v = (rawValue == null) ? '' : String(rawValue);

    return ''
      + '<button class="flex gap-1 items-center select-none py-1"'
      + ' aria-label="Copiar"'
      + ' title="Copiar"'
      + ' data-initdata-copy="1"'
      + ' data-copy="' + escapeAttr(v) + '"'
      + ' style="margin-left:8px; cursor:pointer; background:transparent; border:0; padding:0;">'
      +   '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"'
      +        ' stroke="currentColor" stroke-width="1.75"'
      +        ' stroke-linecap="round" stroke-linejoin="round"'
      +        ' class="icon-sm">'
      +     '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>'
      +     '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>'
      +   '</svg>'
      + '</button>';
  }

  // ============================================================
  // 1) Detectar troca de tela (SPA) – history hook
  // ============================================================
  function onRouteChange() {
    blockInserted = false;
    log('Mudança de rota detectada → tentando reinserir bloco (se houver dados).');
    setTimeout(function () { hookIntoNewPage(); }, 700);
  }

  function enableSpaRouteHooksOnce() {
    if (enableSpaRouteHooksOnce._done) return;
    enableSpaRouteHooksOnce._done = true;

    try {
      var _push = history.pushState;
      history.pushState = function () {
        var ret = _push.apply(this, arguments);
        try { onRouteChange(); } catch (e) {}
        return ret;
      };

      var _replace = history.replaceState;
      history.replaceState = function () {
        var ret = _replace.apply(this, arguments);
        try { onRouteChange(); } catch (e) {}
        return ret;
      };

      window.addEventListener('popstate', function () {
        try { onRouteChange(); } catch (e) {}
      });
    } catch (e) {
      console.error(LOG, 'Erro ao hookar history:', e);
    }
  }

  function hookIntoNewPage() {
    if (capturedData && !blockInserted) {
      tryInsertBlock();
    }
  }

  // ============================================================
  // 2) Intercepta initializationDataByLayout (XHR + fetch)
  // ============================================================
  function isInitDataUrl(url) {
    url = url || '';
    return (
      url.indexOf('/rest/213963628/entity-page/initializationDataByLayout/Request/') !== -1 &&
      url.indexOf('layout=FORM_LAYOUT.withoutResolution,FORM_LAYOUT.onlyResolution') !== -1
    );
  }

  function handleInitDataResponseText(txt) {
    try {
      capturedData = JSON.parse(txt);
      blockInserted = false;
      log('JSON capturado. Tentando inserir bloco...');
      tryInsertBlock();
    } catch (e) {
      console.error(LOG, 'Erro ao parsear JSON:', e);
    }
  }

  function hookNetworkOnce() {
    if (hookNetworkOnce._done) return;
    hookNetworkOnce._done = true;

    // ---- XHR
    try {
      var origOpen = XMLHttpRequest.prototype.open;
      var origSend = XMLHttpRequest.prototype.send;

      XMLHttpRequest.prototype.open = function (method, url) {
        this._tmx_url = url;
        return origOpen.apply(this, arguments);
      };

      XMLHttpRequest.prototype.send = function (body) {
        try {
          var url = this._tmx_url || '';
          if (isInitDataUrl(url)) {
            log('XHR initData detectada:', url);
            var xhr = this;
            xhr.addEventListener('load', function () {
              try {
                if (xhr.status === 200 && xhr.responseText) {
                  handleInitDataResponseText(xhr.responseText);
                } else {
                  log('XHR initData status != 200:', xhr.status);
                }
              } catch (e) {
                console.error(LOG, 'Erro no load XHR:', e);
              }
            });
          }
        } catch (e) {}
        return origSend.apply(this, arguments);
      };
    } catch (e1) {
      console.error(LOG, 'Erro ao hookar XHR:', e1);
    }

    // ---- fetch
    try {
      if (window.fetch) {
        var origFetch = window.fetch;
        window.fetch = function (input, init) {
          var url = '';
          try {
            url = (typeof input === 'string') ? input : (input && input.url) ? input.url : '';
          } catch (e) {}

          return origFetch.apply(this, arguments).then(function (resp) {
            try {
              if (resp && resp.ok && isInitDataUrl(url)) {
                log('fetch initData detectada:', url);
                resp.clone().text().then(function (txt) {
                  if (txt) handleInitDataResponseText(txt);
                });
              }
            } catch (e) {}
            return resp;
          });
        };
      }
    } catch (e2) {
      console.error(LOG, 'Erro ao hookar fetch:', e2);
    }
  }

  // ============================================================
  // 3) Encontrar o container do campo "Título"
  // ============================================================
  function findContainerInDoc(doc) {
    if (!doc) return null;

    var byId = doc.getElementById('withoutResolution_DisplayLabel_container');
    if (byId) return byId;

    try {
      var input = doc.querySelector('input[data-aid="withoutResolution_DisplayLabel"]');
      if (input && input.closest) return input.closest('.field-container');
    } catch (e) {}

    return null;
  }

  function findContainerAnywhere() {
    var c = findContainerInDoc(document);
    if (c) return c;

    for (var i = 0; i < window.frames.length; i++) {
      try {
        var frameDoc = window.frames[i].document;
        var f = findContainerInDoc(frameDoc);
        if (f) return f;
      } catch (e) {}
    }
    return null;
  }

  // ============================================================
  // 4) Extrair dados do JSON (inclui contagem de CommentId)
  // ============================================================
  function countCommentIds(props) {
    try {
      if (!props) return 0;

      var commentsRaw = props.Comments;
      if (!commentsRaw) return 0;

      var parsed = commentsRaw;

      // Em geral vem como string JSON (ex.: "{\"Comment\":[...]}")
      if (typeof parsed === 'string') {
        parsed = parsed.trim();
        if (!parsed) return 0;
        parsed = JSON.parse(parsed);
      }

      if (!parsed) return 0;

      var arr = parsed.Comment || parsed.comments || parsed.comment || null;
      if (!arr) return 0;
      if (!Array.isArray(arr)) arr = [arr];

      var count = 0;
      for (var i = 0; i < arr.length; i++) {
        var cid = arr[i] && arr[i].CommentId;
        if (cid) count++;
      }
      return count;
    } catch (e) {
      // Se falhar, não quebra o bloco
      return 0;
    }
  }

  function extractInfo(data) {
    if (!data || !data.EntityData) return {};

    var props   = data.EntityData.properties         || {};
    var related = data.EntityData.related_properties || {};

    var numeroProcesso = '';
    var usuarioDoCampo = '';

    try {
      var userOptionsRaw = props.UserOptions;
      if (userOptionsRaw) {
        var userOptions = JSON.parse(userOptionsRaw);
        var complex = userOptions &&
                      userOptions.complexTypeProperties &&
                      userOptions.complexTypeProperties[0] &&
                      userOptions.complexTypeProperties[0].properties;

        if (complex) {
          if (complex.NumerodoProcesso_c) numeroProcesso = complex.NumerodoProcesso_c;
          if (complex.Usuario_c) usuarioDoCampo = complex.Usuario_c;
        }
      }
    } catch (e) {
      console.error(LOG, 'Erro ao parsear UserOptions:', e);
    }

    var usuario = '';
    if (related.RequestedForPerson && related.RequestedForPerson.Name) {
      usuario = related.RequestedForPerson.Name;
    } else if (related.RequestedByPerson && related.RequestedByPerson.Name) {
      usuario = related.RequestedByPerson.Name;
    } else if (usuarioDoCampo) {
      usuario = usuarioDoCampo;
    }

    var unidadeRelated = '';
    if (related.RegisteredForLocation) {
      var rl = related.RegisteredForLocation;
      unidadeRelated = rl.DisplayName || rl.DisplayLabel || rl.Name || '';
    }

    var unidadePredio = '';
    if (props.PredioLot_c) unidadePredio = props.PredioLot_c;

    var unidadeFinal = unidadePredio || unidadeRelated || '';

    var commentIdCount = countCommentIds(props);

    return {
      numeroProcesso: numeroProcesso,
      usuario:        usuario,
      unidade:        unidadeFinal,
      unidadeRelated: unidadeRelated,
      unidadePredio:  unidadePredio,
      commentIdCount: commentIdCount
    };
  }

  // ============================================================
  // 5) Montar e inserir o bloco
  // ============================================================
  function insertBlock(container, data) {
    if (blockInserted) return;

    try {
      var old = container.parentNode && container.parentNode.querySelector
        ? container.parentNode.querySelector('#initdata_eproc_block')
        : null;
      if (old && old.parentNode) old.parentNode.removeChild(old);
    } catch (e) {}

    blockInserted = true;

    var info = extractInfo(data);

    var rawNumero         = info.numeroProcesso || '—';
    var rawUsuario        = info.usuario        || '—';
    var rawUnidade        = info.unidade        || '—';
    var rawUnidadeRelated = info.unidadeRelated || '—';

    var numero         = escapeHtml(rawNumero);
    var usuario        = escapeHtml(rawUsuario);
    var unidade        = escapeHtml(rawUnidade);
    var unidadeRelated = escapeHtml(rawUnidadeRelated);

    var commentIdCount = info.commentIdCount || 0;

    var rowStyle = 'display:flex; align-items:center; gap:6px;';
    var html =
      '<div class="field-container clearfix full-width" id="initdata_eproc_block">' +
        '<div class="label-container" style="width: 304px;">' +
          '<label><span class="label-text">Dados eProc</span></label>' +
        '</div>' +
        '<div class="control-container">' +
          '<div style="padding:8px; border:1px solid #ccc; border-radius:4px; font-size:14px; line-height:1.4;">' +

            '<div style="' + rowStyle + '">' +
              '<div><strong>Nº do processo:</strong> ' + numero + '</div>' +
              buildCopyButton(rawNumero) +
            '</div>' +

            '<div style="' + rowStyle + '">' +
              '<div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;"><strong>Usu\u00E1rio:</strong><span>' + usuario + '</span>' + buildCopyButton(rawUsuario) + '<span class="smax-eproc-user-tags" style="display:inline-flex; align-items:center; gap:6px;">' + buildUserTagsHtml(rawUsuario) + '</span></div>' +
            '</div>' +

            '<div style="' + rowStyle + '">' +
              '<div><strong>Unidade:</strong> ' + unidade + '</div>' +
              buildCopyButton(rawUnidade) +
            '</div>' +

            '<div style="' + rowStyle + '">' +
              '<div><strong>Lotação:</strong> ' + unidadeRelated + '</div>' +
              buildCopyButton(rawUnidadeRelated) +
            '</div>' +

            // >>>>> NOVO: linha de comentários (se CommentId > 1)
            (commentIdCount > 1
              ? (
                '<div style="margin-top:6px;">' +
                  '<strong>‼️Comentários:</strong> Existem comentários nas discussões.' +
                '</div>'
              )
              : ''
            ) +

          '</div>' +
        '</div>' +
      '</div>';

    try {
      container.insertAdjacentHTML('afterend', html);
      refreshUserTagsWithRetry(rawUsuario);
      ensureAutomatizadoresLoaded().then(function () {
        refreshUserTagsWithRetry(rawUsuario);
      });
      log('Bloco eproc inserido com sucesso.');
    } catch (e) {
      console.error(LOG, 'Erro ao inserir bloco eproc:', e);
    }
  }

  // ============================================================
  // 6) Esperar container e inserir
  // ============================================================
  function tryInsertBlock() {
    if (!capturedData || blockInserted) return;

    var tries = 0;
    var timer = setInterval(function () {
      tries++;

      var container = findContainerAnywhere();
      if (container) {
        clearInterval(timer);
        insertBlock(container, capturedData);
      } else if (tries >= MAX_TRIES) {
        clearInterval(timer);
        log('Não encontrei o container do Título para inserir o bloco.');
      }
    }, INTERVAL);
  }

  // ============================================================
  // 7) Init – hook de rede tem que ser IMEDIATO
  // ============================================================
  function init() {
    installCopyHandlerOnce();
    enableSpaRouteHooksOnce();
    ensureAutomatizadoresLoaded();
    log('Inicializado. Aguardando initData...');
    setTimeout(function () { hookIntoNewPage(); }, 0);
  }

  hookNetworkOnce();
  init();

})();



