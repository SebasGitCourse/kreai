import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
    throw new Error('[supabaseClient] Falta SUPABASE_URL en las variables de entorno del backend.');
}
if (!supabaseServiceRoleKey) {
    throw new Error('[supabaseClient] Falta SUPABASE_SERVICE_ROLE_KEY en las variables de entorno del backend.');
}

/**
 * Cliente Supabase con service_role_key.
 * - Bypassa RLS para operaciones de negocio seguras del lado servidor.
 * - Habilita supabase.auth.admin.* para gestión de sesiones.
 * - NUNCA exponer esta clave al frontend.
 */
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});
