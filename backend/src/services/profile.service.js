import { supabase } from '../config/supabaseClient.js';

/**
 * Verifica si ya existe un perfil completo con ese correo en public.perfil.
 *
 * Esta función es la ÚNICA fuente de verdad para saber si un usuario
 * completó el registro. Un usuario puede existir en auth.users sin tener
 * perfil (abandonó el flujo antes de verificar el OTP), y en ese caso
 * se considera NO registrado.
 *
 * @returns {boolean} true si el correo tiene perfil completo.
 */
export async function correoYaRegistrado(correo) {
  const { data, error } = await supabase
    .from('perfil')
    .select('id')
    .eq('correo', correo.trim().toLowerCase())
    .maybeSingle();

  if (error) {
    console.error('[profile.service] Error al verificar correo en perfil:', error.message);
    return false;
  }

  return data !== null;
}

/**
 * Crea o actualiza el perfil en public.perfil.
 * Solo se llama tras verificar el OTP correctamente.
 * Columnas exactas del esquema: id, correo, nombres, apellidos,
 * fecha_creacion (auto por DB), fecha_actualizacion.
 */
export async function crearOActualizarPerfil({ id, correo, nombres, apellidos }) {
  const { data, error } = await supabase
    .from('perfil')
    .upsert(
      {
        id,
        correo:              correo.trim().toLowerCase(),
        nombres:             nombres.trim(),
        apellidos:           apellidos.trim(),
        fecha_actualizacion: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (error) {
    throw new Error(error.message ?? 'Error al guardar el perfil en la base de datos.');
  }

  return data;
}

/**
 * Obtiene el perfil de un usuario por su id (UUID de auth.users).
 * Retorna null si aún no existe perfil.
 */
export async function obtenerPerfil(id) {
  const { data, error } = await supabase
    .from('perfil')
    .select('id, correo, nombres, apellidos, fecha_creacion, fecha_actualizacion')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(error.message ?? 'Error al obtener el perfil.');
  }

  return data;
}