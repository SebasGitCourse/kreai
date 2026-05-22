import { useState, useEffect, useRef } from 'react';
import { listarArchivos } from '../../services/archivo.service.js';
import ChipArchivo from './ChipArchivo.jsx';
import './VistaArchivos.css';

const IMGS = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

export default function VistaArchivos() {
    const [archivos, setArchivos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [filtro, setFiltro] = useState('todos');

    useEffect(() => {
        cargar();
    }, []);

    async function cargar() {
        setCargando(true);
        setError(null);
        try {
            setArchivos(await listarArchivos());
        } catch {
            setError('No se pudieron cargar los archivos');
        } finally {
            setCargando(false);
        }
    }

    const filtrados = archivos.filter((a) => {
        if (filtro === 'imagenes') return IMGS.has(a.tipo_mime);
        if (filtro === 'documentos') return !IMGS.has(a.tipo_mime);
        return true;
    });

    const imagenes = filtrados.filter((a) => IMGS.has(a.tipo_mime));
    const documentos = filtrados.filter((a) => !IMGS.has(a.tipo_mime));

    return (
        <div className="varchivos">
            <div className="varchivos__header">
                <h2 className="varchivos__titulo">Mis archivos</h2>
                <p className="varchivos__sub">
                    {archivos.length} archivo{archivos.length > 1 ? 's' : ''} en total
                </p>
            </div>

            <div className="varchivos__filtros" role="tablist">
                {[
                    { id: 'todos', l: 'Todos' },
                    { id: 'imagenes', l: 'Imágenes' },
                    { id: 'documentos', l: 'Documentos' },
                ].map((f) => (
                    <button
                        key={f.id}
                        className={`varchivos__filtro ${filtro === f.id ? 'varchivos__filtro--on' : ''}`}
                        onClick={() => setFiltro(f.id)}
                        role="tab"
                        aria-selected={filtro === f.id}
                    >
                        {f.l}
                    </button>
                ))}
            </div>

            {cargando && (
                <div className="varchivos__estado">
                    <div className="varchivos__spinner" />
                    <p>Cargando archivos…</p>
                </div>
            )}

            {error && !cargando && (
                <div className="varchivos__estado">
                    <p>{error}</p>
                    <button className="varchivos__btn-retry" onClick={cargar}>
                        Reintentar
                    </button>
                </div>
            )}

            {!cargando && !error && filtrados.length === 0 && (
                <div className="varchivos__estado">
                    <span className="varchivos__icono-vacio">📂</span>
                    <p>Sin archivos en esta categoría</p>
                </div>
            )}

            {/* Grid de imágenes con carga lazy */}
            {!cargando && !error && imagenes.length > 0 && (
                <section className="varchivos__seccion">
                    {filtro === 'todos' && <h3 className="varchivos__seccion-titulo">Imágenes</h3>}
                    <div className="varchivos__grid">
                        {imagenes.map((a) => (
                            <ImagenLazy key={a.id} archivo={a} />
                        ))}
                    </div>
                </section>
            )}

            {/* Lista de documentos */}
            {!cargando && !error && documentos.length > 0 && (
                <section className="varchivos__seccion">
                    {filtro === 'todos' && <h3 className="varchivos__seccion-titulo">Documentos</h3>}
                    <div className="varchivos__docs">
                        {documentos.map((a) => (
                            <ChipArchivo key={a.id} archivo={a} modoPreview />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

/**
 * Carga la imagen solo cuando está próxima al viewport (IntersectionObserver).
 * Esto soluciona el problema anterior de carga lenta de imágenes.
 */
function ImagenLazy({ archivo }) {
    const [visible, setVisible] = useState(false);
    const [lightbox, setLightbox] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const obs = new IntersectionObserver(
            ([e]) => {
                if (e.isIntersecting) {
                    setVisible(true);
                    obs.disconnect();
                }
            },
            { rootMargin: '120px' }
        );
        if (ref.current) obs.observe(ref.current);
        return () => obs.disconnect();
    }, []);

    return (
        <>
            <div
                ref={ref}
                className="varchivos__img-wrap"
                onClick={() => setLightbox(true)}
                role="button"
                tabIndex={0}
                aria-label={`Ver: ${archivo.nombre_original}`}
                onKeyDown={(e) => e.key === 'Enter' && setLightbox(true)}
            >
                {visible && archivo.url_firmada ? (
                    <img className="varchivos__img" src={archivo.url_firmada} alt={archivo.nombre_original} loading="lazy" />
                ) : (
                    <div className="varchivos__img-ph" aria-hidden="true">
                        🖼️
                    </div>
                )}
                <div className="varchivos__img-overlay">
                    <span>{archivo.nombre_original}</span>
                </div>
            </div>

            {lightbox && (
                <div className="varchivos__lb" onClick={() => setLightbox(false)} role="dialog" aria-modal="true">
                    <button className="varchivos__lb-cerrar" onClick={() => setLightbox(false)} aria-label="Cerrar">
                        X
                    </button>
                    <img className="varchivos__lb-img" src={archivo.url_firmada} alt={archivo.nombre_original} onClick={(e) => e.stopPropagation()} />
                    <p className="varchivos__lb-nombre">{archivo.nombre_original}</p>
                </div>
            )}
        </>
    );
}
