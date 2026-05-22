import { supabase } from '../config/supabaseClient.js';

const BUCKET = 'archivo-usuario';
const TTL_URL = 3600;

/**
 * Obtiene todos los archivos del usuario con URLs firmadas.
 * La relación es N:M via mensaje_archivo -> mensaje, se toma
 * el id_conversacion del primer mensaje asociado encontrado.
 */
export async function obtenerArchivosUsuario(idUsuario) {
    const { data, error } = await supabase
        .from('archivo')
        .select(
            `
            id,
            nombre_original,
            nombre_almacenado,
            ruta_almacenamiento,
            tipo_mime,
            tamanio,
            fecha_creacion,
            mensaje_archivo(
                mensaje(id_conversacion)
            )
        `
        )
        .eq('id_usuario', idUsuario)
        .order('fecha_creacion', { ascending: false });

    if (error) throw error;

    return Promise.all(
        data.map(async (archivo) => {
            const { data: urlData } = await supabase.storage.from(BUCKET).createSignedUrl(archivo.ruta_almacenamiento, TTL_URL);

            const idConversacion = archivo.mensaje_archivo?.[0]?.mensaje?.id_conversacion || null;

            return {
                id: archivo.id,
                nombre_original: archivo.nombre_original,
                nombre_almacenado: archivo.nombre_almacenado,
                ruta_almacenamiento: archivo.ruta_almacenamiento,
                tipo_mime: archivo.tipo_mime,
                tamanio: archivo.tamanio,
                fecha_creacion: archivo.fecha_creacion,
                id_conversacion: idConversacion,
                url_firmada: urlData?.signedUrl || null,
            };
        })
    );
}
