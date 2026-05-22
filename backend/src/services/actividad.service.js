/**
 * actividad.service.js - Generación de material educativo con IA
 * Construye prompts y llama a generarSugerenciaJSON() de groq.service.js.
 */

import { generarSugerenciaJSON } from './groq.service.js';
import { generarImagen } from './cloudflare.service.js';

async function generar(prompt, esquema) {
    return generarSugerenciaJSON(prompt, esquema);
}

export async function sugerirSopaLetras({ tema, grado, cantidad = 10 }) {
    return generar(
        `Crea una sopa de letras sobre "${tema}" para grado ${grado} de primaria colombiana. ` +
            `Genera exactamente ${cantidad} palabras: mayúsculas, sin tildes, sin espacios, 4-12 letras.`,
        `{"titulo":"string","instrucciones":"string","palabras":["PALABRA1","PALABRA2",...]}`
    );
}

export async function sugerirCrucigrama({ tema, grado, cantidad = 8 }) {
    return generar(
        `Crea un crucigrama sobre "${tema}" para grado ${grado} de primaria. ` +
            `Genera exactamente ${cantidad} palabras con pistas. Palabras en mayúsculas, sin tildes, 4-12 letras.`,
        `{"titulo":"string","instrucciones":"string","palabras":[{"palabra":"STRING","pista":"string"}]}`
    );
}

export async function sugerirVerdaderoFalso({ tema, grado, cantidad = 8 }) {
    return generar(
        `Crea actividad Verdadero o Falso sobre "${tema}" para grado ${grado} de primaria. ` +
            `Exactamente ${cantidad} enunciados, mitad verdaderos y mitad falsos.`,
        `{"titulo":"string","instrucciones":"string","enunciados":[{"texto":"string","respuesta":true}]}`
    );
}

/** Dispatcher usado por el controller - llama al generador correcto según el tipo */
export async function sugerirActividad({ tipo, tema, grado, cantidad }) {
    const mapa = {
        sopa_letras: () => sugerirSopaLetras({ tema, grado, cantidad }),
        crucigrama: () => sugerirCrucigrama({ tema, grado, cantidad }),
        verdadero_falso: () => sugerirVerdaderoFalso({ tema, grado, cantidad }),
    };
    return mapa[tipo]();
}

//  Helper: quita las vocales de una palabra y pone guion bajo
function quitarVocales(palabra) {
    const vocales = new Set(['A', 'E', 'I', 'O', 'U', 'Á', 'É', 'Í', 'Ó', 'Ú']);
    return palabra
        .toUpperCase()
        .split('')
        .map((c) => (vocales.has(c) ? '_' : c))
        .join(' '); // espacios entre letras para mejor legibilidad visual
}

//  Generar: Completa con vocales

/**
 * Genera la actividad "Completa con vocales":
 *  1. Pide las palabras estructuradas a Groq (via generarSugerenciaJSON)
 *  2. Genera las imágenes en paralelo (via cloudflare.service)
 *  3. Devuelve el objeto completo - SIN guardar nada en BD ni Storage
 *
 * @param {object} opciones
 * @param {string} opciones.tema
 * @param {string} opciones.grado
 * @param {number} opciones.cantidad   6 o 9
 * @param {string} [opciones.titulo]
 */
export async function generarCompletaVocales({ tema, grado, cantidad, titulo }) {
    // 1. Groq genera las palabras via el helper generar() ya existente
    const datos = await generar(
        `Genera exactamente ${cantidad} palabras en español para la actividad "completa las vocales" ` +
            `para estudiantes de ${grado} de primaria colombiana. Tema: "${tema}". ` +
            `Requisitos: sustantivos simples y conocidos por niños de ${grado}, ` +
            `entre 3 y 10 letras, mínimo 2 vocales cada una, fácilmente ilustrables. ` +
            `No repitas palabras similares. ` +
            `Para cada palabra incluye una descripción corta en inglés (máximo 5 palabras) ` +
            `del objeto para poder ilustrarlo, formato "a [adjetivo] [sustantivo]".`,
        `{"palabras":[{"palabra":"GATO","descripcionEn":"a cute sitting cat"},{"palabra":"MESA","descripcionEn":"a wooden table"}]}`
    );

    if (!Array.isArray(datos?.palabras) || datos.palabras.length === 0) {
        throw new Error('El modelo no generó palabras válidas. Intenta con otro tema.');
    }

    const palabras = datos.palabras.slice(0, cantidad);

    // 2. Imágenes en paralelo - si una falla, continúa con null (no rompe toda la actividad)
    const palabrasConImagenes = await Promise.all(
        palabras.map(async (item) => {
            let imagen = null;
            try {
                imagen = await generarImagen(item.descripcionEn);
            } catch (err) {
                console.warn(`[actividad.service] Imagen falló para "${item.palabra}":`, err.message);
            }

            return {
                palabra: item.palabra.toUpperCase(),
                palabraDisplay: quitarVocales(item.palabra),
                imagen, // base64 o null
            };
        })
    );

    return {
        titulo: titulo?.trim() || `Completa las vocales - ${tema}`,
        instruccion: 'COMPLETA ESTAS PALABRAS CON LAS VOCALES QUE FALTAN.',
        grado,
        cantidad: palabrasConImagenes.length,
        palabras: palabrasConImagenes,
    };
}

//  Generar imagen para una sola palabra (ingresada manualmente)

/**
 * Dado el texto de una palabra en español:
 *  1. Pide a Groq una descripción corta en inglés para ilustrarla
 *  2. Genera la imagen con Cloudflare
 *  3. Devuelve { palabra, palabraDisplay, imagen } listo para el frontend
 */
export async function generarImagenPalabra(palabra) {
    const palabraLimpia = palabra.toUpperCase().trim();

    // Groq describe la palabra en inglés para el prompt de imagen
    const datos = await generar(
        `Dada la palabra en español "${palabraLimpia}", escribe una descripción corta en inglés ` +
            `(máximo 5 palabras) para ilustrarla como clipart infantil educativo. ` +
            `Formato obligatorio: "a [adjetivo opcional] [sustantivo]". Ejemplo: "a cute red apple".`,
        `{"descripcionEn":"a cute red apple"}`
    );

    const descripcion = datos?.descripcionEn || `a ${palabraLimpia.toLowerCase()}`;

    let imagen = null;
    try {
        imagen = await generarImagen(descripcion);
    } catch (err) {
        console.warn(`[actividad.service] Imagen falló para "${palabraLimpia}":`, err.message);
    }

    return {
        palabra: palabraLimpia,
        palabraDisplay: quitarVocales(palabraLimpia),
        imagen,
    };
}
