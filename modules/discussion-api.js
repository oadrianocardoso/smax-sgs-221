(function (root) {
  'use strict';

  const SMAX = root.SMAX = root.SMAX || {};
  const DEFAULT_TENANT_ID = '213963628';
  const REQUEST_ID_SELECTORS = [
    '[data-aid="entity-page-header-id"]',
    '[data-aid="minimized-header-entity-page-header-id"]'
  ];

  function cleanText(value) {
    return String(value || '')
      .replace(/\u00a0/g, ' ')
      .replace(/[\t\f\v ]+/g, ' ')
      .replace(/\s*\n\s*/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function numericId(value) {
    const match = String(value || '').match(/\d+/);
    return match ? match[0] : '';
  }

  function getCurrentRequestId(context) {
    const doc = context?.ownerDocument || root.document;

    for (const selector of REQUEST_ID_SELECTORS) {
      const candidates = Array.from(doc.querySelectorAll(selector));
      const visible = candidates.find(node => node.offsetParent !== null) || candidates[0];
      const id = numericId(visible?.getAttribute('title') || visible?.textContent);
      if (id) return id;
    }

    const routeMatch = String(root.location?.href || '').match(/\/Requests(?:\/|%2F)(\d+)/i);
    return routeMatch ? routeMatch[1] : '';
  }

  function getTenantId() {
    const configured = numericId(SMAX.config?.tenantId);
    if (configured) return configured;

    try {
      const entries = root.performance?.getEntriesByType?.('resource') || [];
      for (let index = entries.length - 1; index >= 0; index -= 1) {
        const match = String(entries[index]?.name || '').match(/\/rest\/(\d+)\//i);
        if (match) return match[1];
      }
    } catch (e) {
      // A identificacao dinamica e opcional; o tenant conhecido permanece como fallback.
    }

    const resource = root.document.querySelector('[href*="/rest/"], [src*="/rest/"]');
    const resourceMatch = String(resource?.getAttribute('href') || resource?.getAttribute('src') || '')
      .match(/\/rest\/(\d+)\//i);
    return resourceMatch ? resourceMatch[1] : DEFAULT_TENANT_ID;
  }

  function htmlToText(value) {
    const container = root.document.createElement('div');
    container.innerHTML = String(value || '');
    container.querySelectorAll('script, style, noscript, template').forEach(node => node.remove());
    container.querySelectorAll('br').forEach(node => node.replaceWith(root.document.createTextNode('\n')));
    container.querySelectorAll('li').forEach(node => {
      node.insertBefore(root.document.createTextNode('• '), node.firstChild);
      node.appendChild(root.document.createTextNode('\n'));
    });
    container.querySelectorAll('p, div, section, article, blockquote, tr').forEach(node => {
      node.appendChild(root.document.createTextNode('\n'));
    });
    return cleanText(container.textContent || '');
  }

  function formatDate(value) {
    const timestamp = Number(value);
    if (!Number.isFinite(timestamp) || timestamp <= 0) return '';
    try {
      return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'full',
        timeStyle: 'medium'
      }).format(new Date(timestamp));
    } catch (e) {
      return new Date(timestamp).toLocaleString('pt-BR');
    }
  }

  function submitterLabel(comment) {
    const submitter = comment?.Submitter || comment?.submitter || {};
    const user = submitter.user || submitter.User || {};
    const label = cleanText(
      submitter.DisplayLabel
      || submitter.Name
      || submitter.FullName
      || user.DisplayLabel
      || user.Name
      || user.FullName
      || comment?.SubmitterName
      || ''
    );
    if (label) return label;

    const userId = numericId(submitter.UserId || submitter.userId || comment?.SubmitterId);
    return userId ? `Usuário ${userId}` : 'Manifestação sem identificação';
  }

  function normalizeComment(comment, index) {
    const privacy = cleanText(comment?.PrivacyType || comment?.privacyType || '').toUpperCase();
    const actualInterface = cleanText(comment?.ActualInterface || comment?.actualInterface || '').toUpperCase();
    const from = cleanText(comment?.CommentFrom || comment?.commentFrom || '').toUpperCase();
    const isSystem = comment?.IsSystem === true
      || String(comment?.IsSystem).toLowerCase() === 'true'
      || actualInterface === 'SYSTEM'
      || from === 'SYSTEM';

    return {
      id: cleanText(comment?.Id || comment?.id || `${index}:${comment?.CreateTime || 0}`),
      text: htmlToText(comment?.Body || comment?.body || ''),
      author: isSystem ? 'Gerado automaticamente' : submitterLabel(comment),
      when: formatDate(comment?.CreateTime || comment?.createTime),
      createTime: Number(comment?.CreateTime || comment?.createTime || 0),
      privacy: privacy === 'INTERNAL' ? 'Interno' : 'Público',
      purpose: cleanText(comment?.FunctionalPurpose || comment?.functionalPurpose || ''),
      isSystem,
      index
    };
  }

  function responseComments(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.comments)) return payload.comments;
    if (Array.isArray(payload?.Comments)) return payload.Comments;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  }

  async function fetchMessages(options) {
    const requestId = numericId(options?.requestId) || getCurrentRequestId(options?.context);
    if (!requestId) throw new Error('Não foi possível identificar o ID da solicitação aberta.');

    const tenantId = getTenantId();
    const url = `/rest/${tenantId}/collaboration/comments/Request/${encodeURIComponent(requestId)}`;
    const fetchImpl = typeof root.fetch === 'function'
      ? root.fetch.bind(root)
      : (typeof fetch === 'function' ? fetch : null);
    if (!fetchImpl) throw new Error('O navegador não disponibilizou um cliente HTTP para consultar o SMAX.');

    const response = await fetchImpl(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json, text/plain, */*',
        'X-Requested-With': 'XMLHttpRequest'
      },
      signal: options?.signal
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error(`O SMAX recusou o acesso às discussões (HTTP ${response.status}).`);
      }
      throw new Error(`A API de discussões do SMAX retornou HTTP ${response.status}.`);
    }

    let payload;
    try {
      payload = await response.json();
    } catch (e) {
      throw new Error('A API de discussões do SMAX retornou uma resposta inválida.');
    }

    const messages = responseComments(payload)
      .map(normalizeComment)
      .filter(message => message.text)
      .sort((left, right) => {
        if (left.createTime !== right.createTime) return left.createTime - right.createTime;
        return left.index - right.index;
      })
      .map((message, index) => Object.assign({}, message, { index }));

    return { requestId, tenantId, messages };
  }

  SMAX.discussionApi = {
    fetchMessages,
    getCurrentRequestId,
    getTenantId,
    htmlToText
  };

})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
