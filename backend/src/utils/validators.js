/**
 * validators.js (backend)
 * Valida campos del body HTTP en los controllers ANTES de llamar al service.
 * Si falla -> el controller responde 400 sin llegar al service ni a Supabase.
 * Cada función: null = válido, string = mensaje de error.
 *
 * Las funciones comunes (correo, nombres, apellidos, otp) tienen
 * EXACTAMENTE el mismo nombre y lógica que en el frontend validators.js.
 * Las funciones de abajo (flujo, actividad, mensaje) son exclusivas
 * del backend porque el frontend nunca necesita validar esas cosas.
 */

//  Comunes con frontend

/** Correo con formato básico nombre@dominio.algo */
export function validarCorreo(correo) {
    if (!correo || typeof correo !== 'string' || !correo.trim()) {
        return 'El correo es requerido.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
        return 'El formato del correo no es válido.';
    }
    return null;
}

/** OTP de exactamente 6 dígitos numéricos */
export function validarOtp(token) {
    if (!token || typeof token !== 'string') return 'El código de verificación es requerido.';
    if (!/^\d{6}$/.test(token.trim())) return 'El código debe tener 6 dígitos numéricos.';
    return null;
}

/** Nombres del usuario - mínimo 2 caracteres */
export function validarNombres(valor) {
    if (!valor || typeof valor !== 'string' || !valor.trim()) {
        return 'Los nombres son requeridos.';
    }
    if (valor.trim().length < 2) return 'Los nombres deben tener al menos 2 caracteres.';
    return null;
}

/** Apellidos del usuario - mínimo 2 caracteres */
export function validarApellidos(valor) {
    if (!valor || typeof valor !== 'string' || !valor.trim()) {
        return 'Los apellidos son requeridos.';
    }
    if (valor.trim().length < 2) return 'Los apellidos deben tener al menos 2 caracteres.';
    return null;
}

//  Exclusivas del backend
// El frontend nunca valida estas porque son lógica de dominio del servidor.

/**
 * Flujo de autenticación - solo acepta 'login' o 'registro'.
 * El frontend ya sabe qué flujo es porque lo controla él mismo,
 * pero el backend debe verificarlo porque cualquiera puede enviar
 * un request HTTP con un flujo inventado.
 */
export function validarFlujo(flujo) {
    if (!flujo) return 'El flujo de autenticación es requerido.';
    if (!['login', 'registro'].includes(flujo)) return 'Flujo no válido.';
    return null;
}

/** Tipos de actividad aceptados por /api/actividades/sugerir */
const TIPOS_ACTIVIDAD = ['sopa_letras', 'crucigrama', 'verdadero_falso'];

/** Grados de primaria colombiana */
const GRADOS_PRIMARIA = ['1°', '2°', '3°', '4°', '5°'];

/** Valida el body de POST /api/actividades/sugerir */
export function validarSolicitudActividad({ tipo, tema, grado }) {
    // console.log('Validando solicitud de actividad:', { tipo, tema, grado });
    if (!tipo) return 'El tipo de actividad es requerido.';
    if (!TIPOS_ACTIVIDAD.includes(tipo)) return `Tipo de actividad no válido: ${tipo}.`;
    if (!tema || tema.trim().length < 2) return 'El tema debe tener al menos 2 caracteres.';
    if (!grado) return 'El grado es requerido.';
    if (!GRADOS_PRIMARIA.includes(grado)) {
        return `Grado no válido. Solo primaria: ${GRADOS_PRIMARIA.join(', ')}.`;
    }
    return null;
}

/**
 * Valida que un mensaje tenga al menos una forma de contenido.
 * Un mensaje puede tener texto, archivos nuevos (multer) o IDs de archivos
 * existentes - al menos uno debe estar presente.
 */
export function validarContenidoMensaje(contenido, archivosNuevos, idsExistentes) {
    const hayTexto = contenido && contenido.trim().length > 0;
    const hayArchivos = Array.isArray(archivosNuevos) && archivosNuevos.length > 0;
    const hayIds = Array.isArray(idsExistentes) && idsExistentes.length > 0;
    if (!hayTexto && !hayArchivos && !hayIds) return 'El mensaje no puede estar vacío.';
    return null;
}
