// components/copilot/actividades/CompletaVocales.jsx

import { useState, useRef } from 'react';
import { generarCompletaVocales, generarImagenPalabra } from '../../../services/actividad.service.js';
import VistaPrevia from './VistaPrevia.jsx';
import iconoSugerirIA from '../../../assets/icon-sugg-ai.svg';
import iconoFlechaGenerarAct from '../../../assets/icon-gen-act.svg';
import './CompletarVocales.css';

const GRADOS = ['1°', '2°', '3°', '4°', '5°'];

const SUGERENCIAS_TEMA = [
    'animales de la granja',
    'frutas tropicales',
    'objetos del salón',
    'animales del mar',
    'medios de transporte',
    'partes del cuerpo',
];

export default function CompletaVocales({ onVolver }) {
    //  Estado del formulario
    const [form, setForm] = useState({ tema: '', grado: `${GRADOS[4]}`, cantidad: 6, titulo: '' });

    //  Estado de la pantalla
    // formulario | cargando | edicion | preview
    const [pantalla, setPantalla] = useState('formulario');

    //  Palabras generadas/editadas
    // Cada elemento: { palabra, palabraDisplay, imagen }
    const [palabras, setPalabras] = useState([]);

    //  Agregar palabra manual en edición
    const [inputPalabra, setInputPalabra] = useState('');
    const [cargandoImagen, setCargandoImagen] = useState(false);
    const [errorImagen, setErrorImagen] = useState('');
    const inputRef = useRef(null);

    //  Errores generales
    const [error, setError] = useState('');

    //  Formulario: cambio de campo
    function manejarCambio(e) {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    }

    function usarSugerencia(tema) {
        setForm((prev) => ({ ...prev, tema }));
    }

    //  Generar con IA
    async function manejarGenerarIA() {
        if (!form.tema.trim()) {
            setError('Escribe un tema para que la IA genere las palabras.');
            return;
        }
        setError('');
        setPantalla('cargando');
        try {
            const datos = await generarCompletaVocales(form);
            setPalabras(datos.palabras);
            setPantalla('edicion');
        } catch (err) {
            setError(err.message || 'Error al generar. Intenta de nuevo.');
            setPantalla('formulario');
        }
    }

    //  Ir a edición manual (sin IA)
    function manejarModoManual() {
        setPalabras([]);
        setError('');
        setPantalla('edicion');
    }

    //  Edición: agregar palabra manual
    async function manejarAgregarPalabra() {
        const texto = inputPalabra.trim().toUpperCase();
        if (!texto) return;

        if (palabras.some((p) => p.palabra === texto)) {
            setErrorImagen('Esa palabra ya está en la lista.');
            return;
        }

        setErrorImagen('');
        setCargandoImagen(true);
        try {
            const nueva = await generarImagenPalabra(texto);
            setPalabras((prev) => [...prev, nueva]);
            setInputPalabra('');
            inputRef.current?.focus();
        } catch (err) {
            setErrorImagen(err.message || 'Error al generar la imagen. Intenta de nuevo.');
        } finally {
            setCargandoImagen(false);
        }
    }

    function manejarKeyDownInput(e) {
        if (e.key === 'Enter') manejarAgregarPalabra();
    }

    //  Edición: eliminar palabra
    function manejarEliminarPalabra(palabra) {
        setPalabras((prev) => prev.filter((p) => p.palabra !== palabra));
    }

    //  Ir a vista previa
    function manejarVerPreview() {
        setPantalla('preview');
    }

    //  Construir objeto datos para VistaPrevia
    function construirDatos() {
        return {
            titulo: form.titulo?.trim() || `Completa con vocales - ${form.tema || 'Actividad'}`,
            instruccion: 'Completa estas palabras con las vocales que faltan',
            grado: form.grado,
            cantidad: palabras.length,
            palabras,
        };
    }

    //  Render: preview
    if (pantalla === 'preview') {
        return <VistaPrevia tipo="completa_vocales" datos={construirDatos()} onEditar={() => setPantalla('edicion')} onVolver={onVolver} />;
    }

    //  Render: cargando
    if (pantalla === 'cargando') {
        return (
            <div className="cont_completar-vocales">
                <div className="act__header">
                    <h2 className="act__titulo">Completa con vocales</h2>
                </div>

                <div className="cv__cargando">
                    <span className="act__spinner cv__spinner-grande" />
                    <p className="cv__cargando-titulo">Generando palabras e ilustraciones...</p>
                    <p className="cv__cargando-detalle">
                        La IA está seleccionando palabras y creando imágenes para cada una. Esto puede tardar entre 15 y 30 segundos.
                    </p>
                </div>
            </div>
        );
    }

    //  Render: edición
    if (pantalla === 'edicion') {
        const estaLleno = palabras.length >= Number(form.cantidad);

        return (
            <div className="cont_completar-vocales">
                {/* Encabezado */}
                <div className="act__header">
                    <button className="act__volver" onClick={() => setPantalla('formulario')} type="button">
                        Configuración
                    </button>
                    <h2 className="act__titulo">Completa con vocales - Editar palabras</h2>
                </div>

                {/* Palabras actuales como chips */}
                <div className="act__seccion">
                    <p className="act__seccion-titulo">
                        Palabras ({palabras.length} / {form.cantidad}) - puedes eliminar o agregar más
                    </p>

                    {palabras.length === 0 && <p className="cv__vacio">Aún no hay palabras. Agrega al menos una usando el campo de abajo.</p>}

                    <div className="cv__chips-palabras">
                        {palabras.map((item) => (
                            <div key={item.palabra} className="cv__chip-palabra">
                                {item.imagen ? (
                                    <img className="cv__chip-img" src={item.imagen} alt={item.palabra} />
                                ) : (
                                    <span className="cv__chip-img-fallback">🖼️</span>
                                )}
                                <span className="cv__chip-texto">{item.palabraDisplay}</span>
                                <button
                                    className="act__chip-quitar"
                                    onClick={() => manejarEliminarPalabra(item.palabra)}
                                    title={`Eliminar ${item.palabra}`}
                                    type="button"
                                >
                                    x
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Agregar palabra manual */}
                <div className="act__seccion">
                    <p className="act__seccion-titulo">Agregar palabra</p>
                    <div className="cv__agregar">
                        <input
                            ref={inputRef}
                            className="act__input cv__input-palabra"
                            type="text"
                            placeholder={estaLleno ? `Límite alcanzado (${form.cantidad} palabras)` : 'Escribe una palabra, ej: MARIPOSA'}
                            value={inputPalabra}
                            onChange={(e) => setInputPalabra(e.target.value)}
                            onKeyDown={manejarKeyDownInput}
                            disabled={cargandoImagen || estaLleno}
                        />
                        <button
                            className="act__btn-agregar"
                            onClick={manejarAgregarPalabra}
                            disabled={cargandoImagen || !inputPalabra.trim() || estaLleno}
                            type="button"
                        >
                            {cargandoImagen ? (
                                <>
                                    <span className="act__spinner" /> Generando...
                                </>
                            ) : (
                                '+ Agregar'
                            )}
                        </button>
                    </div>
                    {estaLleno && <p className="cv__edicion-detalle">Límite alcanzado. Elimina una palabra para poder agregar otra.</p>}
                    {errorImagen && <p className="act__error cv__error-imagen">{errorImagen}</p>}
                    {cargandoImagen && <p className="cv__edicion-detalle">Generando ilustración para la palabra...</p>}
                </div>

                {/* Acción: ver vista previa */}
                <div className="act__acciones">
                    <button className="act__btn-generar" onClick={manejarVerPreview} disabled={palabras.length === 0} type="button">
                        Ver vista previa →
                    </button>
                </div>

                {palabras.length === 0 && <p className="cv__edicion-detalle">Agrega al menos una palabra para continuar.</p>}
            </div>
        );
    }

    //  Render: formulario (default)
    return (
        <div className="cont_completar-vocales">
            {/* Encabezado */}
            <div className="act__header">
                <button className="act__volver" onClick={onVolver} type="button">
                    Actividades
                </button>
                <h2 className="act__titulo">Completar vocales</h2>
            </div>

            {/* Grado */}
            <div className="act__seccion">
                <p className="act__seccion-titulo">Configuración</p>
                <div className="act__form-fila">
                    <label className="act__label">
                        Grado escolar
                        <select className="act__select" name="grado" value={form.grado} onChange={manejarCambio}>
                            {GRADOS.map((g) => (
                                <option key={g} value={g}>
                                    {g} de primaria
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="act__label">
                        Cantidad de palabras (IA)
                        <select className="act__select" name="cantidad" value={form.cantidad} onChange={manejarCambio}>
                            <option value={4}>4 palabras (2 X 2)</option>
                            <option value={6}>6 palabras (2 X 3)</option>
                            <option value={9}>9 palabras (3 X 3)</option>
                            <option value={16}>16 palabras (4 X 4)</option>
                        </select>
                    </label>
                </div>
            </div>

            {/* Instrucción personalizada */}
            <div className="act__seccion">
                <p className="act__seccion-titulo">Instrucción personalizada (opcional)</p>
                <label className="act__label cv__lab-instruccion">
                    Texto de la instrucción
                    <input
                        className="act__input cv__inp-instruccion"
                        name="titulo"
                        type="text"
                        placeholder="Por defecto: Completa estas palabras con las vocales que faltan."
                        value={form.titulo}
                        onChange={manejarCambio}
                    />
                </label>
            </div>

            {/* Opción 1: generar con IA */}
            <div className="act__seccion">
                <p className="act__seccion-titulo">Opción 1 - Generar con IA por tema</p>
                <label className="act__label cv__lab-tema">
                    Tema o categoría
                    <input
                        className="act__input cv__inp-tema"
                        name="tema"
                        type="text"
                        placeholder="Ej: animales de la granja, frutas, objetos del salón..."
                        value={form.tema}
                        onChange={manejarCambio}
                    />
                </label>

                <div className="cv__sugerencias">
                    {SUGERENCIAS_TEMA.map((t) => (
                        <button key={t} className="cv__chip-sugerencia" onClick={() => usarSugerencia(t)} type="button">
                            {t}
                        </button>
                    ))}
                </div>

                {error && <p className="act__error">{error}</p>}

                <button className="act__btn-ia" onClick={manejarGenerarIA} type="button">
                    <img src={iconoSugerirIA} /> Sugerencia con IA
                </button>
            </div>

            {/* Separador */}
            <div className="cv__separador">
                <hr></hr>
                <span>o</span>
                <hr></hr>
            </div>

            {/* Opción 2: manual */}
            <div className="act__seccion">
                <p className="act__seccion-titulo">Opción 2 - Agregar palabras manualmente</p>
                <p className="cv__descripcion-manual">
                    Ingresa tus propias palabras una por una. La app generará una ilustración para cada una automáticamente.
                </p>

                <button className="act__btn-agregar" onClick={manejarModoManual} type="button">
                    Ingresar palabras manualmente <img src={iconoFlechaGenerarAct} />
                </button>
            </div>
        </div>
    );
}
