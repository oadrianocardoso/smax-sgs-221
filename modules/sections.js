(function (root) {
  'use strict';

  const SMAX = root.SMAX = root.SMAX || {};
  const CONFIG = SMAX.config || {};
  const utils = SMAX.utils || {};
  const { debounce } = utils;

  const OFERTA_SELECTOR = '[aria-label*="Oferta de catálogo"], [data-aid="section-catalog-offering"]';
  const REMOVABLE_SELECTOR = [
    '[data-aid="section-hardware"]',
    '[data-aid="section-sccd"]',
    '[data-aid="section-related-piece"]',
    '[aria-label*="Peça Relacionada"]',
    '[aria-label*="Hardware"]',
    '[aria-label*="Informações SCCD"]'
  ].join(', ');

  const STYLE_ID = 'smax-sections-safe-style';
  const COLLAPSED_ATTR = 'data-smax-catalog-visually-collapsed';
  const HIDDEN_ATTR = 'data-smax-section-visually-hidden';

  let observer = null;
  let initialized = false;
  const userInteracted = new Set();

  function ensureStyles() {
    if (root.document.getElementById(STYLE_ID)) return;
    const style = root.document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      [${COLLAPSED_ATTR}="1"] .pl-entity-page-component-content {
        display: none !important;
      }
      [${COLLAPSED_ATTR}="1"] .pl-entity-page-component-header [pl-bidi-collapse-arrow] {
        transform: rotate(-90deg);
      }
      [${HIDDEN_ATTR}="1"] {
        display: none !important;
      }
    `;
    (root.document.head || root.document.documentElement).appendChild(style);
  }

  function requestIdFor(sectionEl) {
    return SMAX.discussionApi?.getCurrentRequestId?.(sectionEl)
      || root.document.querySelector('[data-aid="entity-page-header-id"]')?.textContent?.trim()
      || root.document.querySelector('[data-aid="minimized-header-entity-page-header-id"]')?.textContent?.trim()
      || 'request';
  }

  function sectionKey(sectionEl) {
    return `${requestIdFor(sectionEl)}:catalog-offering`;
  }

  function sectionFor(node) {
    return node?.closest?.('.form-section, .pl-entity-page-component') || node || null;
  }

  function isOfferingSection(sectionEl) {
    return !!sectionEl && (
      sectionEl.matches?.(OFERTA_SELECTOR)
      || !!sectionEl.querySelector?.(OFERTA_SELECTOR)
    );
  }

  function markOfferingCollapsed(sectionEl) {
    if (!sectionEl || userInteracted.has(sectionKey(sectionEl))) {
      sectionEl?.removeAttribute?.(COLLAPSED_ATTR);
      return;
    }

    const header = sectionEl.querySelector?.('.pl-entity-page-component-header[role="button"]');
    const content = sectionEl.querySelector?.('.pl-entity-page-component-content');
    if (!header || !content) return;

    // Se o SMAX já recolheu a seção, não criamos um segundo estado visual.
    if (header.getAttribute('aria-expanded') === 'false' || content.classList.contains('ng-hide')) return;
    sectionEl.setAttribute(COLLAPSED_ATTR, '1');
  }

  function collapseOfertaCatalogo() {
    root.document.querySelectorAll(OFERTA_SELECTOR).forEach(node => {
      markOfferingCollapsed(sectionFor(node));
    });
  }

  function hideConfiguredSections() {
    root.document.querySelectorAll(REMOVABLE_SELECTOR).forEach(node => {
      sectionFor(node)?.setAttribute?.(HIDDEN_ATTR, '1');
    });
  }

  function applyAll() {
    ensureStyles();
    collapseOfertaCatalogo();
    hideConfiguredSections();
  }

  function expandVisualSection(event, sectionEl) {
    userInteracted.add(sectionKey(sectionEl));

    if (sectionEl.getAttribute(COLLAPSED_ATTR) !== '1') return;

    // O estado nativo continua aberto. Cancelar somente esta primeira ativação
    // revela o conteúdo sem acionar Angular, Select2 ou qualquer outro componente.
    event.preventDefault();
    event.stopImmediatePropagation();
    sectionEl.removeAttribute(COLLAPSED_ATTR);
  }

  function mutationTouchesManagedSection(mutation) {
    return Array.from(mutation.addedNodes || []).some(node => {
      if (node.nodeType !== 1) return false;
      if (node.matches?.('#smax-discussion-advisor') || node.closest?.('#smax-discussion-advisor')) return false;
      return node.matches?.(OFERTA_SELECTOR)
        || node.matches?.(REMOVABLE_SELECTOR)
        || !!node.querySelector?.(OFERTA_SELECTOR)
        || !!node.querySelector?.(REMOVABLE_SELECTOR);
    });
  }

  function init() {
    if (initialized || !CONFIG.prefs?.collapseOn) return;
    initialized = true;

    const doc = root.document;
    ensureStyles();

    doc.addEventListener('click', event => {
      if (!event.isTrusted) return;
      const header = event.target.closest?.('.pl-entity-page-component-header[role="button"]');
      if (!header) return;
      const sectionEl = sectionFor(header);
      if (isOfferingSection(sectionEl)) expandVisualSection(event, sectionEl);
    }, { capture: true });

    doc.addEventListener('keydown', event => {
      if (!event.isTrusted || (event.key !== 'Enter' && event.key !== ' ')) return;
      const header = event.target.closest?.('.pl-entity-page-component-header[role="button"]');
      if (!header) return;
      const sectionEl = sectionFor(header);
      if (isOfferingSection(sectionEl)) expandVisualSection(event, sectionEl);
    }, { capture: true });

    const schedule = debounce ? debounce(applyAll, 100) : applyAll;
    observer = new MutationObserver(mutations => {
      if (mutations.some(mutationTouchesManagedSection)) schedule();
    });

    root.setTimeout(applyAll, 300);
    root.setTimeout(applyAll, 900);
    observer.observe(doc.body, { childList: true, subtree: true });

    root.addEventListener('beforeunload', () => {
      observer?.disconnect();
      observer = null;
    }, { once: true });
  }

  SMAX.sections = { init };

})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
