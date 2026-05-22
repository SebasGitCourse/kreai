/**
 * Cliente HTTP central del frontend.
 * Todas las peticiones al backend pasan por aquí.
 * peticionProtegida agrega el JWT y renueva el token automáticamente si expira.
 * peticionPublica se usa para endpoints de autenticación que no requieren JWT.
 *
 * Regla importante sobre errores de red en la renovación:
 * Si la renovación falla por error de red, no se limpia la sesión porque
 * el refresh_token sigue siendo válido. Solo se limpia si el servidor
 * responde 401 o 400, lo que indica que el token fue revocado o es inválido.
 */

export const API_URL = import.meta.env.VITE_API_URL;

const LLAVE_ACCESS = 'copilot_access_token';
const LLAVE_REFRESH = 'copilot_refresh_token';

// Promesa compartida de renovación para evitar múltiples renovaciones paralelas.
// Si varias peticiones reciben 401 al mismo tiempo, todas esperan esta misma
// promesa en lugar de cada una intentar renovar por su cuenta.
let promesaRenovacion = null;

function cerrarSesionLocal() {
    localStorage.removeItem(LLAVE_ACCESS);
    localStorage.removeItem(LLAVE_REFRESH);
    window.location.href = '/';
}

// Renueva el access_token usando el refresh_token guardado en localStorage.
// Devuelve el nuevo access_token si la renovación fue exitosa, o null si falló.
async function renovarTokenSilenciosamente() {
    const refreshToken = localStorage.getItem(LLAVE_REFRESH);
    if (!refreshToken) {
        cerrarSesionLocal();
        return null;
    }

    let respuesta;
    try {
        respuesta = await fetch(`${API_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
        });
    } catch {
        // Error de red: el refresh_token sigue válido, no limpiar sesión
        return null;
    }

    // 401 o 400 significa que el refresh_token es inválido o fue revocado
    if (respuesta.status === 401 || respuesta.status === 400) {
        cerrarSesionLocal();
        return null;
    }

    // Cualquier otro error del servidor es temporal, no limpiar sesión
    if (!respuesta.ok) return null;

    const datos = await respuesta.json().catch(() => null);
    if (!datos?.access_token) return null;

    localStorage.setItem(LLAVE_ACCESS, datos.access_token);
    localStorage.setItem(LLAVE_REFRESH, datos.refresh_token);
    return datos.access_token;
}

export async function peticionProtegida(ruta, opciones = {}) {
    const token = localStorage.getItem(LLAVE_ACCESS);
    const esForm = opciones.body instanceof FormData;

    const cabeceras = {
        ...(!esForm && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...opciones.headers,
    };

    let respuesta;
    try {
        respuesta = await fetch(`${API_URL}${ruta}`, { ...opciones, headers: cabeceras });
    } catch {
        throw Object.assign(new Error('Sin conexión con el servidor.'), { estado: 0 });
    }

    // Si el servidor responde 401, intentar renovar el token y reintentar la petición.
    // Se usa una promesa compartida para que múltiples peticiones concurrentes que
    // reciben 401 al mismo tiempo esperen la misma renovación en lugar de cada una
    // intentar renovar por separado, lo que causaría errores de token de un solo uso.
    if (respuesta.status === 401) {
        if (!promesaRenovacion) {
            promesaRenovacion = renovarTokenSilenciosamente().finally(() => {
                promesaRenovacion = null;
            });
        }

        const nuevoToken = await promesaRenovacion;

        // Si no se pudo renovar, renovarTokenSilenciosamente ya decidió si limpiar sesión
        if (!nuevoToken) return null;

        // Reintentar la petición original con el nuevo token
        try {
            return await fetch(`${API_URL}${ruta}`, {
                ...opciones,
                headers: {
                    ...(!esForm && { 'Content-Type': 'application/json' }),
                    Authorization: `Bearer ${nuevoToken}`,
                    ...opciones.headers,
                },
            });
        } catch {
            throw Object.assign(new Error('Sin conexión con el servidor.'), { estado: 0 });
        }
    }

    return respuesta;
}

// Petición sin autenticación, usada para los endpoints de auth (login, registro, etc.)
export async function peticionPublica(ruta, opciones = {}) {
    return fetch(`${API_URL}${ruta}`, {
        ...opciones,
        headers: { 'Content-Type': 'application/json', ...opciones.headers },
    });
}
