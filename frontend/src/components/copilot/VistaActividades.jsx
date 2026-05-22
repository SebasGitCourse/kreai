import imgSopaLetras from '../../assets/img-sopa-letras.jpeg';
import imgCrucigrama from '../../assets/img-crucigrama.png';
import imgVf from '../../assets/img-vf.png';
import imgCv from '../../assets/img-cv.png';

import './VistaActividades.css';

const ACTIVIDADES = [
    {
        id: 'sopa_letras',
        nombre: 'Sopa de letras',
        descripcion: 'Crea sopas de letras de cualquier tema con palabras ocultas en una cuadrícula lista para imprimir.',

        iconoURL: imgSopaLetras,
    },
    {
        id: 'crucigrama',
        nombre: 'Crucigrama',
        descripcion: 'Crea crucigramas con pistas y respuestas personalizadas para reforzar conceptos de forma práctica.',

        iconoURL: imgCrucigrama,
    },
    {
        id: 'verdadero_falso',
        nombre: 'Verdadero o falso',
        descripcion: 'Crea ejercicios de verdadero o falso con afirmaciones listas para repasar y evaluar contenidos.',

        iconoURL: imgVf,
    },
    {
        id: 'completar_vocales',
        nombre: 'Completar vocales',
        descripcion: 'Crea actividades con imágenes y palabras incompletas para completar las vocales faltantes en cuadriculas.',

        iconoURL: imgCv,
    },
];

export default function SelectorActividad({ onSeleccionar }) {
    return (
        <div className="selector-actividad">
            <div className="selector-actividad__encabezado">
                <h1 className="selector-actividad__titulo">Material educativo</h1>
                <p className="selector-actividad__sub">Selecciona el tipo de actividad</p>
            </div>

            <div className="selector-activ">
                {ACTIVIDADES.map((act) => (
                    <button key={act.id} className="selector-activ__card" onClick={() => onSeleccionar(act.id)}>
                        <img src={`${act.iconoURL}`} className="selector-activ__card-iconoURL" />

                        <div className="selector-activ-info">
                            <span className="selector-activ__card-nombre">{act.nombre}</span>
                            <span className="selector-activ__card-descripcion">{act.descripcion}</span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
