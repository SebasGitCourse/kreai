/**
 * auth.controller.js
 * Valida con validators.js, delega al service.
 */

import * as servicio from '../services/auth.service.js';
import { validarCorreo, validarOtp, validarFlujo, validarNombres, validarApellidos } from '../utils/validators.js';

export async function loginOtp(req, res) {
    const { correo } = req.body;
    const err = validarCorreo(correo);
    if (err) return res.status(400).json({ error: err, code: 'CORREO_INVALIDO' });
    try {
        await servicio.enviarOtpLogin(correo.trim());
        res.json({ ok: true });
    } catch (e) {
        res.status(e.estado || 500).json({ error: e.message, code: e.code });
    }
}

export async function registroOtp(req, res) {
    const { correo } = req.body;
    const err = validarCorreo(correo);
    if (err) return res.status(400).json({ error: err, code: 'CORREO_INVALIDO' });
    try {
        await servicio.enviarOtpRegistro(correo.trim());
        res.json({ ok: true });
    } catch (e) {
        res.status(e.estado || 500).json({ error: e.message, code: e.code });
    }
}

export async function verificarOtpHandler(req, res) {
    const { correo, token, flujo, nombres, apellidos } = req.body;
    // VERIFICAR DATOS ENVIADOS EN LA SOLICITUD
    console.log(JSON.stringify(req.body, null, 2));

    const errCorreo = validarCorreo(correo);
    if (errCorreo) return res.status(400).json({ error: errCorreo, code: 'CORREO_INVALIDO' });

    const errOtp = validarOtp(token);
    if (errOtp) return res.status(400).json({ error: errOtp, code: 'OTP_INVALIDO_FORMATO' });

    const errFlujo = validarFlujo(flujo);
    if (errFlujo) return res.status(400).json({ error: errFlujo, code: 'FLUJO_INVALIDO' });

    // Nombres y apellidos solo son obligatorios en registro
    if (flujo === 'registro') {
        const errNombres = validarNombres(nombres);
        const errApellidos = validarApellidos(apellidos);
        if (errNombres) return res.status(400).json({ error: errNombres, code: 'NOMBRES_INVALIDOS' });
        if (errApellidos) return res.status(400).json({ error: errApellidos, code: 'APELLIDOS_INVALIDOS' });
    }

    try {
        const tokens = await servicio.verificarOtp(correo.trim(), token.trim(), flujo, nombres, apellidos);
        res.json(tokens);
    } catch (e) {
        res.status(e.estado || 500).json({ error: e.message, code: e.code });
    }
}

export async function reenviarOtpHandler(req, res) {
    const { correo, flujo } = req.body; // ahora también recibe flujo

    const errCorreo = validarCorreo(correo);
    if (errCorreo) return res.status(400).json({ error: errCorreo, code: 'CORREO_INVALIDO' });

    // flujo es necesario para saber qué tipo enviar a Supabase
    const errFlujo = validarFlujo(flujo);
    if (errFlujo) return res.status(400).json({ error: errFlujo, code: 'FLUJO_INVALIDO' });

    try {
        await servicio.reenviarOtp(correo.trim(), flujo);
        res.json({ ok: true });
    } catch (e) {
        res.status(e.estado || 500).json({ error: e.message, code: e.code });
    }
}

export async function obtenerSesion(req, res) {
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    try {
        const datos = await servicio.obtenerSesionActual(accessToken);
        res.json(datos);
    } catch (e) {
        res.status(e.estado || 500).json({ error: e.message });
    }
}

export async function logout(req, res) {
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    try {
        await servicio.cerrarSesion(accessToken);
    } catch {
        /* silencioso */
    }
    res.json({ ok: true });
}

export async function renovarTokenHandler(req, res) {
    const { refresh_token } = req.body;
    if (!refresh_token || typeof refresh_token !== 'string') {
        return res.status(400).json({ error: 'Token de renovación no proporcionado.' });
    }
    try {
        const nuevosTokens = await servicio.renovarSesion(refresh_token);
        res.json(nuevosTokens);
    } catch {
        res.status(401).json({ error: 'La sesión expiró. Por favor inicia sesión de nuevo.' });
    }
}
