import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';

export default function ProtectedRoute({ children }) {
    const { estaAutenticado, cargando } = useAuth();
    const location = useLocation();

    if (cargando) return <Spinner />;

    if (!estaAutenticado) {
        return <Navigate to="/" state={{ desde: location }} replace />;
    }

    return children;
}

export function RutaPublica({ children }) {
    const { estaAutenticado, cargando } = useAuth();

    if (cargando) return <Spinner />;

    if (estaAutenticado) {
        return <Navigate to="/copilot" replace />;
    }

    return children;
}

function Spinner() {
    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100dvh',
                background: '#fff',
            }}
            role="status"
            aria-label="Verificando sesión…"
        >
            <div
                style={{
                    width: '2.5rem',
                    height: '2.5rem',
                    border: '3px solid #df456810',
                    borderTopColor: '#df4568',
                    borderRadius: '50%',
                    animation: 'rotacion-carga 0.7s linear infinite',
                }}
            />
            <style>{`
                @keyframes rotacion-carga {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
