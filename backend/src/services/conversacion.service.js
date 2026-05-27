/**
 * conversacion.service.js - Lógica de conversaciones y streaming de mensajes
 *
 * Enrutamiento de archivos:
 *   imagen      -> cloudflare.service.js -> descripción de texto (se guarda en contenido_extraido)
 *   PDF / Word  -> extraerTextoArchivo() en groq.service.js (se guarda en contenido_extraido)
 *   Solo texto  -> groq.service.js directamente
 *
 * Relación archivos N:M:
 *   Un archivo físico existe una sola vez en Storage y en tabla archivo.
 *   La tabla mensaje_archivo asocia archivos a mensajes sin duplicar.
 *   Al eliminar conversación, el trigger fn_limpiar_archivos_huerfanos
 *   elimina de BD los archivos sin referencias; el servicio limpia Storage.
 *
 * Historial:
 *   Siempre se toman los MAX_HISTORIAL mensajes ANTERIORES al mensaje actual,
 *   nunca posteriores. Aplica igual para mensaje nuevo, regenerar y reintentar.
 */

import { supabase } from '../config/supabaseClient.js';
import { extraerTextoArchivo, generarRespuestaStream } from './groq.service.js';
import { analizarImagen } from './cloudflare.service.js';

const BUCKET = 'archivo-usuario';
const MAX_HISTORIAL = 20;
const TTL_URL = 3600;
const LIMITE_PALABRAS = 1500;
const LIMITE_ARCHIVOS = 3;

// Escribe un evento SSE y lo descarga inmediatamente al cliente.
// res.flush() es necesario cuando hay middleware de compresión o proxies intermedios.
function escribirSSE(res, evento) {
    res.write(`data: ${JSON.stringify(evento)}\n\n`);
    if (typeof res.flush === 'function') res.flush();
}

// Conversaciones

export async function listarConversaciones(idUsuario) {
    const { data, error } = await supabase
        .from('conversacion')
        .select('id,titulo,fecha_creacion,fecha_actualizacion')
        .eq('id_usuario', idUsuario)
        .order('fecha_actualizacion', { ascending: false });
    if (error) throw error;
    return data;
}

export async function crearConversacion(idUsuario) {
    const { data, error } = await supabase.from('conversacion').insert({ id_usuario: idUsuario, titulo: 'Nueva conversación' }).select().single();
    if (error) throw error;
    return data;
}

export async function eliminarConversacion(id, idUsuario) {
    // 1. Identificar archivos que podrían quedar huérfanos tras eliminar esta conversación
    const { data: mensajes } = await supabase.from('mensaje').select('id').eq('id_conversacion', id);

    const idsMensajes = (mensajes || []).map((m) => m.id);
    let archivosAVerificar = [];

    if (idsMensajes.length) {
        const { data: assocs } = await supabase
            .from('mensaje_archivo')
            .select('id_archivo, archivo(ruta_almacenamiento)')
            .in('id_mensaje', idsMensajes);

        archivosAVerificar = (assocs || []).map((a) => ({
            id: a.id_archivo,
            ruta: a.archivo?.ruta_almacenamiento,
        }));
    }

    // 2. Eliminar conversación (cascade -> mensajes -> mensaje_archivo -> archivo si huérfano via trigger)
    const { error } = await supabase.from('conversacion').delete().eq('id', id).eq('id_usuario', idUsuario);
    if (error) throw error;

    // 3. Limpiar de Storage los archivos que el trigger eliminó de BD (quedaron huérfanos)
    if (archivosAVerificar.length) {
        const idsVerificar = archivosAVerificar.map((a) => a.id);
        const { data: aunExisten } = await supabase.from('archivo').select('id').in('id', idsVerificar);

        const idsQueExisten = new Set((aunExisten || []).map((a) => a.id));
        const rutasHuerfanas = archivosAVerificar
            .filter((a) => !idsQueExisten.has(a.id))
            .map((a) => a.ruta)
            .filter(Boolean);

        if (rutasHuerfanas.length) {
            await supabase.storage.from(BUCKET).remove(rutasHuerfanas);
        }
    }
}

export async function obtenerMensajes(idConversacion, idUsuario) {
    const { data: conv } = await supabase.from('conversacion').select('id').eq('id', idConversacion).eq('id_usuario', idUsuario).single();
    if (!conv) throw Object.assign(new Error('Conversación no encontrada.'), { estado: 404 });

    const { data, error } = await supabase
        .from('mensaje')
        .select(
            `
            id, rol, contenido, fecha_creacion,
            mensaje_archivo(
                archivo(id, nombre_original, nombre_almacenado, ruta_almacenamiento, tipo_mime, tamanio)
            )
        `
        )
        .eq('id_conversacion', idConversacion)
        .order('fecha_creacion', { ascending: true });
    if (error) throw error;

    return Promise.all(
        data.map(async (msg) => {
            const archivosRaw = (msg.mensaje_archivo || []).map((ma) => ma.archivo).filter(Boolean);
            const { mensaje_archivo: _, ...msgLimpio } = msg;
            if (!archivosRaw.length) return { ...msgLimpio, archivos: [] };
            const archivos = await Promise.all(
                archivosRaw.map(async (a) => {
                    const { data: u } = await supabase.storage.from(BUCKET).createSignedUrl(a.ruta_almacenamiento, TTL_URL);
                    return { ...a, url_firmada: u?.signedUrl || null };
                })
            );
            return { ...msgLimpio, archivos };
        })
    );
}

// Utilidades internas

async function guardarMensaje(idConversacion, rol, contenido) {
    const { data, error } = await supabase.from('mensaje').insert({ id_conversacion: idConversacion, rol, contenido }).select().single();
    if (error) throw error;
    return data;
}

async function actualizarMensaje(id, contenido) {
    const { data, error } = await supabase.from('mensaje').update({ contenido }).eq('id', id).select().single();
    if (error) throw error;
    return data;
}

async function eliminarMensaje(id) {
    await supabase.from('mensaje').delete().eq('id', id);
}

async function insertarArchivoEnBD(archivo, idUsuario) {
    const { data, error } = await supabase
        .from('archivo')
        .insert({
            id_usuario: idUsuario,
            nombre_original: archivo.nombre_original,
            nombre_almacenado: archivo.nombre_almacenado,
            ruta_almacenamiento: archivo.ruta_almacenamiento,
            tipo_mime: archivo.tipo_mime,
            tamanio: archivo.tamanio,
            contenido_extraido: archivo.contenido_extraido ?? null,
        })
        .select()
        .single();
    if (error) throw error;
    return data;
}

async function asociarArchivoAMensaje(idArchivo, idMensaje) {
    const { error } = await supabase.from('mensaje_archivo').insert({ id_mensaje: idMensaje, id_archivo: idArchivo });
    if (error) throw error;
}

async function insertarArchivosEnBD(idMensaje, archivos, idUsuario) {
    if (!archivos.length) return [];
    const resultados = [];
    for (const a of archivos) {
        const registro = await insertarArchivoEnBD(a, idUsuario);
        await asociarArchivoAMensaje(registro.id, idMensaje);
        resultados.push(registro);
    }
    return resultados;
}

async function asociarArchivosExistentesAMensaje(idMensaje, idsArchivos) {
    for (const idArchivo of idsArchivos) {
        await asociarArchivoAMensaje(idArchivo, idMensaje);
    }
}

async function subirAlStorage(archivos, idUsuario) {
    const resultado = [];
    for (const f of archivos) {
        const ext = f.originalname.split('.').pop();
        const nombre = `${idUsuario}_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const ruta = `${idUsuario}/${nombre}`;
        const { error } = await supabase.storage.from(BUCKET).upload(ruta, f.buffer, { contentType: f.mimetype });
        if (error) throw error;
        resultado.push({
            nombre_original: f.originalname,
            nombre_almacenado: nombre,
            ruta_almacenamiento: ruta,
            tipo_mime: f.mimetype,
            tamanio: f.size,
            buffer: f.buffer,
            textoFormateado: f.textoFormateado ?? null,
            contenido_extraido: f.contenido_extraido ?? null,
        });
    }
    return resultado;
}

// Descarga archivos existentes de Storage para procesamiento IA.
// Incluye contenido_extraido para evitar re-extracción en construirPartesMensaje.
async function descargarArchivosExistentes(ids, idUsuario) {
    if (!ids.length) return [];
    const { data } = await supabase
        .from('archivo')
        .select('id,nombre_original,nombre_almacenado,ruta_almacenamiento,tipo_mime,tamanio,contenido_extraido')
        .in('id', ids)
        .eq('id_usuario', idUsuario);
    if (!data) return [];
    return Promise.all(
        data.map(async (a) => {
            const { data: f } = await supabase.storage.from(BUCKET).download(a.ruta_almacenamiento);
            return { ...a, buffer: f ? Buffer.from(await f.arrayBuffer()) : null };
        })
    );
}

async function obtenerMetadatosArchivosExistentes(ids, idUsuario) {
    if (!ids.length) return [];
    const { data } = await supabase
        .from('archivo')
        .select('id,nombre_original,nombre_almacenado,ruta_almacenamiento,tipo_mime,tamanio')
        .in('id', ids)
        .eq('id_usuario', idUsuario);
    if (!data) return [];
    return Promise.all(
        data.map(async (a) => {
            const { data: u } = await supabase.storage.from(BUCKET).createSignedUrl(a.ruta_almacenamiento, TTL_URL);
            return { ...a, url_firmada: u?.signedUrl || null };
        })
    );
}

/**
 * Obtiene hasta MAX_HISTORIAL mensajes ANTERIORES a anteDeFecha, en orden cronológico.
 * Nunca incluye el mensaje actual ni mensajes posteriores a él.
 * Si anteDeFecha es null toma los más recientes (caso de primer mensaje sin historial previo conocido).
 */
async function obtenerHistorial(idConversacion, excluirId = null, anteDeFecha = null) {
    let query = supabase
        .from('mensaje')
        .select(
            `
            id, rol, contenido,
            mensaje_archivo(
                archivo(nombre_original, tipo_mime, contenido_extraido)
            )
        `
        )
        .eq('id_conversacion', idConversacion)
        .order('fecha_creacion', { ascending: false })
        .limit(MAX_HISTORIAL);

    // Filtrar mensajes posteriores o iguales al mensaje actual
    if (anteDeFecha) {
        query = query.lt('fecha_creacion', anteDeFecha);
    }

    const { data } = await query;
    if (!data) return [];
    return data
        .reverse()
        .filter((m) => m.id !== excluirId)
        .map((m) => ({
            id: m.id,
            rol: m.rol,
            contenido: m.contenido,
            archivos: (m.mensaje_archivo || []).map((ma) => ma.archivo).filter(Boolean),
        }));
}

async function urlsFirmadas(archivos) {
    return Promise.all(
        archivos.map(async (a) => {
            const { data: u } = await supabase.storage.from(BUCKET).createSignedUrl(a.ruta_almacenamiento, TTL_URL);
            return { ...a, url_firmada: u?.signedUrl || null };
        })
    );
}

/**
 * Valida la entrada completa antes de tocar Storage o BD.
 * Devuelve { valido, errores, archivosConTexto }
 *   - valido: false si cualquier regla falla
 *   - errores: array de strings para mostrar al usuario
 *   - archivosConTexto: archivos enriquecidos con textoFormateado y contenido_extraido
 *
 * Reglas:
 *   1. Máximo LIMITE_ARCHIVOS archivos por mensaje (nuevos + existentes)
 *   2. Texto del usuario ≤ LIMITE_PALABRAS
 *   3. Cada archivo nuevo legible individualmente ≤ LIMITE_PALABRAS
 *   4. Cada archivo existente reutilizado ≤ LIMITE_PALABRAS
 *   5. Suma total (texto + todos los archivos) ≤ LIMITE_PALABRAS
 *   6. Si cualquier archivo falla, todo el mensaje es inválido
 */
async function validarEntradaCompleta(archivosNuevos, contenido, idsExistentes = []) {
    const errores = [];

    // Regla 1: máximo de archivos (nuevos + existentes)
    const totalArchivos = archivosNuevos.length + idsExistentes.length;
    if (totalArchivos > LIMITE_ARCHIVOS) {
        errores.push(`Solo se permiten hasta ${LIMITE_ARCHIVOS} archivos por mensaje. Enviaste ${totalArchivos}.`);
        return { valido: false, errores, archivosConTexto: [] };
    }

    // Regla 2: palabras del texto del usuario
    const palabrasUsuario = contenido?.trim().split(/\s+/).filter(Boolean).length || 0;
    if (palabrasUsuario > LIMITE_PALABRAS) {
        errores.push(`El texto supera el límite de ${LIMITE_PALABRAS} palabras (tiene ${palabrasUsuario}).`);
        return { valido: false, errores, archivosConTexto: [] };
    }

    // Regla 3: procesar archivos nuevos
    const archivosConTexto = [];
    let palabrasNuevos = 0;

    for (const a of archivosNuevos) {
        const esDoc =
            a.mimetype === 'application/pdf' ||
            a.mimetype === 'application/msword' ||
            a.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        const esImagen = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(a.mimetype);

        if (esDoc) {
            try {
                const resultado = await extraerTextoArchivo(a.buffer, a.mimetype, a.originalname);
                if (resultado.palabras > LIMITE_PALABRAS) {
                    errores.push(`"${a.originalname}" excede el límite de ${LIMITE_PALABRAS} palabras (tiene ${resultado.palabras}).`);
                } else {
                    palabrasNuevos += resultado.palabras;
                    archivosConTexto.push({
                        ...a,
                        textoFormateado: resultado.textoFormateado,
                        contenido_extraido: resultado.textoPlano,
                    });
                }
            } catch (err) {
                if (err.code === 'ARCHIVO_ILEGIBLE') {
                    errores.push(`"${a.originalname}" no pudo leerse. Puede estar escaneado, vacío o dañado.`);
                } else {
                    errores.push(`"${a.originalname}" no pudo procesarse. Verifica que el archivo no esté dañado.`);
                }
            }
        } else if (esImagen) {
            // Las imágenes no tienen texto extraíble aquí; su análisis ocurre en construirPartesMensaje
            archivosConTexto.push({ ...a, textoFormateado: null, contenido_extraido: null });
        } else {
            errores.push(`"${a.originalname}" tiene un formato no soportado.`);
        }
    }

    // Si algún archivo nuevo falló, todo el mensaje es inválido
    if (errores.length) return { valido: false, errores, archivosConTexto: [] };

    // Regla 4: validar archivos existentes reutilizados
    let palabrasExistentes = 0;
    if (idsExistentes.length) {
        const { data: existentes } = await supabase.from('archivo').select('nombre_original, tipo_mime, contenido_extraido').in('id', idsExistentes);

        for (const a of existentes || []) {
            if (a.contenido_extraido) {
                const palabras = a.contenido_extraido.trim().split(/\s+/).filter(Boolean).length;
                if (palabras > LIMITE_PALABRAS) {
                    errores.push(`"${a.nombre_original}" excede el límite de ${LIMITE_PALABRAS} palabras (tiene ${palabras}).`);
                } else {
                    palabrasExistentes += palabras;
                }
            }
            // Imágenes y archivos sin contenido_extraido no suman palabras
        }
    }

    if (errores.length) return { valido: false, errores, archivosConTexto: [] };

    // Regla 5: suma total de palabras
    const totalPalabras = palabrasUsuario + palabrasNuevos + palabrasExistentes;
    if (totalPalabras > LIMITE_PALABRAS) {
        errores.push(
            `La entrada total supera el límite de ${LIMITE_PALABRAS} palabras (tiene ${totalPalabras}: ${palabrasUsuario} de instrucción adicional + ${palabrasNuevos + palabrasExistentes} de archivos).`
        );
        return { valido: false, errores, archivosConTexto: [] };
    }

    return { valido: true, errores: [], archivosConTexto };
}

/**
 * Construye las partes del mensaje para el modelo de IA.
 *
 * Prioridad para cada archivo:
 *   - Imagen con contenido_extraido -> usa descripción guardada (sin re-analizar)
 *   - Imagen sin contenido_extraido + buffer -> analiza y guarda en BD
 *   - Documento con textoFormateado -> texto ya extraído en validación (archivo nuevo)
 *   - Documento con contenido_extraido -> texto guardado en BD (reutilizado o regenerado)
 *
 * Nunca re-extrae ni re-analiza si el contenido ya está en BD.
 */
async function construirPartesMensaje(archivos, contenidoTexto) {
    const partes = [];
    let textoImagenes = '';

    for (const a of archivos) {
        const esImagen = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(a.tipo_mime);

        if (esImagen) {
            if (a.contenido_extraido) {
                // Imagen ya analizada - usar descripción guardada en BD
                textoImagenes += `[El usuario envió la imagen "${a.nombre_original}". Análisis automático del sistema: ${a.contenido_extraido}]\n`;
            } else if (a.buffer) {
                // Primera vez - analizar y guardar en BD para no repetir
                try {
                    const base64 = Buffer.isBuffer(a.buffer) ? a.buffer.toString('base64') : a.buffer;
                    const desc = await analizarImagen(base64, a.tipo_mime, contenidoTexto || 'Describe esta imagen detalladamente en español.');
                    textoImagenes += `[El usuario envió la imagen "${a.nombre_original}". Análisis automático del sistema: ${desc}]\n`;
                    if (a.id) {
                        await supabase.from('archivo').update({ contenido_extraido: desc }).eq('id', a.id);
                    }
                } catch (err) {
                    console.error('[construirPartesMensaje] Error analizando imagen:', err.message);
                    textoImagenes += `[Imagen "${a.nombre_original}": no se pudo analizar]\n`;
                }
            }
        } else if (a.textoFormateado) {
            // Documento nuevo - texto extraído durante validación
            partes.push({ text: a.textoFormateado });
        } else if (a.contenido_extraido) {
            // Documento reutilizado o regenerado - usar texto guardado en BD
            partes.push({ text: `[Archivo: "${a.nombre_original}"]\n${a.contenido_extraido}` });
        }
    }

    // CONSOLE.log('Partes construidas para IA:', JSON.stringify(partes, null, 2));
    if (textoImagenes) partes.push({ text: textoImagenes });
    if (contenidoTexto) partes.push({ text: contenidoTexto });

    return partes;
}

/**
 * Envío de mensaje nuevo.
 * También cubre el caso de "reintentar" por error: el mensaje anterior no llegó a BD
 * por lo que se crea uno nuevo completo. No confundir con reintentarMensajeStream.
 */
export async function enviarMensajeStream(idConversacion, idUsuario, contenido, archivosNuevos, idsExistentes, res) {
    const { data: conv } = await supabase.from('conversacion').select('id,titulo').eq('id', idConversacion).eq('id_usuario', idUsuario).single();

    if (!conv) {
        escribirSSE(res, { tipo: 'error', mensaje: 'Conversación no encontrada.' });
        return res.end();
    }

    const { valido, errores, archivosConTexto } = await validarEntradaCompleta(archivosNuevos, contenido, idsExistentes);

    if (!valido) {
        escribirSSE(res, { tipo: 'error_validacion', errores });
        return res.end();
    }

    if (!archivosConTexto.length && !idsExistentes.length && !contenido?.trim()) {
        escribirSSE(res, { tipo: 'error', mensaje: 'No hay contenido válido para enviar.', recuperable: false });
        return res.end();
    }

    const subidos = archivosConTexto.length ? await subirAlStorage(archivosConTexto, idUsuario) : [];
    const msgUsuario = await guardarMensaje(idConversacion, 'usuario', contenido || '');
    const archivosNuevosGuardados = subidos.length ? await insertarArchivosEnBD(msgUsuario.id, subidos, idUsuario) : [];
    const urlsNuevos = await urlsFirmadas(archivosNuevosGuardados);
    const metadatosExistentes = await obtenerMetadatosArchivosExistentes(idsExistentes, idUsuario);

    escribirSSE(res, {
        tipo: 'mensaje_usuario',
        mensaje: { ...msgUsuario, archivos: [...urlsNuevos, ...metadatosExistentes] },
    });

    // N:M - solo crear asociación, sin re-subir ni duplicar el archivo físico
    await asociarArchivosExistentesAMensaje(msgUsuario.id, idsExistentes);

    // subidosConId lleva el id de BD para que construirPartesMensaje pueda guardar análisis de imágenes
    const subidosConId = subidos.map((s, i) => ({ ...s, id: archivosNuevosGuardados[i]?.id ?? null }));
    const reutilizados = await descargarArchivosExistentes(idsExistentes, idUsuario);
    const partesMensaje = await construirPartesMensaje([...subidosConId, ...reutilizados], contenido);

    if (!partesMensaje.length) {
        await eliminarMensaje(msgUsuario.id);
        escribirSSE(res, { tipo: 'error', mensaje: 'El mensaje no puede estar vacío.', recuperable: false });
        return res.end();
    }

    // Historial: solo mensajes anteriores al mensaje recién creado
    const historial = await obtenerHistorial(idConversacion, msgUsuario.id, msgUsuario.fecha_creacion);

    let textoCompleto = '';
    try {
        textoCompleto = await generarRespuestaStream(historial, partesMensaje, (token) => {
            escribirSSE(res, { tipo: 'token', contenido: token });
        });
    } catch {
        await eliminarMensaje(msgUsuario.id);
        escribirSSE(res, { tipo: 'error', mensaje: 'Error con la IA. El mensaje no fue guardado.', recuperable: true });
        return res.end();
    }

    const msgAsistente = await guardarMensaje(idConversacion, 'asistente', textoCompleto);

    let tituloActualizado = null;
    if (conv.titulo === 'Nueva conversación' && contenido) {
        tituloActualizado = contenido.slice(0, 60);
        await supabase
            .from('conversacion')
            .update({ titulo: tituloActualizado, fecha_actualizacion: new Date().toISOString() })
            .eq('id', idConversacion);
    }

    escribirSSE(res, {
        tipo: 'fin',
        id_mensaje_usuario: msgUsuario.id,
        id_mensaje_asistente: msgAsistente.id,
        titulo_actualizado: tituloActualizado,
    });
    res.end();
}

/**
 * Regeneración de respuesta.
 * El usuario quiere una respuesta diferente a la que el asistente ya dio.
 * El mensaje del usuario ya existe en BD - no se crea uno nuevo.
 * Se actualiza la respuesta del asistente (UPDATE) sin crear registros basura.
 * El historial incluye solo mensajes anteriores al mensaje a regenerar.
 */
export async function reintentarMensajeStream(idConversacion, idMensajeUsuario, idUsuario, res) {
    const { data: conv } = await supabase.from('conversacion').select('id').eq('id', idConversacion).eq('id_usuario', idUsuario).single();

    if (!conv) {
        escribirSSE(res, { tipo: 'error', mensaje: 'Acceso denegado.' });
        return res.end();
    }

    const { data: msgUsuario } = await supabase
        .from('mensaje')
        .select(
            `
            id, contenido, fecha_creacion,
            mensaje_archivo(
                archivo(id, nombre_original, tipo_mime, contenido_extraido, ruta_almacenamiento)
            )
        `
        )
        .eq('id', idMensajeUsuario)
        .eq('id_conversacion', idConversacion)
        .single();

    if (!msgUsuario) {
        escribirSSE(res, { tipo: 'error', mensaje: 'Mensaje no encontrado.' });
        return res.end();
    }

    // Buscar el mensaje asistente por posición (el inmediatamente siguiente al usuario
    // en orden cronológico). No se usan timestamps porque tras una regeneración el mensaje
    // actualizado mantiene su timestamp original, garantizando posición correcta sin acumular basura.
    const { data: todosMensajes } = await supabase
        .from('mensaje')
        .select('id, rol')
        .eq('id_conversacion', idConversacion)
        .order('fecha_creacion', { ascending: true });

    const idxUsuario = (todosMensajes || []).findIndex((m) => m.id === idMensajeUsuario);
    const siguienteMsg = idxUsuario >= 0 ? todosMensajes[idxUsuario + 1] : null;
    const idMensajeAsistentePrevio = siguienteMsg?.rol === 'asistente' ? siguienteMsg.id : null;

    const archivosOriginales = [];
    for (const ma of msgUsuario.mensaje_archivo || []) {
        const a = ma.archivo;
        if (!a) continue;
        const esImagen = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(a.tipo_mime);
        if (esImagen && !a.contenido_extraido && a.ruta_almacenamiento) {
            const { data: f } = await supabase.storage.from(BUCKET).download(a.ruta_almacenamiento);
            archivosOriginales.push({ ...a, buffer: f ? Buffer.from(await f.arrayBuffer()) : null });
        } else {
            archivosOriginales.push(a);
        }
    }
    const partes = await construirPartesMensaje(archivosOriginales, msgUsuario.contenido);

    // Historial: solo mensajes anteriores al mensaje que se regenera
    const historial = await obtenerHistorial(idConversacion, msgUsuario.id, msgUsuario.fecha_creacion);

    let textoCompleto = '';
    try {
        textoCompleto = await generarRespuestaStream(historial, partes, (token) => {
            escribirSSE(res, { tipo: 'token', contenido: token });
        });
    } catch {
        console.error('[reintentarMensajeStream] Error al generar respuesta con IA.');
        escribirSSE(res, { tipo: 'error', mensaje: 'Error al reintentar.', recuperable: true });
        return res.end();
    }

    // Si no existe el mensaje asistente previo es un estado inválido
    if (!idMensajeAsistentePrevio) {
        console.error('[reintentarMensajeStream] No se encontró mensaje asistente para actualizar.');
        escribirSSE(res, { tipo: 'error', mensaje: 'No se encontró la respuesta a regenerar.', recuperable: false });
        return res.end();
    }

    // Se actualiza el mensaje del asistente en lugar de crear uno nuevo,
    // para evitar registros basura por múltiples reintentos
    let msgAsistente;
    try {
        msgAsistente = await actualizarMensaje(idMensajeAsistentePrevio, textoCompleto);
    } catch (err) {
        console.error('[reintentarMensajeStream] Error al actualizar respuesta en BD:', err.message);
        escribirSSE(res, { tipo: 'error', mensaje: 'Error al guardar la respuesta regenerada. Intenta de nuevo.', recuperable: true });
        return res.end();
    }

    escribirSSE(res, {
        tipo: 'fin',
        id_mensaje_usuario: idMensajeUsuario,
        id_mensaje_asistente: msgAsistente.id,
        titulo_actualizado: null,
    });

    res.end();
}
