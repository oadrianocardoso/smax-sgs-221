(function () {
  'use strict';

  var LOG = '[TMX-CLOSETIME-MENU-ROBUST]';

  // ====== ORIGINAIS ======
  var ORIG_SAVE_SELECTOR =
    'button[data-aid="tool-bar-btn-save"].tool-bar-btn-save';

  var ORIG_SAVE_CLOSE_SELECTOR =
    'button[data-aid="tool-bar-btn-save-and-close"].tool-bar-btn-save-and-close';

  // Em alguns estados o lifecycle muda classes (minimized/regular),
  // então buscamos pela visão do lifecycle e pegamos QUALQUER overview-buttons-container dentro dela,
  // EXCLUINDO clones.
  var ORIG_LIFECYCLE_BOX_SELECTOR =
    'div.pl-lifecycle-overview[data-aid="lifecycle-overview"] ' +
    'div.overview-buttons-container:not(.tmx-clone-lifecycle)';

  // ====== DESTINO ======
  var TARGET_SELECTOR = '#onlyResolution_CloseTime_container';

  // ====== CLASSES ======
  var CLS_WRAP      = 'tmx-top-actions';
  var CLS_SAVE      = 'tmx-clone-save';
  var CLS_SAVECL    = 'tmx-clone-save-close';
  var CLS_LC        = 'tmx-clone-lifecycle';
  var CLS_MENU      = 'tmx-lc-menu';
  var CLS_MENU_ITEM = 'tmx-lc-menu-item';
  var ATTR_BOUND    = 'data-tmx-bound';

  function log() {
    try { console.log.apply(console, [LOG].concat([].slice.call(arguments))); } catch (e) {}
  }

  function removeIds(root) {
    var els = root.querySelectorAll('[id]');
    for (var i = 0; i < els.length; i++) els[i].removeAttribute('id');
  }

  function ensureWrapper(dst) {
    var wrap = dst.querySelector('.' + CLS_WRAP);
    if (wrap) return wrap;

    wrap = document.createElement('div');
    wrap.className = CLS_WRAP;
    dst.insertBefore(wrap, dst.firstChild || null);
    return wrap;
  }

  function ensureFirst(dst, node) {
    if (dst.firstChild !== node) dst.insertBefore(node, dst.firstChild || null);
  }

  function ensureAfter(parent, anchor, node) {
    if (!parent || !node) return;
    if (node.parentNode !== parent) parent.appendChild(node);
    if (anchor && anchor.parentNode === parent && anchor.nextSibling !== node) {
      parent.insertBefore(node, anchor.nextSibling);
    }
  }

  function clickLikeUser(el) {
    if (!el || el.disabled) return false;
    try {
      var ev = document.createEvent('MouseEvents');
      ev.initMouseEvent('click', true, true, window, 1);
      el.dispatchEvent(ev);
      return true;
    } catch (e) {
      try { el.click(); return true; } catch (e2) {}
    }
    return false;
  }

  function syncDisabledState(cloneBtn, origBtn) {
    if (!cloneBtn || !origBtn) return;

    var disabled = !!origBtn.disabled ||
      origBtn.classList.contains('disabled') ||
      origBtn.classList.contains('plToolbarItemDisabled') ||
      origBtn.getAttribute('aria-disabled') === 'true';

    if (disabled) {
      cloneBtn.setAttribute('disabled', 'disabled');
      cloneBtn.setAttribute('aria-disabled', 'true');
      cloneBtn.classList.add('disabled');
      cloneBtn.classList.add('plToolbarItemDisabled');
    } else {
      cloneBtn.removeAttribute('disabled');
      cloneBtn.setAttribute('aria-disabled', 'false');
      cloneBtn.classList.remove('disabled');
      cloneBtn.classList.remove('plToolbarItemDisabled');
    }
  }

  // ====== localizar lifecycle original (mesmo escondido) ======
  function getOrigLifecycleBox() {
    // querySelector acha mesmo com ng-hide (continua no DOM)
    var box = document.querySelector(ORIG_LIFECYCLE_BOX_SELECTOR);
    return box || null;
  }

  // ====== CLONES ======
  function ensureSaveClone(wrap) {
    var existing = wrap.querySelector('.' + CLS_SAVE);
    if (existing) return existing;

    var src = document.querySelector(ORIG_SAVE_SELECTOR);
    if (!src) return null;

    var clone = src.cloneNode(true);
    clone.classList.add(CLS_SAVE);
    removeIds(clone);
    clone.style.display = 'inline-flex';
    clone.style.alignItems = 'center';
    wrap.appendChild(clone);
    return clone;
  }

  function ensureSaveCloseClone(wrap) {
    var existing = wrap.querySelector('.' + CLS_SAVECL);
    if (existing) return existing;

    var src = document.querySelector(ORIG_SAVE_CLOSE_SELECTOR);
    if (!src) return null;

    var clone = src.cloneNode(true);
    clone.classList.add(CLS_SAVECL);
    removeIds(clone);
    clone.style.display = 'inline-flex';
    clone.style.alignItems = 'center';
    wrap.appendChild(clone);
    return clone;
  }

  function ensureLifecycleClone(wrap) {
    var existing = wrap.querySelector('.' + CLS_LC);
    if (existing) return existing;

    var src = getOrigLifecycleBox();
    if (!src) return null;

    var clone = src.cloneNode(true);
    clone.classList.add(CLS_LC);
    removeIds(clone);
    clone.style.display = 'inline-flex';
    clone.style.alignItems = 'center';

    // esconda menus bootstrap clonados (usaremos menu próprio)
    var ul = clone.querySelector('ul.dropdown-menu');
    if (ul) ul.style.display = 'none';

    wrap.appendChild(clone);
    return clone;
  }

  // ====== PROXY (Salvar / Salvar e fechar) ======
  function bindButtonProxy(cloneBtn, origSelector) {
    if (!cloneBtn) return;
    if (cloneBtn.getAttribute(ATTR_BOUND) === '1') return;
    cloneBtn.setAttribute(ATTR_BOUND, '1');

    cloneBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();

      var orig = document.querySelector(origSelector);
      if (!orig || orig.disabled) return;
      clickLikeUser(orig);
    }, true);
  }

  // ====== MENU PRÓPRIO (LIFECYCLE) ======
  function ensureMenuElement() {
    var menu = document.querySelector('.' + CLS_MENU);
    if (menu) return menu;

    menu = document.createElement('div');
    menu.className = CLS_MENU;
    menu.style.display = 'none';
    menu.setAttribute('data-open', '0');
    document.body.appendChild(menu);
    return menu;
  }

  function hideMenu(menu) {
    if (!menu) return;
    menu.style.display = 'none';
    menu.setAttribute('data-open', '0');
  }

  function showMenu(menu, anchorEl) {
    if (!menu || !anchorEl) return;
    var r = anchorEl.getBoundingClientRect();
    menu.style.left = (r.left + window.scrollX) + 'px';
    menu.style.top  = (r.bottom + window.scrollY + 4) + 'px';
    menu.style.display = 'block';
    menu.setAttribute('data-open', '1');
  }

  function buildMenu(menu, options) {
    menu.innerHTML = '';
    for (var i = 0; i < options.length; i++) {
      var opt = options[i];
      var item = document.createElement('div');
      item.className = CLS_MENU_ITEM + (opt.disabled ? ' tmx-disabled' : '');
      item.setAttribute('data-phase-id', opt.phaseId);
      item.textContent = opt.label;
      menu.appendChild(item);
    }
  }

  function getLifecycleOptionsFromOriginal() {
    var origBox = getOrigLifecycleBox();
    if (!origBox) return [];

    var opts = [];

    // botão principal
    var mainBtn = origBox.querySelector('button[target-phase-id]');
    if (mainBtn) {
      opts.push({
        phaseId: mainBtn.getAttribute('target-phase-id') || '',
        label: (mainBtn.textContent || '').replace(/\s+/g, ' ').trim(),
        disabled: !!mainBtn.disabled || mainBtn.classList.contains('disabled-action'),
        isMain: true
      });
    }

    // itens do dropdown (quando existe no DOM)
    var items = origBox.querySelectorAll('ul.dropdown-menu a[target-phase-id]');
    for (var i = 0; i < items.length; i++) {
      var a = items[i];
      var phaseId = a.getAttribute('target-phase-id') || '';
      var label = (a.textContent || '').replace(/\s+/g, ' ').trim();
      if (!phaseId || !label) continue;

      var disabled = a.classList.contains('disabled-action') || a.classList.contains('disabled');

      // evita duplicar
      var dup = false;
      for (var j = 0; j < opts.length; j++) {
        if (opts[j].phaseId === phaseId && opts[j].label === label) { dup = true; break; }
      }
      if (!dup) opts.push({ phaseId: phaseId, label: label, disabled: disabled, isMain: false });
    }

    return opts;
  }

  function clickOriginalLifecyclePhase(phaseId) {
    var origBox = getOrigLifecycleBox();
    if (!origBox) return false;

    var el = origBox.querySelector('[target-phase-id="' + phaseId + '"]');
    if (!el) return false;
    if (el.disabled || el.classList.contains('disabled-action')) return false;

    return clickLikeUser(el);
  }

  function bindLifecycleMenu(lifecycleClone) {
    if (!lifecycleClone) return;
    if (lifecycleClone.getAttribute(ATTR_BOUND) === '1') return;
    lifecycleClone.setAttribute(ATTR_BOUND, '1');

    var menu = ensureMenuElement();

    function refreshAndOpen(anchor) {
      var opts = getLifecycleOptionsFromOriginal();
      if (!opts.length) return;

      buildMenu(menu, opts);
      showMenu(menu, anchor);
    }

    // setinha do clone (abre menu próprio)
    lifecycleClone.addEventListener('click', function (e) {
      var t = e.target;

      // impede bootstrap/Angular do clone
      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();

      var toggle = (t && t.closest) ? t.closest('button[data-aid="dropdown-toggle"]') : null;
      if (toggle) {
        if (menu.getAttribute('data-open') === '1') hideMenu(menu);
        else refreshAndOpen(toggle);
        return;
      }

      // clique no botão principal -> dispara a ação principal do original
      var opts = getLifecycleOptionsFromOriginal();
      if (!opts.length) return;

      if (!opts[0].disabled) clickOriginalLifecyclePhase(opts[0].phaseId);
      hideMenu(menu);
    }, true);

    // clique em itens do menu próprio
    menu.addEventListener('click', function (e) {
      var item = e.target;
      if (!item || !item.classList || !item.classList.contains(CLS_MENU_ITEM)) return;

      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();

      if (item.classList.contains('tmx-disabled')) return;

      var phaseId = item.getAttribute('data-phase-id');
      if (phaseId) clickOriginalLifecyclePhase(phaseId);

      hideMenu(menu);
    }, true);

    // clique fora fecha
    document.addEventListener('mousedown', function (e) {
      if (menu.getAttribute('data-open') !== '1') return;
      if (menu.contains(e.target)) return;
      hideMenu(menu);
    }, true);

    // ESC fecha
    document.addEventListener('keydown', function (e) {
      if (menu.getAttribute('data-open') !== '1') return;
      var key = e.key || e.keyCode;
      if (key === 'Escape' || key === 27) hideMenu(menu);
    }, true);

    log('Lifecycle menu próprio ligado (robusto p/ hidden).');
  }

  // ====== CSS ======
    GM_addStyle([
        TARGET_SELECTOR + ' .' + CLS_WRAP + ' {',
        '  display: flex;',
        '  flex-wrap: nowrap;',
        '  align-items: center;',
        '  gap: 8px;',
        '  margin-bottom: 8px;',
        '  overflow-x: auto;',
        '}',

        TARGET_SELECTOR + ' .' + CLS_WRAP + ' > * { white-space: nowrap; }',

        TARGET_SELECTOR + ' .' + CLS_LC + ' {',
        '  display: inline-flex !important;',
        '  align-items: center;',
        '  margin: 0 !important;',
        '}',

        /* ===== OCULTAR LABEL "Hora de fechamento" ===== */
        '#onlyResolution_CloseTime_label {',
        '  display: none !important;',
        '}',

        /* ===== MENU PRÓPRIO DO LIFECYCLE ===== */
        '.' + CLS_MENU + ' {',
        '  position: absolute;',
        '  z-index: 999999;',
        '  min-width: 180px;',
        '  background: #fff;',
        '  border: 1px solid #cfcfcf;',
        '  border-radius: 4px;',
        '  box-shadow: 0 6px 16px rgba(0,0,0,.15);',
        '  padding: 6px 0;',
        '}',

        '.' + CLS_MENU_ITEM + ' {',
        '  padding: 8px 12px;',
        '  cursor: pointer;',
        '  font-size: 13px;',
        '}',

        '.' + CLS_MENU_ITEM + ':hover { background: #f3f6fb; }',

        '.' + CLS_MENU_ITEM + '.tmx-disabled {',
        '  opacity: .45;',
        '  cursor: not-allowed;',
        '}'
    ].join('\n'));


  // ====== LOOP PERSISTENTE ======
  function tick() {
    var dst = document.querySelector(TARGET_SELECTOR);
    if (!dst) return;

    var wrap = ensureWrapper(dst);
    ensureFirst(dst, wrap);

    var cSave = ensureSaveClone(wrap);
    var cSaveClose = ensureSaveCloseClone(wrap);
    var cLC = ensureLifecycleClone(wrap);

    // ordem
    if (cSave) ensureAfter(wrap, null, cSave);
    if (cSaveClose) ensureAfter(wrap, cSave, cSaveClose);
    if (cLC) ensureAfter(wrap, cSaveClose || cSave, cLC);

    // proxy save
    bindButtonProxy(cSave, ORIG_SAVE_SELECTOR);
    bindButtonProxy(cSaveClose, ORIG_SAVE_CLOSE_SELECTOR);

    // lifecycle menu próprio
    bindLifecycleMenu(cLC);

    // disabled sync
    syncDisabledState(cSave, document.querySelector(ORIG_SAVE_SELECTOR));
    syncDisabledState(cSaveClose, document.querySelector(ORIG_SAVE_CLOSE_SELECTOR));
  }

  tick();
  setTimeout(tick, 300);
  setTimeout(tick, 900);
  setInterval(tick, 1500);

  log('Ativo: robusto p/ lifecycle hidden/minimized.');
})();