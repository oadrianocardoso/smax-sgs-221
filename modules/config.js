;(function (root) {
  'use strict';

  var SMAX = root.SMAX = root.SMAX || {};
  var STORAGE_KEY = 'smax-sgs-221:settings:v1';

  var DEFAULT_CONFIG = {
    prefs: {
      highlightsOn:      true,
      nameBadgesOn:      true,
      magistradoOn:      true,
      collapseOn:        true,
      enlargeCommentsOn: true,
      autoTagsOn:        true
    }
  };

  function isPlainObject(v) {
    return Object.prototype.toString.call(v) === '[object Object]';
  }

  function cloneValue(value) {
    if (Array.isArray(value)) return value.map(cloneValue);
    if (isPlainObject(value)) {
      var out = {};
      Object.keys(value).forEach(function (k) {
        out[k] = cloneValue(value[k]);
      });
      return out;
    }
    return value;
  }

  function deepMerge(target, source) {
    if (!isPlainObject(target) || !isPlainObject(source)) return target;

    Object.keys(source).forEach(function (k) {
      var next = source[k];
      if (Array.isArray(next)) {
        target[k] = next.map(cloneValue);
      } else if (isPlainObject(next)) {
        if (!isPlainObject(target[k])) target[k] = {};
        deepMerge(target[k], next);
      } else {
        target[k] = next;
      }
    });

    return target;
  }

  function loadPersistedSettings() {
    try {
      var raw = root.localStorage && root.localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      return isPlainObject(parsed) ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function serializeHighlightGroups(groups) {
    if (!isPlainObject(groups)) return undefined;
    var out = {};

    Object.keys(groups).forEach(function (k) {
      var g = groups[k];
      if (!isPlainObject(g)) return;
      out[k] = {
        cls: typeof g.cls === 'string' ? g.cls : '',
        whole: Array.isArray(g.whole) ? g.whole.slice() : [],
        substr: Array.isArray(g.substr) ? g.substr.slice() : [],
        regex: Array.isArray(g.regex)
          ? g.regex.map(function (r) {
            if (r && typeof r === 'object' && typeof r.pattern === 'string') {
              return {
                pattern: r.pattern,
                flags: typeof r.flags === 'string' ? r.flags : 'giu'
              };
            }
            if (r instanceof RegExp) {
              return {
                pattern: r.source,
                flags: r.flags || 'giu'
              };
            }
            return null;
          }).filter(Boolean)
          : []
      };
    });

    return out;
  }

  function buildSnapshot() {
    var out = {
      prefs: cloneValue(CONFIG.prefs || {})
    };

    ['teamName', 'teams', 'teamGroupIds', 'nameGroups', 'nameAliases', 'nameColors', 'ausentes', 'personMeta', 'detratores', 'autoTagRules'].forEach(function (k) {
      if (typeof CONFIG[k] !== 'undefined') out[k] = cloneValue(CONFIG[k]);
    });

    var groups = serializeHighlightGroups(CONFIG.highlightGroups);
    if (groups) out.highlightGroups = groups;

    return out;
  }

  function savePersistedSettings() {
    try {
      if (!root.localStorage) return;
      root.localStorage.setItem(STORAGE_KEY, JSON.stringify(buildSnapshot()));
    } catch (e) {
      // ignore quota/security issues
    }
  }

  function updateSettings(next) {
    if (!isPlainObject(next)) return;
    Object.keys(next).forEach(function (k) {
      var v = next[k];
      if (Array.isArray(v)) {
        CONFIG[k] = v.map(cloneValue);
      } else if (isPlainObject(v)) {
        CONFIG[k] = cloneValue(v);
      } else {
        CONFIG[k] = v;
      }
    });
    savePersistedSettings();
  }

  function resetSettings() {
    try {
      if (root.localStorage) root.localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      // ignore
    }
  }

  var CONFIG = cloneValue(DEFAULT_CONFIG);
  deepMerge(CONFIG, loadPersistedSettings());

  CONFIG.update = updateSettings;
  CONFIG.snapshot = buildSnapshot;
  CONFIG.save = savePersistedSettings;
  CONFIG.reset = resetSettings;
  CONFIG.storageKey = STORAGE_KEY;

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
