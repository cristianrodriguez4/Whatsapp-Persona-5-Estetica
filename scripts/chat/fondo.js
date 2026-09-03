/* =========================================================
   P5 - SISTEMA DE MENSAJES
   FASE 1: DETECCIÓN Y MEDICIÓN DINÁMICA
   ========================================================= */


/* ---------------------------------------------------------
   1. OBTENER MENSAJES
   --------------------------------------------------------- */

function obtenerMensajesP5() {
    let panel = document.querySelector(
        '[data-testid="conversation-panel-messages"]'
    );

    if (!panel) {
        return [];
    }

    let rectPanel = panel.getBoundingClientRect();

    let elementos = [
        ...panel.querySelectorAll('[data-testid="msg-container"]')
    ];

    let mensajes = elementos.map((elemento, indice) => {
        let rect = elemento.getBoundingClientRect();

        let tipo = 'desconocido';

        if (elemento.querySelector('.x1g5lz36')) {
            tipo = 'enviado';
        } else if (elemento.querySelector('.x1ew7x2d')) {
            tipo = 'recibido';
        }

        let x = rect.left - rectPanel.left;
        let y = rect.top - rectPanel.top;

        return {
            indice,
            elemento,

            tipo,

            x: Math.round(x),
            y: Math.round(y),

            ancho: Math.round(rect.width),
            alto: Math.round(rect.height),

            top: Math.round(y),
            bottom: Math.round(y + rect.height),

            centroX: Math.round(x + rect.width / 2),
            centroY: Math.round(y + rect.height / 2)
        };
    });

    return mensajes;
}


/* ---------------------------------------------------------
   2. MOSTRAR MENSAJES
   --------------------------------------------------------- */

function mostrarMensajesP5() {
    let mensajes = obtenerMensajesP5();

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

        let mensajes = obtenerMensajesP5();

        console.log(
            `%cP5 → ${mensajes.length} mensajes detectados`,
            'color: red; font-weight: bold;'
        );
        let conexiones = calcularConexionesP5(mensajes);

        console.log(
            `%cP5 → ${conexiones.length} conexiones calculadas`,
            'color: red; font-weight: bold;'
        );

        console.table(conexiones);

    });
}


/* ---------------------------------------------------------
   4. OBSERVAR EL PANEL DE MENSAJES
   --------------------------------------------------------- */

function observarPanelMensajesP5(panel) {
    let observerPanel = new MutationObserver(() => {
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
    let panel = document.querySelector(
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

    console.log(
        '%cP5 - Sistema de mensajes cargado',
        'color: red; font-weight: bold;'
    );
}


/* ---------------------------------------------------------
   7. INICIAR CUANDO EL BODY EXISTA
   --------------------------------------------------------- */

if (document.body) {
    iniciarSistemaMensajesP5();
} else {
    document.addEventListener(
        'DOMContentLoaded',
        iniciarSistemaMensajesP5,
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

    let x = mensaje.x + (mensaje.ancho * porcentajeHorizontal);

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

    let puntoSalida = calcularPuntoConexion(
        mensajeA,
        'salida'
    );

    let puntoEntrada = calcularPuntoConexion(
        mensajeB,
        'entrada'
    );

    return {
        desde: mensajeA.indice,
        hacia: mensajeB.indice,

        tipoDesde: mensajeA.tipo,
        tipoHacia: mensajeB.tipo,

        x1: puntoSalida.x,
        y1: puntoSalida.y,

        x2: puntoEntrada.x,
        y2: puntoEntrada.y
    };
}


/**
 * Calcula todas las conexiones entre mensajes
 * consecutivos.
 */
function calcularConexionesP5(mensajes) {

    let conexiones = [];

    for (let i = 0; i < mensajes.length - 1; i++) {

        let mensajeA = mensajes[i];
        let mensajeB = mensajes[i + 1];

        let distanciaVertical = Math.abs(
            mensajeB.centroY - mensajeA.centroY
        );

        // Evitar conexiones enormes por saltos de DOM/virtualización
        if (distanciaVertical > 400) {
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

    let mensajes = obtenerMensajesP5();

    let conexiones = calcularConexionesP5(
        mensajes
    );

    console.log(
        `%cP5 → ${conexiones.length} conexiones calculadas`,
        'color: red; font-weight: bold;'
    );

    console.table(conexiones);

    return conexiones;
}



window.mostrarMensajesP5 = mostrarMensajesP5;
window.mostrarConexionesP5 = mostrarConexionesP5;