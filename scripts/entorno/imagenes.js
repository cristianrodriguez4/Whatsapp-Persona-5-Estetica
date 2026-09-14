/* =========================================================
   Permitir que Chrome y Edge peudan acceder a las imagenes formato SVG
   ========================================================= */

(function inyectarUrlsIconosP5() {
  const getURL = (typeof chrome !== 'undefined' && chrome.runtime?.getURL)
    ? chrome.runtime.getURL.bind(chrome.runtime)
    : (typeof browser !== 'undefined' && browser.runtime?.getURL)
      ? browser.runtime.getURL.bind(browser.runtime)
      : (path) => path;

  const style = document.createElement('style');
  style.id = 'p5-extension-urls';
  style.textContent = `
    :root {
      --p5-icon-img:    url("${getURL('icons/img.svg')}");
      --p5-icon-img2:   url("${getURL('icons/img2.svg')}");
      --p5-icon-imgBGW: url("${getURL('icons/imgBGW.svg')}");
      --p5-icon-imgBG2: url("${getURL('icons/imgBG2.svg')}");
    }
  `;
  (document.head || document.documentElement).appendChild(style);
})();