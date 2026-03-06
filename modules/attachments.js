(function (root) {
  'use strict';

  const SMAX = root.SMAX = root.SMAX || {};
  const LINK_BIND_ATTR = 'tmPreviewLinkBound';
  const IMAGE_EXT_RE = /\.(png|jpg|jpeg|gif|bmp|webp)$/i;
  const URL_API = root.URL || (typeof URL !== 'undefined' ? URL : null);
  const FILE_LIST_RE = /\/frs\/file-list\//i;

  let cssInjected = false;
  let activePreview = null;
  let observerStarted = false;
  let maintainScheduled = false;

  function ensureCss() {
    if (cssInjected) return;
    cssInjected = true;
    if (typeof GM_addStyle !== 'function') return;

    GM_addStyle(`
      .tmPreviewModal {
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.75);
        z-index: 999999;
      }
      .tmPreviewClose {
        position: fixed;
        top: 20px;
        right: 30px;
        font-size: 30px;
        color: #fff;
        cursor: pointer;
        z-index: 1000000;
      }
      .tmPreviewImg {
        max-width: 90%;
        max-height: 90%;
        border: 3px solid #fff;
        box-shadow: 0 0 20px #000;
        background: #fff;
      }
    `);
  }

  function moveAttachmentsIntoForm() {
    const doc = root.document;
    const attachments = doc.querySelector('div.pl-entity-page-component[data-aid="attachments"]');
    const form = doc.querySelector('ng-form[name="form"]');
    if (!attachments || !form) return;

    attachments.style.display = '';

    if (attachments.parentNode === form && form.firstElementChild === attachments) {
      return;
    }

    form.insertBefore(attachments, form.firstElementChild || null);
  }

  function normalizeUrl(rawUrl) {
    if (!rawUrl) return '';

    const trimmed = String(rawUrl)
      .replace(/&amp;/gi, '&')
      .trim();
    if (!trimmed || trimmed.toLowerCase().startsWith('javascript:')) return '';

    try {
      return new root.URL(trimmed, root.location.href).href;
    } catch (_) {
      return trimmed;
    }
  }

  function getAttachmentUrl(link) {
    const hrefProp = link && link.href ? link.href : '';
    const hrefAttr = link.getAttribute('href');
    const ngHrefAttr = link.getAttribute('ng-href');
    const rawUrl = hrefProp || hrefAttr || ngHrefAttr || '';
    return normalizeUrl(rawUrl);
  }

  function pickFileNameFromUrl(url) {
    const clean = String(url || '').split('?')[0];
    const parts = clean.split('/');
    return (parts[parts.length - 1] || '').trim();
  }

  function closeImageModal() {
    if (!activePreview) return;
    const modal = activePreview.modal;
    const blobUrl = activePreview.blobUrl;
    if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
    if (blobUrl && URL_API && typeof URL_API.revokeObjectURL === 'function') {
      try { URL_API.revokeObjectURL(blobUrl); } catch (_) {}
    }
    activePreview = null;
  }

  function openImageModal(blobUrl, fileName) {
    const doc = root.document;
    ensureCss();
    closeImageModal();

    const modal = doc.createElement('div');
    modal.className = 'tmPreviewModal';
    modal.addEventListener('click', (ev) => {
      if (ev.target === modal) closeImageModal();
    });
    const closeBtn = doc.createElement('div');
    closeBtn.className = 'tmPreviewClose';
    closeBtn.textContent = 'x';
    closeBtn.title = 'Fechar';
    closeBtn.onclick = closeImageModal;
    const img = doc.createElement('img');
    img.className = 'tmPreviewImg';
    img.src = blobUrl;
    img.alt = fileName || 'Imagem anexada';
    modal.appendChild(closeBtn);
    modal.appendChild(img);
    doc.body.appendChild(modal);
    activePreview = { modal, blobUrl };
  }

  async function fetchAttachmentBlob(url) {
    const fetchImpl = (root && typeof root.fetch === 'function')
      ? root.fetch.bind(root)
      : (typeof fetch === 'function' ? fetch : null);
    if (!fetchImpl) throw new Error('fetch indisponivel');
    const resp = await fetchImpl(url, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store'
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const blob = await resp.blob();
    return { blob };
  }

  function wirePreviewLinks() {
    const doc = root.document;
    const area = doc.querySelector('#attachmentsArea');
    if (!area) return;

    const links = area.querySelectorAll(
      'a[ng-href*="/rest/"][href*="/file-list/"], a[href*="/rest/"][href*="/file-list/"], a[ng-href*="/file-list/"], a[href*="/file-list/"]'
    );

    links.forEach((link) => {
      if (!link || link.dataset[LINK_BIND_ATTR] === '1') return;
      link.dataset[LINK_BIND_ATTR] = '1';
      link.removeAttribute('download');

      link.addEventListener('click', async (e) => {
        const url = getAttachmentUrl(link);
        if (!url) return;
        if (!FILE_LIST_RE.test(url)) return;
        const fileName = (String(link.textContent || '').trim()
          || (link.getAttribute('title') || '').trim()
          || pickFileNameFromUrl(url));
        const lowerName = String(fileName || '').toLowerCase();
        const isPdf = lowerName.endsWith('.pdf');
        const isImage = IMAGE_EXT_RE.test(lowerName);

        e.preventDefault();
        e.stopPropagation();

        try {
          if (isPdf) {
            const data = await fetchAttachmentBlob(url);
            if (!URL_API || typeof URL_API.createObjectURL !== 'function') throw new Error('URL.createObjectURL indisponivel');
            const blobUrl = URL_API.createObjectURL(data.blob);
            root.open(blobUrl, '_blank');
            root.setTimeout(() => {
              try { URL_API.revokeObjectURL(blobUrl); } catch (_) {}
            }, 60 * 1000);
            return;
          }

          if (isImage) {
            const data = await fetchAttachmentBlob(url);
            if (!URL_API || typeof URL_API.createObjectURL !== 'function') throw new Error('URL.createObjectURL indisponivel');
            const blobUrl = URL_API.createObjectURL(data.blob);
            openImageModal(blobUrl, fileName || 'Imagem anexada');
            return;
          }

          root.open(url, '_blank');
        } catch (err) {
          root.alert('Erro ao abrir anexo: ' + err);
        }
      }, true);
    });
  }

  function maintain() {
    maintainScheduled = false;
    moveAttachmentsIntoForm();
    wirePreviewLinks();
  }

  function scheduleMaintain() {
    if (maintainScheduled) return;
    maintainScheduled = true;

    const schedule = typeof root.requestAnimationFrame === 'function'
      ? root.requestAnimationFrame.bind(root)
      : (fn) => root.setTimeout(fn, 16);

    schedule(maintain);
  }

  function startAttachmentObserver() {
    if (observerStarted) return;
    observerStarted = true;

    const doc = root.document;

    const start = () => {
      if (!doc.body) {
        root.setTimeout(start, 120);
        return;
      }

      const obs = new MutationObserver(() => scheduleMaintain());
      obs.observe(doc.body, { childList: true, subtree: true });

      root.addEventListener('beforeunload', () => obs.disconnect(), { once: true });

      // retries for late async renders that move attachments to the bottom
      root.setTimeout(scheduleMaintain, 200);
      root.setTimeout(scheduleMaintain, 700);
      root.setTimeout(scheduleMaintain, 1600);
    };

    start();
  }

  function apply() {
    ensureCss();
    maintain();
    startAttachmentObserver();
  }

  SMAX.attachments = { apply };
})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
