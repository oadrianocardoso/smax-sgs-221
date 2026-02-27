(function (root) {
  'use strict';

  const SMAX = root.SMAX = root.SMAX || {};

  let cssInjected = false;
  function ensureCss() {
    if (cssInjected) return;
    cssInjected = true;
    if (typeof GM_addStyle !== 'function') return;
    GM_addStyle(`
      .tmPreviewModal {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.75);
        display: flex;
        align-items: center;
        justify-content: center;
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
    const form        = doc.querySelector('ng-form[name="form"]');
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

    try {
      return new root.URL(rawUrl, root.location.href).href;
    } catch (_) {
      return rawUrl;
    }
  }

  function openImageModal(objUrl) {
    const doc = root.document;
    ensureCss();
    const modal = doc.createElement('div');
    modal.className = 'tmPreviewModal';

    const closeBtn = doc.createElement('div');
    closeBtn.className = 'tmPreviewClose';
    closeBtn.textContent = '✖';
    closeBtn.onclick = () => {
      root.URL.revokeObjectURL(objUrl);
      modal.remove();
    };

    const img = doc.createElement('img');
    img.className = 'tmPreviewImg';
    img.src = objUrl;

    modal.appendChild(closeBtn);
    modal.appendChild(img);
    doc.body.appendChild(modal);
  }

  function wirePreviewLinks() {
    const doc = root.document;
    const area = doc.querySelector('#attachmentsArea');
    if (!area) return;

    const links = area.querySelectorAll('a');

    links.forEach(link => {
      if (link._tmPreviewBound) return;

      link.addEventListener('click', async (e) => {
        const url = getAttachmentUrl(link);
        if (!url || (!url.includes('/rest/') && !url.includes('/file-list/'))) return;

        const name = ((link.textContent || '').trim() || url.split('?')[0].split('/').pop() || '').toLowerCase();
        const isPdf = name.endsWith('.pdf');
        const isImage = /\.(png|jpg|jpeg|gif|bmp|webp)$/i.test(name);

        link.removeAttribute('download');
        e.preventDefault();
        e.stopPropagation();

        try {
          if (isPdf) {
            const resp = await fetch(url, { credentials: 'include' });
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            const blob = await resp.blob();
            const url  = root.URL.createObjectURL(blob);
            root.open(url, '_blank');
            setTimeout(() => root.URL.revokeObjectURL(url), 60 * 1000);
            return;
          }

          if (isImage) {
            const resp = await fetch(url, { credentials: 'include' });
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            const blob = await resp.blob();
            const url  = root.URL.createObjectURL(blob);
            openImageModal(url);
            return;
          }

          root.open(url, '_blank');
        } catch (err) {
          alert('Erro ao abrir anexo: ' + err);
        }
      });

      link._tmPreviewBound = true;
    });
  }

  function apply() {
    moveAttachmentsIntoForm();
    ensureCss();
    wirePreviewLinks();
  }

  SMAX.attachments = { apply };

})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
