(function (root) {
  'use strict';

  const SMAX   = root.SMAX = root.SMAX || {};
  const CONFIG = SMAX.config || {};
  const GRUPO_1 = CONFIG.grupo1 || [];

  grupo1: [
      "Adriano Zilli","Adriana Da Silva Ferreira Oliveira","Alessandra Sousa Nunes","Bruna Marques Dos Santos",
      "Breno Medeiros Malfati","Carlos Henrique Scala De Almeida","Cassia Santos Alves De Lima","Dalete Rodrigues Silva",
      "David Lopes De Oliveira","Davi Dos Reis Garcia","Deaulas De Campos Salviano","Diego Oliveira Da Silva",
      "Diogo Mendonça Aniceto","Elaine Moriya","Ester Naili Dos Santos","Fabiano Barbosa Dos Reis",
      "Fabricio Christiano Tanobe Lyra","Gabriel Teixeira Ludvig","Gilberto Sintoni Junior","Giovanna Coradini Teixeira",
      "Gislene Ferreira Sant'Ana Ramos","Guilherme Cesar De Sousa","Gustavo De Meira Gonçalves","Jackson Alcantara Santana",
      "Janaina Dos Passos Silvestre","Jefferson Silva De Carvalho Soares","Joyce Da Silva Oliveira","Juan Campos De Souza",
      "Juliana Lino Dos Santos Rosa","Karina Nicolau Samaan","Karine Barbara Vitor De Lima Souza","Kaue Nunes Silva Farrelly",
      "Kelly Ferreira De Freitas","Larissa Ferreira Fumero","Lucas Alves Dos Santos","Lucas Carneiro Peres Ferreira",
      "Marcos Paulo Silva Madalena","Maria Fernanda De Oliveira Bento","Natalia Yurie Shiba","Paulo Roberto Massoca",
      "Pedro Henrique Palacio Baritti","Rafaella Silva Lima Petrolini","Renata Aparecida Mendes Bonvechio","Rodrigo Silva Oliveira",
      "Ryan Souza Carvalho","Tatiana Lourenço Da Costa Antunes","Tatiane Araujo Da Cruz","Thiago Tadeu Faustino De Oliveira",
      "Tiago Carvalho De Freitas Meneses","Victor Viana Roca","GERSON DA MATTA"
  ]

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
