(function (root) {
  'use strict';

  const SMAX = root.SMAX = root.SMAX || {};
  const CONFIG = SMAX.config || {};
  const STYLE_ID = 'smax-zen-mode-style';
  const ACTIVE_CLASS = 'smax-zen-mode-active';
  let initialized = false;

  const HIDDEN_SELECTORS = [
    'div[id*="Fabricante_c_container"]',
    'div[id*="TicketFornecedor_c_container"]',
    'div[id*="TicketAuxiliar_c_container"]',
    'div[id*="DataEnvioFornecedor_c_container"]',
    'div[id*="Garantia_c_container"]',
    'div[id*="DataAgendamento_c_container"]',
    'div[id*="PreferredContactMethod_container"]',
    'div[id*="RegisteredForServiceComponent_container"]',
    'div[id*="SubscriptionActionType_container"]',
    'div[data-aid="related-knowledge-preview"]',
    'div[data-aid="tab-panel-nav-task-plan"]',
    'div[data-aid="tab-panel-nav-slts"]',
    'div[data-aid="tab-panel-nav-involved-cis"]',
    'div[data-aid="tab-panel-nav-related-news"]',
    'div[data-aid="tab-panel-nav-reservation"]',
    '[data-aid="section-hardware"]',
    '[data-aid="section-sccd"]',
    '[data-aid="section-related-piece"]',
    '[aria-label*="Peça Relacionada"]',
    '[aria-label*="Hardware"]',
    '[aria-label*="Informações SCCD"]'
  ];

  function isEnabled() {
    return CONFIG.prefs?.zenModeOn !== false;
  }

  function ensureCss() {
    if (root.document.getElementById(STYLE_ID)) return;
    const style = root.document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = HIDDEN_SELECTORS
      .map(selector => `body.${ACTIVE_CLASS} ${selector} { display: none !important; }`)
      .join('\n');
    root.document.head.appendChild(style);
  }

  function apply() {
    ensureCss();
    root.document.body?.classList.toggle(ACTIVE_CLASS, isEnabled());
  }

  function init() {
    if (initialized) return;
    initialized = true;
    apply();
  }

  SMAX.zenMode = { init, apply };

})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
