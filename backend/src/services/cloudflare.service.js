/**
 * cloudflare.service.js - Análisis de imágenes con Cloudflare Workers AI
 *
 * Ruta de archivos en conversacion.service.js:
 *   imagen sola            -> analizarImagen()
 *   imagen + texto usuario -> analizarImagen() con el texto como instrucción
 *   PDF / Word             -> extraerTextoArchivo() en groq.service.js
 */

const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CF_MODELO = process.env.CLOUDFLARE_MODEL;
const CF_MODELO_GEN_IMG = process.env.CLOUDFLARE_MODEL_GEN_IMAGEN;
const CLOUDFLARE_BASE = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/ai/run/`;

/**
 * Analiza una imagen y devuelve una descripción textual.
 * @param {Buffer} buffer
 * @param {string} tipoMime
 * @param {string} instruccion - Pregunta o descripción del usuario
 */
export async function analizarImagen(buffer, tipoMime, instruccion) {
    if (!CF_ACCOUNT || !CF_TOKEN) {
        throw new Error('CLOUDFLARE_ACCOUNT_ID o CLOUDFLARE_API_TOKEN no configurados.');
    }

    const base64 = buffer.toString('base64');
    // console.log('BASE 64: ' + base64);
    const payload = {
        messages: [
            {
                role: 'user',
                content: [
                    { type: 'image_url', image_url: { url: `data:${tipoMime};base64,${base64}` } },
                    { type: 'text', text: instruccion || 'Describe detalladamente esta imagen.' },
                ],
            },
        ],
        max_tokens: 1024,
    };

    const respuesta = await fetch(CLOUDFLARE_BASE + `${CF_MODELO}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${CF_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!respuesta.ok) {
        const err = await respuesta.json().catch(() => ({}));
        throw Object.assign(new Error('Error de Cloudflare Vision'), { cfError: err, status: respuesta.status });
    }

    const datos = await respuesta.json();
    return datos?.result?.response || '';
}

//  Generación de imágenes

/**
 * Genera una imagen con Stable Diffusion XL Lightning.
 * Devuelve string base64 con prefijo data URI: "data:image/png;base64,..."
 * NO almacena nada - el buffer se convierte a base64 y se devuelve directo.
 *
 * @param {string} descripcionEn  Descripción en inglés del objeto (ej: "a red apple")
 * @returns {Promise<string>}
 */
export async function generarImagen(descripcionEn) {
    const url = CLOUDFLARE_BASE + `${CF_MODELO_GEN_IMG}`;

    const prompt = [
        `cute cartoon illustration of ${descripcionEn}`,
        'child-friendly',
        'colorful',
        'flat design',
        'white background',
        'simple clean shapes',
        'educational clipart style',
        'no text',
        'no letters',
        'no words',
        'no watermark',
        // `photorealistic photo of ${descripcionEn},
        // single subject,
        // only one,
        // centered,
        // natural lighting,
        // real world environment,
        // no additional animals,
        // no extra objects,
        // no duplicates,
        // clean background,
        // sharp focus,
        // realistic proportions,
        // no text,
        // no watermark`,
    ].join(', ');

    const respuesta = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
    });

    if (!respuesta.ok) {
        const error = await respuesta.text();
        throw new Error(`Cloudflare imagen (${respuesta.status}): ${error}`);
    }

    const buffer = await respuesta.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return `data:image/png;base64,${base64}`;
}

/** Verifica conectividad con Cloudflare. Usado en GET /api/health */
export async function verificarConexionCloudflare() {
    if (!CF_ACCOUNT || !CF_TOKEN) return false;
    try {
        // Pixel PNG 1×1 en base64 para una llamada mínima
        const pixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        const payload = {
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'image_url', image_url: { url: `data:image/png;base64,${pixel}` } },
                        { type: 'text', text: 'ok' },
                    ],
                },
            ],
            max_tokens: 100,
        };

        const r = await fetch(CLOUDFLARE_BASE + `${CF_MODELO}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${CF_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        return r.ok;
    } catch {
        return false;
    }
}
