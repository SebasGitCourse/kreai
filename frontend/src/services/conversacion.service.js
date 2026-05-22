import { API_URL, peticionProtegida } from '../config/api.js';

// Obtiene la lista de conversaciones del usuario ordenadas por fecha de actualización.
export async function listarConversaciones() {
    const res = await peticionProtegida('/api/conversaciones');
    if (!res) return [];
    const datos = await res.json().catch(() => ({}));
    if (!res.ok) throw datos;
    return datos;
}

// Crea una nueva conversación vacía para el usuario autenticado.
export async function crearConversacion() {
    const res = await peticionProtegida('/api/conversaciones', { method: 'POST' });
    if (!res) return null;
    const datos = await res.json().catch(() => ({}));
    if (!res.ok) throw datos;
    return datos;
}

// Elimina una conversación por su id junto con todos sus mensajes y archivos asociados.
export async function eliminarConversacion(id) {
    const res = await peticionProtegida(`/api/conversaciones/${id}`, { method: 'DELETE' });
    if (!res || !res.ok) throw new Error('Error al eliminar');
}

// Obtiene todos los mensajes de una conversación incluyendo los archivos adjuntos con URL firmada.
export async function obtenerMensajes(idConversacion) {
    const res = await peticionProtegida(`/api/conversaciones/${idConversacion}/mensajes`);
    if (!res) return [];
    const datos = await res.json().catch(() => ({}));
    if (!res.ok) throw datos;
    return datos;
}

// Lee el stream SSE línea a línea y despacha cada evento al callback correspondiente.
// Los eventos posibles son: mensaje_usuario, token, fin, error, archivos_ilegibles, error_validacion.
async function leerStreamSSE(respuesta, { onMensajeUsuario, onToken, onFin, onError, onArchivosIlegibles, onErrorValidacion }) {
    const lector = respuesta.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await lector.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const bloques = buffer.split('\n\n');
        buffer = bloques.pop();

        for (const bloque of bloques) {
            const linea = bloque.trim();
            if (!linea.startsWith('data: ')) continue;
            try {
                const evento = JSON.parse(linea.slice(6));
                if (evento.tipo === 'mensaje_usuario') onMensajeUsuario?.(evento.mensaje);
                else if (evento.tipo === 'token') onToken?.(evento.contenido);
                else if (evento.tipo === 'fin') onFin?.(evento);
                else if (evento.tipo === 'error') onError?.(evento);
                else if (evento.tipo === 'archivos_ilegibles') onArchivosIlegibles?.(evento.archivos);
                else if (evento.tipo === 'error_validacion') onErrorValidacion?.(evento.errores);
            } catch {
                // Chunk malformado o incompleto, se ignora y se continúa con el siguiente
            }
        }
    }
}

// Envía un mensaje nuevo con texto y archivos al backend via SSE.
// Usa FormData porque puede incluir archivos binarios nuevos.
// peticionProtegida maneja la renovación automática del token si está expirado,
// por eso se usa en lugar de fetch directo.
export async function enviarMensajeStream(idConversacion, contenido, archivosNuevos = [], idsArchivosExistentes = [], callbacks = {}) {
    const formData = new FormData();
    formData.append('contenido', contenido || '');
    if (idsArchivosExistentes.length > 0) {
        formData.append('ids_archivos_existentes', JSON.stringify(idsArchivosExistentes));
    }
    for (const archivo of archivosNuevos) formData.append('archivos', archivo);

    let respuesta;
    try {
        respuesta = await peticionProtegida(`/api/conversaciones/${idConversacion}/mensajes`, {
            method: 'POST',
            body: formData,
        });
    } catch {
        callbacks.onError?.({ tipo: 'error', mensaje: 'Sin conexión con el servidor', recuperable: true });
        return;
    }

    if (!respuesta || !respuesta.ok) {
        callbacks.onError?.({ tipo: 'error', mensaje: 'Error al enviar el mensaje', recuperable: true });
        return;
    }

    try {
        await leerStreamSSE(respuesta, callbacks);
    } catch {
        // La conexión SSE se interrumpió durante el streaming por red inestable o timeout
        callbacks.onError?.({ tipo: 'error', mensaje: 'La conexión se interrumpió. Intenta de nuevo.', recuperable: true });
    }
}

// Regenera la respuesta del asistente para un mensaje de usuario existente en la base de datos.
// A diferencia de enviarMensajeStream, aquí el mensaje del usuario ya existe en BD,
// por lo que solo se actualiza la respuesta del asistente sin crear registros nuevos.
// peticionProtegida maneja la renovación automática del token si está expirado,
// por eso se usa en lugar de fetch directo.
export async function reintentarMensajeStream(idConversacion, idMensajeUsuario, callbacks = {}) {
    let respuesta;
    try {
        respuesta = await peticionProtegida(`/api/conversaciones/${idConversacion}/mensajes/${idMensajeUsuario}/reintentar`, { method: 'POST' });
    } catch {
        callbacks.onError?.({ tipo: 'error', mensaje: 'Sin conexión con el servidor', recuperable: true });
        return;
    }

    if (!respuesta || !respuesta.ok) {
        callbacks.onError?.({ tipo: 'error', mensaje: 'Error al reintentar', recuperable: true });
        return;
    }

    try {
        await leerStreamSSE(respuesta, callbacks);
    } catch {
        // La conexión SSE se interrumpió durante el streaming por red inestable o timeout
        callbacks.onError?.({ tipo: 'error', mensaje: 'La conexión se interrumpió. Intenta de nuevo.', recuperable: true });
    }
}
 