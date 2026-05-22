import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middlewares/auth.middleware.js';
import {
    listarConversaciones,
    crearConversacion,
    eliminarConversacion,
    obtenerMensajes,
    enviarMensaje,
    reintentarMensaje,
} from '../controllers/conversacion.controller.js';

const router = Router();

const MIMES = new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024, files: 10 },
    fileFilter: (_req, file, cb) => (MIMES.has(file.mimetype) ? cb(null, true) : cb(new Error(`Tipo no permitido: ${file.mimetype}`))),
});

router.get('/', requireAuth, listarConversaciones);
router.post('/', requireAuth, crearConversacion);
router.delete('/:id', requireAuth, eliminarConversacion);
router.get('/:id/mensajes', requireAuth, obtenerMensajes);
router.post('/:id/mensajes', requireAuth, upload.array('archivos', 10), enviarMensaje);
router.post('/:id/mensajes/:id_mensaje/reintentar', requireAuth, reintentarMensaje);

export default router;
