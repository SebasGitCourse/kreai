import { peticionProtegida } from '../config/api.js';

/**
 * Obtiene todos los archivos subidos por el usuario autenticado.
 * Incluye URLs firmadas listas para mostrar.
 */
export async function listarArchivos() {
    const res = await peticionProtegida('/api/archivos');
    if (!res) return [];
    const datos = await res.json().catch(() => ({}));
    if (!res.ok) throw datos;
    return datos;
}
