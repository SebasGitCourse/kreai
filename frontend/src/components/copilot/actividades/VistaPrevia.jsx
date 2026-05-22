import { useRef, useEffect } from 'react';
import iconoImprimirAct from '../../../assets/icon-print-act.svg';
import fondoPlantilla1 from '../../../assets/img-fondo-plantilla1.png';
import fondoPlantilla2 from '../../../assets/img-fondo-plantilla2.png';
import fondoPlantilla3 from '../../../assets/img-fondo-plantilla3.png';
import fondoPlantilla4 from '../../../assets/img-fondo-plantilla4.png';
import fondoPlantilla5 from '../../../assets/img-fondo-plantilla5.png';
import './VistaPrevia.css';

const IMG_FONDOS_URLS = [fondoPlantilla1, fondoPlantilla2, fondoPlantilla3, fondoPlantilla4, fondoPlantilla5];

function elegirFondoAleatorio(fondos = []) {
    if (!fondos.length) return '';
    const index = Math.floor(Math.random() * fondos.length);
    return fondos[index];
}

// Estilos base de impresión - sin fondo (se inyecta dinámicamente en generarHTML)
const CSS_IMPRESION = `
    * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
    }

    @page {
        size: letter;
        margin: 0;
    }

    html {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }

    body {
        font-family: 'Times New Roman', Times, serif;
        color: #000;
        padding: 1.5cm 2cm;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
    }

    h1 { font-size: 18pt; text-align: center; }
    h3 { font-size: 11pt; margin: 6pt 0 3pt; }
    p, li { font-size: 11pt; line-height: 1.5; }

    .instrucciones {
        text-align: center;
        font-size: 10pt;
        width: 80%;
    }

    .info-doc {
        display: flex;
        justify-content: space-between;
        font-size: 10pt;
        gap: 20pt;
        width: 100%;
    }

    /* Sopa de letras */
    .grilla-sopa { border-collapse: collapse; }

    .grilla-sopa td {
        width: 22pt;
        height: 22pt;
        text-align: center;
        font-size: 9pt;
        font-weight: bold;
        border: 1px solid #000;
    }

    .celda-res { background: #df456890; }

    .lista-palabras { columns: 3; column-gap: 2rem; width: 80%; }
    .lista-palabras li { font-size: 10pt; break-inside: avoid; }

    /* Crucigrama */
    .grilla-cruz { border: none; }

    .grilla-cruz td {
        width: 22pt;
        height: 22pt;
        position: relative;
        vertical-align: top;
        border: 1px solid transparent;
    }

    .celda-negra { background: transparent; border: none; }

    .num-celda {
        font-size: 6pt;
        position: absolute;
        top: 2pt;
        left: 2pt;
        line-height: 1;
        color: #df4568;
    }

    .letra-cruz {
        font-size:5pt;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        border: 0.1px solid #000;
        color: #000;
    }

    .pistas { display: flex; gap: 20pt; margin-top: 8pt; width: 80%; }
    .pistas-col { flex: 1; }
    .pista { font-size: 10pt; margin-bottom: 3pt; }

    /* Verdadero o falso */
    .vf-lista {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 6pt;
    }

    .vf-fila {
        display: flex;
        align-items: center;
        gap: 8pt;
        padding: 5pt 8pt;
        background: rgba(223, 69, 104, 0.06);
        border-radius: 4pt;
        page-break-inside: avoid;
        break-inside: avoid;
    }

    .vf-num {
        font-weight: bold;
        flex-shrink: 0;
        color: #df4568;
        min-width: 16pt;
    }

    .vf-texto { flex: 1; font-size: 11pt; }

    .vf-cajas {
        display: flex;
        align-items: center;
        gap: 4pt;
        flex-shrink: 0;
    }

    .vf-caja {
        border: 1px solid #000;
        padding: 2pt 8pt;
        font-size: 10pt;
        min-width: 22pt;
        text-align: center;
    }

    .vf-resp {
        font-size: 11pt;
        font-weight: bold;
        flex-shrink: 0;
        min-width: 40pt;
        text-align: center;
    }
`;

/**
 * VistaPrevia muestra el material generado y ofrece botones para imprimir.
 *
 * El fondo de plantilla se precarga como base64 al montar el componente,
 * evitando peticiones de red al momento de imprimir y mejorando el rendimiento.
 *
 * Para que el fondo aparezca en cada página (no solo en la primera),
 * se usa html::before con position:fixed — en impresión CSS, los elementos
 * fixed se repiten en cada página por estándar.
 */
export default function VistaPrevia({ tipo, datos, onEditar, onVolver }) {
    const iframeRef = useRef(null);
    const fondosRef = useRef(IMG_FONDOS_URLS); // fallback a imágenes originales si falla la precarga

    useEffect(() => {
        Promise.all(
            IMG_FONDOS_URLS.map((url) =>
                fetch(url)
                    .then((r) => r.blob())
                    .then(
                        (blob) =>
                            new Promise((resolve) => {
                                const reader = new FileReader();
                                reader.onloadend = () => resolve(reader.result);
                                reader.readAsDataURL(blob);
                            })
                    )
                    .catch(() => url)
            )
        )
            .then((fondosBase64) => {
                fondosRef.current = fondosBase64;
            })
            .catch(() => {
                fondosRef.current = IMG_FONDOS_URLS;
            });
    }, []);

    function imprimir(conRespuestas) {
        // const html = generarHTML(tipo, datos, conRespuestas, fondoRef.current);
        const fondoAleatorio = elegirFondoAleatorio(fondosRef.current);
        const html = generarHTML(tipo, datos, conRespuestas, fondoAleatorio);

        if (!iframeRef.current) {
            const iframe = document.createElement('iframe');
            iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;border:none;';
            document.body.appendChild(iframe);
            iframeRef.current = iframe;
        }

        const iframe = iframeRef.current;
        const doc = iframe.contentDocument || iframe.contentWindow.document;

        doc.open();
        doc.write(html);
        doc.close();

        iframe.onload = () => {
            const imagenes = Array.from(doc.images);

            if (imagenes.length === 0) {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
                return;
            }

            let pendientes = imagenes.length;
            const intentarImprimir = () => {
                pendientes--;
                if (pendientes === 0) {
                    iframe.contentWindow.focus();
                    iframe.contentWindow.print();
                }
            };

            imagenes.forEach((img) => {
                if (img.complete) {
                    intentarImprimir();
                } else {
                    img.onload = intentarImprimir;
                    img.onerror = intentarImprimir;
                }
            });
        };
    }

    return (
        <div className="vista-previa">
            <div className="act__header vp__header">
                <button className="act__volver" onClick={onEditar}>
                    Regresar
                </button>
                <span className="act__titulo">{datos.titulo || 'Sin título'}</span>
            </div>

            <div className="vp__preview">
                <PreviewContenido tipo={tipo} datos={datos} conRespuestas={false} />
            </div>

            <div className="vp__acciones">
                {tipo === 'completa_vocales' ? (
                    <button className="vp__btn vp__btn--primario" onClick={() => imprimir(false)}>
                        <img src={iconoImprimirAct} alt="" />
                        Imprimir / Descargar PDF
                    </button>
                ) : (
                    <>
                        <button className="vp__btn vp__btn--secundario" onClick={() => imprimir(false)}>
                            <img src={iconoImprimirAct} alt="" />
                            Imprimir (para resolver)
                        </button>
                        <button className="vp__btn vp__btn--primario" onClick={() => imprimir(true)}>
                            <img src={iconoImprimirAct} alt="" />
                            Imprimir con respuestas
                        </button>
                    </>
                )}

                <button className="vp__btn vp__btn--neutro" onClick={onVolver}>
                    <svg xmlns="http://www.w3.org/2000/svg" width={20} viewBox="0 0 24 24" xmlSpace="preserve">
                        <path
                            fill="#fff"
                            d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2m-1.2 14.8-3.7-3.7 1.4-1.4 2.2 2.2 5.8-6.1L18 9.3z"
                        />
                        <path fill="none" d="M0 0h24v24H0z" />
                    </svg>
                    Listo
                </button>
            </div>
        </div>
    );
}

function PreviewContenido({ tipo, datos, conRespuestas }) {
    switch (tipo) {
        case 'sopa_letras':
            return <PreviewSopa datos={datos} conRespuestas={conRespuestas} />;
        case 'crucigrama':
            return <PreviewCrucigrama datos={datos} conRespuestas={conRespuestas} />;
        case 'verdadero_falso':
            return <PreviewVF datos={datos} conRespuestas={conRespuestas} />;
        case 'completa_vocales':
            return <PreviewCompletaVocales datos={datos} />;
        default:
            return <p className="vp__info">Tipo desconocido.</p>;
    }
}

// DE AQUI SE HICIERON CAMBIOS PARA DE COLOREAR PALABRAS EN LA  GRILLA Y REMARCAR PALABRAS EN LA SOPA DE LETRAS SOLUCIONADA
const COLORES_SOPA = [
    '#FFD6A5', // naranja pastel
    '#FDFFB6', // amarillo pastel
    '#CAFFBF', // verde lima pastel
    '#9BF6FF', // cian pastel
    '#A0C4FF', // azul pastel
    '#BDB2FF', // morado pastel
    '#FFC6FF', // fucsia pastel
    '#FFADAD', // rojo coral pastel
    '#CDEAC0', // verde hoja claro
    '#B5EAEA', // turquesa suave
    '#FBC4AB', // durazno
    '#D7BDE2', // lavanda fuerte suave
    '#F9D5E5', // rosa claro
    '#B8F2E6', // aguamarina
    '#E2F0CB', // verde oliva claro
];

function crearMapaColoresPalabras(palabrasColocadas = []) {
    const mapa = {};

    palabrasColocadas.slice(0, COLORES_SOPA.length).forEach((pc, index) => {
        mapa[pc.palabra] = COLORES_SOPA[index];
    });

    return mapa;
}

function colorCeldaRespuesta(r, c, palabrasColocadas = [], mapaColores = {}) {
    for (const pc of palabrasColocadas) {
        const [df, dc] = pc.dir;

        for (let i = 0; i < pc.palabra.length; i++) {
            if (pc.fila + df * i === r && pc.col + dc * i === c) {
                return mapaColores[pc.palabra] || null;
            }
        }
    }

    return null;
}

function PreviewSopa({ datos, conRespuestas }) {
    const { grid, palabras = [], palabrasColocadas = [] } = datos;
    if (!grid) return <p className="vp__info">La grilla aún no está generada.</p>;
    const colocadasSet = new Set(palabrasColocadas.map((p) => p.palabra));
    const mapaColores = crearMapaColoresPalabras(palabrasColocadas);

    return (
        <div className="vp__sopa">
            <div className="vp__grilla-wrap">
                <table className="vp__grilla">
                    <tbody>
                        {grid.map((fila, r) => (
                            <tr key={r}>
                                {fila.map((celda, c) => {
                                    // const resaltada = conRespuestas && esCeldaResaltada(r, c, palabrasColocadas);
                                    // return (
                                    //     <td key={c} className={`vp__celda${resaltada ? ' vp__celda--res' : ''}`}>
                                    //         {celda}
                                    //     </td>
                                    // );

                                    const color = conRespuestas ? colorCeldaRespuesta(r, c, palabrasColocadas, mapaColores) : null;
                                    return (
                                        <td key={c} className="vp__celda" style={color ? { backgroundColor: color } : undefined}>
                                            {celda}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="vp__lista-palabras">
                <h4>Palabras a encontrar:</h4>
                <ul>
                    {palabras.map((p, i) => (
                        // <li key={i} className={conRespuestas && colocadasSet.has(p) ? 'vp__pal-encontrada' : ''}>
                        //     {p}
                        // </li>

                        <li
                            key={i}
                            className={conRespuestas && colocadasSet.has(p) ? 'vp__pal-encontrada' : ''}
                            style={
                                conRespuestas && mapaColores[p]
                                    ? {
                                          backgroundColor: mapaColores[p],
                                          padding: '2px 6px',
                                          borderRadius: '6px',
                                          fontWeight: 'bold',
                                      }
                                    : undefined
                            }
                        >
                            {p}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

function PreviewCrucigrama({ datos, conRespuestas }) {
    const { grid = [], palabrasColocadas = [] } = datos;
    if (!grid.length) return <p className="vp__info">La grilla aún no está generada.</p>;

    const horizontales = palabrasColocadas.filter((p) => p.horizontal);
    const verticales = palabrasColocadas.filter((p) => !p.horizontal);

    return (
        <div className="vp__crucigrama">
            <div className="vp__grilla-wrap">
                <table className="vp__grilla vp__grilla--cruz">
                    <tbody>
                        {grid.map((fila, r) => (
                            <tr key={r}>
                                {fila.map((celda, c) => {
                                    if (!celda) return <td key={c} className="vp__celda-negra" />;
                                    return (
                                        <td key={c} className="vp__celda-cruz">
                                            {celda.numero && <span className="vp__numero">{celda.numero}</span>}
                                            {conRespuestas && <span className="vp__letra-cruz">{celda.letra}</span>}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="vp__pistas">
                <div className="vp__pistas-col">
                    <h4>Horizontales</h4>
                    {horizontales.map((p) => (
                        <p key={p.numero} className="vp__pista">
                            <strong>{p.numero}.</strong> {p.pista}
                        </p>
                    ))}
                </div>
                <div className="vp__pistas-col">
                    <h4>Verticales</h4>
                    {verticales.map((p) => (
                        <p key={p.numero} className="vp__pista">
                            <strong>{p.numero}.</strong> {p.pista}
                        </p>
                    ))}
                </div>
            </div>
        </div>
    );
}

function PreviewVF({ datos, conRespuestas }) {
    return (
        <div className="vp__vf">
            {(datos.enunciados || []).map((e, i) => (
                <div key={i} className="vp__vf-fila">
                    <span className="vp__vf-num">{i + 1}.</span>
                    <span className="vp__vf-texto">{e.texto}</span>
                    {conRespuestas ? (
                        <span className="vp__vf-resp">{e.respuesta ? '✓ V' : 'X F'}</span>
                    ) : (
                        <span className="vp__vf-cajas">
                            <span>V</span>
                            <span>F</span>
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
}

function columnasCv(cantidad) {
    if (cantidad <= 4) return 2;
    if (cantidad <= 9) return 3;
    return 4;
}

function PreviewCompletaVocales({ datos }) {
    const cols = columnasCv(datos.palabras?.length || datos.cantidad);
    const tamImg = cols === 2 ? 90 : cols === 3 ? 70 : 50;

    return (
        <div className="vp__completar-vocales">
            <p className="vp__instruccion-cv">{datos.instruccion}</p>
            <div className="vp__grid-cv" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
                {(datos.palabras || []).map((item, i) => (
                    <div key={i} className="vp__celda-cv">
                        <div className="vp__img-cv-wrap">
                            {item.imagen ? (
                                <img className="vp__img-cv" src={item.imagen} alt={item.palabra} style={{ width: tamImg, height: tamImg }} />
                            ) : (
                                <div className="vp__img-cv-fallback" style={{ width: tamImg, height: tamImg }}>
                                    🖼️
                                </div>
                            )}
                        </div>
                        <p className="vp__palabra-cv">{item.palabraDisplay}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Construye el documento HTML completo para el iframe de impresión.
// El fondo se pasa como parámetro para usar la versión base64 precargada.
function generarHTML(tipo, datos, conRespuestas, fondoUrl) {
    const titulo = datos.titulo || 'Actividad educativa';
    const contenido = generarContenido(tipo, datos, conRespuestas);

    // html::before con position:fixed es la forma correcta de repetir un fondo
    // en cada página impresa. Los elementos fixed en CSS print se repiten por página.
    const cssFondo = `
        html::before {
            content: '';
            position: fixed;
            inset: 0;
            z-index: -1;
            background-image: url(${fondoUrl});
            background-size: cover;
            background-repeat: no-repeat;
        }
    `;

    return `<!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>${titulo}</title>
                <style>${CSS_IMPRESION}${cssFondo}</style>
            </head>
            <body>
                <h1>${titulo}</h1>
                ${datos.instrucciones ? `<p class="instrucciones">${datos.instrucciones}</p>` : ''}
                <div class="info-doc">
                    <span>Nombre: ________________________</span>
                    <span>Grado: _________</span>
                    <span>Fecha: _________</span>
                </div>
                ${contenido}
            </body>
            </html>`;
}

function generarContenido(tipo, datos, conRespuestas) {
    switch (tipo) {
        case 'sopa_letras':
            return htmlSopa(datos, conRespuestas);
        case 'crucigrama':
            return htmlCrucigrama(datos, conRespuestas);
        case 'verdadero_falso':
            return htmlVF(datos, conRespuestas);
        case 'completa_vocales':
            return htmlCompletaVocales(datos);
        default:
            return '';
    }
}

function htmlSopa({ grid, palabras = [], palabrasColocadas = [] }, conRespuestas) {
    if (!grid) return '<p>Grilla no generada.</p>';

    const mapaColores = crearMapaColoresPalabras(palabrasColocadas);

    const filas = grid
        .map(
            (fila, r) =>
                `<tr>${fila
                    .map((letra, c) => {
                        // const res = conRespuestas && esCeldaResaltada(r, c, palabrasColocadas);
                        // return `<td${res ? ' class="celda-res"' : ''}>${letra}</td>`;

                        const color = conRespuestas ? colorCeldaRespuesta(r, c, palabrasColocadas, mapaColores) : null;
                        return `<td${color ? ` style="background-color:${color};"` : ''}>${letra}</td>`;
                    })
                    .join('')}</tr>`
        )
        .join('');

    return `
        <table class="grilla-sopa"><tbody>${filas}</tbody></table>
        <h3>Palabras a encontrar:</h3>
        <!-- <ul class="lista-palabras">${palabras.map((p) => `<li>${p}</li>`).join('')}</ul> -->
        <ul class="lista-palabras">
            ${palabras
                .map((p) => {
                    const color = conRespuestas ? mapaColores[p] : null;

                    return `<li${
                        color ? ` style="background-color:${color}; padding:2pt 6pt; border-radius:5pt; font-weight:bold; margin-bottom:3pt;"` : ''
                    }>${p}</li>`;
                })
                .join('')}
        </ul>
    `;
}

function htmlCrucigrama({ grid = [], palabrasColocadas = [] }, conRespuestas) {
    if (!grid.length) return '<p>Grilla no generada.</p>';

    const filas = grid
        .map(
            (fila) =>
                `<tr>${fila
                    .map((celda) => {
                        if (!celda) return '<td class="celda-negra"></td>';
                        const num = celda.numero ? `<span class="num-celda">${celda.numero}</span>` : '';
                        const letra = `<div class="letra-cruz">${conRespuestas ? celda.letra : ''}</div>`;
                        return `<td>${num}${letra}</td>`;
                    })
                    .join('')}</tr>`
        )
        .join('');

    const horiz = palabrasColocadas
        .filter((p) => p.horizontal)
        .map((p) => `<p class="pista"><strong>${p.numero}.</strong> ${p.pista}</p>`)
        .join('');

    const vert = palabrasColocadas
        .filter((p) => !p.horizontal)
        .map((p) => `<p class="pista"><strong>${p.numero}.</strong> ${p.pista}</p>`)
        .join('');

    return `
        <table class="grilla-cruz"><tbody>${filas}</tbody></table>
        <div class="pistas">
            <div class="pistas-col"><h3>Horizontales</h3>${horiz}</div>
            <div class="pistas-col"><h3>Verticales</h3>${vert}</div>
        </div>
    `;
}

function htmlVF({ enunciados = [] }, conRespuestas) {
    const filas = enunciados
        .map((e, i) => {
            const respuesta = conRespuestas
                ? `<span class="vf-resp">${e.respuesta ? '✓ V' : '✗ F'}</span>`
                : `<span class="vf-cajas">
                       <span class="vf-caja">V</span>
                       <span class="vf-caja">F</span>
                   </span>`;
            return `<div class="vf-fila">
                        <span class="vf-num">${i + 1}.</span>
                        <span class="vf-texto">${e.texto}</span>
                        ${respuesta}
                    </div>`;
        })
        .join('');

    return `<div class="vf-lista">${filas}</div>`;
}

function htmlCompletaVocales(datos) {
    const total = datos.palabras?.length || datos.cantidad;
    const cols = total <= 4 ? 2 : total <= 9 ? 3 : 4;
    const filas = Math.ceil(total / cols);

    const tamImg = cols === 2 ? '110pt' : cols === 3 ? '90pt' : '65pt';
    const tamFuente = cols === 2 ? '16pt' : cols === 3 ? '13pt' : '10pt';
    const tamInstr = cols === 4 ? '11pt' : '13pt';

    const altoBloque = 'calc(27.94cm - 3cm - 3.5cm)';

    const celdas = (datos.palabras || [])
        .map(
            (item) => `
            <div class="celda-cv">
                <div class="img-wrap">
                    ${item.imagen ? `<img src="${item.imagen}" alt="${item.palabra}" class="img-cv" />` : `<div class="img-fallback">&#128444;</div>`}
                </div>
                <p class="palabra-cv">${item.palabraDisplay}</p>
            </div>`
        )
        .join('');

    return `
        <style>
            .bloque-cv {
                display: flex;
                flex-direction: column;
                height: ${altoBloque};
            }
            .instruccion-cv {
                font-size: ${tamInstr};
                font-weight: 700;
                text-align: center;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 8pt;
            }
            .grid-cv {
                display: grid;
                grid-template-columns: repeat(${cols}, 1fr);
                grid-template-rows: repeat(${filas}, 1fr);
                gap: 1rem;
                overflow: hidden;
            }
            .celda-cv {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 1.5rem;
                gap: 1.5rem;
                overflow: hidden;
                border: 2px solid #df456850;
                border-radius: 0.5rem;
            }
            .img-wrap {
                display: flex;
                align-items: center;
                justify-content: center;
                flex: 1;
                width: 100%;
                overflow: hidden;
            }
            .img-cv {
                max-width: ${tamImg};
                max-height: ${tamImg};
                width: auto;
                height: auto;
                object-fit: contain;
                display: block;
                border-radius: 50%;
            }
            .img-fallback {
                width: ${tamImg};
                height: ${tamImg};
                display: flex;
                align-items: center;
                justify-content: center;
                color: #bbb;
                border: 1pt dashed #df4568;
                border-radius: 4pt;
            }
            .palabra-cv {
                font-size: ${tamFuente};
                font-weight: 500;
                letter-spacing: 0px;
                text-align: center;
                text-transform: uppercase;
                word-break: break-all;
                flex-shrink: 0;
                margin: 0;
            }
        </style>
        <div class="bloque-cv">
            <p class="instruccion-cv">${datos.instruccion}</p>
            <div class="grid-cv">${celdas}</div>
        </div>
    `;
}
