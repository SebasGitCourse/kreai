/**
 * conversacion.controller.js - Valida con validators.js, delega al servicio.
 * Maneja streaming SSE para los endpoints de mensajes.
 */

import * as servicio from '../services/conversacion.service.js';
import { validarContenidoMensaje } from '../utils/validators.js';

/** Configura headers para una respuesta SSE (Server-Sent Events) */
function iniciarSSE(res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
}

export async function listarConversaciones(req, res) {
    try {
        res.json(await servicio.listarConversaciones(req.usuario.id));
    } catch {
        res.status(500).json({ error: 'No se pudieron cargar las conversaciones.' });
    }
}

export async function crearConversacion(req, res) {
    try {
        res.status(201).json(await servicio.crearConversacion(req.usuario.id));
    } catch {
        res.status(500).json({ error: 'No se pudo crear la conversación.' });
    }
}

export async function eliminarConversacion(req, res) {
    try {
        await servicio.eliminarConversacion(req.params.id, req.usuario.id);
        res.json({ ok: true });
    } catch {
        res.status(500).json({ error: 'No se pudo eliminar la conversación.' });
    }
}

export async function obtenerMensajes(req, res) {
    try {
        res.json(await servicio.obtenerMensajes(req.params.id, req.usuario.id));
    } catch (e) {
        res.status(e.estado || 500).json({ error: e.message });
    }
}

export async function enviarMensaje(req, res) {
    iniciarSSE(res);

    let idsExistentes = [];
    try {
        idsExistentes = req.body.ids_archivos_existentes ? JSON.parse(req.body.ids_archivos_existentes) : [];
    } catch {
        idsExistentes = [];
    }

    const contenido = req.body.contenido || '';
    const archivosNuevos = req.files || [];

    const errorContenido = validarContenidoMensaje(contenido, archivosNuevos, idsExistentes);
    if (errorContenido) {
        res.write(`data: ${JSON.stringify({ tipo: 'error', mensaje: errorContenido })}\n\n`);
        return res.end();
    }

    try {
        await servicio.enviarMensajeStream(req.params.id, req.usuario.id, contenido, archivosNuevos, idsExistentes, res);
    } catch {
        if (!res.writableEnded) {
            res.write(`data: ${JSON.stringify({ tipo: 'error', mensaje: 'Error inesperado al enviar el mensaje.' })}\n\n`);
            res.end();
        }
    }
}

export async function reintentarMensaje(req, res) {
    iniciarSSE(res);
    try {
        await servicio.reintentarMensajeStream(req.params.id, req.params.id_mensaje, req.usuario.id, res);
    } catch {
        if (!res.writableEnded) {
            res.write(`data: ${JSON.stringify({ tipo: 'error', mensaje: 'Error inesperado al reintentar.' })}\n\n`);
            res.end();
        }
    }
}
