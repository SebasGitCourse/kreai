import { useState } from 'react';
import './ChipArchivo.css';

const TIPOS_IMAGEN = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

function icono(mime) {
    if (TIPOS_IMAGEN.has(mime)) return IconImage();
    if (mime === 'application/pdf') return IconPdf();
    if (mime?.includes('word') || mime === 'application/msword') return IconWord();
    return IconFile();
}

function formatBytes(bytes) {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
}

/**
 * Chip que representa un archivo adjunto.
 *
 * Props:
 *   archivo -> objeto de BD (con url_firmada) o File nativo del browser
 *   modoPreview -> si true, al hacer clic abre lightbox (imagen), nueva pestaña (PDF) o descarga (Word)
 *   onEliminar -> si se pasa, muestra botón x para quitarlo
 *   estiloEntMensaje -> clase CSS adicional para el estilo en el contexto de entrada de mensaje
 */
export default function ChipArchivo({ archivo, modoPreview = false, onEliminar, estiloEntMensaje }) {
    const [lightbox, setLightbox] = useState(false);

    const mime = archivo.tipo_mime || archivo.type || '';
    const nombre = archivo.nombre_original || archivo.name || 'Archivo';
    const bytes = archivo.tamanio ?? archivo.size;
    const esImagen = TIPOS_IMAGEN.has(mime);
    const esPdf = mime === 'application/pdf';

    const url = archivo.url_firmada || (archivo instanceof File ? URL.createObjectURL(archivo) : null);

    function alHacerClic() {
        if (!modoPreview || !url) return;
        if (esImagen) setLightbox(true);
        else if (esPdf) window.open(url, '_blank', 'noopener,noreferrer');
        else {
            const a = document.createElement('a');
            a.href = url;
            a.download = nombre;
            a.click();
        }
    }

    return (
        <>
            <div
                className={`chip ${modoPreview && url ? 'chip--clicable' : ''} ${estiloEntMensaje || ''}`}
                onClick={alHacerClic}
                role={modoPreview && url ? 'button' : undefined}
                tabIndex={modoPreview && url ? 0 : undefined}
                aria-label={modoPreview ? `Ver ${nombre}` : undefined}
                onKeyDown={modoPreview ? (e) => e.key === 'Enter' && alHacerClic() : undefined}
            >
                {esImagen && url ? (
                    <img className="chip__thumb" src={url} alt={nombre} loading="lazy" />
                ) : (
                    <span className="chip__icono" aria-hidden="true">
                        {icono(mime)}
                    </span>
                )}

                <div className="chip__info">
                    <span className="chip__nombre">{nombre}</span>
                    {bytes != null && <span className="chip__peso">{formatBytes(bytes)}</span>}
                </div>

                {onEliminar && (
                    <button
                        className="chip__quitar"
                        type="button"
                        aria-label={`Quitar ${nombre}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            onEliminar();
                        }}
                    >
                        x
                    </button>
                )}
            </div>

            {lightbox && esImagen && url && (
                <div
                    className="chip__lightbox"
                    onClick={() => setLightbox(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Vista previa: ${nombre}`}
                >
                    <button className="chip__lightbox-cerrar" onClick={() => setLightbox(false)} aria-label="Cerrar">
                        X
                    </button>
                    <img className="chip__lightbox-img" src={url} alt={nombre} onClick={(e) => e.stopPropagation()} />
                    <p className="chip__lightbox-nombre">{nombre}</p>
                </div>
            )}
        </>
    );
}

function IconImage() {
    return (
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M30 28a2 2 0 0 1-2 2h-5.168l-7.368-7.465L24 13.999l6 6zM4 30a2 2 0 0 1-2-2v-.939l7.945-7.116L20.001 30zM8 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8m20-4H4a4 4 0 0 0-4 4v24a4 4 0 0 0 4 4h24a4 4 0 0 0 4-4V4a4 4 0 0 0-4-4M8 10a2 2 0 1 0-.001-4.001A2 2 0 0 0 8 10"
                fillRule="evenodd"
                stroke="#000"
            />
        </svg>
    );
}

function IconPdf() {
    return (
        <svg width={32} height={32} viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <style>{'.cls-1{fill:#000; }'}</style>
            </defs>
            <title />
            <g id="xxx-word">
                <path className="cls-1" d="M325 105h-75a5 5 0 0 1-5-5V25a5 5 0 0 1 10 0v70h70a5 5 0 0 1 0 10" />
                <path
                    className="cls-1"
                    d="M325 154.83a5 5 0 0 1-5-5v-47.76L247.93 30H100a20 20 0 0 0-20 20v98.17a5 5 0 0 1-10 0V50a30 30 0 0 1 30-30h150a5 5 0 0 1 3.54 1.46l75 75A5 5 0 0 1 330 100v49.83a5 5 0 0 1-5 5M300 380H100a30 30 0 0 1-30-30v-75a5 5 0 0 1 10 0v75a20 20 0 0 0 20 20h200a20 20 0 0 0 20-20v-75a5 5 0 0 1 10 0v75a30 30 0 0 1-30 30"
                />
                <path className="cls-1" d="M275 280H125a5 5 0 0 1 0-10h150a5 5 0 0 1 0 10m-75 50h-75a5 5 0 0 1 0-10h75a5 5 0 0 1 0 10" />
                <path
                    className="cls-1"
                    d="M325 280H75a30 30 0 0 1-30-30v-76.83a30 30 0 0 1 30-30h.2l250 1.66a30.09 30.09 0 0 1 29.81 30V250A30 30 0 0 1 325 280M75 153.17a20 20 0 0 0-20 20V250a20 20 0 0 0 20 20h250a20 20 0 0 0 20-20v-75.17a20.06 20.06 0 0 0-19.88-20l-250-1.66Z"
                />
                <path
                    className="cls-1"
                    d="M145 236h-9.61v-53.32h21.84q9.34 0 13.85 4.71a16.37 16.37 0 0 1-.37 22.95 17.5 17.5 0 0 1-12.38 4.53H145Zm0-29.37h11.37q4.45 0 6.8-2.19a7.58 7.58 0 0 0 2.34-5.82 8 8 0 0 0-2.17-5.62q-2.17-2.34-7.83-2.34H145ZM183 236v-53.32h19.7q10.9 0 17.5 7.71t6.6 19q0 11.33-6.8 18.95T200.55 236Zm9.88-7.85h8a14.36 14.36 0 0 0 10.94-4.84q4.49-4.84 4.49-14.41a21.9 21.9 0 0 0-3.93-13.22 12.22 12.22 0 0 0-10.37-5.41h-9.14Zm52.71 7.85h-9.89v-53.32h33.71v8.24h-23.82v14.57h18.75v8h-18.75Z"
                />
            </g>
        </svg>
    );
}

function IconWord() {
    return (
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient
                    id="a"
                    x1="4.494"
                    y1="-1712.086"
                    x2="13.832"
                    y2="-1695.914"
                    gradientTransform="translate(0 1720)"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop offset="0" stopColor="#2368c4" />
                    <stop offset=".5" stopColor="#1a5dbe" />
                    <stop offset="1" stopColor="#1146ac" />
                </linearGradient>
            </defs>
            <path d="M28.806 3H9.705a1.19 1.19 0 0 0-1.193 1.191V9.5l11.069 3.25L30 9.5V4.191A1.19 1.19 0 0 0 28.806 3" style={{ fill: '#41a5ee' }} />
            <path d="M30 9.5H8.512V16l11.069 1.95L30 16Z" style={{ fill: '#2b7cd3' }} />
            <path d="M8.512 16v6.5l10.418 1.3L30 22.5V16Z" style={{ fill: '#185abd' }} />
            <path d="M9.705 29h19.1A1.19 1.19 0 0 0 30 27.809V22.5H8.512v5.309A1.19 1.19 0 0 0 9.705 29" style={{ fill: '#103f91' }} />
            <path
                d="M16.434 8.2H8.512v16.25h7.922a1.2 1.2 0 0 0 1.194-1.191V9.391A1.2 1.2 0 0 0 16.434 8.2"
                style={{ opacity: 0.10000000149011612, isolation: 'isolate' }}
            />
            <path
                d="M15.783 8.85H8.512V25.1h7.271a1.2 1.2 0 0 0 1.194-1.191V10.041a1.2 1.2 0 0 0-1.194-1.191"
                style={{ opacity: 0.20000000298023224, isolation: 'isolate' }}
            />
            <path
                d="M15.783 8.85H8.512V23.8h7.271a1.2 1.2 0 0 0 1.194-1.191V10.041a1.2 1.2 0 0 0-1.194-1.191"
                style={{ opacity: 0.20000000298023224, isolation: 'isolate' }}
            />
            <path
                d="M15.132 8.85h-6.62V23.8h6.62a1.2 1.2 0 0 0 1.194-1.191V10.041a1.2 1.2 0 0 0-1.194-1.191"
                style={{ opacity: 0.20000000298023224, isolation: 'isolate' }}
            />
            <path
                d="M3.194 8.85h11.938a1.193 1.193 0 0 1 1.194 1.191v11.918a1.193 1.193 0 0 1-1.194 1.191H3.194A1.19 1.19 0 0 1 2 21.959V10.041A1.19 1.19 0 0 1 3.194 8.85"
                style={{ fill: 'url(#a)' }}
            />
            <path
                d="M6.9 17.988q.035.276.046.481h.028q.015-.195.065-.47c.05-.275.062-.338.089-.465l1.255-5.407h1.624l1.3 5.326a8 8 0 0 1 .162 1h.022a8 8 0 0 1 .135-.975l1.039-5.358h1.477l-1.824 7.748h-1.727l-1.237-5.126q-.054-.222-.122-.578t-.084-.52h-.021q-.021.189-.084.561t-.1.552L7.78 19.871H6.024L4.19 12.127h1.5l1.131 5.418a5 5 0 0 1 .079.443"
                style={{ fill: '#fff' }}
            />
        </svg>
    );
}

function IconFile() {
    return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M9 17h6m-6-4h6M9 9h1m3-6H8.2c-1.12 0-1.68 0-2.108.218a2 2 0 0 0-.874.874C5 4.52 5 5.08 5 6.2v11.6c0 1.12 0 1.68.218 2.108a2 2 0 0 0 .874.874C6.52 21 7.08 21 8.2 21h7.6c1.12 0 1.68 0 2.108-.218a2 2 0 0 0 .874-.874C19 19.48 19 18.92 19 17.8V9m-6-6 6 6m-6-6v4.4c0 .56 0 .84.109 1.054a1 1 0 0 0 .437.437C13.76 9 14.04 9 14.6 9H19"
                stroke="#000"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
