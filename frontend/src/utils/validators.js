/**
 * Validaciones del lado cliente para UX inmediata.
 * El backend tiene su propio conjunto de validaciones como segunda defensa.
 */

export function validarCorreo(correo) {
    if (!correo || correo.trim() === '') {
        return 'El correo electrónico es obligatorio.';
    }
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!regex.test(correo.trim())) {
        return 'Ingresa un correo electrónico válido (ejemplo: usuario@dominio.com).';
    }
    return null;
}

export function validarNombres(nombres) {
    if (!nombres || nombres.trim() === '') return 'Los nombres son obligatorios.';
    if (nombres.trim().length < 2) return 'Los nombres deben tener al menos 2 caracteres.';
    if (nombres.trim().length > 100) return 'Los nombres no pueden superar los 100 caracteres.';
    const regex = /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s'-]+$/;
    if (!regex.test(nombres.trim())) {
        return 'Los nombres solo pueden contener letras, espacios, apóstrofes o guiones.';
    }
    return null;
}

export function validarApellidos(apellidos) {
    if (!apellidos || apellidos.trim() === '') return 'Los apellidos son obligatorios.';
    if (apellidos.trim().length < 2) return 'Los apellidos deben tener al menos 2 caracteres.';
    if (apellidos.trim().length > 100) return 'Los apellidos no pueden superar los 100 caracteres.';
    const regex = /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s'-]+$/;
    if (!regex.test(apellidos.trim())) {
        return 'Los apellidos solo pueden contener letras, espacios, apóstrofes o guiones.';
    }
    return null;
}

// Validación de OTP: Especificamente para el caso en el que se manipula el DOM.
export function validarOtp(otp) {
    if (!otp) return 'El código de verificación es obligatorio.';
    if (!/^\d{6}$/.test(otp)) return 'El código debe ser exactamente 6 dígitos numéricos.';
    return null;
}
