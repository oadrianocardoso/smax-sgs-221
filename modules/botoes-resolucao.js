// ==UserScript==
// @name         SMAX - Topo CloseTime completo (Picker + Salvar + Lifecycle)
// @namespace    https://github.com/oadrianocardoso
// @version      3.0
// @description  Adiciona topo funcional no CloseTime: EntityPicker (read-only), Salvar, Salvar e fechar e Lifecycle com menu próprio. Robusto contra Angular re-render.
// @author       ADRIANO / ChatGPT
// @match        https://suporte.tjsp.jus.br/saw/*
// @run-at       document-idle
// @grant        GM_addStyle
// ==/UserScript==

(function () {
  'use strict';

  /* ================= CONFIG ================= */

  const TARGET_SELECTOR = '#onlyResolution_CloseTime_container';

  const ORIG_SAVE_SELECTOR =
    'button[data-aid="tool-bar-btn-save"].tool-bar-btn-save';

  const ORIG_SAVE_CLOSE_SELECTOR =
    'button[data-aid="tool-bar-btn-save-and-close"].tool-bar-btn-save-and-close';

  const ORIG_LIFECYCLE_SELECTOR =
    'div.pl-lifecycle-overview[data-aid="lifecycle-overview"] ' +
    'div.overview-buttons-container:not(.tmx-clone-lifecycle)';

  const ORIG_ENTITY_PICKER_SELECTOR =
    '.entity-picker-input-wrapper';

  /* ================= CLASSES ================= */

  const CLS_WRAP      = 'tmx-top-actions';
  const CLS_PICKER    = 'tmx-clone-entity-picker';
  const CLS_SAVE      = 'tmx-clone-save';
  const CLS_SAVECL    = 'tmx-clone-save-close';
  const CLS_LC        = 'tmx-clone-lifecycle';
  const CLS_MENU      = 'tmx-lifecycle-menu';
  const CLS_MENU_ITEM = 'tmx-lifecycle-menu-item';

  const ATTR_BOUND = 'data-tmx-bound';

  /* ================= HELPERS ================= */

  function removeIds(root) {
    root.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
  }

  function clickLikeUser(el) {
    if (!el || el.disabled) return;
    try {
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    } catch {
      el.click();
    }
  }

  function ensureWrapper(dst) {
    let wrap = dst.querySelector('.' + CLS_WRAP);
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = CLS_WRAP;
      dst.prepend(wrap);
    }
    return wrap;
  }

  function ensureAfter(parent, anchor, node) {
    if (!node) return;
    if (!anchor) parent.appendChild(node);
    else if (anchor.nextSibling !== node)
      parent.insertBefore(node, anchor.nextSibling);
  }

  /* ================= ENTITY PICKER ================= */

  function ensureEntityPickerClone(wrap) {
    let existing = wrap.querySelector('.' + CLS_PICKER);
    if (existing) return existing;

    let src = document.querySelector(ORIG_ENTITY_PICKER_SELECTOR);
    if (!src) return null;

    let clone = src.cloneNode(true);
    clone.classList.add(CLS_PICKER);
    removeIds(clone);

    clone.style.pointerEvents = 'none';
    clone.style.opacity = '0.95';

    wrap.appendChild(clone);
    return clone;
  }

  /* ================= SAVE BUTTONS ================= */

  function ensureButtonClone(wrap, selector, cls) {
    let existing = wrap.querySelector('.' + cls);
    if (existing) return existing;

    let src = document.querySelector(selector);
    if (!src) return null;

    let clone = src.cloneNode(true);
    clone.classList.add(cls);
    removeIds(clone);
    clone.style.display = 'inline-flex';

    clone.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      clickLikeUser(document.querySelector(selector));
    }, true);

    wrap.appendChild(clone);
    return clone;
  }

  /* ================= LIFECYCLE MENU ================= */

  function getLifecycleBox() {
    return document.querySelector(ORIG_LIFECYCLE_SELECTOR);
  }

  function getLifecycleOptions() {
    let box = getLifecycleBox();
    if (!box) return [];

    let opts = [];

    box.querySelectorAll('[target-phase-id]').forEach(el => {
      let label = el.textContent.trim();
      let phaseId = el.getAttribute('target-phase-id');
      if (!phaseId || !label) return;
      if (!opts.find(o => o.phaseId === phaseId))
        opts.push({ phaseId, label });
    });

    return opts;
  }

  function ensureLifecycleClone(wrap) {
    let existing = wrap.querySelector('.' + CLS_LC);
    if (existing) return existing;

    let src = getLifecycleBox();
    if (!src) return null;

    let clone = src.cloneNode(true);
    clone.classList.add(CLS_LC);
    removeIds(clone);

    clone.querySelectorAll('ul.dropdown-menu').forEach(ul => ul.remove());

    clone.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      showLifecycleMenu(clone);
    }, true);

    wrap.appendChild(clone);
    return clone;
  }

  function showLifecycleMenu(anchor) {
    let menu = document.querySelector('.' + CLS_MENU);
    if (!menu) {
      menu = document.createElement('div');
      menu.className = CLS_MENU;
      document.body.appendChild(menu);
    }

    menu.innerHTML = '';
    getLifecycleOptions().forEach(opt => {
      let item = document.createElement('div');
      item.className = CLS_MENU_ITEM;
      item.textContent = opt.label;
      item.onclick = () => clickLikeUser(
        getLifecycleBox().querySelector('[target-phase-id="' + opt.phaseId + '"]')
      );
      menu.appendChild(item);
    });

    let r = anchor.getBoundingClientRect();
    menu.style.left = (r.left + window.scrollX) + 'px';
    menu.style.top  = (r.bottom + window.scrollY + 4) + 'px';
    menu.style.display = 'block';
  }

  document.addEventListener('mousedown', e => {
    let menu = document.querySelector('.' + CLS_MENU);
    if (menu && !menu.contains(e.target)) menu.style.display = 'none';
  });

  /* ================= CSS ================= */

  GM_addStyle(`
    #onlyResolution_CloseTime_label { display: none !important; }

    .${CLS_WRAP} {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      overflow-x: auto;
      white-space: nowrap;
    }

    .${CLS_PICKER} { max-width: 320px; }

    .${CLS_MENU} {
      position: absolute;
      z-index: 999999;
      background: #fff;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-shadow: 0 6px 16px rgba(0,0,0,.15);
    }

    .${CLS_MENU_ITEM} {
      padding: 8px 12px;
      cursor: pointer;
    }

    .${CLS_MENU_ITEM}:hover {
      background: #f3f6fb;
    }
  `);

  /* ================= LOOP ================= */

  function tick() {
    let dst = document.querySelector(TARGET_SELECTOR);
    if (!dst) return;

    let wrap = ensureWrapper(dst);

    let cPicker = ensureEntityPickerClone(wrap);
    let cSave   = ensureButtonClone(wrap, ORIG_SAVE_SELECTOR, CLS_SAVE);
    let cSaveCl = ensureButtonClone(wrap, ORIG_SAVE_CLOSE_SELECTOR, CLS_SAVECL);
    let cLC     = ensureLifecycleClone(wrap);

    ensureAfter(wrap, null, cPicker);
    ensureAfter(wrap, cPicker, cSave);
    ensureAfter(wrap, cSave, cSaveCl);
    ensureAfter(wrap, cSaveCl, cLC);
  }

  tick();
  setInterval(tick, 1500);
})();
