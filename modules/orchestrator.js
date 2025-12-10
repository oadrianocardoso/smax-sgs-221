(function (root) {
  'use strict';

  const SMAX  = root.SMAX = root.SMAX || {};
  const utils = SMAX.utils || {};

  // Pega debounce de forma segura, sem destructuring
  const debounceFn = (utils && typeof utils.debounce === 'function')
    ? utils.debounce
    : null;

  function runAll() {
    const work = () => {
      try {
        SMAX.highlights  && SMAX.highlights.apply   && SMAX.highlights.apply();
        SMAX.badges      && SMAX.badges.apply       && SMAX.badges.apply();
        SMAX.magistrado  && SMAX.magistrado.apply   && SMAX.magistrado.apply();
        SMAX.tags        && SMAX.tags.apply         && SMAX.tags.apply();
        SMAX.attachments && SMAX.attachments.apply  && SMAX.attachments.apply();
      } catch (e) {
        console.error('[SMAX Orchestrator] Erro em runAll:', e);
      }
    };

    if ('requestIdleCallback' in root) {
      root.requestIdleCallback(work, { timeout: 500 });
    } else {
      setTimeout(work, 0);
    }
  }

  const scheduleRunAll = debounceFn ? debounceFn(runAll, 80) : runAll;

  function init() {
    const doc = root.document;

    try {
      // CSS agora é responsabilidade de cada módulo
      SMAX.comments   && SMAX.comments.init   && SMAX.comments.init();
      SMAX.sections   && SMAX.sections.init   && SMAX.sections.init();
      SMAX.detratores && SMAX.detratores.init && SMAX.detratores.init();
    } catch (e) {
      console.error('[SMAX Orchestrator] Erro ao inicializar módulos one-shot:', e);
    }

    runAll();

    const obsMain = new MutationObserver(() => scheduleRunAll());
    obsMain.observe(doc.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'aria-expanded']
    });

    const headerEl = doc.querySelector('.slick-header-columns') || doc.body;
    const obsHeader = new MutationObserver(() => scheduleRunAll());
    obsHeader.observe(headerEl, {
      childList: true,
      subtree: true,
      attributes: true
    });

    root.addEventListener('scroll', scheduleRunAll, true);
    root.addEventListener('resize', scheduleRunAll, { passive: true });

    root.addEventListener('beforeunload', () => {
      obsMain.disconnect();
      obsHeader.disconnect();
    }, { once: true });
  }

  SMAX.orchestrator = { init };

})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
