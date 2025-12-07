(function (root) {
  'use strict';

  const SMAX   = root.SMAX = root.SMAX || {};
  const CONFIG = SMAX.config || {};
  const GRUPO_1 = CONFIG.grupo1 || [];

  function init() {
    const doc = root.document;
    const ICON_CAVEIRA_URL = 'https://cdn-icons-png.flaticon.com/512/564/564619.png';

    const normalizeName = s => (s||'').toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .trim()
      .toUpperCase();

    const FLAG_SET = new Set(GRUPO_1.map(normalizeName));

    function getVisibleLeadingText(el) {
      const clone = el.cloneNode(true);
      while (clone.firstChild) {
        if (clone.firstChild.nodeType === Node.ELEMENT_NODE) clone.removeChild(clone.firstChild);
        else break;
      }
      return clone.textContent || '';
    }

    function applySkullAlert(personItem) {
      try {
        if (!(personItem instanceof HTMLElement)) return;
        const nomeVisivel = getVisibleLeadingText(personItem);
        const chave       = normalizeName(nomeVisivel);
        if (!FLAG_SET.has(chave)) return;

        const img = personItem.querySelector('img.ts-avatar, img.pl-shared-item-img, img.ts-image') ||
                    personItem.querySelector('img');
        if (img && img.dataset.__g1Applied !== '1') {
          img.dataset.__g1Applied = '1';
          img.src   = ICON_CAVEIRA_URL;
          img.alt   = 'Alerta de Usuário Detrator';
          img.title = 'Alerta de Usuário Detrator';
          Object.assign(img.style, {
            border:'3px solid #ff0000',
            borderRadius:'50%',
            padding:'2px',
            backgroundColor:'#ff000022',
            boxShadow:'0 0 10px #ff0000'
          });
        }
        personItem.style.color = '#ff0000';
      } catch {}
    }

    const obs = new MutationObserver(() =>
      doc.querySelectorAll('span.pl-person-item').forEach(applySkullAlert)
    );
    obs.observe(doc.body, { childList:true, subtree:true });

    if (doc.readyState === 'loading') {
      doc.addEventListener('DOMContentLoaded', () =>
        doc.querySelectorAll('span.pl-person-item').forEach(applySkullAlert)
      );
    } else {
      doc.querySelectorAll('span.pl-person-item').forEach(applySkullAlert);
    }

    root.addEventListener('beforeunload', () => obs.disconnect(), { once:true });
  }

  SMAX.detratores = { init };

})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
