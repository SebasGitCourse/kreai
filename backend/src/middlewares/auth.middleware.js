/** Verifica que la petición tenga un JWT válido en el header Authorization. */
import { supabase } from '../config/supabaseClient.js';

export async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token no proporcionado.' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
        return res.status(401).json({ error: 'Token inválido o expirado.' });
    }

    req.usuario = data.user; // disponible en el controller como req.usuario
    next();
}
