import { useState, useCallback } from 'react';
import { sugerirActividad } from '../../../services/actividad.service.js';
import { generarCrucigrama } from '../../../utils/algoritmos.js';
import VistaPrevia from './VistaPrevia.jsx';
import iconoSugerirIA from '../../../assets/icon-sugg-ai.svg';
import iconoFlechaGenerarAct from '../../../assets/icon-gen-act.svg';
import './actividades-base.css';
import './Crucigrama.css';

const GRADOS = ['1°', '2°', '3°', '4°', '5°'];
const CANTIDAD_MIN = 8;
const CANTIDAD_MAX = 12;

export default function Crucigrama({ onVolver }) {
    const [tema, setTema] = useState('');
    const [grado, setGrado] = useState(GRADOS[4]);
    const [cantidad, setCantidad] = useState(8);
    const [cantidadTexto, setCantidadTexto] = useState('8');
    const [titulo, setTitulo] = useState('');
    const [instrucciones, setInstrucciones] = useState('');
    const [palabras, setPalabras] = useState([]);
    const [nuevaPalabra, setNuevaPalabra] = useState('');
    const [nuevaPista, setNuevaPista] = useState('');
    const [cargandoIA, setCargandoIA] = useState(false);
    const [errorIA, setErrorIA] = useState('');
    const [resultado, setResultado] = useState(null);
    const [vistaPrevia, setVistaPrevia] = useState(false);

    const pedirIA = useCallback(async () => {
        if (!tema.trim()) return setErrorIA('Escribe un tema.');
        setCargandoIA(true);
        setErrorIA('');
        try {
            const d = await sugerirActividad({ tipo: 'crucigrama', tema, grado, cantidad });
            if (!d) return;
            setTitulo(d.titulo || '');
            setInstrucciones(d.instrucciones || '');
            setPalabras(d.palabras || []);
        } catch {
            setErrorIA('No se pudo obtener sugerencias.');
        } finally {
            setCargandoIA(false);
        }
    }, [tema, grado, cantidad]);

    function actualizarCantidad(valor) {
        setCantidadTexto(valor);
    }

    function confirmarCantidad() {
        const num = parseInt(cantidadTexto, 10);
        const validado = isNaN(num) ? CANTIDAD_MIN : Math.min(Math.max(num, CANTIDAD_MIN), CANTIDAD_MAX);
        setCantidad(validado);
        setCantidadTexto(String(validado));
    }

    function editarPalabra(idx, campo, val) {
        setPalabras((prev) => prev.map((p, i) => (i === idx ? { ...p, [campo]: campo === 'palabra' ? val.toUpperCase() : val } : p)));
    }

    function agregar() {
        const p = nuevaPalabra.trim().replace(/\s+/g, '').toUpperCase();
        if (!p || palabras.length >= CANTIDAD_MAX) return;
        setPalabras((prev) => [...prev, { palabra: p, pista: nuevaPista.trim() }]);
        setNuevaPalabra('');
        setNuevaPista('');
    }

    function generarGrilla() {
        if (palabras.length < 2) return;
        setResultado(generarCrucigrama(palabras));
        setVistaPrevia(true);
    }

    if (vistaPrevia && resultado) {
        return (
            <VistaPrevia
                tipo="crucigrama"
                datos={{ titulo, instrucciones, palabras, ...resultado }}
                onEditar={() => setVistaPrevia(false)}
                onVolver={onVolver}
            />
        );
    }

    return (
        <div className="crucigrama">
            <div className="act__header">
                <button className="act__volver" onClick={onVolver}>
                    Actividades
                </button>
                <h2 className="act__titulo">Crucigrama</h2>
            </div>
            <section className="act__seccion">
                <h3 className="act__seccion-titulo">Configuración</h3>
                <div className="act__form-fila">
                    <label className="act__label">
                        Tema{' '}
                        <input
                            className="act__input"
                            type="text"
                            placeholder="Ej: El sistema solar"
                            value={tema}
                            onChange={(e) => setTema(e.target.value)}
                        />
                    </label>
                    <label className="act__label">
                        Grado{' '}
                        <select className="act__select" value={grado} onChange={(e) => setGrado(e.target.value)}>
                            {GRADOS.map((g) => (
                                <option key={g}>{g}</option>
                            ))}
                        </select>
                    </label>
                    <label className="act__label">
                        Palabras{' '}
                        <input
                            className="act__input act__input--num"
                            type="number"
                            inputMode="numeric"
                            min={CANTIDAD_MIN}
                            max={CANTIDAD_MAX}
                            value={cantidadTexto}
                            onChange={(e) => actualizarCantidad(e.target.value)}
                            onBlur={confirmarCantidad}
                        />
                    </label>
                </div>
                <button className="act__btn-ia" onClick={pedirIA} disabled={cargandoIA}>
                    {cargandoIA ? (
                        <>
                            <span className="act__spinner" /> Generando…
                        </>
                    ) : (
                        <>
                            <img src={iconoSugerirIA} /> Sugerencia con IA
                        </>
                    )}
                </button>
                {errorIA && <p className="act__error">{errorIA}</p>}
            </section>
            <section className="act__seccion">
                <h3 className="act__seccion-titulo">Título e instrucciones</h3>
                <input className="act__input" type="text" placeholder="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
                <textarea
                    className="act__textarea"
                    placeholder="Instrucciones"
                    rows={2}
                    value={instrucciones}
                    onChange={(e) => setInstrucciones(e.target.value)}
                />
            </section>
            <section className="act__seccion">
                <h3 className="act__seccion-titulo">Palabras y pistas ({palabras.length})</h3>
                {palabras.map((p, i) => (
                    <div key={i} className="crucigrama__fila">
                        <input
                            className="act__input crucigrama__inp-palabra"
                            value={p.palabra}
                            onChange={(e) => editarPalabra(i, 'palabra', e.target.value)}
                            placeholder="PALABRA"
                        />
                        <input
                            className="act__input crucigrama__inp-pista"
                            value={p.pista}
                            onChange={(e) => editarPalabra(i, 'pista', e.target.value)}
                            placeholder="Pista o definición"
                        />
                        <button className="act__chip-quitar" onClick={() => setPalabras((prev) => prev.filter((_, j) => j !== i))}>
                            x
                        </button>
                    </div>
                ))}
                <div className="crucigrama__fila">
                    <input
                        className="act__input crucigrama__inp-palabra"
                        value={nuevaPalabra}
                        onChange={(e) => setNuevaPalabra(e.target.value)}
                        placeholder="PALABRA"
                        onKeyDown={(e) => e.key === 'Enter' && agregar()}
                    />
                    <input
                        className="act__input crucigrama__inp-pista"
                        value={nuevaPista}
                        onChange={(e) => setNuevaPista(e.target.value)}
                        placeholder="Pista"
                        onKeyDown={(e) => e.key === 'Enter' && agregar()}
                    />
                    <button className="act__btn-agregar" onClick={agregar}>
                        + Agregar
                    </button>
                </div>
            </section>
            <div className="act__acciones">
                <button className="act__btn-generar" onClick={generarGrilla} disabled={palabras.length < 2}>
                    Generar crucigrama <img src={iconoFlechaGenerarAct} />
                </button>
            </div>
        </div>
    );
}
