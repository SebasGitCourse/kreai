/**
 * Sidebar.jsx - Barra lateral de navegación
 * Props exactas (no renombrar): conversaciones, idActiva, vistaActual, usuario,
 * onNuevaConv, onSeleccionar, onEliminar, onCambiarVista, onCerrarSesion, abierto
 */

import { useState } from 'react';
import './Sidebar.css';
import logoBrand from '../../assets/logo-with-brand.png';
import imgUdla from '../../assets/img-udla.png';

export default function Sidebar({
    conversaciones = [],
    idActiva,
    vistaActual,
    usuario,
    onNuevaConv,
    onSeleccionar,
    onEliminar,
    onCambiarVista,
    onCerrarSesion,
    abierto,
}) {
    const [idConfirmando, setIdConfirmando] = useState(null);
    const ahora = new Date();

    function manejarEliminar(e, id) {
        e.stopPropagation();
        if (idConfirmando === id) {
            onEliminar(id);
            setIdConfirmando(null);
        } else {
            setIdConfirmando(id);
            setTimeout(() => setIdConfirmando(null), 3000);
        }
    }

    function formatearFecha(f) {
        if (!f) return '';
        const d = new Date(f),
            diff = Math.floor((ahora - d) / 86400000);
        if (diff === 0) return 'Hoy';
        if (diff === 1) return 'Ayer';
        if (diff < 7) return `Hace ${diff} días`;
        return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
    }

    const iniciales = usuario ? `${usuario.nombres?.[0] || ''}${usuario.apellidos?.[0] || ''}`.toUpperCase() : '?';
    const nombreCompleto = usuario ? `${usuario.nombres || ''} ${usuario.apellidos || ''}`.trim() : 'Usuario';

    return (
        <aside className={`sidebar ${abierto ? 'sidebar--abierto' : 'sidebar--cerrado'}`}>
            <div className="sidebar__encabezado">
                <div
                    className="sidebar__logo"
                    onClick={() => {
                        onCambiarVista('chat_bienvenida');
                    }}
                >
                    <img src={logoBrand} alt="Logo + Marca" />
                </div>
            </div>

            <button className="sidebar__btn-nuevo" onClick={onNuevaConv}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Nueva conversación
            </button>

            <nav className="sidebar__nav">
                {[
                    { id: 'chat', icono: <IconChat />, etiqueta: 'Chat' },
                    { id: 'archivos', icono: <IconArchivos />, etiqueta: 'Archivos' },
                    { id: 'actividades', icono: <IconActividades />, etiqueta: 'Material educativo' },
                    { id: 'perfil', icono: <IconPerfil />, etiqueta: 'Perfil' },
                ].map(({ id, icono, etiqueta }) => (
                    <button
                        key={id}
                        className={`sidebar__nav-item ${vistaActual === id ? 'sidebar__nav-item--activo' : ''}`}
                        onClick={() => onCambiarVista(id)}
                    >
                        {icono} {etiqueta}
                    </button>
                ))}
            </nav>

            <div className="sidebar__divisor" />

            <div className="sidebar__lista-wrapper">
                {conversaciones.length === 0 ? (
                    <p className="sidebar__lista-vacia">Aún no tienes conversaciones.</p>
                ) : (
                    <ul className="sidebar__lista">
                        <ul className="sidebar__lista">
                            {conversaciones.map((conv) => (
                                <li
                                    key={conv.id}
                                    className={`sidebar__conv-item ${
                                        conv.id === idActiva && vistaActual === 'chat' ? 'sidebar__conv-item--activo' : ''
                                    }`}
                                    onClick={() => onSeleccionar(conv.id)}
                                >
                                    <div className="sidebar__conv-info">
                                        <span className="sidebar__conv-titulo">{conv.titulo || 'Sin título'}</span>
                                        <span className="sidebar__conv-fecha">{formatearFecha(conv.fecha_actualizacion)}</span>
                                    </div>
                                    <button
                                        className={`sidebar__conv-btn-eliminar ${idConfirmando === conv.id ? 'sidebar__conv-btn-eliminar--confirmar' : ''}`}
                                        onClick={(e) => manejarEliminar(e, conv.id)}
                                        title={idConfirmando === conv.id ? 'Clic para confirmar' : 'Eliminar'}
                                    >
                                        {idConfirmando === conv.id ? '✓' : 'X'}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </ul>
                )}
            </div>

            <div className="sidebar_logo-udla">
                <img
                    src={imgUdla}
                    className="sibdebar-img-udla"
                    alt="UDLA"
                    onClick={() => {
                        window.open('https://www.facebook.com/uniamazonia.edu.co/', '_blank');
                    }}
                />
            </div>

            <div className="sidebar__usuario">
                <div className="sidebar__usuario-avatar">{iniciales}</div>
                <div className="sidebar__usuario-datos">
                    <span className="sidebar__usuario-nombre">{nombreCompleto}</span>
                    <span className="sidebar__usuario-correo">{usuario?.correo || ''}</span>
                </div>
                <button className="sidebar__usuario-salir" onClick={onCerrarSesion} title="Cerrar sesión">
                    <IconSalir />
                </button>
            </div>
        </aside>
    );
}

function IconChat() {
    return (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M2 1.5h11a1 1 0 011 1v7a1 1 0 01-1 1H4.5l-3 3V2.5a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
    );
}

function IconActividades() {
    return (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <rect x="1.5" y="1.5" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M4 7.5h7M4 5h7M4 10h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
    );
}

function IconArchivos() {
    return (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M3 1.5h6l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1v-11a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M9 1.5v4h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
    );
}

function IconPerfil() {
    return (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <circle cx="7.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M2 13.5c0-3 2.5-4.5 5.5-4.5s5.5 1.5 5.5 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
    );
}

function IconSalir() {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
                d="M5 2H3a1 1 0 00-1 1v8a1 1 0 001 1h2M9.5 4.5L12 7l-2.5 2.5M12 7H5"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
