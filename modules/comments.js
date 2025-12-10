(function (root) {
  'use strict';

  const SMAX   = root.SMAX = root.SMAX || {};
  const CONFIG = SMAX.config || {};
  const prefs  = CONFIG.prefs || {};

  function init() {
    if (!prefs.enlargeCommentsOn) return;

    const doc = root.document;
    const obs = new MutationObserver(muts => {
      for (const m of muts) {
        m.addedNodes?.forEach(node => {
          if (node.nodeType !== 1) return;
          if (node.matches?.('.comment-items')) {
            node.style.height    = 'auto';
            node.style.maxHeight = 'none';
          } else {
            node.querySelectorAll?.('.comment-items').forEach(el => {
              el.style.height    = 'auto';
              el.style.maxHeight = 'none';
            });
          }
        });
      }
    });
    obs.observe(doc.body, { childList:true, subtree:true });

    root.addEventListener('beforeunload', () => obs.disconnect(), { once:true });
  }

  SMAX.comments = { init };

})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
