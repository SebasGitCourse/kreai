/**
 * auth.service.js - Lógica de autenticación con Supabase.
 * Único archivo que usa supabase.auth.*
 *
 * Flujo de sesión:
 *   access_token  -> JWT, dura 1 hora
 *   refresh_token -> cadena única, no expira, solo se usa una vez
 *   Al usar el refresh_token se obtiene un nuevo par de tokens.
 */

import { supabase } from '../config/supabaseClient.js';

/** Textos que Supabase devuelve en rate limit - no son errores reales */
const TEXTOS_RATE_LIMIT = ['security purposes', 'only request this after', 'rate limit'];

function esRateLimit(mensaje) {
    if (!mensaje) return false;
    return TEXTOS_RATE_LIMIT.some((t) => mensaje.toLowerCase().includes(t));
}

//  OTP

/** Envía OTP de login - requiere que el usuario ya exista en public.perfil */
export async function enviarOtpLogin(correo) {
    const { data: perfil } = await supabase.from('perfil').select('id').eq('correo', correo).single();

    if (!perfil) {
        throw Object.assign(new Error('No encontramos una cuenta con ese correo.'), { code: 'USUARIO_NO_ENCONTRADO', estado: 404 });
    }

    const { error } = await supabase.auth.signInWithOtp({
        email: correo,
        options: { shouldCreateUser: false },
    });
    if (error && !esRateLimit(error.message)) {
        throw Object.assign(new Error(error.message), { estado: 400 });
    }
}

/** Envía OTP de registro - requiere que el correo NO exista en public.perfil */
export async function enviarOtpRegistro(correo) {
    const { data: existente } = await supabase.from('perfil').select('id').eq('correo', correo).single();

    if (existente) {
        throw Object.assign(new Error('Ya existe una cuenta con ese correo.'), { code: 'CORREO_YA_REGISTRADO', estado: 409 });
    }

    const { error } = await supabase.auth.signInWithOtp({
        email: correo,
        options: { shouldCreateUser: true },
    });
    if (error && !esRateLimit(error.message)) {
        throw Object.assign(new Error(error.message), { estado: 400 });
    }
}

/** Verifica el OTP; en registro crea el perfil en public.perfil */
export async function verificarOtp(correo, token, flujo, nombres, apellidos) {
    const { data, error } = await supabase.auth.verifyOtp({
        email: correo,
        token,
        type: 'email',
    });

    if (error || !data?.session) {
        throw Object.assign(new Error('Código incorrecto o expirado.'), { code: 'OTP_INVALIDO', estado: 400 });
    }

    const { session, user } = data;

    if (flujo === 'registro') {
        const { data: yaExiste } = await supabase.from('perfil').select('id').eq('id', user.id).single();

        if (!yaExiste) {
            const { error: errPerfil } = await supabase.from('perfil').insert({
                id: user.id,
                correo,
                nombres: nombres || '',
                apellidos: apellidos || '',
            });
            if (errPerfil) throw Object.assign(new Error(errPerfil.message), { estado: 500 });
        }
    }

    return { access_token: session.access_token, refresh_token: session.refresh_token };
}

/** Reenvía el OTP - los errores de rate limit se ignoran */
export async function reenviarOtp(correo, flujo) {
    let error = null;

    if (flujo === 'registro') {
        const response = await supabase.auth.signInWithOtp({
            email: correo,
            options: {
                shouldCreateUser: true,
            },
        });

        error = response.error;
    } else {
        console.log('CORREO REENVIAROTP: ' + correo);
        const response = await supabase.auth.signInWithOtp({
            email: correo,
            options: {
                shouldCreateUser: false,
            },
        });
        console.log('ERROR REENVIAROTP :' + error);

        error = response.error;
    }

    if (error) {
        throw Object.assign(new Error(error.message), {
            estado: error.status ?? 400,
            code: error.code,
        });
    }
}

//  Sesión

/** Valida el access_token y devuelve usuario + perfil */
export async function obtenerSesionActual(accessToken) {
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data?.user) {
        throw Object.assign(new Error('Token inválido o expirado.'), { estado: 401 });
    }

    const { data: perfil } = await supabase.from('perfil').select('*').eq('id', data.user.id).single();

    if (!perfil) {
        throw Object.assign(new Error('Perfil no encontrado.'), { estado: 401 });
    }

    return { usuario: data.user, perfil };
}

/** Invalida la sesión en Supabase */
export async function cerrarSesion(accessToken) {
    try {
        await supabase.auth.admin.signOut(accessToken);
    } catch {
        /* silencioso */
    }
}

/**
 * Renueva el access_token usando el refresh_token.
 * El refresh_token no expira pero solo puede usarse UNA VEZ.
 * Después de usarlo, se recibe un nuevo par de tokens.
 */
export async function renovarSesion(refreshToken) {
    const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
    });

    if (error || !data?.session) {
        throw Object.assign(new Error('La sesión expiró completamente.'), { estado: 401 });
    }

    return {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
    };
}
