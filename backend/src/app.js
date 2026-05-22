import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import conversacionRoutes from './routes/conversacion.routes.js';
import archivoRoutes from './routes/archivo.routes.js';
import actividadRoutes from './routes/actividad.routes.js';
import { verificarConexion } from './services/groq.service.js';
import { verificarConexionCloudflare } from './services/cloudflare.service.js';

const app = express();

app.use(
    cors({
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        credentials: true,
    })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/conversaciones', conversacionRoutes);
app.use('/api/archivos', archivoRoutes);
app.use('/api/actividades', actividadRoutes);

app.get('/api/health', async (_req, res) => {
    const [groqOk, cfOk] = await Promise.all([verificarConexion(), verificarConexionCloudflare()]);
    res.json({
        estado: 'ok',
        ia: {
            texto: { proveedor: 'Groq', disponible: groqOk },
            vision: { proveedor: 'Cloudflare Workers AI', disponible: cfOk },
        },
    });
});

export default app;
