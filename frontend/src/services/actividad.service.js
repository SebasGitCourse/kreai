// src/services/actividad.service.js

import { peticionProtegida } from '../config/api.js';

// Helper interno: parsea la respuesta y lanza error si no es ok
async function parsearRespuesta(res) {
    if (!res) return null;
    const datos = await res.json().catch(() => ({}));
    if (!res.ok) throw datos;

    console.log('Datos recibidos del backend:', datos);

    return datos;
}

/**
 * Envía el mensaje del docente al backend para detectar si pide una actividad.
 * @param {string} mensaje
 * @param {Array}  historial - últimos mensajes de la conversación
 */

//  Sugerir actividad

export async function sugerirActividad(mensaje, historial = []) {
    let datos = await peticionProtegida('/api/actividades/sugerir', {
        method: 'POST',
        body: JSON.stringify({ mensaje, historial }),
    });

    return parsearRespuesta(datos);
}

/**
 * Solicita la generación de la actividad al backend.
 * El backend devuelve el objeto completo con palabras e imágenes en base64.
 * No se almacena nada - solo vive en memoria hasta que el docente descarga.
 */
export async function generarCompletaVocales({ tema, grado, cantidad, titulo }) {
    const datos = await peticionProtegida('/api/actividades/completa-vocales', {
        method: 'POST',
        body: JSON.stringify({ tema, grado, cantidad: Number(cantidad), titulo }),
    });

    return parsearRespuesta(datos);
}

//  Generar imagen para una palabra manual

/**
 * Solicita al backend la imagen para una palabra ingresada manualmente.
 * Devuelve { palabra, palabraDisplay, imagen }.
 */
export async function generarImagenPalabra(palabra) {
    const res = await peticionProtegida('/api/actividades/imagen-palabra', {
        method: 'POST',
        body: JSON.stringify({ palabra }),
    });
    return parsearRespuesta(res);
}
