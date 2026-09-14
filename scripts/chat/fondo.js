/* =========================================================
   P5 - Conexiones entre mensajes 
   ========================================================= */

(function () {
  'use strict';

  function inyectarUrlsIconos() {
    const getURL =
      typeof chrome !== 'undefined' && chrome.runtime?.getURL
        ? chrome.runtime.getURL.bind(chrome.runtime)
        : typeof browser !== 'undefined' && browser.runtime?.getURL
          ? browser.runtime.getURL.bind(browser.runtime)
          : null;

    if (!getURL) return;

    if (document.getElementById('p5-extension-urls')) return;

    const style = document.createElement('style');
    style.id = 'p5-extension-urls';
    style.textContent = `
      :root {
        --p5-icon-img:    url("${getURL('icons/img.svg')}");
        --p5-icon-img2:   url("${getURL('icons/img2.svg')}");
        --p5-icon-imgBGW: url("${getURL('icons/imgBGW.svg')}");
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  inyectarUrlsIconos();

  /* ---- Config ---- */
  const CONFIG = {
    color: '#e3021d',
    grosor: 35,
    maxDistanciaVertical: 450,
  };

  let actualizacionPendiente = false;
  let panelActual = null;
  let observerPanel = null;
  let observerGeneral = null;

  /* ---- Helpers ---- */
  function encontrarScrollable(desde) {
    let el = desde;
    while (el && el !== document.body) {
      const overflowY = getComputedStyle(el).overflowY;
      if (
        (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
        el.scrollHeight > el.clientHeight + 5
      ) {
        return el;
      }
      el = el.parentElement;
    }
    return desde;
  }

  function obtenerMensajes() {
    const panel = document.querySelector(
      '[data-testid="conversation-panel-messages"]'
    );
    if (!panel) return [];

    const scrollable = encontrarScrollable(panel);
    const rectViewport = scrollable.getBoundingClientRect();
    const elementos = panel.querySelectorAll('[data-testid="msg-container"]');
    const mensajes = [];

    for (let i = 0; i < elementos.length; i++) {
      const elemento = elementos[i];
      const rect = elemento.getBoundingClientRect();

      const visible =
        rect.bottom > rectViewport.top - 50 &&
        rect.top < rectViewport.bottom + 50;

      if (!visible) continue;

      let tipo = 'desconocido';
      if (elemento.querySelector('.x1g5lz36')) tipo = 'enviado';
      else if (elemento.querySelector('.x1ew7x2d')) tipo = 'recibido';

      const x = rect.left - rectViewport.left;
      const y = rect.top - rectViewport.top;
      const ancho = rect.width;
      const alto = rect.height;

      mensajes.push({
        indice: i,
        tipo,
        x: Math.round(x),
        y: Math.round(y),
        ancho: Math.round(ancho),
        alto: Math.round(alto),
        centroX: Math.round(x + ancho / 2),
        centroY: Math.round(y + alto / 2),
      });
    }

    return mensajes;
  }

  function calcularConexiones(mensajes) {
    const conexiones = [];
    for (let i = 0; i < mensajes.length - 1; i++) {
      const a = mensajes[i];
      const b = mensajes[i + 1];
      if (Math.abs(b.centroY - a.centroY) > CONFIG.maxDistanciaVertical) continue;
      conexiones.push({
        x1: a.centroX,
        y1: a.centroY,
        x2: b.centroX,
        y2: b.centroY,
      });
    }
    return conexiones;
  }

  function pathCuadrado(x1, y1, x2, y2, grosor) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy) || 1;
    const perpX = -(dy / dist);
    const perpY = dx / dist;
    const half = grosor / 2;

    const p1x = x1 + perpX * half;
    const p1y = y1 + perpY * half;
    const p2x = x1 - perpX * half;
    const p2y = y1 - perpY * half;
    const p3x = x2 - perpX * half;
    const p3y = y2 - perpY * half;
    const p4x = x2 + perpX * half;
    const p4y = y2 + perpY * half;

    return (
      `M ${p1x.toFixed(1)} ${p1y.toFixed(1)} ` +
      `L ${p4x.toFixed(1)} ${p4y.toFixed(1)} ` +
      `L ${p3x.toFixed(1)} ${p3y.toFixed(1)} ` +
      `L ${p2x.toFixed(1)} ${p2y.toFixed(1)} Z`
    );
  }

  function crearSvg(scrollable) {
    let svg = scrollable.querySelector('#p5-svg-conexiones');

    if (svg) {
      svg.style.top = scrollable.scrollTop + 'px';
      svg.style.height = scrollable.clientHeight + 'px';
      svg.style.width = scrollable.clientWidth + 'px';
      return svg;
    }

    if (getComputedStyle(scrollable).position === 'static') {
      scrollable.style.position = 'relative';
    }

    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('id', 'p5-svg-conexiones');
    svg.style.cssText =
      'position:absolute;left:0;pointer-events:none;overflow:visible;z-index:0;' +
      `top:${scrollable.scrollTop}px;` +
      `width:${scrollable.clientWidth}px;` +
      `height:${scrollable.clientHeight}px;`;

    scrollable.insertBefore(svg, scrollable.firstChild);
    return svg;
  }

  function dibujar(svg, conexiones) {
    const parts = [];
    for (let i = 0; i < conexiones.length; i++) {
      const c = conexiones[i];
      parts.push(
        `<path d="${pathCuadrado(c.x1, c.y1, c.x2, c.y2, CONFIG.grosor)}" ` +
          `fill="${CONFIG.color}" stroke="none"/>`
      );
    }
    svg.innerHTML = parts.join('');
  }

  /* ---- Actualización (1 vez por frame como máximo) ---- */
  function actualizar() {
    if (actualizacionPendiente) return;
    actualizacionPendiente = true;

    requestAnimationFrame(() => {
      actualizacionPendiente = false;

      const panel = document.querySelector(
        '[data-testid="conversation-panel-messages"]'
      );
      if (!panel) return;

      const scrollable = encontrarScrollable(panel);
      const mensajes = obtenerMensajes();
      const conexiones = calcularConexiones(mensajes);
      const svg = crearSvg(scrollable);
      dibujar(svg, conexiones);
    });
  }

  function observarPanel(panel) {
    if (observerPanel) {
      observerPanel.disconnect();
      observerPanel = null;
    }

    observerPanel = new MutationObserver(actualizar);
    observerPanel.observe(panel, { childList: true, subtree: true });
    actualizar();
  }

  function buscarPanel() {
    const panel = document.querySelector(
      '[data-testid="conversation-panel-messages"]'
    );
    if (!panel || panel === panelActual) return;

    panelActual = panel;
    observarPanel(panel);
  }

  function iniciar() {
    buscarPanel();

    if (!observerGeneral) {
      observerGeneral = new MutationObserver(buscarPanel);
      observerGeneral.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    window.addEventListener('resize', actualizar, { passive: true });
    document.addEventListener('scroll', actualizar, {
      capture: true,
      passive: true,
    });
  }

  if (document.body) {
    iniciar();
  } else {
    document.addEventListener('DOMContentLoaded', iniciar, { once: true });
  }
})();