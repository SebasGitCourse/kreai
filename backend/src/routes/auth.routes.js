import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import {
    loginOtp,
    registroOtp,
    verificarOtpHandler,
    reenviarOtpHandler,
    obtenerSesion,
    logout,
    renovarTokenHandler,
} from '../controllers/auth.controller.js';

const router = Router();

// Rutas públicas (no requieren JWT)
router.post('/login-otp', loginOtp);
router.post('/register-otp', registroOtp);
router.post('/verify-otp', verificarOtpHandler);
router.post('/resend-otp', reenviarOtpHandler);
router.post('/refresh', renovarTokenHandler); // pública: el access_token ya venció

// Rutas protegidas (requieren JWT válido)
router.get('/me', requireAuth, obtenerSesion);
router.post('/logout', requireAuth, logout);

export default router;
