(function (root) {
  'use strict';

  const SMAX = root.SMAX = root.SMAX || {};
  const LINK_BIND_ATTR = 'tmPreviewLinkBound';
  const IMG_BIND_ATTR = 'tmPreviewImgBound';
  const IMAGE_EXT_RE = /\.(png|jpg|jpeg|gif|bmp|webp)$/i;
  const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/ig;
  const URL_API = root.URL || (typeof URL !== 'undefined' ? URL : null);
  const INIT_DATA_PATH_RE = /\/rest\/213963628\/entity-page\/initializationDataByLayout\/Request\//i;
  const INIT_DATA_LAYOUT_TOKEN = 'layout=FORM_LAYOUT.withoutResolution,FORM_LAYOUT.onlyResolution';
  const ATTACHMENT_PATH_RE = /\/frs\/(?:file-list|image-list)\//i;

  let cssInjected = false;
  let activePreview = null;
  let observerStarted = false;
  let maintainScheduled = false;
  let networkHooked = false;
  let attachmentMetaById = {};

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

  function isInitDataUrl(url) {
    const raw = String(url || '');
    return INIT_DATA_PATH_RE.test(raw) && raw.indexOf(INIT_DATA_LAYOUT_TOKEN) !== -1;
  }

  function normalizeAttachmentMeta(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const id = String(src.id || '').trim().toLowerCase();
    if (!id) return null;

    const fileName = String(src.file_name || src.name || '').trim();
    const fileExtension = String(src.file_extension || '').trim().toLowerCase();
    const mimeType = String(src.mime_type || '').trim().toLowerCase();
    const isHidden = src.IsHidden === true;

    return { id, fileName, fileExtension, mimeType, isHidden };
  }

  function extractAttachmentMetaMap(payload) {
    const map = {};
    const data = payload && typeof payload === 'object' ? payload : {};
    const props = data.EntityData && data.EntityData.properties && typeof data.EntityData.properties === 'object'
      ? data.EntityData.properties
      : {};
    const raw = props.RequestAttachments;
    if (!raw) return map;

    let parsed = raw;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch (_) {
        return map;
      }
    }

    const rows = Array.isArray(parsed && parsed.complexTypeProperties)
      ? parsed.complexTypeProperties
      : [];

    rows.forEach((entry) => {
      const normalized = normalizeAttachmentMeta(entry && entry.properties);
      if (!normalized) return;
      map[normalized.id] = normalized;
    });

    return map;
  }

  function updateAttachmentMetaFromText(txt) {
    if (!txt) return;
    try {
      const payload = JSON.parse(txt);
      const nextMap = extractAttachmentMetaMap(payload);
      if (!nextMap || !Object.keys(nextMap).length) return;
      attachmentMetaById = Object.assign({}, attachmentMetaById, nextMap);
    } catch (_) {}
  }

  function hookInitDataNetworkOnce() {
    if (networkHooked) return;
    networkHooked = true;

    try {
      const origXhrOpen = XMLHttpRequest.prototype.open;
      const origXhrSend = XMLHttpRequest.prototype.send;

      XMLHttpRequest.prototype.open = function patchedOpen(method, url) {
        this._tmxInitDataUrl = String(url || '');
        return origXhrOpen.apply(this, arguments);
      };

      XMLHttpRequest.prototype.send = function patchedSend() {
        try {
          if (isInitDataUrl(this._tmxInitDataUrl)) {
            this.addEventListener('load', () => {
              try {
                if (this.status === 200 && this.responseText) {
                  updateAttachmentMetaFromText(this.responseText);
                }
              } catch (_) {}
            });
          }
        } catch (_) {}

        return origXhrSend.apply(this, arguments);
      };
    } catch (_) {}

    try {
      if (typeof root.fetch === 'function') {
        const origFetch = root.fetch.bind(root);
        root.fetch = function patchedFetch(input, init) {
          let url = '';
          try {
            url = (typeof input === 'string')
              ? input
              : (input && input.url ? input.url : '');
          } catch (_) {}

          return origFetch(input, init).then((resp) => {
            try {
              if (resp && resp.ok && isInitDataUrl(url)) {
                resp.clone().text().then(updateAttachmentMetaFromText).catch(() => {});
              }
            } catch (_) {}
            return resp;
          });
        };
      }
    } catch (_) {}
  }

  function extractAttachmentIdFromUrl(url) {
    const raw = String(url || '');
    if (!raw) return '';

    const matches = raw.match(UUID_RE);
    if (!matches || !matches.length) return '';
    return String(matches[0] || '').trim().toLowerCase();
  }

  function getAttachmentMetaByUrl(url) {
    const id = extractAttachmentIdFromUrl(url);
    if (!id) return null;
    return attachmentMetaById[id] || null;
  }

  function replaceAttachmentPath(url, fromSegment, toSegment) {
    const raw = String(url || '');
    if (!raw) return '';
    return raw.replace(new RegExp(`\\/frs\\/${fromSegment}\\/`, 'i'), `/frs/${toSegment}/`);
  }

  function buildAttachmentFetchCandidates(url) {
    const list = [];
    const pushUnique = (value) => {
      const v = String(value || '').trim();
      if (!v) return;
      if (list.indexOf(v) !== -1) return;
      list.push(v);
    };

    const normalized = normalizeUrl(url);
    const hasImageList = /\/frs\/image-list\//i.test(normalized);
    const hasFileList = /\/frs\/file-list\//i.test(normalized);

    if (hasImageList) {
      // Prefer file-list first because image-list often returns 500 for download fetch.
      pushUnique(replaceAttachmentPath(normalized, 'image-list', 'file-list'));
      pushUnique(normalized);
      return list;
    }

    pushUnique(normalized);

    if (hasFileList) {
      pushUnique(replaceAttachmentPath(normalized, 'file-list', 'image-list'));
    }

    return list;
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

  function detectTypeByMime(mime) {
    const m = String(mime || '').toLowerCase();
    if (!m) return '';
    if (m.includes('pdf')) return 'pdf';
    if (m.startsWith('image/')) return 'image';
    return '';
  }

  async function detectTypeByMagic(blob) {
    try {
      if (!blob || typeof blob.arrayBuffer !== 'function') return '';
      const buf = await blob.arrayBuffer();
      const u8 = new Uint8Array(buf);
      if (u8.length < 4) return '';

      // PDF: 25 50 44 46 -> %PDF
      if (u8[0] === 0x25 && u8[1] === 0x50 && u8[2] === 0x44 && u8[3] === 0x46) return 'pdf';
      // PNG: 89 50 4E 47
      if (u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4E && u8[3] === 0x47) return 'image';
      // JPG: FF D8 FF
      if (u8[0] === 0xFF && u8[1] === 0xD8 && u8[2] === 0xFF) return 'image';
      // GIF: 47 49 46 38
      if (u8[0] === 0x47 && u8[1] === 0x49 && u8[2] === 0x46 && u8[3] === 0x38) return 'image';
      // BMP: 42 4D
      if (u8[0] === 0x42 && u8[1] === 0x4D) return 'image';
      // WEBP: RIFF....WEBP
      if (
        u8.length > 11 &&
        u8[0] === 0x52 && u8[1] === 0x49 && u8[2] === 0x46 && u8[3] === 0x46 &&
        u8[8] === 0x57 && u8[9] === 0x45 && u8[10] === 0x42 && u8[11] === 0x50
      ) return 'image';
    } catch (_) {}

    return '';
  }

  function closePreviewModal() {
    if (!activePreview) return;

    const doc = root.document;
    const { modal, onKeyDown, revokeUrl } = activePreview;

    try {
      doc.removeEventListener('keydown', onKeyDown, true);
    } catch (_) {}

    try {
      modal.remove();
    } catch (_) {}

    if (revokeUrl && URL_API && typeof URL_API.revokeObjectURL === 'function') {
      try {
        URL_API.revokeObjectURL(revokeUrl);
      } catch (_) {}
    }

    activePreview = null;
  }

  function openPreviewModal(sourceUrl, previewType, fileName, fallbackUrl) {
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
    fallbackLink.href = fallbackUrl || sourceUrl;
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

    const revokeUrl = /^blob:/i.test(sourceUrl || '') ? sourceUrl : '';
    activePreview = { modal, onKeyDown, revokeUrl };
  }

  async function fetchAttachmentBlob(url) {
    const fetchImpl = (root && typeof root.fetch === 'function')
      ? root.fetch.bind(root)
      : (typeof fetch === 'function' ? fetch : null);

    if (!fetchImpl) throw new Error('fetch indisponivel');

    const candidates = buildAttachmentFetchCandidates(url);
    let lastError = '';

    for (let i = 0; i < candidates.length; i++) {
      const candidateUrl = candidates[i];
      try {
        const resp = await fetchImpl(candidateUrl, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store'
        });

        if (!resp.ok) {
          lastError = `HTTP ${resp.status} (${candidateUrl})`;
          continue;
        }

        const contentType = ((resp.headers && resp.headers.get && resp.headers.get('content-type')) || '')
          .split(';')[0]
          .trim()
          .toLowerCase();

        const blob = await resp.blob();
        return { blob, contentType, sourceUrl: candidateUrl };
      } catch (err) {
        lastError = `${String(err)} (${candidateUrl})`;
      }
    }

    throw new Error(lastError || 'Falha ao baixar anexo');
  }

  function pickImageMime(fileName) {
    const lower = String(fileName || '').toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.gif')) return 'image/gif';
    if (lower.endsWith('.bmp')) return 'image/bmp';
    if (lower.endsWith('.webp')) return 'image/webp';
    return 'image/jpeg';
  }

  function coerceBlobType(blob, previewType, fileName, headerType) {
    const currentType = (blob && blob.type ? blob.type : '').toLowerCase();
    const normalizedHeader = String(headerType || '').toLowerCase();

    let expectedType = '';
    if (previewType === 'pdf') {
      expectedType = 'application/pdf';
    } else if (previewType === 'image') {
      expectedType = pickImageMime(fileName);
    }

    const hasGenericType = !currentType || currentType === 'application/octet-stream';
    const headerIsSpecific = normalizedHeader && normalizedHeader !== 'application/octet-stream';
    const finalType = headerIsSpecific ? normalizedHeader : (hasGenericType ? expectedType : currentType);

    if (!finalType || finalType === currentType) return blob;

    try {
      const BlobCtor = root.Blob || (typeof Blob !== 'undefined' ? Blob : null);
      if (!BlobCtor) return blob;
      return new BlobCtor([blob], { type: finalType });
    } catch (_) {
      return blob;
    }
  }

  async function openPreviewIfSupported(url, fileName, fallbackType) {
    if (!url) return false;

    const normalizedName = fileName || pickFileNameFromUrl(url) || 'anexo';
    const byNameType = detectPreviewType(normalizedName, url, fallbackType);

    try {
      const data = await fetchAttachmentBlob(url);
      if (!URL_API || typeof URL_API.createObjectURL !== 'function') {
        throw new Error('URL.createObjectURL indisponivel');
      }

      const byMimeType = detectTypeByMime(data.contentType) || detectTypeByMime(data.blob && data.blob.type);
      const byMagicType = await detectTypeByMagic(data.blob);
      const previewType = byNameType || byMimeType || byMagicType || fallbackType || '';
      if (!previewType) return false;

      const typedBlob = coerceBlobType(data.blob, previewType, normalizedName, data.contentType);
      const objectUrl = URL_API.createObjectURL(typedBlob);
      openPreviewModal(objectUrl, previewType, normalizedName, url);
      return true;
    } catch (_) {
      if (!byNameType && !fallbackType) return false;
      openPreviewModal(url, byNameType || fallbackType, normalizedName, url);
      return true;
    }
  }

  function wirePreviewLinks() {
    const doc = root.document;
    const area = doc.querySelector('#attachmentsArea') || doc.querySelector('div.pl-entity-page-component[data-aid="attachments"]');
    if (!area) return;

    const links = area.querySelectorAll('a[ng-href*="/rest/"][href*="/file-list/"], a[ng-href*="/rest/"][href*="/image-list/"], a[href*="/rest/"][href*="/file-list/"], a[href*="/rest/"][href*="/image-list/"], a[ng-href*="/file-list/"], a[ng-href*="/image-list/"], a[href*="/file-list/"], a[href*="/image-list/"]');

    links.forEach((link) => {
      if (!link || link.dataset[LINK_BIND_ATTR] === '1') return;
      link.dataset[LINK_BIND_ATTR] = '1';

      link.removeAttribute('download');

      link.addEventListener('click', async (e) => {
        const url = getAttachmentUrl(link);
        if (!url) return;
        if (!ATTACHMENT_PATH_RE.test(url)) return;

        const meta = getAttachmentMetaByUrl(url);
        const fileName = (String(meta && meta.fileName || '').trim()
          || (link.textContent || '').trim()
          || (link.getAttribute('title') || '').trim()
          || pickFileNameFromUrl(url));
        const lowerName = String(fileName || '').toLowerCase();
        const metaType = detectTypeByMime(meta && meta.mimeType);
        const isPdf = lowerName.endsWith('.pdf') || metaType === 'pdf' || String(meta && meta.fileExtension || '') === 'pdf';
        const isImage = IMAGE_EXT_RE.test(lowerName) || metaType === 'image';

        e.preventDefault();
        e.stopPropagation();

        try {
          if (isPdf) {
            const data = await fetchAttachmentBlob(url);
            if (!URL_API || typeof URL_API.createObjectURL !== 'function') throw new Error('URL.createObjectURL indisponivel');
            const blobUrl = URL_API.createObjectURL(coerceBlobType(data.blob, 'pdf', fileName, data.contentType));
            root.open(blobUrl, '_blank');
            root.setTimeout(() => {
              try { URL_API.revokeObjectURL(blobUrl); } catch (_) {}
            }, 60 * 1000);
            return;
          }

          if (isImage) {
            const data = await fetchAttachmentBlob(url);
            if (!URL_API || typeof URL_API.createObjectURL !== 'function') throw new Error('URL.createObjectURL indisponivel');
            const blobUrl = URL_API.createObjectURL(coerceBlobType(data.blob, 'image', fileName, data.contentType));
            openPreviewModal(blobUrl, 'image', fileName || 'Imagem anexada', url);
            return;
          }

          const shown = await openPreviewIfSupported(url, fileName, '');
          if (!shown) root.open(url, '_blank');
        } catch (err) {
          root.alert('Erro ao abrir anexo: ' + err);
        }
      }, true);
    });
  }

  function wireInlineImages() {
    const doc = root.document;
    const images = doc.querySelectorAll('img[src*="/frs/file-list/"], img[src*="/frs/image-list/"], img[src*="/file-list/"], img[src*="/image-list/"], img[ng-src*="/frs/file-list/"], img[ng-src*="/frs/image-list/"], img[ng-src*="/file-list/"], img[ng-src*="/image-list/"]');

    images.forEach((img) => {
      if (!img || img.dataset[IMG_BIND_ATTR] === '1') return;
      img.dataset[IMG_BIND_ATTR] = '1';
      img.style.cursor = img.style.cursor || 'zoom-in';

      img.addEventListener('click', async (e) => {
        const url = getImageUrl(img);
        if (!url) return;
        if (!ATTACHMENT_PATH_RE.test(url)) return;

        const meta = getAttachmentMetaByUrl(url);
        const fileName = (String(meta && meta.fileName || '').trim()
          || (img.getAttribute('alt') || '').trim()
          || (img.getAttribute('title') || '').trim()
          || pickFileNameFromUrl(url)
          || 'imagem');

        e.preventDefault();
        e.stopPropagation();

        const shown = await openPreviewIfSupported(url, fileName, 'image');
        if (!shown) root.open(url, '_blank');
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
    hookInitDataNetworkOnce();
    maintain();
    startAttachmentObserver();
  }

  SMAX.attachments = { apply };
})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
