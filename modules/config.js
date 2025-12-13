;(function (root) {
  'use strict';

  var SMAX = root.SMAX = root.SMAX || {};

  var CONFIG = {
    prefs: {
      highlightsOn:      true,
      nameBadgesOn:      true,
      magistradoOn:      true,
      collapseOn:        true,
      enlargeCommentsOn: true,
      autoTagsOn:        true
    }
  };

  function debounce(fn, wait) {
    var t;
    if (typeof wait === 'undefined') wait = 120;

    return function () {
      var args = arguments;
      clearTimeout(t);
      t = setTimeout(function () {
        fn.apply(null, args);
      }, wait);
    };
  }

  function getGridViewport(doc) {
    var d = doc || root.document;
    return d.querySelector('.slick-viewport') || d;
  }

  function escapeReg(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function normalizeText(t) {
    t = (t || '');
    // se der erro aqui depois, te mando fallback sem normalize()
    return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  SMAX.config = CONFIG;
  SMAX.utils  = {
    debounce: debounce,
    getGridViewport: getGridViewport,
    escapeReg: escapeReg,
    normalizeText: normalizeText
  };

})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
