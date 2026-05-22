/**
 * useAuth.js - Estado de autenticación global
 *
 * Al cargar, verifica el JWT localmente antes de llamar al backend:
 *   Si está expirado -> renovar primero -> luego llamar al backend
 *   Si la renovación falla por red -> conservar tokens (son válidos)
 *   Si el servidor responde 401 -> limpiar sesión
 *
 * Renovación proactiva cada 50 min para evitar expiración durante el uso.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    obtenerSesionActual,
    cerrarSesion as cerrarSesionServicio,
    refrescarTokens,
    obtenerAccessToken,
    limpiarTokens,
} from '../services/auth.service.js';

const INTERVALO_RENOVACION_MS = 50 * 60 * 1000; // 50 minutos

//  Helpers para leer el JWT localmente

/** Extrae el campo exp (expiración en ms) del JWT sin llamar al servidor */
function obtenerExpiracionJWT(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp * 1000;
    } catch {
        return 0;
    }
}

/** true si el token ya expiró o expira en menos de 60 segundos */
function tokenEstaExpirado(token) {
    return obtenerExpiracionJWT(token) < Date.now() + 60_000;
}

//  Hook
export function useAuth() {
    const [usuario, setUsuario] = useState(null);
    const [perfil, setPerfil] = useState(null);
    const [cargando, setCargando] = useState(true);
    const navegar = useNavigate();
    const timerRenovar = useRef(null);

    const cargarSesion = useCallback(async () => {
        const accessToken = obtenerAccessToken();
        if (!accessToken) {
            setCargando(false);
            return;
        }

        // Verificar expiración localmente antes de tocar el backend
        if (tokenEstaExpirado(accessToken)) {
            try {
                const renovado = await refrescarTokens();
                if (!renovado) {
                    // refresh_token inválido -> sesión terminada
                    limpiarTokens();
                    setCargando(false);
                    return;
                }
                // Éxito: nuevos tokens ya guardados en localStorage, continuar
            } catch {
                // Error de red: tokens siguen válidos, no limpiar
                setCargando(false);
                return;
            }
        }

        try {
            const datos = await obtenerSesionActual();
            setUsuario(datos.usuario ?? null);
            setPerfil(datos.perfil ?? null);
        } catch (err) {
            if (err.estado === 401) limpiarTokens();
            // Cualquier otro error: no limpiar tokens
            setUsuario(null);
            setPerfil(null);
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        cargarSesion();
    }, [cargarSesion]);

    // Renovación proactiva cada 50 min
    useEffect(() => {
        timerRenovar.current = setInterval(async () => {
            if (!obtenerAccessToken()) return;
            try {
                await refrescarTokens();
            } catch {
                /* silencioso */
            }
        }, INTERVALO_RENOVACION_MS);
        return () => clearInterval(timerRenovar.current);
    }, []);

    const logout = useCallback(async () => {
        clearInterval(timerRenovar.current);
        try {
            await cerrarSesionServicio();
        } catch {
            limpiarTokens();
        } finally {
            setUsuario(null);
            setPerfil(null);
            navegar('/', { replace: true });
        }
    }, [navegar]);

    return { usuario, perfil, cargando, estaAutenticado: !!usuario, logout };
}
