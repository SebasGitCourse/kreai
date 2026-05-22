import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { listarArchivos } from '../controllers/archivo.controller.js';

const router = Router();

router.get('/', requireAuth, listarArchivos);

export default router;
