(function (root) {
  'use strict';

  const SMAX = root.SMAX = root.SMAX || {};
  const LINK_BIND_ATTR = 'tmPreviewLinkBound';
  const IMG_BIND_ATTR = 'tmPreviewImgBound';
  const IMAGE_EXT_RE = /\.(png|jpg|jpeg|gif|bmp|webp)$/i;

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
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        padding: 20px;
        background: rgba(0, 0, 0, 0.75);
      }
      .tmPreviewDialog {
        position: relative;
        width: min(1100px, 96vw);
        max-height: 92vh;
        border-radius: 10px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.2);
        background: #111;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
      }
      .tmPreviewHeader {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 10px 14px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.15);
        background: rgba(255, 255, 255, 0.07);
      }
      .tmPreviewTitle {
        color: #fff;
        font-size: 14px;
        line-height: 1.2;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .tmPreviewClose {
        appearance: none;
        border: 0;
        background: transparent;
        color: #fff;
        font-size: 26px;
        line-height: 1;
        padding: 0 4px;
        cursor: pointer;
      }
      .tmPreviewBody {
        width: 100%;
        height: min(84vh, 860px);
        display: flex;
        align-items: center;
        justify-content: center;
        background: #fff;
      }
      .tmPreviewImg {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        display: block;
      }
      .tmPreviewPdf {
        width: 100%;
        height: 100%;
        border: 0;
        background: #fff;
      }
      .tmPreviewFallback {
        position: absolute;
        right: 12px;
        bottom: 12px;
        padding: 6px 10px;
        border-radius: 6px;
        background: rgba(17, 17, 17, 0.9);
        color: #fff;
        font-size: 12px;
        text-decoration: none;
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

    const trimmed = String(rawUrl).trim();
    if (!trimmed || trimmed.toLowerCase().startsWith('javascript:')) return '';

    try {
      return new root.URL(trimmed, root.location.href).href;
    } catch (_) {
      return trimmed;
    }
  }

  function getAttachmentUrl(link) {
    const hrefAttr = link.getAttribute('href');
    const ngHrefAttr = link.getAttribute('ng-href');
    const rawUrl = hrefAttr || ngHrefAttr || (link.hasAttribute('href') ? link.href : '');
    return normalizeUrl(rawUrl);
  }

  function getImageUrl(img) {
    const rawSrc = img.getAttribute('src') || img.getAttribute('ng-src') || img.currentSrc || '';
    return normalizeUrl(rawSrc);
  }

  function pickFileNameFromUrl(url) {
    const clean = String(url || '').split('?')[0];
    const parts = clean.split('/');
    return (parts[parts.length - 1] || '').trim();
  }

  function detectPreviewType(fileName, url, fallbackType) {
    const lowerName = String(fileName || '').toLowerCase();
    if (lowerName.endsWith('.pdf')) return 'pdf';
    if (IMAGE_EXT_RE.test(lowerName)) return 'image';

    const byUrlName = pickFileNameFromUrl(url).toLowerCase();
    if (byUrlName.endsWith('.pdf')) return 'pdf';
    if (IMAGE_EXT_RE.test(byUrlName)) return 'image';

    return fallbackType || '';
  }

  function closePreviewModal() {
    if (!activePreview) return;

    const doc = root.document;
    const { modal, onKeyDown } = activePreview;

    try {
      doc.removeEventListener('keydown', onKeyDown, true);
    } catch (_) {}

    try {
      modal.remove();
    } catch (_) {}

    activePreview = null;
  }

  function openPreviewModal(sourceUrl, previewType, fileName) {
    const doc = root.document;
    ensureCss();

    closePreviewModal();

    const modal = doc.createElement('div');
    modal.className = 'tmPreviewModal';
    modal.addEventListener('click', (ev) => {
      if (ev.target === modal) closePreviewModal();
    });

    const dialog = doc.createElement('div');
    dialog.className = 'tmPreviewDialog';

    const header = doc.createElement('div');
    header.className = 'tmPreviewHeader';

    const title = doc.createElement('div');
    title.className = 'tmPreviewTitle';
    title.textContent = fileName || 'Visualizacao de anexo';

    const closeBtn = doc.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'tmPreviewClose';
    closeBtn.textContent = 'x';
    closeBtn.title = 'Fechar';
    closeBtn.onclick = closePreviewModal;

    header.appendChild(title);
    header.appendChild(closeBtn);

    const body = doc.createElement('div');
    body.className = 'tmPreviewBody';

    if (previewType === 'pdf') {
      const pdfFrame = doc.createElement('iframe');
      pdfFrame.className = 'tmPreviewPdf';
      pdfFrame.src = sourceUrl;
      pdfFrame.setAttribute('title', fileName || 'PDF');
      body.appendChild(pdfFrame);
    } else {
      const img = doc.createElement('img');
      img.className = 'tmPreviewImg';
      img.src = sourceUrl;
      img.alt = fileName || 'Imagem anexada';
      body.appendChild(img);
    }

    const fallbackLink = doc.createElement('a');
    fallbackLink.className = 'tmPreviewFallback';
    fallbackLink.href = sourceUrl;
    fallbackLink.target = '_blank';
    fallbackLink.rel = 'noopener noreferrer';
    fallbackLink.textContent = 'Abrir em nova aba';

    dialog.appendChild(header);
    dialog.appendChild(body);
    dialog.appendChild(fallbackLink);
    modal.appendChild(dialog);
    doc.body.appendChild(modal);

    const onKeyDown = (ev) => {
      if (ev.key === 'Escape') closePreviewModal();
    };
    doc.addEventListener('keydown', onKeyDown, true);

    activePreview = { modal, onKeyDown };
  }

  function openPreviewIfSupported(url, fileName, fallbackType) {
    const previewType = detectPreviewType(fileName, url, fallbackType);
    if (!previewType) return false;

    openPreviewModal(url, previewType, fileName || pickFileNameFromUrl(url) || 'anexo');
    return true;
  }

  function wirePreviewLinks() {
    const doc = root.document;
    const area = doc.querySelector('#attachmentsArea') || doc.querySelector('div.pl-entity-page-component[data-aid="attachments"]');
    if (!area) return;

    const links = area.querySelectorAll('a[ng-href*="/rest/"], a[href*="/rest/"], a[ng-href*="/file-list/"], a[href*="/file-list/"]');

    links.forEach((link) => {
      if (!link || link.dataset[LINK_BIND_ATTR] === '1') return;
      link.dataset[LINK_BIND_ATTR] = '1';

      link.removeAttribute('download');

      link.addEventListener('click', (e) => {
        const url = getAttachmentUrl(link);
        if (!url) return;
        if (!/\/frs\/file-list\/|\/file-list\//i.test(url)) return;

        const fileName = ((link.textContent || '').trim()
          || (link.getAttribute('title') || '').trim()
          || pickFileNameFromUrl(url));

        if (!openPreviewIfSupported(url, fileName, '')) return;

        e.preventDefault();
        e.stopPropagation();
      }, true);
    });
  }

  function wireInlineImages() {
    const doc = root.document;
    const images = doc.querySelectorAll('img[src*="/frs/file-list/"], img[src*="/file-list/"], img[ng-src*="/frs/file-list/"], img[ng-src*="/file-list/"]');

    images.forEach((img) => {
      if (!img || img.dataset[IMG_BIND_ATTR] === '1') return;
      img.dataset[IMG_BIND_ATTR] = '1';
      img.style.cursor = img.style.cursor || 'zoom-in';

      img.addEventListener('click', (e) => {
        const url = getImageUrl(img);
        if (!url) return;
        if (!/\/frs\/file-list\/|\/file-list\//i.test(url)) return;

        const fileName = ((img.getAttribute('alt') || '').trim()
          || (img.getAttribute('title') || '').trim()
          || pickFileNameFromUrl(url)
          || 'imagem');

        if (!openPreviewIfSupported(url, fileName, 'image')) return;

        e.preventDefault();
        e.stopPropagation();
      }, true);
    });
  }

  function maintain() {
    maintainScheduled = false;
    moveAttachmentsIntoForm();
    wirePreviewLinks();
    wireInlineImages();
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
