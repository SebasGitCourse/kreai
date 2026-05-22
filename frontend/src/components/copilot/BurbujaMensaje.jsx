import { useState } from 'react';
import ChipArchivo from './ChipArchivo.jsx';
import './BurbujaMensaje.css';

export default function BurbujaMensaje({ mensaje, onReintento, onReenvio }) {
    const esUsuario = mensaje.rol === 'usuario';
    const esAsistente = mensaje.rol === 'asistente';
    const estaStreaming = mensaje.estado === 'streaming';
    const tieneError = mensaje.estado === 'error';
    const UMBRAL_TRUNCAR = 300;
    const [expandido, setExpandido] = useState(false);

    function limpiarMarkdown(texto) {
        if (!texto) return '';
        return (
            texto
                // Tablas markdown: eliminar líneas que sean solo |, -, espacios
                .replace(/^\|[\s\S]*?\|$/gm, '')
                .replace(/^\s*\|?[-:\s|]+\|?\s*$/gm, '')
                // Bloques de código con triple backtick
                .replace(/```[\s\S]*?```/g, (match) => {
                    const contenido = match
                        .replace(/```\w*\n?/g, '')
                        .replace(/```/g, '')
                        .trim();
                    return contenido;
                })
                // Código inline
                .replace(/`([^`]+)`/g, '$1')
                // Encabezados ### ## #
                .replace(/^#{1,6}\s+(.+)$/gm, '$1')
                // Negrilla **texto** o __texto__
                .replace(/\*\*(.+?)\*\*/g, '$1')
                .replace(/__(.+?)__/g, '$1')
                // Cursiva *texto* o _texto_
                .replace(/\*([^*]+?)\*/g, '$1')
                .replace(/_([^_]+?)_/g, '$1')
                // Líneas horizontales --- o *** o ___
                .replace(/^[-*_]{3,}\s*$/gm, '')
                // Listas con guión o asterisco al inicio de línea
                .replace(/^[\s]*[-*+]\s+/gm, '• ')
                // Listas numeradas
                .replace(/^[\s]*\d+\.\s+/gm, (match) => match.trim() + ' ')
                // Citas >
                .replace(/^>\s*/gm, '')
                // Múltiples líneas vacías seguidas -> una sola
                .replace(/\n{3,}/g, '\n\n')
                .trim()
        );
    }

    function formatearTexto(texto) {
        if (!texto) return '';
        const limpio = limpiarMarkdown(texto);
        // Saltos de línea -> <br/>
        return limpio.replace(/\n/g, '<br/>');
    }

    function manejarReintentar() {
        if (mensaje._idMensajeUsuario) onReintento?.(mensaje._idMensajeUsuario);
        else if (mensaje._payload) onReenvio?.(mensaje._payload);
        else onReintento?.(mensaje.id);
    }

    return (
        <article
            className={`burbuja burbuja--${esUsuario ? 'usuario' : 'asistente'}`}
            aria-label={esUsuario ? 'Tu mensaje' : 'Respuesta del asistente'}
        >
            {esAsistente && (
                <div className="burbuja__avatar" aria-hidden="true">
                    {IconRobot()}
                </div>
            )}

            {esUsuario && (
                <div className="burbuja__avatar-usuario" aria-hidden="true">
                    <svg width="15" height="14" viewBox="0 0 15 15" fill="none">
                        <circle cx="7.5" cy="5" r="2.5" stroke="#fff" strokeWidth="1.3" />
                        <path d="M2 13.5c0-3 2.5-4.5 5.5-4.5s5.5 1.5 5.5 4.5" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                </div>
            )}

            <div className="burbuja__cuerpo">
                {mensaje.archivos?.length > 0 && (
                    <div className="burbuja__archivos">
                        {mensaje.archivos.map((a) => (
                            <ChipArchivo key={a.id} archivo={a} modoPreview />
                        ))}
                    </div>
                )}

                {/* Tres puntos animados mientras el modelo no ha enviado nada aún */}
                {estaStreaming && !mensaje.contenido && (
                    <div className="burbuja__escribiendo" aria-label="El asistente está escribiendo">
                        <span />
                        <span />
                        <span />
                    </div>
                )}

                {mensaje.contenido &&
                    (() => {
                        // Recorta mensajes largos del usuario y permite expandirlos con "Ver más".
                        const esTruncable = esUsuario && !estaStreaming && mensaje.contenido.length > UMBRAL_TRUNCAR;

                        // Define si se muestra el texto completo o una versión recortada.
                        const textoVisible =
                            esTruncable && !expandido ? mensaje.contenido.slice(0, UMBRAL_TRUNCAR).trimEnd() + '…' : mensaje.contenido;

                        return (
                            <>
                                {/* Renderiza el texto formateado y agrega cursor si está en streaming. */}
                                <div
                                    className="burbuja__texto"
                                    dangerouslySetInnerHTML={{
                                        __html:
                                            formatearTexto(textoVisible) +
                                            (estaStreaming ? '<span class="burbuja__cursor" aria-hidden="true"></span>' : ''),
                                    }}
                                />

                                {/* Botón para alternar entre texto recortado y completo. */}
                                {esTruncable && (
                                    <button className="burbuja__ver-mas" onClick={() => setExpandido((prev) => !prev)}>
                                        {expandido ? 'Ver menos ▲' : 'Ver más ▼'}
                                    </button>
                                )}
                            </>
                        );
                    })()}

                {/* Error amigable pegado al mensaje del usuario */}
                {esUsuario && tieneError && mensaje._errorMsg && (
                    <div className="burbuja__error-inline">
                        <span className="burbuja__error-icono">⚠</span>
                        <span className="burbuja__error-texto">{mensaje._errorMsg}</span>
                    </div>
                )}

                {/* Botón siempre visible - Regenerar en ok, Reintentar en error */}
                {esUsuario && !estaStreaming && (
                    <button
                        className={`burbuja__btn-reintentar ${tieneError ? 'burbuja__btn-reintentar--error' : ''}`}
                        onClick={manejarReintentar}
                        title={tieneError ? 'Intentar de nuevo' : 'Pedir otra respuesta'}
                    >
                        ↺ {tieneError ? 'Reintentar' : 'Regenerar'}
                    </button>
                )}
            </div>
        </article>
    );
}

function IconRobot() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 48 48">
            <path
                fill="none"
                stroke="#df4568"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M23.02 11.054V9.195a1.85 1.85 0 0 1 1.85-1.85h0a1.85 1.85 0 0 1 1.85 1.85v1.85"
            />
            <path
                fill="none"
                stroke="#df4568"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M32.973 40.655H16.027c-3.48 0-6.327-2.848-6.327-6.328V17.374c0-3.48 2.847-6.328 6.327-6.328h16.946c3.48 0 6.327 2.848 6.327 6.328v16.953c0 3.48-2.847 6.328-6.327 6.328"
            />
            <path
                fill="none"
                stroke="#df4568"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M30.79 34.363H18.21a2.97 2.97 0 0 1-2.96-2.96h0a2.97 2.97 0 0 1 2.96-2.961h12.58a2.97 2.97 0 0 1 2.96 2.96h0a2.97 2.97 0 0 1-2.96 2.961M7.85 29.552A1.85 1.85 0 0 1 6 27.702v-5.923a1.85 1.85 0 0 1 1.85-1.85h0a1.85 1.85 0 0 1 1.85 1.85v5.922a1.85 1.85 0 0 1-1.85 1.85m33.3.001a1.85 1.85 0 0 0 1.85-1.85v-5.923a1.85 1.85 0 0 0-1.85-1.85h0a1.85 1.85 0 0 0-1.85 1.85v5.922a1.85 1.85 0 0 0 1.85 1.85m-22.57-1.11v5.922m3.7-5.922v5.922m3.7-5.922v5.922m3.7-5.922v5.922m-.74-13.693a2.097 2.097 0 1 0 0-.002zm-12.95 0a2.097 2.097 0 1 0 4.194.003v-.003a2.097 2.097 0 1 0-4.194 0"
            />
        </svg>
    );
}
