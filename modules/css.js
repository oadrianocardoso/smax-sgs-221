(function (root) {
  'use strict';

  const SMAX = root.SMAX = root.SMAX || {};

  function init() {
    if (typeof GM_addStyle !== 'function') {
      console.warn('[SMAX CSS] GM_addStyle não disponível.');
      return;
    }

    GM_addStyle(`
      .tmx-hl-yellow { background:#ffeb3b; color:#000; font-weight:700; border-radius:5px; padding:0 .14em; }
      .tmx-hl-red    { background:#d32f2f; color:#fff; font-weight:700; border-radius:3px; padding:0 .16em; }
      .tmx-hl-green  { background:#2e7d32; color:#fff; font-weight:700; border-radius:3px; padding:0 .14em; }
      .tmx-hl-blue   { background:#1e88e5; color:#fff; font-weight:700; border-radius:3px; padding:0 .14em; }
      .tmx-hl-pink   { background:#FC0FC0; color:#000; font-weight:700; border-radius:3px; padding:0 .14em; }

      .tmx-juizdireito-hit { background:#1e88e5 !important; color:#fff !important; font-weight:700 !important; }

      .slick-cell.tmx-namecell { font-weight:700 !important; transition: box-shadow .15s ease; }
      .slick-cell.tmx-namecell a { color: inherit !important; }
      .slick-cell.tmx-namecell:focus-within { outline: 2px solid rgba(0,0,0,.25); outline-offset: 2px; }
      .slick-cell.tmx-namecell:hover { box-shadow: 0 0 0 2px rgba(0,0,0,.08) inset; }

      .tag-smax, .tag-smax * { all: unset !important; }
      .tag-smax {
        display: inline-block !important;
        background: #e0e0e0 !important;
        color: #000 !important;
        font-weight: 700 !important;
        border-radius: 3px !important;
        padding: 0 4px !important;
        margin-right: 4px !important;
        white-space: nowrap !important;
        font-size: inherit !important;
        font-family: inherit !important;
        line-height: inherit !important;
        text-decoration: none !important;
      }
      .tag-smax [class^="tmx-hl-"], .tag-smax [class*=" tmx-hl-"] {
        all: unset !important;
        background: none !important;
        color: inherit !important;
      }

      .comment-items { height: auto !important; max-height: none !important; }

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

  SMAX.css = { init };

})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
