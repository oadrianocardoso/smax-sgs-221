(function () {
  'use strict';

  var LOG        = '[SMAX] Módulo Dados eProc carregado';
  var MAX_TRIES  = 40;
  var INTERVAL   = 500;

  var capturedData  = null;
  var blockInserted = false;

  function log() {
    try {
      console.log.apply(console, [LOG].concat([].slice.call(arguments)));
    } catch (e) {}
  }

  // ============================================================
  // 0) Copiar para clipboard + handler dos botões
  // ============================================================
  function copiarTexto(texto) {
    texto = (texto == null) ? '' : String(texto);

    if (navigator.clipboard && window.isSecureContext) {
      try { return navigator.clipboard.writeText(texto); } catch (e) {}
    }

    // fallback
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

        // feedback leve (sem mexer no layout)
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

  // Para colocar o texto cru em atributo HTML com segurança
  function escapeAttr(str) {
    return escapeHtml(str).replace(/`/g, '&#96;');
  }

  // Botão idêntico ao que você colou (mesmas classes/SVG), com data-copy
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
  // 1) MutationObserver – detecta troca de tela no SMAX (SPA)
  // ============================================================
  function enableAutoReload() {
    var lastUrl = location.href;

    try {
      var observer = new MutationObserver(function () {
        if (location.href !== lastUrl) {
          lastUrl = location.href;
          blockInserted = false;
          capturedData  = null;
          log('Mudança de tela detectada → reiniciando lógica do bloco');

          // dá um tempo pro SMAX montar a tela
          setTimeout(function () {
            hookIntoNewPage();
          }, 700);
        }
      });

      observer.observe(document, { childList: true, subtree: true });
    } catch (e) {
      console.error(LOG, 'Erro ao configurar MutationObserver:', e);
    }
  }

  function hookIntoNewPage() {
    // Se já tivermos JSON capturado (por navegação interna + XHR reaproveitado),
    // tenta inserir o bloco de novo
    if (capturedData && !blockInserted) {
      tryInsertBlock();
    }
  }

  // ============================================================
  // 2) Intercepta a chamada initializationDataByLayout/Request
  // ============================================================
  (function hookXHR() {
    var origOpen = XMLHttpRequest.prototype.open;
    var origSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url) {
      this._url = url;
      return origOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function (body) {
      try {
        var url = this._url || '';

        var isInitData =
          url.indexOf('/rest/213963628/entity-page/initializationDataByLayout/Request/') !== -1 &&
          url.indexOf('layout=FORM_LAYOUT.withoutResolution,FORM_LAYOUT.onlyResolution') !== -1;

        if (isInitData) {
          log('Requisição initializationDataByLayout detectada:', url);

          var xhr = this;
          xhr.addEventListener('load', function () {
            try {
              if (xhr.status === 200) {
                capturedData  = JSON.parse(xhr.responseText);
                blockInserted = false;
                log('JSON capturado. Tentando inserir bloco...');
                tryInsertBlock();
              } else {
                log('Status != 200 na initializationDataByLayout:', xhr.status);
              }
            } catch (e) {
              console.error(LOG, 'Erro ao processar resposta initializationDataByLayout:', e);
            }
          });
        }
      } catch (e) {
        console.error(LOG, 'Erro ao inspecionar XHR:', e);
      }

      return origSend.apply(this, arguments);
    };
  })();

  // ============================================================
  // 3) Encontrar o container do campo "Título"
  // ============================================================
  function findContainerInDoc(doc) {
    if (!doc) return null;

    // Tenta pelo ID padrão do container
    var byId = doc.getElementById('withoutResolution_DisplayLabel_container');
    if (byId) return byId;

    // Fallback: procura o input e sobe até o .field-container
    try {
      var input = doc.querySelector('input[data-aid="withoutResolution_DisplayLabel"]');
      if (input && input.closest) {
        return input.closest('.field-container');
      }
    } catch (e) {}

    return null;
  }

  function findContainerAnywhere() {
    // Documento principal
    var c = findContainerInDoc(document);
    if (c) return c;

    // Procura em iframes (SMAX usa bastante)
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
  // 4) Extrair dados do JSON
  // ============================================================
  function extractInfo(data) {
    if (!data || !data.EntityData) {
      return {};
    }

    var props   = data.EntityData.properties         || {};
    var related = data.EntityData.related_properties || {};

    // ----- Número do processo + usuário dos UserOptions -----
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
          if (complex.NumerodoProcesso_c) {
            numeroProcesso = complex.NumerodoProcesso_c;
          }
          if (complex.Usuario_c) {
            usuarioDoCampo = complex.Usuario_c;
          }
        }
      }
    } catch (e) {
      console.error(LOG, 'Erro ao parsear UserOptions:', e);
    }

    // ----- Usuário "oficial" -----
    var usuario = '';

    if (related.RequestedForPerson && related.RequestedForPerson.Name) {
      usuario = related.RequestedForPerson.Name;
    } else if (related.RequestedByPerson && related.RequestedByPerson.Name) {
      usuario = related.RequestedByPerson.Name;
    } else if (usuarioDoCampo) {
      usuario = usuarioDoCampo;
    }

    // ----- Unidade vinda do related_properties -----
    var unidadeRelated = '';
    if (related.RegisteredForLocation) {
      var rl = related.RegisteredForLocation;
      unidadeRelated =
        rl.DisplayName ||
        rl.DisplayLabel ||
        rl.Name ||
        '';
    }

    // ----- PredioLot_c (lotação) -----
    var unidadePredio = '';
    if (props.PredioLot_c) {
      unidadePredio = props.PredioLot_c;
    }

    // Regra final: se PredioLot existir, usamos como "unidade principal"
    var unidadeFinal = unidadePredio || unidadeRelated || '';

    return {
      numeroProcesso: numeroProcesso,
      usuario:        usuario,
      unidade:        unidadeFinal,   // principal
      unidadeRelated: unidadeRelated, // do RegisteredForLocation
      unidadePredio:  unidadePredio   // do PredioLot_c
    };
  }

  // ============================================================
  // 5) Montar e inserir o bloco abaixo do Título
  // ============================================================
  function insertBlock(container, data) {
    if (blockInserted) return;

    // remove bloco anterior se existir (caso SPA tenha reaproveitado DOM)
    try {
      var old = container.parentNode && container.parentNode.querySelector
        ? container.parentNode.querySelector('#initdata_eproc_block')
        : null;
      if (old && old.parentNode) old.parentNode.removeChild(old);
    } catch (e) {}

    blockInserted = true;

    var info = extractInfo(data);

    // valores crus (pra copiar)
    var rawNumero        = info.numeroProcesso || '—';
    var rawUsuario       = info.usuario        || '—';
    var rawUnidade       = info.unidade        || '—';
    var rawUnidadeRelated= info.unidadeRelated || '—';

    // valores escapados (pra exibir)
    var numero        = escapeHtml(rawNumero);
    var usuario       = escapeHtml(rawUsuario);
    var unidade       = escapeHtml(rawUnidade);
    var unidadeRelated= escapeHtml(rawUnidadeRelated);

    var rowStyle = 'display:flex; align-items:center; gap:6px;';
    var html =
      '<div class="field-container clearfix full-width" id="initdata_eproc_block">' +
        '<div class="label-container" style="width: 304px;">' +
          '<label>' +
            '<span class="label-text">Dados eProc</span>' +
          '</label>' +
        '</div>' +
        '<div class="control-container">' +
          '<div style="padding:8px; border:1px solid #ccc; border-radius:4px; font-size:14px; line-height:1.4;">' +

            '<div style="' + rowStyle + '">' +
              '<div><strong>Nº do processo:</strong> ' + numero + '</div>' +
              buildCopyButton(rawNumero) +
            '</div>' +

            '<div style="' + rowStyle + '">' +
              '<div><strong>Usuário:</strong> ' + usuario + '</div>' +
              buildCopyButton(rawUsuario) +
            '</div>' +

            '<div style="' + rowStyle + '">' +
              '<div><strong>Unidade:</strong> ' + unidade + '</div>' +
              buildCopyButton(rawUnidade) +
            '</div>' +

            '<div style="' + rowStyle + '">' +
              '<div><strong>Lotação:</strong> ' + unidadeRelated + '</div>' +
              buildCopyButton(rawUnidadeRelated) +
            '</div>' +

          '</div>' +
        '</div>' +
      '</div>';

    try {
      container.insertAdjacentHTML('afterend', html);
      log('Bloco eproc inserido com sucesso.');
    } catch (e) {
      console.error(LOG, 'Erro ao inserir bloco eproc:', e);
    }
  }

  // ============================================================
  // 6) Esperar ter JSON + container e então inserir
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
  // 7) Inicialização
  // ============================================================
  function init() {
    log('Script carregado. Aguardando initializationDataByLayout...');
    installCopyHandlerOnce();
    enableAutoReload(); // já liga o observer pra navegação interna
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }

})();