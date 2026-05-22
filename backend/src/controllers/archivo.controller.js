import { obtenerArchivosUsuario } from '../services/archivo.service.js';

/**
 * GET /api/archivos
 * Devuelve todos los archivos subidos por el usuario autenticado.
 */
export async function listarArchivos(req, res) {
    try {
        const archivos = await obtenerArchivosUsuario(req.usuario.id);
        res.json(archivos);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener archivos' });
    }
}
