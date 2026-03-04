(function (root) {
  'use strict';

  const SMAX = root.SMAX = root.SMAX || {};
  const AREA_BIND_ATTR = 'tmPreviewAreaBound';
  const IMAGE_EXT_RE = /\.(png|jpg|jpeg|gif|bmp|webp)$/i;

  let cssInjected = false;
  let activePreview = null;

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

  function getAttachmentUrl(link) {
    const hrefAttr = link.getAttribute('href');
    const ngHrefAttr = link.getAttribute('ng-href');
    const rawUrl = hrefAttr || ngHrefAttr || (link.hasAttribute('href') ? link.href : '');
    if (!rawUrl) return '';

    const trimmed = String(rawUrl).trim();
    if (!trimmed || trimmed.toLowerCase().startsWith('javascript:')) return '';

    try {
      return new root.URL(trimmed, root.location.href).href;
    } catch (_) {
      return trimmed;
    }
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

  async function handleAttachmentClick(e) {
    const link = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!link) return;

    const area = e.currentTarget && e.currentTarget.nodeType === 1
      ? e.currentTarget
      : root.document.querySelector('#attachmentsArea, div.pl-entity-page-component[data-aid="attachments"]');
    if (!area || !area.contains(link)) return;

    const url = getAttachmentUrl(link);
    if (!url) return;

    const fileName = ((link.textContent || '').trim() || url.split('?')[0].split('/').pop() || '').trim();
    const lowerName = fileName.toLowerCase();
    const byExtPdf = lowerName.endsWith('.pdf');
    const byExtImage = IMAGE_EXT_RE.test(lowerName);

    if (!byExtPdf && !byExtImage) return;

    link.removeAttribute('download');
    e.preventDefault();
    e.stopPropagation();

    try {
      openPreviewModal(url, byExtPdf ? 'pdf' : 'image', fileName);
    } catch (err) {
      root.alert('Erro ao abrir anexo: ' + (err && err.message ? err.message : String(err)));
    }
  }

  function wirePreviewLinks() {
    const doc = root.document;
    const areas = doc.querySelectorAll('#attachmentsArea, div.pl-entity-page-component[data-aid="attachments"]');
    if (!areas || !areas.length) return;

    areas.forEach((area) => {
      if (!area || area.dataset[AREA_BIND_ATTR] === '1') return;
      area.addEventListener('click', handleAttachmentClick, true);
      area.dataset[AREA_BIND_ATTR] = '1';
    });
  }

  function apply() {
    moveAttachmentsIntoForm();
    ensureCss();
    wirePreviewLinks();
  }

  SMAX.attachments = { apply };
})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
