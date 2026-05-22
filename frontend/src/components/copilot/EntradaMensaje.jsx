import { useState, useRef, useEffect } from 'react';
import ChipArchivo from './ChipArchivo.jsx';
import { listarArchivos } from '../../services/archivo.service.js';
import './EntradaMensaje.css';

const MIMES_PERMITIDOS = new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export default function EntradaMensaje({ onEnviar, deshabilitado }) {
    const [texto, setTexto] = useState('');
    const [archivos, setArchivos] = useState([]);
    const [idsExistentes, setIdsExist] = useState([]);
    const [archivosBib, setArchivosBib] = useState([]);
    const [idsSelBib, setIdsSelBib] = useState([]);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [cargandoBib, setCargandoBib] = useState(false);
    const [filtroBib, setFiltroBib] = useState('todos');
    const [arrastrando, setArrastrando] = useState(false);

    const textareaRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.style.height = 'auto';
        ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
    }, [texto]);

    function agregarArchivos(lista) {
        const validos = Array.from(lista).filter((f) => MIMES_PERMITIDOS.has(f.type));
        setArchivos((prev) => [...prev, ...validos].slice(0, 10));
    }

    function enviar() {
        const contenido = texto.trim();
        if (!contenido && !archivos.length && !idsExistentes.length) return;
        if (deshabilitado) return;

        onEnviar(contenido, archivos, idsExistentes);
        setTexto('');
        setArchivos([]);
        setIdsExist([]);
    }

    function onKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            enviar();
        }
    }

    async function abrirBiblioteca() {
        setModalAbierto(true);
        setCargandoBib(true);
        try {
            setArchivosBib(await listarArchivos());
        } catch {
            setArchivosBib([]);
        } finally {
            setCargandoBib(false);
        }
    }

    function toggleSelBib(id) {
        setIdsSelBib((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    }

    function confirmarBib() {
        setIdsExist((prev) => [...new Set([...prev, ...idsSelBib])]);
        setIdsSelBib([]);
        setModalAbierto(false);
    }

    const IMGS = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
    const bibFiltrados = archivosBib.filter((a) => {
        if (filtroBib === 'imagenes') return IMGS.has(a.tipo_mime);
        if (filtroBib === 'documentos') return !IMGS.has(a.tipo_mime);
        return true;
    });
    const existentesMostrar = archivosBib.filter((a) => idsExistentes.includes(a.id));

    return (
        <>
            <div
                className={`entrada ${arrastrando ? 'entrada--drag' : ''} ${deshabilitado ? 'entrada--off' : ''}`}
                onDragOver={(e) => {
                    e.preventDefault();
                    setArrastrando(true);
                }}
                onDragLeave={() => setArrastrando(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setArrastrando(false);
                    if (e.dataTransfer.files?.length) agregarArchivos(e.dataTransfer.files);
                }}
            >
                {(archivos.length > 0 || existentesMostrar.length > 0) && (
                    <div className="entrada__adjuntos">
                        {archivos.map((f, i) => (
                            <ChipArchivo key={i} archivo={f} onEliminar={() => setArchivos((p) => p.filter((_, j) => j !== i))} />
                        ))}
                        {existentesMostrar.map((a) => (
                            <ChipArchivo key={a.id} archivo={a} modoPreview onEliminar={() => setIdsExist((p) => p.filter((id) => id !== a.id))} />
                        ))}
                    </div>
                )}

                <div className="entrada__fila">
                    <div className="entrada__izq">
                        <button
                            className="entrada__btn-adj"
                            type="button"
                            title="Adjuntar archivo"
                            disabled={deshabilitado}
                            onClick={() => inputRef.current?.click()}
                        >
                            <IconClip />
                        </button>

                        <button
                            className="entrada__btn-adj"
                            type="button"
                            title="Usar archivo anterior"
                            disabled={deshabilitado}
                            onClick={abrirBiblioteca}
                        >
                            <IconFile />
                        </button>

                        <input
                            ref={inputRef}
                            type="file"
                            accept={[...MIMES_PERMITIDOS].join(',')}
                            multiple
                            style={{ display: 'none' }}
                            onChange={(e) => e.target.files && agregarArchivos(e.target.files)}
                        />
                    </div>

                    <textarea
                        ref={textareaRef}
                        className="entrada__textarea"
                        placeholder="Escribe un mensaje…"
                        value={texto}
                        onChange={(e) => setTexto(e.target.value)}
                        onKeyDown={onKeyDown}
                        disabled={deshabilitado}
                        rows={1}
                    />

                    <button
                        className="entrada__btn-enviar"
                        type="button"
                        onClick={enviar}
                        disabled={deshabilitado || (!texto.trim() && !archivos.length && !idsExistentes.length)}
                        aria-label="Enviar mensaje"
                    >
                        {deshabilitado ? <span className="entrada__spinner" /> : IconSend()}
                    </button>
                </div>
            </div>

            {modalAbierto && (
                <div className="bib__fondo" onClick={() => setModalAbierto(false)}>
                    <div className="bib" onClick={(e) => e.stopPropagation()}>
                        <div className="bib__header">
                            <h3 className="bib__titulo">Mis archivos</h3>
                            <button className="bib__cerrar" onClick={() => setModalAbierto(false)}>
                                x
                            </button>
                        </div>

                        <div className="bib__filtros">
                            {[
                                { id: 'todos', l: 'Todos' },
                                { id: 'imagenes', l: 'Imágenes' },
                                { id: 'documentos', l: 'Documentos' },
                            ].map((f) => (
                                <button
                                    key={f.id}
                                    className={`bib__filtro ${filtroBib === f.id ? 'bib__filtro--on' : ''}`}
                                    onClick={() => setFiltroBib(f.id)}
                                >
                                    {f.l}
                                </button>
                            ))}
                        </div>

                        <div className="bib__lista">
                            {cargandoBib && <p className="bib__estado">Cargando archivos…</p>}
                            {!cargandoBib && bibFiltrados.length === 0 && <p className="bib__estado">Sin archivos.</p>}
                            {bibFiltrados.map((a) => (
                                <div
                                    key={a.id}
                                    className={`bib__item ${idsSelBib.includes(a.id) ? 'bib__item--sel' : ''}`}
                                    onClick={() => toggleSelBib(a.id)}
                                >
                                    <ChipArchivo archivo={a} estiloEntMensaje="chip--bib_entMensaje" />
                                    {idsSelBib.includes(a.id) && <span className="bib__check">✓</span>}
                                </div>
                            ))}
                        </div>

                        <div className="bib__pie">
                            <span>
                                {idsSelBib.length} seleccionado{idsSelBib.length !== 1 ? 's' : ''}
                            </span>
                            <button className="bib__ok" onClick={confirmarBib} disabled={!idsSelBib.length}>
                                Usar seleccionados
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function IconSend() {
    return (
        <svg width={20} height={20} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="icon glyph">
            <path
                d="M21.66 12a2 2 0 0 1-1.14 1.81L5.87 20.75A2.1 2.1 0 0 1 5 21a2 2 0 0 1-1.82-2.82L5.46 13H11a1 1 0 0 0 0-2H5.46L3.18 5.87a2 2 0 0 1 2.68-2.62l14.65 6.94A2 2 0 0 1 21.66 12"
                style={{
                    fill: '#fff',
                }}
            />
        </svg>
    );
}

function IconClip() {
    return (
        <svg height={20} width={20} xmlns="http://www.w3.org/2000/svg" fill="#fff" viewBox="0 0 500 500" xmlSpace="preserve">
            <path d="M359.784 103.784v262.919c0 57.226-46.557 103.784-103.784 103.784S152.216 423.93 152.216 366.703V103.784c0-34.336 27.934-62.27 62.27-62.27s62.27 27.934 62.27 62.27v262.919c0 11.445-9.312 20.757-20.757 20.757s-20.757-9.311-20.757-20.757V103.784H193.73v262.919c0 34.336 27.934 62.27 62.27 62.27s62.27-27.934 62.27-62.27V103.784C318.27 46.557 271.713 0 214.487 0S110.703 46.557 110.703 103.784v262.919C110.703 446.82 175.883 512 256 512s145.297-65.18 145.297-145.297V103.784z" />
        </svg>
    );
}

function IconFile() {
    return (
        <svg width={20} height={20} viewBox="0 0 20 24" fill="#fff" xmlns="http://www.w3.org/2000/svg" className="icon glyph">
            <path d="M19 8H7a3 3 0 0 0-2.74 1.78L2 14.87V5a2 2 0 0 1 2-2h4a2.05 2.05 0 0 1 1.4.56L11.83 6H17a2 2 0 0 1 2 2m2.81 2.42A1 1 0 0 0 21 10H7a1 1 0 0 0-.91.59l-4 9A1 1 0 0 0 3 21h15a1 1 0 0 0 .95-.68l3-9a1 1 0 0 0-.14-.9" />
        </svg>
    );
}
