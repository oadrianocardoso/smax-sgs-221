(function (root) {
  'use strict';

  const SMAX   = root.SMAX = root.SMAX || {};
  const CONFIG = SMAX.config || {};
  const prefs  = CONFIG.prefs || {};
  const utils  = SMAX.utils || {};
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

  let observer = null;
  let initialized = false;
  const userInteracted = new Set();
  const retryTimers = new WeakMap();

  function requestIdFor(sectionEl) {
    return SMAX.discussionApi?.getCurrentRequestId?.(sectionEl)
      || root.document.querySelector('[data-aid="entity-page-header-id"]')?.textContent?.trim()
      || 'request';
  }

  function sectionKey(sectionEl) {
    return `${requestIdFor(sectionEl)}:catalog-offering`;
  }

  function sectionScope(sectionEl) {
    try {
      const angular = root.angular;
      if (!angular?.element) return null;
      const wrapped = angular.element(sectionEl);
      return wrapped.scope?.() || wrapped.inheritedData?.('$scope') || null;
    } catch (e) {
      return null;
    }
  }

  function collapseUsingAngularState(sectionEl) {
    if (!sectionEl || userInteracted.has(sectionKey(sectionEl))) return true;

    const scope = sectionScope(sectionEl);
    const section = scope?.section;
    if (!scope || !section) return false;

    const collapse = () => {
      if (userInteracted.has(sectionKey(sectionEl))) return;
      if (section.isOpen !== false && typeof scope.toggleSectionState === 'function') {
        scope.toggleSectionState(section, scope.$index);
      }
      section.isOpen = false;
      const state = scope.sectionsState && section.name
        ? scope.sectionsState[section.name]
        : null;
      if (state && typeof state === 'object') state.isOpen = false;
      sectionEl.setAttribute('data-smax-section-collapsed', '1');
    };

    try {
      if (scope.$root?.$$phase) collapse();
      else if (typeof scope.$evalAsync === 'function') scope.$evalAsync(collapse);
      else collapse();
      return true;
    } catch (error) {
      console.warn('[SMAX Sections] Não foi possível recolher a seção pelo estado do Angular:', error);
      return false;
    }
  }

  function scheduleStateRetry(sectionEl) {
    if (!sectionEl?.isConnected || retryTimers.has(sectionEl)) return;
    let attempt = 0;
    const delays = [80, 180, 400, 800];

    const retry = () => {
      if (!sectionEl.isConnected || userInteracted.has(sectionKey(sectionEl))) {
        retryTimers.delete(sectionEl);
        return;
      }
      if (collapseUsingAngularState(sectionEl) || attempt >= delays.length) {
        retryTimers.delete(sectionEl);
        return;
      }
      const timer = root.setTimeout(retry, delays[attempt]);
      attempt += 1;
      retryTimers.set(sectionEl, timer);
    };

    retry();
  }

  function collapseOfertaCatalogo() {
    root.document.querySelectorAll(OFERTA_SELECTOR).forEach(node => {
      const sectionEl = node.closest('.form-section, .pl-entity-page-component') || node;
      scheduleStateRetry(sectionEl);
    });
  }

  function removeConfiguredSections() {
    root.document.querySelectorAll(REMOVABLE_SELECTOR).forEach(node => {
      const wrapper = node.closest('.form-section, .pl-entity-page-component') || node;
      if (wrapper?.parentNode) wrapper.parentNode.removeChild(wrapper);
    });
  }

  function applyAll() {
    collapseOfertaCatalogo();
    removeConfiguredSections();
  }

  function mutationTouchesManagedSection(mutation) {
    const target = mutation.target?.nodeType === 1
      ? mutation.target
      : mutation.target?.parentElement;
    if (target?.closest?.('#smax-discussion-advisor')) return false;
    if (target?.closest?.(OFERTA_SELECTOR)) return true;

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
    if (initialized || !prefs.collapseOn) return;
    initialized = true;

    const doc = root.document;
    doc.addEventListener('click', event => {
      if (!event.isTrusted) return;
      const header = event.target.closest?.('.pl-entity-page-component-header[role="button"]');
      if (!header) return;
      const sectionEl = header.closest('.form-section, .pl-entity-page-component');
      if (!sectionEl?.matches?.(OFERTA_SELECTOR) && !sectionEl?.querySelector?.(OFERTA_SELECTOR)) return;
      userInteracted.add(sectionKey(sectionEl));
      sectionEl.setAttribute('data-smax-section-user-interacted', '1');
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
