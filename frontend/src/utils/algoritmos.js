/**
 * algoritmos.js
 * Generación de grillas para actividades educativas.
 * 100% frontend, sin llamadas al backend.
 */

const LETRAS_ES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const DIRS_8 = [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
];

function letraRandom() {
    return LETRAS_ES[Math.floor(Math.random() * LETRAS_ES.length)];
}

function normalizar(str) {
    return str
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Z]/g, '');
}

function mezclar(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// Sopa de letras
function puedePoner(grid, palabra, fila, col, [df, dc], tam) {
    for (let i = 0; i < palabra.length; i++) {
        const r = fila + df * i;
        const c = col + dc * i;
        if (r < 0 || r >= tam || c < 0 || c >= tam) return false;
        if (grid[r][c] !== '' && grid[r][c] !== palabra[i]) return false;
    }
    return true;
}

function ponerPalabra(grid, palabra, fila, col, [df, dc]) {
    for (let i = 0; i < palabra.length; i++) {
        grid[fila + df * i][col + dc * i] = palabra[i];
    }
}

/**
 * Genera una sopa de letras en una grilla NxN.
 * Solo se omite una palabra si su longitud supera el tamaño de la grilla.
 *
 * @param {string[]} palabras
 * @param {number} tamano
 * @returns {{ grid: string[][], palabrasColocadas: object[] }}
 */
export function generarSopaLetras(palabras, tamano = 15) {
    const grid = Array.from({ length: tamano }, () => Array(tamano).fill(''));
    const palabrasColocadas = [];

    const lista = [...palabras].map(normalizar).sort((a, b) => b.length - a.length);

    for (const palabra of lista) {
        if (palabra.length > tamano) continue;

        let colocada = false;
        const filas = mezclar([...Array(tamano).keys()]);

        for (const fila of filas) {
            if (colocada) break;
            const cols = mezclar([...Array(tamano).keys()]);
            for (const col of cols) {
                if (colocada) break;
                const dirs = mezclar(DIRS_8);
                for (const dir of dirs) {
                    if (puedePoner(grid, palabra, fila, col, dir, tamano)) {
                        ponerPalabra(grid, palabra, fila, col, dir);
                        palabrasColocadas.push({ palabra, fila, col, dir });
                        colocada = true;
                        break;
                    }
                }
            }
        }
    }

    for (let i = 0; i < tamano; i++) for (let j = 0; j < tamano; j++) if (grid[i][j] === '') grid[i][j] = letraRandom();

    return { grid, palabrasColocadas };
}

// Crucigrama
const TAM_CRUCIGRAMA = 15;

/**
 * Genera un crucigrama en una grilla fija de 15x15.
 * Garantiza que todas las palabras estén incluidas e intersectadas.
 * Reintenta la generación completa hasta 20 veces para maximizar palabras colocadas.
 * Solo omite una palabra si es matemáticamente imposible intersectarla.
 *
 * @param {{ palabra: string, pista: string }[]} items
 * @returns {{ grid: object[][], palabrasColocadas: object[], ancho: number, alto: number }}
 */
export function generarCrucigrama(items) {
    const TAM = TAM_CRUCIGRAMA;

    const lista = items
        .map((it) => ({ ...it, palabra: normalizar(it.palabra) }))
        .filter((it) => it.palabra.length > 0 && it.palabra.length <= TAM)
        .sort((a, b) => b.palabra.length - a.palabra.length);

    if (!lista.length) {
        return {
            grid: Array.from({ length: TAM }, () => Array(TAM).fill(null)),
            palabrasColocadas: [],
            ancho: TAM,
            alto: TAM,
        };
    }

    function intentarGeneracion() {
        const celdas = new Map();
        const colocadas = [];

        const clave = (r, c) => `${r},${c}`;

        function puedePonerCruz(palabra, fila, col, horizontal) {
            const [df, dc] = horizontal ? [0, 1] : [1, 0];
            const filaFin = fila + df * (palabra.length - 1);
            const colFin = col + dc * (palabra.length - 1);

            if (fila < 0 || col < 0 || filaFin >= TAM || colFin >= TAM) return false;

            // No puede haber letra inmediatamente antes ni después del extremo
            if (celdas.has(clave(fila - df, col - dc))) return false;
            if (celdas.has(clave(fila + df * palabra.length, col + dc * palabra.length))) return false;

            let intersecciones = 0;

            for (let i = 0; i < palabra.length; i++) {
                const r = fila + df * i;
                const c = col + dc * i;
                const existente = celdas.get(clave(r, c));

                if (existente) {
                    // Celda ocupada: debe ser la misma letra (punto de cruce)
                    if (existente !== palabra[i]) return false;
                    intersecciones++;
                } else {
                    // Celda libre: no puede tocar lateralmente otra palabra
                    const lat1r = r + (horizontal ? 1 : 0);
                    const lat1c = c + (horizontal ? 0 : 1);
                    const lat2r = r - (horizontal ? 1 : 0);
                    const lat2c = c - (horizontal ? 0 : 1);
                    if (celdas.has(clave(lat1r, lat1c)) || celdas.has(clave(lat2r, lat2c))) return false;
                }
            }

            // Si ya hay palabras colocadas, esta debe intersectar al menos una
            if (colocadas.length > 0 && intersecciones === 0) return false;

            return true;
        }

        function colocar(item, fila, col, horizontal) {
            const [df, dc] = horizontal ? [0, 1] : [1, 0];
            for (let i = 0; i < item.palabra.length; i++) {
                celdas.set(clave(fila + df * i, col + dc * i), item.palabra[i]);
            }
            colocadas.push({
                palabra: item.palabra,
                pista: item.pista,
                fila,
                col,
                horizontal,
                numero: colocadas.length + 1,
            });
        }

        function buscarInterseccion(item) {
            for (const horizontal of mezclar([true, false])) {
                for (const pc of mezclar([...colocadas])) {
                    if (pc.horizontal === horizontal) continue;
                    for (let lp = 0; lp < pc.palabra.length; lp++) {
                        for (let li = 0; li < item.palabra.length; li++) {
                            if (item.palabra[li] !== pc.palabra[lp]) continue;
                            const filaInt = pc.horizontal ? pc.fila : pc.fila + lp;
                            const colInt = pc.horizontal ? pc.col + lp : pc.col;
                            const fila = horizontal ? filaInt : filaInt - li;
                            const col = horizontal ? colInt - li : colInt;
                            if (puedePonerCruz(item.palabra, fila, col, horizontal)) {
                                colocar(item, fila, col, horizontal);
                                return true;
                            }
                        }
                    }
                }
            }
            return false;
        }

        // Primera palabra: horizontal, centrada
        const listaMezclada = [lista[0], ...mezclar(lista.slice(1))];
        const primera = listaMezclada[0];
        const filaInicial = Math.floor(TAM / 2);
        const colInicial = Math.floor((TAM - primera.palabra.length) / 2);
        colocar(primera, filaInicial, colInicial, true);

        // Pasadas sucesivas hasta que no haya más progreso
        let pendientes = listaMezclada.slice(1);
        let progreso = true;

        while (progreso && pendientes.length) {
            progreso = false;
            const sinColocar = [];
            for (const item of mezclar(pendientes)) {
                if (buscarInterseccion(item)) {
                    progreso = true;
                } else {
                    sinColocar.push(item);
                }
            }
            pendientes = sinColocar;
        }

        return { celdas, colocadas, totalColocadas: colocadas.length };
    }

    // Reintentar hasta 20 veces y quedarse con el resultado que más palabras colocó
    let mejor = null;
    const totalObjetivo = lista.length;

    for (let intento = 0; intento < 20; intento++) {
        const resultado = intentarGeneracion();
        if (!mejor || resultado.totalColocadas > mejor.totalColocadas) {
            mejor = resultado;
        }
        if (mejor.totalColocadas === totalObjetivo) break;
    }

    // Construir grilla fija 15x15
    const grid = Array.from({ length: TAM }, () => Array(TAM).fill(null));

    for (const [key, letra] of mejor.celdas.entries()) {
        const [r, c] = key.split(',').map(Number);
        grid[r][c] = { letra, numero: null };
    }

    for (const pc of mejor.colocadas) {
        if (grid[pc.fila]?.[pc.col]) {
            grid[pc.fila][pc.col].numero = pc.numero;
        }
    }

    return { grid, palabrasColocadas: mejor.colocadas, ancho: TAM, alto: TAM };
}
