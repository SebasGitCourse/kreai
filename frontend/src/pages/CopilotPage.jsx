import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import Sidebar from '../components/copilot/Sidebar.jsx';
import AreaChat from '../components/copilot/AreaChat.jsx';
import EntradaMensaje from '../components/copilot/EntradaMensaje.jsx';
import VistaPerfil from '../components/copilot/VistaPerfil.jsx';
import VistaArchivos from '../components/copilot/VistaArchivos.jsx';
import SelectorActividad from '../components/copilot/VistaActividades.jsx';
import SopaLetras from '../components/copilot/actividades/SopaLetras.jsx';
import Crucigrama from '../components/copilot/actividades/Crucigrama.jsx';
import VerdaderoFalso from '../components/copilot/actividades/VerdaderoFalso.jsx';
import CompletarVocales from '../components/copilot/actividades/CompletarVocales.jsx';
import Notificacion from '../components/copilot/Notificacion.jsx';
import { cerrarSesion } from '../services/auth.service.js';
import {
    listarConversaciones,
    crearConversacion,
    eliminarConversacion,
    obtenerMensajes,
    enviarMensajeStream,
    reintentarMensajeStream,
} from '../services/conversacion.service.js';
import './CopilotPage.css';

const VISTAS = { CHAT: 'chat', PERFIL: 'perfil', ARCHIVOS: 'archivos', ACTIVIDADES: 'actividades' };

const COMPONENTES_ACTIVIDAD = {
    sopa_letras: SopaLetras,
    crucigrama: Crucigrama,
    verdadero_falso: VerdaderoFalso,
    completar_vocales: CompletarVocales,
};

const MS_POR_CARACTER = 1;

function traducirError(msg) {
    if (!msg) return 'Ocurrió un error inesperado. Por favor intenta de nuevo.';
    const lower = msg.toLowerCase();
    if (lower.includes('rate limit') || lower.includes('429'))
        return 'El asistente está atendiendo muchas solicitudes. Espera unos segundos e intenta de nuevo.';
    if (lower.includes('timeout') || lower.includes('tardó')) return 'La respuesta tardó demasiado. Verifica tu conexión e intenta de nuevo.';
    if (lower.includes('conexión') || lower.includes('network') || lower.includes('servidor'))
        return 'No se pudo conectar. Verifica tu internet e intenta de nuevo.';
    return 'No se pudo obtener respuesta. Usa el botón ↺ para intentar de nuevo.';
}

export default function CopilotPage() {
    const { perfil, cargando: cargandoAuth } = useAuth();
    const navegar = useNavigate();

    // USE STATES
    const [vistaActual, setVistaActual] = useState(VISTAS.CHAT);
    const [sidebarAbierto, setSidebarAbierto] = useState(false);
    const [conversaciones, setConversaciones] = useState([]);
    const [idConversacionActiva, setIdConversacionActiva] = useState(null);
    const [mensajes, setMensajes] = useState([]);
    const [cargandoMensajes, setCargandoMensajes] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [actividadActiva, setActividadActiva] = useState(null);
    const [notificaciones, setNotificaciones] = useState([]);

    // USE REF
    const colaCaracteresRef = useRef([]);
    const textoAcumuladoRef = useRef('');
    const idTempRef = useRef(null);
    const timerTypewriterRef = useRef(null);
    // Callback registrado por onFin que se ejecuta cuando el typewriter vacía la cola.
    // Evita que onFin destruya la animación antes de que el usuario la vea.
    const callbackFinRef = useRef(null);
    const idRealUsuarioRef = useRef(null);

    useEffect(() => {
        if (!cargandoAuth && !perfil) navegar('/');
    }, [perfil, cargandoAuth, navegar]);

    useEffect(() => {
        if (perfil) cargarConversaciones();
    }, [perfil]);

    useEffect(() => {
        if (idConversacionActiva) cargarMensajes(idConversacionActiva);
    }, [idConversacionActiva]);

    useEffect(() => {
        return () => {
            if (timerTypewriterRef.current) clearTimeout(timerTypewriterRef.current);
        };
    }, []);

    // Procesa un carácter por tick. Cuando la cola se vacía, ejecuta el callback
    // de fin si lo hay (registrado por onFin mientras la animación aún corría).
    const procesarSiguienteCaracter = useCallback(() => {
        if (!colaCaracteresRef.current.length) {
            timerTypewriterRef.current = null;

            if (callbackFinRef.current) {
                const cb = callbackFinRef.current;
                callbackFinRef.current = null;
                cb();
            }
            return;
        }

        const caracter = colaCaracteresRef.current.shift();
        textoAcumuladoRef.current += caracter;

        const textoActual = textoAcumuladoRef.current;
        const idTemp = idTempRef.current;

        setMensajes((prev) => prev.map((m) => (m.id === idTemp ? { ...m, contenido: textoActual } : m)));

        timerTypewriterRef.current = setTimeout(procesarSiguienteCaracter, MS_POR_CARACTER);
    }, []);

    // Agrega los caracteres del token a la cola y arranca el typewriter si está parado.
    const agregarTokenACola = useCallback(
        (token) => {
            colaCaracteresRef.current.push(...token.split(''));
            if (!timerTypewriterRef.current) {
                timerTypewriterRef.current = setTimeout(procesarSiguienteCaracter, 0);
            }
        },
        [procesarSiguienteCaracter]
    );

    // Usada solo en errores: vuelca todo el texto pendiente sin animación.
    const vaciarColaDeTiron = useCallback(() => {
        if (colaCaracteresRef.current.length) {
            textoAcumuladoRef.current += colaCaracteresRef.current.join('');
            colaCaracteresRef.current = [];
        }
        if (timerTypewriterRef.current) {
            clearTimeout(timerTypewriterRef.current);
            timerTypewriterRef.current = null;
        }
        callbackFinRef.current = null;
    }, []);

    async function cargarConversaciones() {
        try {
            setConversaciones(await listarConversaciones());
        } catch {
            /* silencioso */
        }
    }

    async function cargarMensajes(id) {
        setCargandoMensajes(true);
        setMensajes([]);
        try {
            const lista = await obtenerMensajes(id);
            setMensajes(lista.map((m) => ({ ...m, estado: 'ok' })));
        } catch {
            /* silencioso */
        } finally {
            setCargandoMensajes(false);
        }
    }

    async function manejarNuevaConversacion() {
        try {
            const nueva = await crearConversacion();
            setConversaciones((prev) => [nueva, ...prev]);
            setIdConversacionActiva(nueva.id);
            setMensajes([]);
            setVistaActual(VISTAS.CHAT);
            setSidebarAbierto(false);
        } catch {
            /* silencioso */
        }
    }

    // ---------------------------

    const mostrarNotificacion = useCallback((mensaje) => {
        const id = Date.now();
        setNotificaciones((prev) => [...prev, { id, mensaje }]);
        setTimeout(() => setNotificaciones((prev) => prev.filter((n) => n.id !== id)), 5000);
    }, []);

    // ---------------------------

    async function manejarEliminarConversacion(id) {
        try {
            await eliminarConversacion(id);
            setConversaciones((prev) => prev.filter((c) => c.id !== id));
            if (idConversacionActiva === id) {
                setIdConversacionActiva(null);
                setMensajes([]);
            }
        } catch {
            /* silencioso */
        }
    }

    async function manejarCerrarSesion() {
        try {
            await cerrarSesion();
        } catch {
            /* silencioso */
        }
        navegar('/');
    }

    function manejarCambiarVista(v) {
        if (v === 'chat_bienvenida') {
            setVistaActual('chat');
            setIdConversacionActiva(null);
        } else {
            setVistaActual(v);
            if (v !== VISTAS.ACTIVIDADES) setActividadActiva(null);
            setSidebarAbierto(false);
        }
    }

    const manejarEnvio = useCallback(
        async (contenido, archivosNuevos, idsArchivosExistentes) => {
            if (!idConversacionActiva || enviando) return;
            setEnviando(true);

            textoAcumuladoRef.current = '';
            colaCaracteresRef.current = [];
            callbackFinRef.current = null;

            const idTempUsuario = `temp_usr_${Date.now()}`;
            const idTemporal = `temp_ast_${Date.now()}`;
            idTempRef.current = idTemporal;

            setMensajes((prev) => [
                ...prev,
                { id: idTempUsuario, rol: 'usuario', contenido: contenido || '', archivos: [], estado: 'ok' },
                { id: idTemporal, rol: 'asistente', contenido: '', archivos: [], estado: 'streaming' },
            ]);

            await enviarMensajeStream(idConversacionActiva, contenido, archivosNuevos, idsArchivosExistentes, {
                onMensajeUsuario: (msgUsuario) => {
                    idRealUsuarioRef.current = msgUsuario.id;
                    setMensajes((prev) => prev.map((m) => (m.id === idTempUsuario ? { ...msgUsuario, estado: 'ok' } : m)));
                },

                onToken: (token) => agregarTokenACola(token),

                // onFin NO vacía la cola. Registra un callback que el typewriter
                // ejecutará cuando termine de animar todos los caracteres.
                onFin: (evento) => {
                    const aplicarFin = () => {
                        const textoFinal = textoAcumuladoRef.current;

                        setMensajes((prev) =>
                            prev.map((m) =>
                                m.id === idTemporal ? { ...m, id: evento.id_mensaje_asistente, contenido: textoFinal, estado: 'ok' } : m
                            )
                        );

                        if (evento.titulo_actualizado) {
                            setConversaciones((prev) =>
                                prev.map((c) => (c.id === idConversacionActiva ? { ...c, titulo: evento.titulo_actualizado } : c))
                            );
                        }

                        textoAcumuladoRef.current = '';
                        idTempRef.current = null;
                        setEnviando(false);
                    };

                    // Si el typewriter ya terminó, aplicar de inmediato.
                    // Si aún está corriendo, el callback se ejecutará cuando vacíe la cola.
                    if (!timerTypewriterRef.current && !colaCaracteresRef.current.length) {
                        aplicarFin();
                    } else {
                        callbackFinRef.current = aplicarFin;
                    }
                },

                onError: (evento) => {
                    vaciarColaDeTiron();
                    // Capturar ANTES de resetear - el callback de setMensajes se ejecuta
                    // en el siguiente render cuando idRealUsuarioRef.current ya sería null
                    const idRealCapturado = idRealUsuarioRef.current;
                    setMensajes((prev) => {
                        const sinTempAsistente = prev.filter((m) => m.id !== idTemporal);
                        return sinTempAsistente.map((m) => {
                            const esEsteUsuario = m.id === idTempUsuario || m.id === idRealCapturado;
                            if (!esEsteUsuario) return m;
                            return {
                                ...m,
                                estado: 'error',
                                _errorMsg: traducirError(evento.mensaje),
                                _payload: { contenido, archivosNuevos, idsArchivosExistentes },
                            };
                        });
                    });
                    textoAcumuladoRef.current = '';
                    idTempRef.current = null;
                    idRealUsuarioRef.current = null;
                    setEnviando(false);
                },

                onArchivosIlegibles: (archivos) => {
                    archivos.forEach((nombre) => mostrarNotificacion(`"${nombre}" no pudo leerse. Puede estar escaneado, vacío o dañado.`));
                },

                onErrorValidacion: (errores) => {
                    // Eliminar burbujas temporales - no hubo envío real
                    setMensajes((prev) => prev.filter((m) => m.id !== idTempUsuario && m.id !== idTemporal));
                    textoAcumuladoRef.current = '';
                    idTempRef.current = null;
                    setEnviando(false);
                    errores.forEach((msg) => mostrarNotificacion(msg));
                },
            });
        },
        [idConversacionActiva, enviando, agregarTokenACola, vaciarColaDeTiron, mostrarNotificacion]
    );

    const manejarReintento = useCallback(
        async (idMensajeUsuario) => {
            if (!idConversacionActiva || enviando) return;
            setEnviando(true);

            textoAcumuladoRef.current = '';
            colaCaracteresRef.current = [];
            callbackFinRef.current = null;

            const idTemporal = `temp_ret_${Date.now()}`;
            idTempRef.current = idTemporal;

            setMensajes((prev) => {
                const idxUsuario = prev.findIndex((m) => m.id === idMensajeUsuario);
                if (idxUsuario === -1) return prev;

                const hastaUsuario = prev
                    .slice(0, idxUsuario + 1)
                    .map((m) => (m.id === idMensajeUsuario ? { ...m, estado: 'ok', _errorMsg: undefined, _payload: undefined } : m));

                return [...hastaUsuario, { id: idTemporal, rol: 'asistente', contenido: '', archivos: [], estado: 'streaming' }];
            });

            await reintentarMensajeStream(idConversacionActiva, idMensajeUsuario, {
                onToken: (token) => agregarTokenACola(token),

                onFin: (evento) => {
                    const aplicarFin = () => {
                        const textoFinal = textoAcumuladoRef.current;

                        setMensajes((prev) =>
                            prev.map((m) =>
                                m.id === idTemporal ? { ...m, id: evento.id_mensaje_asistente, contenido: textoFinal, estado: 'ok' } : m
                            )
                        );

                        textoAcumuladoRef.current = '';
                        idTempRef.current = null;
                        setEnviando(false);
                    };

                    if (!timerTypewriterRef.current && !colaCaracteresRef.current.length) {
                        aplicarFin();
                    } else {
                        callbackFinRef.current = aplicarFin;
                    }
                },

                onError: (evento) => {
                    vaciarColaDeTiron();
                    setMensajes((prev) =>
                        prev
                            .filter((m) => m.id !== idTemporal)
                            .map((m) => (m.id === idMensajeUsuario ? { ...m, estado: 'error', _errorMsg: traducirError(evento.mensaje) } : m))
                    );
                    textoAcumuladoRef.current = '';
                    idTempRef.current = null;
                    setEnviando(false);
                },
            });
        },
        [idConversacionActiva, enviando, agregarTokenACola, vaciarColaDeTiron]
    );

    const manejarReenvio = useCallback(
        (payload) => {
            if (!payload) return;
            // Eliminar la burbuja con error - manejarEnvio creará burbujas nuevas limpias
            setMensajes((prev) => prev.filter((m) => m.estado !== 'error'));
            manejarEnvio(payload.contenido, payload.archivosNuevos, payload.idsArchivosExistentes);
        },
        [manejarEnvio]
    );

    function renderizarActividad(tipo) {
        const Comp = COMPONENTES_ACTIVIDAD[tipo];
        if (!Comp) return null;
        return <Comp onVolver={() => setActividadActiva(null)} />;
    }

    if (cargandoAuth) return null;

    return (
        <div className="copilot">
            {sidebarAbierto && <div className="copilot__overlay" onClick={() => setSidebarAbierto(false)} />}

            <Sidebar
                abierto={sidebarAbierto}
                vistaActual={vistaActual}
                conversaciones={conversaciones}
                idActiva={idConversacionActiva}
                usuario={perfil}
                onNuevaConv={manejarNuevaConversacion}
                onSeleccionar={(id) => {
                    setIdConversacionActiva(id);
                    setVistaActual(VISTAS.CHAT);
                    setSidebarAbierto(false);
                }}
                onEliminar={manejarEliminarConversacion}
                onCambiarVista={manejarCambiarVista}
                onCerrarSesion={manejarCerrarSesion}
            />

            <main className="copilot__main">
                <button className="copilot__btn-menu" onClick={() => setSidebarAbierto(true)} aria-label="Abrir menú">
                    {iconMenu()}
                </button>

                {vistaActual === VISTAS.PERFIL && <VistaPerfil usuario={perfil} onCerrarSesion={manejarCerrarSesion} />}
                {vistaActual === VISTAS.ARCHIVOS && <VistaArchivos />}

                {vistaActual === VISTAS.ACTIVIDADES && (
                    <div className="copilot__actividades">
                        {!actividadActiva ? <SelectorActividad onSeleccionar={setActividadActiva} /> : renderizarActividad(actividadActiva)}
                    </div>
                )}

                {vistaActual === VISTAS.CHAT && (
                    <div className="copilot__chat">
                        {!idConversacionActiva ? (
                            <div className="copilot__bienvenida">
                                <div className="copilot__bienvenida-logo" aria-hidden="true"></div>
                                <h1 className="copilot__bienvenida-titulo">Hola, {perfil?.nombres?.split(' ')[0] || 'docente'}</h1>
                                <p className="copilot__bienvenida-sub">¿En qué puedo ayudarte hoy?</p>
                                <div className="copilot__bienvenida-acciones">
                                    <button className="copilot__bienvenida-cta" onClick={manejarNuevaConversacion}>
                                        {iconConversation()}
                                        <span>Nueva conversación</span>
                                    </button>
                                    <button
                                        className="copilot__bienvenida-cta copilot__bienvenida-cta--sec"
                                        onClick={() => manejarCambiarVista(VISTAS.ACTIVIDADES)}
                                    >
                                        {iconMaterialEdu()}
                                        <span>Crear material educativo</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <AreaChat mensajes={mensajes} cargando={cargandoMensajes} onReintento={manejarReintento} onReenvio={manejarReenvio} />
                                <EntradaMensaje deshabilitado={enviando} onEnviar={manejarEnvio} />
                            </>
                        )}
                    </div>
                )}
            </main>

            <Notificacion notificaciones={notificaciones} />
        </div>
    );
}

function iconMenu() {
    return (
        // <svg viewBox="0 -2 32 32" fill="#fff" xmlns="http://www.w3.org/2000/svg">
        //     <title>arrow-right</title>
        //     <path
        //         d="M28 0H8a4 4 0 0 0-4 4v4h2V4a2 2 0 0 1 2-2h20a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-4H4v4a4 4 0 0 4 4h20a4 4 0 0 0 4-4V4a4 4 0 0 0-4-4M17.343 20.243a1 1 0 0 0 1.415 1.414l6.899-6.899A1 1 0 0 0 25.94 14a1 1 0 0 0-.283-.757l-6.899-6.899a1 1 0 1 0-1.415 1.414L22.586 13H1a1 1 0 1 0 0 2h21.586z"
        //         fillRule="evenodd"
        //     />
        // </svg>

        <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <title>{'arrow-right-circle'}</title>
            <path
                d="m22.535 16.88-5.656 5.66a1 1 0 0 1-1.414 0 1.006 1.006 0 0 1 0-1.42L19.586 17H9a1.001 1.001 0 0 1 0-2h10.586l-4.121-4.12a1.006 1.006 0 0 1 0-1.42 1 1 0 0 1 1.414 0l5.656 5.66c.24.24.315.57.26.88.055.31-.02.64-.26.88M16 0C7.163 0 0 7.16 0 16s7.163 16 16 16 16-7.16 16-16S24.837 0 16 0"
                fillRule="evenodd"
                fill="#fff"
            />
        </svg>
    );
}

function iconConversation() {
    return (
        <svg viewBox="0 0 24 24" data-name="Flat Line" xmlns="http://www.w3.org/2000/svg" className="icon flat-line">
            <path d="M8 17h9l4 4V7a1 1 0 0 0-1-1h-3" style={{ fill: 'black', stroke: 'black', strokeWidth: '0px' }} />
            <path
                data-name="primary"
                d="M17 4v8a1 1 0 0 1-1 1H7l-4 4V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1"
                style={{ fill: '#df4568', stroke: 'black', strokeWidth: '1px' }}
            />
        </svg>
    );
}

function iconMaterialEdu() {
    return (
        <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
            <g id="SVGRepo_tracerCarrier" />
            <g id="SVGRepo_iconCarrier">
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
            </g>
        </svg>
    );
}
