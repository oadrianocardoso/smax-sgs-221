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

    nameGroups: {
      "ADRIANO":       [0,1,2,3,4,5,6],
      "DANIEL LEAL":   [7,8,9,10,11,12],
      "DOUGLAS":       [13,14,15,16,17,18,19],
      "IONE":          [20,21,22,23,24,25],
      "ISA":           [26,27,28,29,30,31,32],
      "IVAN":          [33,34,35,36,37,38,39],
      "LAIS":          [40,41,42,43,44,45,46],
      "LEONARDO":      [47,48,49,50,51,52,53],
      "LUANA":         [54,55,56,57,58,59,60],
      "LUIS FELIPE":   [61,62,63,64,65,66,67],
      "MARCELO":       [68,69,70,71,72,73,74],
      "MARLON":        [75,76,77,78,79,80,81],
      "ROBSON":        [82,83,84,85,86,87],
      "SAMUEL":        [88,89,90,91,92,93],
      "YVES":          [94,95,96,97,98,99]
    },

    nameColors: {
      "ADRIANO":            {bg:"#E6E66A", fg:"#000"},
      "DANIEL LEAL":        {bg:"#E6A85C", fg:"#000"},
      "DOUGLAS":            {bg:"#66CCCC", fg:"#000"},
      "IONE":               {bg:"#4D4D4D", fg:"#fff"},
      "ISA":                {bg:"#5C6FA6", fg:"#fff"},
      "IVAN":               {bg:"#9A9A52", fg:"#000"},
      "LAIS":               {bg:"#D966D9", fg:"#000"},
      "LEONARDO":           {bg:"#8E5A8E", fg:"#fff"},
      "LUANA":              {bg:"#7ACC7A", fg:"#000"},
      "LUIS FELIPE":        {bg:"#5CA3A3", fg:"#000"},
      "MARCELO":            {bg:"#A05252", fg:"#fff"},
      "MARLON":             {bg:"#A0A0A0", fg:"#000"},
      "ROBSON":             {bg:"#CCCCCC", fg:"#000"},
      "SAMUEL":             {bg:"#66A3CC", fg:"#000"},
      "YVES":               {bg:"#4D4D4D", fg:"#fff"}
    },

    ausentes: ["ISA"],

  };

  function debounce(fn, wait = 120) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
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
