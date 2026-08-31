(function () {
  const ATRIBUTOS_UTILES = ['id', 'role', 'aria-label', 'placeholder'];

  function atributosEstables(el) {
    const resultado = {};
    for (const attr of ATRIBUTOS_UTILES) {
      if (el.hasAttribute(attr)) resultado[attr] = el.getAttribute(attr);
    }
    for (const attr of el.attributes) {
      if (attr.name.startsWith('data-')) resultado[attr.name] = attr.value;
    }
    return resultado;
  }

  function describirElemento(el) {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return {
      tag: el.tagName,
      atributos: JSON.stringify(atributosEstables(el)),
      ancho: Math.round(rect.width),
      alto: Math.round(rect.height),
      bg: style.backgroundColor,
      fuente: style.fontFamily,
      tamanoTexto: style.fontSize,
      texto: (el.textContent || '').trim().slice(0, 40),
    };
  }

  function inspeccionar(e) {
    if (!e.altKey) return; // solo actúa si mantienes ALT presionado
    e.preventDefault();
    e.stopPropagation();

    const cadena = [];
    let el = e.target;
    while (el && el !== document.body.parentElement) {
      cadena.push(describirElemento(el));
      el = el.parentElement;
    }

    console.clear();
    console.log('%cCadena de ancestros del elemento clickeado:', 'font-weight:bold;font-size:14px;color:#e10600');
    console.table(cadena);
  }

  document.addEventListener('click', inspeccionar, true);
  console.log('%cModo inspector activado. Mantén ALT y haz click en cualquier parte para identificarla.', 'color:#e10600;font-weight:bold');
})();
