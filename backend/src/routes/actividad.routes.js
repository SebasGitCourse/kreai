import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { sugerirActividad, completaVocales, imagenPalabra } from '../controllers/actividad.controller.js';

const router = Router();

router.post('/sugerir', requireAuth, sugerirActividad);
router.post('/completa-vocales', requireAuth, completaVocales);
router.post('/imagen-palabra', requireAuth, imagenPalabra);

export default router;
