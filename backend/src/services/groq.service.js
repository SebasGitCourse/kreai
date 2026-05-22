import Groq from 'groq-sdk';
import mammoth from 'mammoth';
import PDFParser from 'pdf2json';

const MODELO_PRINCIPAL = process.env.GROQ_MODEL_PRIMARY || 'openai/gpt-oss-120b';
const MODELO_FALLBACK = process.env.GROQ_MODEL_FALLBACK || 'llama-3.1-8b-instant';

const PROMPT_SISTEMA =
    'Eres KreAI, asistente educativo exclusivo para docentes de primaria en Colombia ' +
    '(grados 1° a 5°, niños entre 6 y 11 años). Apoya con explicaciones, material ' +
    'didáctico, planeación de clases y actividades lúdicas adaptadas a primaria. ' +
    'Responde en español colombiano, con lenguaje cálido, claro y profesional. ' +
    'IMPORTANTE: Responde SIEMPRE en texto plano y natural. ' +
    'NUNCA uses asteriscos, guiones, almohadillas, barras verticales ni ningún símbolo ' +
    'de formato markdown. No uses listas con guión ni con asterisco. ' +
    'No uses negrillas con asteriscos. No uses tablas. No uses líneas horizontales. ' +
    'Escribe en párrafos normales como si hablaras directamente con el docente y ser lo mas directo para evitar respuestas largas. ' +
    'Cuando veas "[El usuario envió la imagen..." o "[El usuario adjuntó...", significa que el usuario ENVIÓ ese archivo. ' +
    'Por lo anteriror si son imagenes o archivos NUNCA digas "según tu descripción", "como describes" o "lo que describes". ' +
    'Di siempre "en la imagen que enviaste", "en el archivo que adjuntaste" o similar. ' +
    'Cuando veas "[El usuario adjuntó: ...]" en el historial, recuerda que ese usuario ya te envió esos archivos ' +
    'y puedes hacer referencia a su contenido si fue procesado anteriormente en la conversación.';

/** Palabras que activan la búsqueda web */
const PALABRAS_BUSQUEDA = [
    'busca',
    'buscar',
    'busca en internet',
    'investiga',
    'investigar',
    'consulta en internet',
    'fecha actual',
    'fecha de hoy',
    'qué fecha',
    'qué día',
    'qué hora',
    'día de hoy',
    'hoy es',
    'hoy en día',
    'hoy,',
    'últimas noticias',
    'noticias de',
    'qué pasó',
    'qué hay de nuevo',
    'novedades',
    'recientemente',
    'actualmente',
    'información actualizada',
    'este año',
    'en 2025',
    'en 2026',
    'última versión',
    'más reciente',
];

function crearCliente() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY no definida en backend/.env');
    return new Groq({ apiKey });
}

const groq = crearCliente();

// Helpers privados

// SE ACTIVA BUSQUEDA EN CASOS QUE NO REQUIERE EJEMPLO: que te pedi que buscaras ?
// function necesitaBusqueda(partes) {
//     const texto = partes
//         .filter((p) => p.text)
//         .map((p) => p.text)
//         .join(' ')
//         .toLowerCase();

//     return PALABRAS_BUSQUEDA.some((p) => texto.includes(p));
// }

// Determina si el mensaje necesita activar una busqueda en internet
function necesitaBusqueda(partes) {
    // Une todos los textos del mensaje en un solo texto limpio
    const texto = partes
        .filter((p) => p.text)
        .map((p) => p.text)
        .join(' ')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();

    // Revisa si alguna palabra de busqueda aparece como palabra o frase completa
    return PALABRAS_BUSQUEDA.some((palabra) => {
        // Limpia la palabra de busqueda para compararla con el texto
        const palabraNormalizada = palabra.toLowerCase().replace(/\s+/g, ' ').trim();

        // Evita coincidencias parciales como buscar dentro de buscaras
        const regex = new RegExp(`(^|\\W)${palabraNormalizada}($|\\W)`, 'i');

        // Devuelve true solo si encuentra la palabra o frase completa
        return regex.test(texto);
    });
}

async function llamarGroq(modelo, mensajes, opciones = {}) {
    const params = {
        model: modelo,
        messages: mensajes,
        max_tokens: opciones.maxTokens || 2048,
        temperature: opciones.temperatura ?? 0.7,
        stream: opciones.stream || false,
    };

    if (opciones.formatoRespuesta) params.response_format = opciones.formatoRespuesta;

    return groq.chat.completions.create(params);
}

async function llamarConBusqueda(mensajes) {
    // Se incluye el historial completo para que el modelo tenga contexto
    // de conversaciones previas, por ejemplo si el usuario dice
    // "busca de nuevo lo que te pedí antes"
    const respuesta = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: MODELO_PRINCIPAL,
            messages: mensajes,
            max_completion_tokens: 550,
            temperature: 1,
            reasoning_effort: 'low',
            stream: false,
            tool_choice: 'auto',
            tools: [{ type: 'browser_search' }],
        }),
    });

    if (!respuesta.ok) {
        const err = await respuesta.text();
        throw new Error(`Groq browser_search (${respuesta.status}): ${err}`);
    }

    console.log('BUSQUEDA ACTIVADA');
    const datos = await respuesta.json();
    return datos.choices?.[0]?.message?.content || '';
}

async function llamarConFallback(mensajes, opciones = {}) {
    try {
        return await llamarGroq(MODELO_PRINCIPAL, mensajes, opciones);
    } catch (err) {
        return await llamarGroq(MODELO_FALLBACK, mensajes, { ...opciones, usarBusqueda: false });
    }
}

/**
 * Extrae texto de un PDF usando pdf2json.
 * pdf2json es puro JavaScript sin dependencias de DOM - compatible con Node.js 22.
 */
async function parsearPDF(buffer, nombreOriginal) {
    return new Promise((resolve, reject) => {
        const parser = new PDFParser();

        parser.on('pdfParser_dataReady', (pdfData) => {
            try {
                const texto = (pdfData.Pages || [])
                    .flatMap((pagina) => pagina.Texts || [])
                    .map((t) => (t.R || []).map((r) => decodeURIComponent(r.T)).join(''))
                    .join(' ')
                    .trim();
                resolve(texto);
            } catch {
                reject(new Error('No se pudo procesar el contenido del PDF'));
            }
        });

        parser.on('pdfParser_dataError', (errData) => {
            reject(new Error(errData?.parserError || 'Error al parsear PDF'));
        });

        parser.parseBuffer(buffer);
    });
} 
 
// API pública

/**
 * Extrae texto de PDF o Word.
 * Devuelve { textoFormateado, palabras } o null si el tipo no es soportado.
 * Lanza error con code ARCHIVO_ILEGIBLE si el archivo no tiene texto extraíble.
 */
export async function extraerTextoArchivo(buffer, tipoMime, nombreOriginal) {
    if (tipoMime === 'application/pdf') {
        let texto;
        try {
            texto = await parsearPDF(buffer, nombreOriginal);
            console.log('\nTEXTO PDF: ' + texto);
        } catch {
            const err = new Error(`"${nombreOriginal}" no contiene texto extraíble.`);
            err.code = 'ARCHIVO_ILEGIBLE';
            throw err;
        }

        if (!texto) {
            const err = new Error(`"${nombreOriginal}" no contiene texto extraíble.`);
            err.code = 'ARCHIVO_ILEGIBLE';
            console.log('ERROR PDF: ' + err.code);
            throw err;
        }

        return {
            textoFormateado: `[PDF: "${nombreOriginal}"]\n\n${texto}`,
            textoPlano: texto,
            palabras: texto.split(/\s+/).filter(Boolean).length,
        };
    }

    const esWord = tipoMime === 'application/msword' || tipoMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    if (esWord) {
        let r;
        try {
            r = await mammoth.extractRawText({ buffer });
        } catch {
            const err = new Error(`"${nombreOriginal}" no contiene texto extraíble.`);
            err.code = 'ARCHIVO_ILEGIBLE';
            console.log('ERROR WORD[Vacío]: ' + err.code);
            throw err;
        }

        const texto = r.value?.trim() || '';
        console.log('\nTEXTO WORD: ' + texto);

        if (!texto) {
            const err = new Error(`"${nombreOriginal}" no contiene texto extraíble.`);
            err.code = 'ARCHIVO_ILEGIBLE';
            console.log('ERROR WORD: ' + err.code);
            throw err;
        }

        return {
            textoFormateado: `[Word: "${nombreOriginal}"]\n\n${r.value}`,
            textoPlano: texto,
            palabras: texto.split(/\s+/).filter(Boolean).length,
        };
    }

    return null;
}

/**
 * Genera respuesta de chat.
 * Con búsqueda: llamada no-streaming, texto completo como un token.
 * Sin búsqueda: streaming normal, token por token.
 */
export async function generarRespuestaStream(historial, partes, onToken) {
    const contenidoUsuario = partes.filter((p) => p.text).map((p) => ({ type: 'text', text: p.text }));

    if (!contenidoUsuario.length) throw new Error('El mensaje no tiene contenido.');

    const mensajesApi = [
        { role: 'system', content: PROMPT_SISTEMA },
        ...historial.map((m) => {
            let contenido = m.contenido || '';
            if (m.archivos?.length) {
                const partesArchivos = m.archivos.map((a) => {
                    const esImagen = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(a.tipo_mime);
                    if (esImagen) {
                        if (a.contenido_extraido) return `[imagen adjunta: "${a.nombre_original}". Descripción: ${a.contenido_extraido}]`;
                        return `[imagen adjunta: "${a.nombre_original}"]`;
                    }
                    if (a.contenido_extraido) return `[archivo adjunto: "${a.nombre_original}"]\n${a.contenido_extraido}`;
                    return `[archivo adjunto: "${a.nombre_original}"]`;
                });
                const contexto = partesArchivos.join('\n\n');
                contenido = contenido ? `${contexto}\n\n${contenido}` : contexto;
            }
            return {
                role: m.rol === 'usuario' ? 'user' : 'assistant',
                content: contenido,
            };
        }),
        {
            role: 'user',
            content: contenidoUsuario.length === 1 ? contenidoUsuario[0].text : contenidoUsuario,
        },
    ];

    if (necesitaBusqueda(partes)) {
        try {
            const texto = await llamarConBusqueda(mensajesApi);
            if (texto) onToken(texto);
            return texto;
        } catch (err) {
            console.error('ERROR BUSQUEDA DETALLE:', err.message);
            throw err;
        }
    }

    let stream;
    try {
        console.log('INTENTANDO LLAMADO A GROP CON MODELO PRINCIPAL');

        stream = await llamarGroq(MODELO_PRINCIPAL, mensajesApi, { stream: true, maxTokens: 2048 });

        console.log('MODELO USADO: ' + MODELO_PRINCIPAL);
    } catch (err) {
        console.log('\n\nERROR MODELO PRINCIPAL:\n\n' + err + '\n\n');
        console.log('INTENTANDO LLAMADO A GROP CON MODELO DE RESPALDO');

        // Si el modelo principal falla por cualquier razón (rate limit, TPD, modelo no disponible, etc.)
        // se intenta con el modelo de respaldo. Si el respaldo también falla, el error sube al llamador.
        stream = await llamarGroq(MODELO_FALLBACK, mensajesApi, { stream: true, maxTokens: 2048 });

        console.log('MODELO USADO: ' + MODELO_FALLBACK);
    }

    let textoCompleto = '';
    for await (const chunk of stream) {
        const fragmento = chunk.choices[0]?.delta?.content || '';
        if (fragmento) {
            textoCompleto += fragmento;
            onToken(fragmento);
        }
    }

    return textoCompleto;
}

/**
 * Genera JSON estructurado para actividades educativas.
 */
export async function generarSugerenciaJSON(prompt, descripcionEsquema) {
    const mensajes = [
        {
            role: 'system',
            content:
                'Eres experto en material educativo para primaria (1° a 5°) en Colombia. ' +
                'Responde SOLO con un objeto JSON válido, sin markdown, sin texto extra. ' +
                `Esquema: ${descripcionEsquema}`,
        },
        { role: 'user', content: prompt },
    ];

    const resp = await llamarConFallback(mensajes, {
        maxTokens: 1500,
        temperatura: 0.7,
        formatoRespuesta: { type: 'json_object' },
    });

    const texto = resp.choices[0]?.message?.content || '{}';
    try {
        return JSON.parse(texto);
    } catch {
        const match = texto.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        throw new Error('El modelo no devolvió JSON válido.');
    }
}

/** Verifica conectividad con Groq. Usado en GET /api/health */
export async function verificarConexion() {
    try {
        const r = await llamarGroq(MODELO_PRINCIPAL, [{ role: 'user', content: 'ok' }], {
            maxTokens: 100,
            temperatura: 0,
        });
        return !!r.choices[0]?.message?.content;
    } catch {
        return false;
    }
}
