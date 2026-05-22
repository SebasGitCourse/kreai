import { useState, useCallback } from 'react';
import { sugerirActividad } from '../../../services/actividad.service.js';
import VistaPrevia from './VistaPrevia.jsx';
import iconoSugerirIA from '../../../assets/icon-sugg-ai.svg';
import iconoFlechaGenerarAct from '../../../assets/icon-gen-act.svg';
import './actividades-base.css';
import './VerdaderoFalso.css';

const GRADOS = ['1°', '2°', '3°', '4°', '5°'];
const CANTIDAD_MIN = 10;
const CANTIDAD_MAX = 25;

export default function VerdaderoFalso({ onVolver }) {
    const [tema, setTema] = useState('');
    const [grado, setGrado] = useState(GRADOS[4]);
    const [cantidad, setCantidad] = useState(10);
    const [cantidadTexto, setCantidadTexto] = useState('10');
    const [titulo, setTitulo] = useState('');
    const [instrucciones, setInstrucciones] = useState('');
    const [enunciados, setEnunciados] = useState([]);
    const [nuevoTexto, setNuevoTexto] = useState('');
    const [nuevaResp, setNuevaResp] = useState(true);
    const [cargandoIA, setCargandoIA] = useState(false);
    const [errorIA, setErrorIA] = useState('');
    const [vistaPrevia, setVistaPrevia] = useState(false);

    function mezclar(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    const pedirIA = useCallback(async () => {
        if (!tema.trim()) return setErrorIA('Escribe un tema.');
        setCargandoIA(true);
        setErrorIA('');
        try {
            const d = await sugerirActividad({ tipo: 'verdadero_falso', tema, grado, cantidad });
            if (!d) return;
            setTitulo(d.titulo || '');
            setInstrucciones(d.instrucciones || '');
            setEnunciados(mezclar(d.enunciados || []));
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

    function agregar() {
        if (!nuevoTexto.trim() || enunciados.length >= CANTIDAD_MAX) return;
        setEnunciados((prev) => [...prev, { texto: nuevoTexto.trim(), respuesta: nuevaResp }]);
        setNuevoTexto('');
    }

    if (vistaPrevia)
        return (
            <VistaPrevia
                tipo="verdadero_falso"
                datos={{ titulo, instrucciones, enunciados }}
                onEditar={() => setVistaPrevia(false)}
                onVolver={onVolver}
            />
        );

    return (
        <div className="verdadero-falso">
            <div className="act__header">
                <button className="act__volver" onClick={onVolver}>
                    Actividades
                </button>
                <h2 className="act__titulo">Verdadero o falso</h2>
            </div>

            <section className="act__seccion">
                <h3 className="act__seccion-titulo">Configuración</h3>
                <div className="act__form-fila">
                    <label className="act__label">
                        Tema{' '}
                        <input
                            className="act__input"
                            type="text"
                            placeholder="Ej: La fotosíntesis"
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
                        Enunciados{' '}
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
                <h3 className="act__seccion-titulo">Enunciados ({enunciados.length})</h3>
                {enunciados.map((e, i) => (
                    <div key={i} className="vf__fila">
                        <input
                            className="act__input vf__inp"
                            value={e.texto}
                            onChange={(ev) => setEnunciados((prev) => prev.map((x, j) => (j === i ? { ...x, texto: ev.target.value } : x)))}
                        />
                        <select
                            className="act__select vf__sel"
                            value={String(e.respuesta)}
                            onChange={(ev) =>
                                setEnunciados((prev) => prev.map((x, j) => (j === i ? { ...x, respuesta: ev.target.value === 'true' } : x)))
                            }
                        >
                            <option value="true">Verdadero</option>
                            <option value="false">Falso</option>
                        </select>
                        <button className="act__chip-quitar" onClick={() => setEnunciados((prev) => prev.filter((_, j) => j !== i))}>
                            x
                        </button>
                    </div>
                ))}
                <div className="vf__fila">
                    <input
                        className="act__input vf__inp"
                        value={nuevoTexto}
                        onChange={(e) => setNuevoTexto(e.target.value)}
                        placeholder="Nuevo enunciado"
                        onKeyDown={(e) => e.key === 'Enter' && agregar()}
                    />
                    <select className="act__select vf__sel" value={String(nuevaResp)} onChange={(e) => setNuevaResp(e.target.value === 'true')}>
                        <option value="true">Verdadero</option>
                        <option value="false">Falso</option>
                    </select>
                    <button className="act__btn-agregar" onClick={agregar}>
                        + Agregar
                    </button>
                </div>
            </section>

            <div className="act__acciones">
                <button className="act__btn-generar" onClick={() => setVistaPrevia(true)} disabled={enunciados.length < 2}>
                    Generar actividad <img src={iconoFlechaGenerarAct} />
                </button>
            </div>
        </div>
    );
}
