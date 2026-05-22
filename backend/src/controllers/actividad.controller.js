/**
 * actividad.controller.js - Valida con validators.js, delega al servicio.
 */

import * as servicio from '../services/actividad.service.js';
import { validarSolicitudActividad } from '../utils/validators.js';

/** POST /api/actividades/sugerir */
export async function sugerirActividad(req, res) {
    // el body de la request viene del frontend como { mensaje: { tipo, tema, grado, cantidad } }
    const { tipo, tema, grado, cantidad } = req.body.mensaje;

    const error = validarSolicitudActividad({ tipo, tema, grado });
    if (error) return res.status(400).json({ error });

    try {
        const resultado = await servicio.sugerirActividad({
            tipo,
            tema: tema.trim(),
            grado,
            cantidad: cantidad ? Number(cantidad) : undefined,
        });

        console.log('Resultado sugerirActividad:', resultado);
        res.json(resultado);
    } catch (e) {
        console.error('actividad.controller error:', e?.message);
        res.status(503).json({
            error: 'El asistente no está disponible en este momento. Por favor intenta en unos segundos.',
        });
    }
}

/** POST /api/actividades/completa-vocales */
export async function completaVocales(req, res) {
    const { tema, grado, cantidad, titulo } = req.body;

    if (!tema || typeof tema !== 'string' || !tema.trim()) {
        return res.status(400).json({ error: 'El campo "tema" es requerido.' });
    }
    const cantidadNum = parseInt(cantidad, 10);
    if (![4, 6, 9, 16].includes(cantidadNum)) {
        return res.status(400).json({ error: 'La cantidad debe ser 4, 6, 9 o 16.' });
    }

    const gradosValidos = ['1°', '2°', '3°', '4°', '5°'];
    if (!gradosValidos.includes(grado)) {
        return res.status(400).json({ error: `El grado debe ser uno de: ${gradosValidos.join(', ')}.` });
    }

    try {
        const resultado = await servicio.generarCompletaVocales({
            tema: tema.trim(),
            grado,
            cantidad: cantidadNum,
            titulo: titulo?.trim() || '',
        });

        // console.log('Resultado completaVocales:', resultado);

        res.json(resultado);
    } catch (e) {
        console.error('actividad.controller completaVocales:', e?.message);
        res.status(503).json({
            error: e.message || 'Error al generar la actividad. Intenta de nuevo.',
        });
    }
}

/** POST /api/actividades/imagen-palabra */
export async function imagenPalabra(req, res) {
    const { palabra } = req.body;

    if (!palabra || typeof palabra !== 'string' || !palabra.trim()) {
        return res.status(400).json({ error: 'El campo "palabra" es requerido.' });
    }
    if (palabra.trim().length < 2) {
        return res.status(400).json({ error: 'La palabra debe tener al menos 2 letras.' });
    }

    try {
        const resultado = await servicio.generarImagenPalabra(palabra.trim());
        res.json(resultado);
    } catch (e) {
        console.error('actividad.controller imagenPalabra:', e?.message);
        res.status(503).json({
            error: e.message || 'Error al generar la imagen. Intenta de nuevo.',
        });
    }
}
