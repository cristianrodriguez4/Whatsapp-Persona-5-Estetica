/* =========================================================
   P5 - SISTEMA DE MENSAJES
   FASE 1: DETECCIÓN Y MEDICIÓN DINÁMICA
   ========================================================= */


/* ---------------------------------------------------------
   HELPERS DE SCROLL / VIEWPORT
   --------------------------------------------------------- */

function encontrarScrollableP5(desde) {
    let el = desde;
    while (el && el !== document.body) {
        const style = getComputedStyle(el);
        const overflowY = style.overflowY;
        const puedeScroll =
            (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
            el.scrollHeight > el.clientHeight + 5;

        if (puedeScroll) return el;
        el = el.parentElement;
    }
    // Fallback: el propio panel
    return desde;
}

function obtenerViewportRectP5(scrollable) {
    return scrollable.getBoundingClientRect();
}


/* ---------------------------------------------------------
   1. OBTENER MENSAJES
   --------------------------------------------------------- */

function obtenerMensajesP5() {
    const panel = document.querySelector(
        '[data-testid="conversation-panel-messages"]'
    );

    if (!panel) {
        return [];
    }

    const scrollable = encontrarScrollableP5(panel);
    const rectViewport = obtenerViewportRectP5(scrollable);

    const elementos = [
        ...panel.querySelectorAll('[data-testid="msg-container"]')
    ];

    const mensajes = elementos.map((elemento, indice) => {
        const rect = elemento.getBoundingClientRect();

        // Solo mensajes (parcialmente) visibles
        const visible =
            rect.bottom > rectViewport.top - 50 &&
            rect.top < rectViewport.bottom + 50;

        let tipo = 'desconocido';

        if (elemento.querySelector('.x1g5lz36')) {
            tipo = 'enviado';
        } else if (elemento.querySelector('.x1ew7x2d')) {
            tipo = 'recibido';
        }

        // Coordenadas relativas al área visible del scrollable
        const x = rect.left - rectViewport.left;
        const y = rect.top - rectViewport.top;

        return {
            indice,
            elemento,
            tipo,
            visible,

            x: Math.round(x),
            y: Math.round(y),

            ancho: Math.round(rect.width),
            alto: Math.round(rect.height),

            top: Math.round(y),
            bottom: Math.round(y + rect.height),

            centroX: Math.round(x + rect.width / 2),
            centroY: Math.round(y + rect.height / 2)
        };
    }).filter(m => m.visible);

    return mensajes;
}


/* ---------------------------------------------------------
   2. MOSTRAR MENSAJES
   --------------------------------------------------------- */

function mostrarMensajesP5() {
    const mensajes = obtenerMensajesP5();

    console.log(
        `%cP5 → ${mensajes.length} mensajes detectados`,
        'color: red; font-weight: bold;'
    );

    console.table(
        mensajes.map((mensaje) => ({
            indice: mensaje.indice,
            tipo: mensaje.tipo,

            x: mensaje.x,
            y: mensaje.y,

            ancho: mensaje.ancho,
            alto: mensaje.alto,

            top: mensaje.top,
            bottom: mensaje.bottom,

            centroX: mensaje.centroX,
            centroY: mensaje.centroY
        }))
    );

    return mensajes;
}


/* ---------------------------------------------------------
   3. ACTUALIZAR CUANDO CAMBIA EL CHAT
   --------------------------------------------------------- */

let actualizacionPendiente = false;

function actualizarMensajesP5() {
    if (actualizacionPendiente) {
        return;
    }

    actualizacionPendiente = true;

    requestAnimationFrame(() => {
        actualizacionPendiente = false;

        const panel = document.querySelector(
            '[data-testid="conversation-panel-messages"]'
        );

        if (!panel) {
            return;
        }

        const scrollable = encontrarScrollableP5(panel);
        const mensajes = obtenerMensajesP5();
        const conexiones = calcularConexionesP5(mensajes);

        // FASE 3: dibujamos las conexiones como rayos SVG
        const svg = crearSvgConexionesP5(scrollable);
        dibujarConexionesP5(svg, conexiones);

        console.log(
            `%cP5 → ${mensajes.length} mensajes / ${conexiones.length} rayos dibujados`,
            'color: red; font-weight: bold;'
        );
    });
}


/* ---------------------------------------------------------
   4. OBSERVAR EL PANEL DE MENSAJES
   --------------------------------------------------------- */

function observarPanelMensajesP5(panel) {
    const observerPanel = new MutationObserver(() => {
        actualizarMensajesP5();
    });

    observerPanel.observe(panel, {
        childList: true,
        subtree: true
    });

    console.log(
        '%cP5 → observando panel de mensajes',
        'color: red; font-weight: bold;'
    );

    actualizarMensajesP5();
}


/* ---------------------------------------------------------
   5. ESPERAR A QUE APAREZCA EL PANEL
   --------------------------------------------------------- */

let panelActualP5 = null;
let observerGeneralP5 = null;

function buscarPanelMensajesP5() {
    const panel = document.querySelector(
        '[data-testid="conversation-panel-messages"]'
    );

    if (!panel) {
        return;
    }

    /*
     * Si ya estamos observando este mismo panel,
     * no hacemos nada.
     */
    if (panelActualP5 === panel) {
        return;
    }

    panelActualP5 = panel;

    observarPanelMensajesP5(panel);
}


/* ---------------------------------------------------------
   6. OBSERVADOR GENERAL DE WHATSAPP
   --------------------------------------------------------- */

function iniciarSistemaMensajesP5() {

    buscarPanelMensajesP5();

    observerGeneralP5 = new MutationObserver(() => {
        buscarPanelMensajesP5();
    });

    observerGeneralP5.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Si cambia el tamaño de la ventana, el panel puede cambiar de
    // dimensiones (por ejemplo al abrir el panel de info del contacto).
    window.addEventListener('resize', actualizarMensajesP5);

    // IMPORTANTE: el elemento que realmente hace scroll adentro del
    // panel puede NO ser "conversation-panel-messages" (WhatsApp suele
    // virtualizar la lista con un contenedor interno). El evento
    // "scroll" no hace bubbling, pero SÍ se puede capturar desde un
    // ancestro usando la fase de captura (capture: true). Por eso lo
    // registramos una sola vez en "document" en vez de en el panel.
    document.addEventListener(
        'scroll',
        actualizarMensajesP5,
        { capture: true, passive: true }
    );

    console.log(
        '%cP5 - Sistema de mensajes cargado',
        'color: red; font-weight: bold;'
    );
}


/* ---------------------------------------------------------
   8. BUCLE DE REDIBUJADO CONTINUO (red de seguridad)
   ---------------------------------------------------------
   MutationObserver y el "scroll" en captura cubren la mayoría
   de los casos, pero WhatsApp puede reposicionar mensajes de
   formas que ninguno de los dos detecta (reciclado de nodos,
   scroll-to-bottom inicial, etc). En vez de perseguir el evento
   exacto, redibujamos en cada frame: es barato y garantiza que
   la posición siempre coincide con lo que se ve en pantalla.
   --------------------------------------------------------- */

function iniciarBucleRedibujoP5() {
    actualizarMensajesP5();
    requestAnimationFrame(iniciarBucleRedibujoP5);
}

/* ---------------------------------------------------------
   7. INICIAR CUANDO EL BODY EXISTA
   --------------------------------------------------------- */

if (document.body) {
    iniciarSistemaMensajesP5();
    iniciarBucleRedibujoP5();
} else {
    document.addEventListener(
        'DOMContentLoaded',
        () => {
            iniciarSistemaMensajesP5();
            iniciarBucleRedibujoP5();
        },
        { once: true }
    );
}


/* =========================================================
   FASE 2 - CALCULAR CONEXIONES ENTRE MENSAJES
   ========================================================= */


/**
 * Decide desde qué lado debe salir la conexión
 * dependiendo del tipo de mensaje.
 */
function calcularPuntoConexion(mensaje, posicion) {

    let porcentajeHorizontal = 0.5;

    if (mensaje.tipo === 'enviado') {
        porcentajeHorizontal = 0.85;
    } else if (mensaje.tipo === 'recibido') {
        porcentajeHorizontal = 0.15;
    }

    const x = mensaje.x + (mensaje.ancho * porcentajeHorizontal);

    let y;

    if (posicion === 'salida') {
        y = mensaje.bottom;
    } else {
        y = mensaje.top;
    }

    return {
        x: Math.round(x),
        y: Math.round(y)
    };
}


/**
 * Crea una conexión entre dos mensajes consecutivos.
 */
function crearConexionP5(mensajeA, mensajeB) {

    // NOTA: por ahora conectamos CENTRO con CENTRO para validar el
    // trazado básico. "calcularPuntoConexion" queda definida arriba
    // para cuando volvamos a usar puntos de salida/entrada por el
    // lado del mensaje (enviado/recibido) en una iteración futura.

    return {
        desde: mensajeA.indice,
        hacia: mensajeB.indice,

        tipoDesde: mensajeA.tipo,
        tipoHacia: mensajeB.tipo,

        x1: mensajeA.centroX,
        y1: mensajeA.centroY,

        x2: mensajeB.centroX,
        y2: mensajeB.centroY
    };
}


/**
 * Calcula todas las conexiones entre mensajes
 * consecutivos.
 */
function calcularConexionesP5(mensajes) {

    const conexiones = [];

    for (let i = 0; i < mensajes.length - 1; i++) {

        const mensajeA = mensajes[i];
        const mensajeB = mensajes[i + 1];

        const distanciaVertical = Math.abs(
            mensajeB.centroY - mensajeA.centroY
        );

        // Evitar conexiones enormes por saltos de DOM/virtualización
        if (distanciaVertical > 450) {
            continue;
        }

        conexiones.push(
            crearConexionP5(
                mensajeA,
                mensajeB
            )
        );
    }

    return conexiones;
}

/**
 * Muestra las conexiones en consola.
 */
function mostrarConexionesP5() {

    const mensajes = obtenerMensajesP5();

    const conexiones = calcularConexionesP5(
        mensajes
    );

    console.log(
        `%cP5 → ${conexiones.length} conexiones calculadas`,
        'color: red; font-weight: bold;'
    );

    console.table(conexiones);

    return conexiones;
}


/* =========================================================
   FASE 3 - DIBUJAR CONEXIONES COMO "RAYOS" SVG
   ========================================================= */

const P5_CONFIG_RAYO = {
    color: '#e3021d',
    grosor: 28          // ancho del cuadrado/barra (px)
};

/* ---- 3.1 Generador de números pseudoaleatorios con semilla ---- */

// Mismo "desde-hacia" => misma forma de rayo, aunque se
// vuelva a dibujar por un MutationObserver. Sin esto, el rayo
// "temblaría" en cada actualización aunque nada se moviera.
function crearGeneradorAleatorioP5(semilla) {
    let estado = semilla >>> 0;

    return function () {
        estado |= 0;
        estado = (estado + 0x6D2B79F5) | 0;

        let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function semillaDesdeTextoP5(texto) {
    let hash = 0;

    for (let i = 0; i < texto.length; i++) {
        hash = (hash * 31 + texto.charCodeAt(i)) | 0;
    }

    return hash;
}


/* ---- 3.2 Generación geométrica del rayo ---- */

/**
 * Genera los puntos del "esqueleto" central del rayo entre dos
 * puntos, con quiebres aleatorios perpendiculares a la línea recta.
 * El grosor y la desviación se atenúan en los extremos para que
 * el rayo termine en punta (como en la referencia).
 */
function generarPuntosRayoP5(x1, y1, x2, y2, aleatorio, config) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distancia = Math.hypot(dx, dy) || 1;

    const perpX = -(dy / distancia);
    const perpY = (dx / distancia);

    const numSegmentos = config.segmentosMin +
        Math.floor(aleatorio() * (config.segmentosMax - config.segmentosMin + 1));

    const centrales = [];

    for (let i = 0; i <= numSegmentos; i++) {
        const t = i / numSegmentos;

        // 0 en las puntas, 1 en el centro del trazo
        const atenuacionExtremo = Math.sin(Math.PI * t);

        const jitter = (aleatorio() * 2 - 1) * config.jitterMax * atenuacionExtremo;

        const grosor = (config.grosorMin +
            aleatorio() * (config.grosorMax - config.grosorMin)) * atenuacionExtremo;

        centrales.push({
            x: x1 + dx * t + perpX * jitter,
            y: y1 + dy * t + perpY * jitter,
            grosor
        });
    }

    return { centrales, perpX, perpY };
}

/**
 * Convierte el esqueleto central en un polígono relleno
 * (dos bordes desplazados a izquierda/derecha del centro).
 */
function construirPathRayoP5(centrales, perpX, perpY) {
    const bordeA = centrales.map((punto) => ({
        x: punto.x + perpX * (punto.grosor / 2),
        y: punto.y + perpY * (punto.grosor / 2)
    }));

    const bordeB = centrales.map((punto) => ({
        x: punto.x - perpX * (punto.grosor / 2),
        y: punto.y - perpY * (punto.grosor / 2)
    })).reverse();

    const puntos = [...bordeA, ...bordeB];

    const d = puntos
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
        .join(' ');

    return d + ' Z';
}

/**
 * Genera un polígono rectangular (barra/cuadrado) entre dos puntos.
 * El rectángulo sigue la dirección del segmento y tiene el grosor indicado.
 */
function generarTrazoCuadradoP5(x1, y1, x2, y2, config) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distancia = Math.hypot(dx, dy) || 1;

    // Vector perpendicular normalizado
    const perpX = -(dy / distancia);
    const perpY =  (dx / distancia);

    const half = (config.grosor || 24) / 2;

    // 4 esquinas del rectángulo
    const p1 = { x: x1 + perpX * half, y: y1 + perpY * half };
    const p2 = { x: x1 - perpX * half, y: y1 - perpY * half };
    const p3 = { x: x2 - perpX * half, y: y2 - perpY * half };
    const p4 = { x: x2 + perpX * half, y: y2 + perpY * half };

    return [
        `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`,
        `L ${p4.x.toFixed(1)} ${p4.y.toFixed(1)}`,
        `L ${p3.x.toFixed(1)} ${p3.y.toFixed(1)}`,
        `L ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`,
        'Z'
    ].join(' ');
}


/* ---- 3.3 Overlay SVG fijo al viewport del scrollable ---- */

function crearSvgConexionesP5(scrollable) {
    let existente = scrollable.querySelector('#p5-svg-conexiones');

    if (existente) {
        // Re-anclar al viewport visible actual
        existente.style.top = scrollable.scrollTop + 'px';
        existente.style.height = scrollable.clientHeight + 'px';
        existente.style.width = scrollable.clientWidth + 'px';
        return existente;
    }

    // El scrollable necesita ser contenedor posicionado
    const posicionActual = getComputedStyle(scrollable).position;

    if (posicionActual === 'static') {
        scrollable.style.position = 'relative';
    }

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('id', 'p5-svg-conexiones');

    // Clave: lo anclamos al scrollTop actual para que siempre
    // cubra exactamente el área visible
    svg.style.position = 'absolute';
    svg.style.top = scrollable.scrollTop + 'px';
    svg.style.left = '0';
    svg.style.width = scrollable.clientWidth + 'px';
    svg.style.height = scrollable.clientHeight + 'px';
    svg.style.pointerEvents = 'none'; // no debe bloquear scroll ni clicks
    svg.style.overflow = 'visible';
    svg.style.zIndex = '0';

    // Se inserta como PRIMER hijo para quedar detrás de los mensajes
    // en el orden de pintado, sin tocar z-index de los mensajes.
    scrollable.insertBefore(svg, scrollable.firstChild);

    return svg;
}

/**
 * PASO ACTUAL: dibuja una línea recta simple, centro a centro,
 * por cada conexión. Sirve para validar que el trazado (posición,
 * capa, comportamiento con scroll) es correcto antes de aplicarle
 * el jitter/quiebres del rayo.
 *
 * "generarTrazoRayoP5" queda arriba, lista para reemplazar el
 * contenido de este forEach cuando volvamos a complejizar.
 */
function dibujarConexionesP5(svg, conexiones) {
    svg.innerHTML = '';

    conexiones.forEach((conexion) => {
        const d = generarTrazoCuadradoP5(
            conexion.x1,
            conexion.y1,
            conexion.x2,
            conexion.y2,
            P5_CONFIG_RAYO
        );

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', d);
        path.setAttribute('class', 'p5-cuadrado-conexion');
        path.style.fill = P5_CONFIG_RAYO.color;
        path.style.stroke = 'none';

        svg.appendChild(path);
    });
}


window.mostrarMensajesP5 = mostrarMensajesP5;
window.mostrarConexionesP5 = mostrarConexionesP5;