(function (root) {
  'use strict';

  const SMAX = root.SMAX = root.SMAX || {};

  const CONFIG = {
    prefs: {
      highlightsOn:      true,
      nameBadgesOn:      true,
      magistradoOn:      true,
      collapseOn:        true,
      enlargeCommentsOn: true,
      autoTagsOn:        true
    },
    
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
    const d = doc || root.document;
    return d.querySelector('.slick-viewport') || d;
  }

  function escapeReg(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function normalizeText(t) {
    return (t || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  SMAX.config = CONFIG;
  SMAX.utils  = {
    debounce,
    getGridViewport,
    escapeReg,
    normalizeText
  };

})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
