// @version      2.1
(function (root) {
  'use strict';

  const SMAX   = root.SMAX = root.SMAX || {};
  const CONFIG = SMAX.config || {};
  const prefs  = CONFIG.prefs || {};
  const utils  = SMAX.utils  || {};
  const { debounce } = utils;

  function init() {
    if (!prefs.collapseOn) return;

    const doc = root.document;

    const OFERTA_SELECTOR =
      '[aria-label*="Oferta de catálogo"], [data-aid="section-catalog-offering"]';

    // NOVO: seletor da seção Classificação
    const CLASSIFICACAO_SELECTOR =
      '[data-aid="section-classification"], [aria-label^="Classificação"], [aria-label*="Classificação."]';

    const ARIA_PATTERNS = [
      'Peça Relacionada',
      'Hardware',
      'Informações SCCD'
    ];

    const collapsedOnce = new WeakSet();

    const isOpen = (sectionEl) => {
      const content = sectionEl?.querySelector?.('.pl-entity-page-component-content');
      return !!content && !content.classList.contains('ng-hide');
    };

    const syntheticClick = (el) => {
      try {
        el.click();
      } catch {
        el.dispatchEvent(new MouseEvent('click', { bubbles:true, cancelable:true }));
      }
    };

    const fixAriaAndIcon = (headerEl, sectionEl) => {
      if (!headerEl || !sectionEl) return;

      // aria-expanded no header
      if (headerEl.getAttribute('aria-expanded') !== 'false') {
        headerEl.setAttribute('aria-expanded', 'false');
      }

      // Texto "xxx. Expandido" -> "xxx. Recolhido" no header SR
      const sr = sectionEl.querySelector('.pl-entity-page-component-header-sr');
      if (sr && /Expandido/i.test(sr.textContent || '')) {
        sr.textContent = sr.textContent.replace(/Expandido/ig, 'Recolhido');
      }

      // NOVO: ajustar o aria-label do container da seção
      const currentLabel = sectionEl.getAttribute('aria-label');
      if (currentLabel && /Expandido/i.test(currentLabel)) {
        sectionEl.setAttribute(
          'aria-label',
          currentLabel.replace(/Expandido/ig, 'Recolhido')
        );
      }

      // Ícone de seta (down -> right)
      const icon =
        headerEl.querySelector('[pl-bidi-collapse-arrow]') ||
        headerEl.querySelector('.icon-arrow-med-down, .icon-arrow-med-right');

      if (icon) {
        icon.classList.remove('icon-arrow-med-down');
        icon.classList.add('icon-arrow-med-right');
      }
    };

    function collapseSectionOnce(sectionEl) {
      if (!sectionEl) return;
      if (sectionEl.dataset.userInteracted === '1') return;
      if (collapsedOnce.has(sectionEl)) return;

      const header = sectionEl.querySelector('.pl-entity-page-component-header[role="button"]');
      if (!header) return;

      if (isOpen(sectionEl)) {
        syntheticClick(header);
        setTimeout(() => fixAriaAndIcon(header, sectionEl), 0);
      } else {
        fixAriaAndIcon(header, sectionEl);
      }
      collapsedOnce.add(sectionEl);
    }

    function collapseOfertaCatalogo() {
      doc.querySelectorAll(OFERTA_SELECTOR).forEach(node => {
        const sectionEl = node.closest('.form-section, .pl-entity-page-component') || node;
        collapseSectionOnce(sectionEl);
      });
    }

    // NOVO: colapsar inicialmente a seção "Classificação"
    function collapseClassificacao() {
      doc.querySelectorAll(CLASSIFICACAO_SELECTOR).forEach(node => {
        const sectionEl = node.closest('.form-section, .pl-entity-page-component') || node;
        collapseSectionOnce(sectionEl);
      });
    }

    function removeSectionsByAriaLabel() {
      doc
        .querySelectorAll('[data-aid="section-hardware"], [data-aid="section-sccd"], [data-aid="section-related-piece"]')
        .forEach(node => {
          const wrapper =
            node.closest('.form-section, .pl-entity-page-component') ||
            node.closest('div') ||
            node;
          if (wrapper && wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
        });

      ARIA_PATTERNS.forEach(label => {
        doc
          .querySelectorAll(`[aria-label*="${label}"]`)
          .forEach(node => {
            const wrapper =
              node.closest('.form-section, .pl-entity-page-component') ||
              node.closest('div') ||
              node;
            if (wrapper && wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
          });
      });
    }

    function applyAll() {
      collapseOfertaCatalogo();
      collapseClassificacao();     // NOVO: aplicar à seção Classificação
      removeSectionsByAriaLabel();
    }

    // NOVO: função para saber se é seção que estamos rastreando (Oferta ou Classificação)
    const isTrackedSection = (el) => {
      if (!el) return false;
      return (
        el.matches?.(OFERTA_SELECTOR) ||
        el.matches?.(CLASSIFICACAO_SELECTOR) ||
        !!el.querySelector?.(OFERTA_SELECTOR) ||
        !!el.querySelector?.(CLASSIFICACAO_SELECTOR)
      );
    };

    doc.addEventListener(
      'click',
      (e) => {
        const header = e.target.closest('.pl-entity-page-component-header[role="button"]');
        if (!header) return;
        const sectionEl = header.closest('.form-section, .pl-entity-page-component');
        if (isTrackedSection(sectionEl)) {
          sectionEl.dataset.userInteracted = '1';
        }
      },
      { capture:true }
    );

    const schedule = debounce ? debounce(applyAll, 100) : applyAll;
    const obs = new MutationObserver(() => schedule());
    setTimeout(applyAll, 300);
    obs.observe(doc.documentElement, { childList:true, subtree:true });
    root.addEventListener('beforeunload', () => obs.disconnect(), { once:true });
  }

  SMAX.sections = { init };

})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);