(function (root) {
  'use strict';

  const SMAX = root.SMAX = root.SMAX || {};
  const CONFIG = SMAX.config || {};

  function getDetratores() {
    return Array.isArray(CONFIG.detratores) ? CONFIG.detratores : [];
  }

  function init() {
    const doc = root.document;
    if (!doc.body) {
      const pendingApi = { sweep: () => {} };
      doc.addEventListener('DOMContentLoaded', () => {
        if (api === pendingApi) api = init();
      }, { once: true });
      return pendingApi;
    }

    const ICON_CAVEIRA_URL = 'https://cdn-icons-png.flaticon.com/512/564/564619.png';
    let sweepTimer = null;

    const normalizeName = s => (s || '').toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase();

    function getVisibleLeadingText(el) {
      let out = '';
      const nodes = el && el.childNodes ? el.childNodes : [];
      for (let i = 0; i < nodes.length; i += 1) {
        const n = nodes[i];
        if (!n) continue;
        if (n.nodeType === Node.ELEMENT_NODE) break;
        if (n.nodeType === Node.TEXT_NODE) out += n.textContent || '';
      }
      return out;
    }

    function readNameFromElement(personItem) {
      const raw = [
        getVisibleLeadingText(personItem),
        personItem.getAttribute('title') || '',
        personItem.getAttribute('aria-label') || '',
        personItem.textContent || ''
      ]
        .map(v => String(v || '').trim())
        .find(Boolean) || '';
      return raw;
    }

    function isDetratorName(nameRaw, flagList, flagSet) {
      const key = normalizeName(nameRaw);
      if (!key) return false;
      if (flagSet.has(key)) return true;
      if (key.length < 8) return false;
      return flagList.some(flag => key.includes(flag) || flag.includes(key));
    }

    function applySkullAlert(personItem, flagList, flagSet) {
      try {
        if (!(personItem instanceof HTMLElement)) return;

        const nomeVisivel = readNameFromElement(personItem);
        if (!isDetratorName(nomeVisivel, flagList, flagSet)) return;

        const img = personItem.querySelector('img.ts-avatar, img.pl-shared-item-img, img.ts-image') ||
                    personItem.querySelector('img');

        if (img && img.dataset.__g1Applied !== '1') {
          img.dataset.__g1Applied = '1';
          img.src = ICON_CAVEIRA_URL;
          img.alt = 'Alerta de Usuario Detrator';
          img.title = 'Alerta de Usuario Detrator';
          Object.assign(img.style, {
            border: '3px solid #ff0000',
            borderRadius: '50%',
            padding: '2px',
            backgroundColor: '#ff000022',
            boxShadow: '0 0 10px #ff0000'
          });
        }

        if (personItem.dataset.__g1ColorApplied !== '1') {
          personItem.style.color = '#ff0000';
          personItem.dataset.__g1ColorApplied = '1';
        }
      } catch (e) {
        // noop
      }
    }

    function getCandidateNodes() {
      return doc.querySelectorAll([
        'span.pl-person-item',
        '.pl-person-item',
        '.pl-shared-item',
        '.pl-shared-item-title',
        '.rc-object-name',
        '.ts-contact-name'
      ].join(','));
    }

    function sweep() {
      const flagList = getDetratores().map(normalizeName).filter(Boolean);
      const flagSet = new Set(flagList);
      if (!flagSet.size) return;
      getCandidateNodes().forEach(item => applySkullAlert(item, flagList, flagSet));
    }

    function scheduleSweep(delay) {
      if (sweepTimer) {
        root.clearTimeout(sweepTimer);
        sweepTimer = null;
      }
      sweepTimer = root.setTimeout(() => {
        sweepTimer = null;
        sweep();
      }, Number(delay) || 0);
    }

    const obs = new MutationObserver(() => scheduleSweep(60));

    obs.observe(doc.body, { childList: true, subtree: true });

    if (doc.readyState === 'loading') {
      doc.addEventListener('DOMContentLoaded', () => scheduleSweep(100));
    } else {
      scheduleSweep(100);
    }

    const intervalId = root.setInterval(() => {
      if (doc.hidden) return;
      scheduleSweep(0);
    }, 3000);

    root.addEventListener('beforeunload', () => {
      obs.disconnect();
      if (sweepTimer) root.clearTimeout(sweepTimer);
      root.clearInterval(intervalId);
    }, { once: true });

    return {
      sweep: () => scheduleSweep(0)
    };
  }

  let api = null;

  SMAX.detratores = {
    init() {
      if (api) return api;
      api = init();
      return api;
    },
    refresh() {
      if (!api) api = init();
      api?.sweep?.();
    }
  };

})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
