/**
 * auth.service.js (frontend) - Peticiones a /api/auth/*
 *
 * CONTRATOS de llamada (deben coincidir con cómo los llaman los formularios):
 *
 *   LoginForm.jsx      -> enviarOtpLogin(correo)
 *   RegisterForm.jsx   -> enviarOtpRegistro(correo)
 *   VerifyCodeForm.jsx -> verificarOtp({ correo, token, flujo, nombres, apellidos })
 *                     -> reenviarOtp(correo, esRegistro)
 */

import { peticionPublica, peticionProtegida } from '../config/api.js';

const LLAVE_ACCESS = 'copilot_access_token';
const LLAVE_REFRESH = 'copilot_refresh_token';

//  Tokens

/** Devuelve el access_token guardado, o null si no hay sesión */
export function obtenerAccessToken() {
    return localStorage.getItem(LLAVE_ACCESS);
}

/** Elimina ambos tokens - al cerrar sesión o en 401 sin recuperación */
export function limpiarTokens() {
    localStorage.removeItem(LLAVE_ACCESS);
    localStorage.removeItem(LLAVE_REFRESH);
}

//  Auth

/**
 * Envía OTP de login.
 * Llamado por LoginForm.jsx: enviarOtpLogin(correo)
 */
export async function enviarOtpLogin(correo) {
    const res = await peticionPublica('/api/auth/login-otp', {
        method: 'POST',
        body: JSON.stringify({ correo }),
    });
    const datos = await res.json().catch(() => ({}));
    if (!res.ok) throw datos;
    return datos;
}

/**
 * Envía OTP de registro.
 * Llamado por RegisterForm.jsx: enviarOtpRegistro(correo)
 */
export async function enviarOtpRegistro(correo) {
    const res = await peticionPublica('/api/auth/register-otp', {
        method: 'POST',
        body: JSON.stringify({ correo }),
    });
    const datos = await res.json().catch(() => ({}));
    if (!res.ok) throw datos;
    return datos;
}

/**
 * Verifica el código OTP ingresado por el usuario.
 *
 * Llamado por VerifyCodeForm.jsx como:
 *   verificarOtp({ correo, token, flujo, nombres, apellidos })
 *
 * Recibe UN OBJETO porque el formulario maneja todos los campos juntos.
 * Los desestructuramos aquí para construir el body correctamente.
 */
export async function verificarOtp({ correo, token, flujo, nombres, apellidos }) {
    const res = await peticionPublica('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ correo, token, flujo, nombres, apellidos }),
    });

    const datos = await res.json().catch(() => ({}));
    if (!res.ok) throw datos;

    // Guardar tokens al verificar exitosamente
    localStorage.setItem(LLAVE_ACCESS, datos.access_token);
    localStorage.setItem(LLAVE_REFRESH, datos.refresh_token);
    return datos;
}

/**
 * Reenvía el código OTP.
 *
 * Llamado por VerifyCodeForm.jsx como:
 *   reenviarOtp(correo, flujo === 'registro')
 *
 * El segundo parámetro (esRegistro) no se usa en el backend -
 * el endpoint /api/auth/resend-otp solo necesita el correo.
 * Lo ignoramos aquí.
 */
export async function reenviarOtp(correo, flujo) {
    const res = await peticionPublica('/api/auth/resend-otp', {
        method: 'POST',
        body: JSON.stringify({ correo, flujo }),
    });
    const datos = await res.json().catch(() => ({}));
    if (!res.ok) throw datos;
    return datos;
}

//  Sesión

/**
 * Obtiene los datos del usuario autenticado.
 * Llamado por useAuth.js al cargar la app.
 */
export async function obtenerSesionActual() {
    const res = await peticionProtegida('/api/auth/me');
    if (!res) throw Object.assign(new Error('Sin sesión'), { estado: 401 });
    const datos = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(datos, { estado: res.status });
    return datos;
}

/**
 * Cierra la sesión del usuario.
 * Siempre limpia los tokens aunque el backend falle.
 */
export async function cerrarSesion() {
    try {
        await peticionProtegida('/api/auth/logout', { method: 'POST' });
    } finally {
        limpiarTokens();
    }
}

/**
 * Renueva el access_token usando el refresh_token.
 * Llamado por useAuth.js (intervalo 50 min) y por api.js (en 401).
 *
 * @returns {{ access_token, refresh_token } | null}
 */
export async function refrescarTokens() {
    const refreshToken = localStorage.getItem(LLAVE_REFRESH);
    if (!refreshToken) return null;

    const res = await peticionPublica('/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;

    const datos = await res.json().catch(() => null);
    if (!datos) return null;

    localStorage.setItem(LLAVE_ACCESS, datos.access_token);
    localStorage.setItem(LLAVE_REFRESH, datos.refresh_token);
    return datos;
}
