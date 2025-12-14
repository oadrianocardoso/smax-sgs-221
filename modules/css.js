(function (root) {
  'use strict';

  const SMAX = root.SMAX = root.SMAX || {};

  function init() {
    if (document.getElementById('smax-css-header-preto')) return;

    const style = document.createElement('style');
    style.id = 'smax-css-header-preto';
    style.type = 'text/css';
    style.textContent = `
      .navbar.navbar-fixed-top.navbar-inline{
        --headerBackgroundColor: #000000 !important;
        --logoBackgroundColor:   #000000 !important;
      }

      .customBrandLogoContainer{
        background-color: #000000 !important;
      }

      #menu-categories .menu-right-section{
        background-color: #000000 !important;
      }

      .sub-menu-navbar .subitem-link a:hover{
        border-bottom: 4px solid red !important;
      }
    `;

    document.head.appendChild(style);
  }

  SMAX.css = { init };

})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);

