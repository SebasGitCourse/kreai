import { createBrowserRouter } from 'react-router-dom';
import LoginPage from '../pages/LoginPage.jsx';
import RegisterPage from '../pages/RegisterPage.jsx';
import VerifyCodePage from '../pages/VerifyCodePage.jsx';
import CopilotPage from '../pages/CopilotPage.jsx';
import ProtectedRoute, { RutaPublica } from '../components/common/ProtectedRoute.jsx';

const router = createBrowserRouter([
    {
        path: '/',
        element: (
            <RutaPublica>
                <LoginPage />
            </RutaPublica>
        ),
    },
    {
        path: '/registro',
        element: (
            <RutaPublica>
                <RegisterPage />
            </RutaPublica>
        ),
    },
    {
        path: '/verificar',
        element: (
            <RutaPublica>
                <VerifyCodePage />
            </RutaPublica>
        ),
    },
    {
        path: '/copilot',
        element: (
            <ProtectedRoute>
                <CopilotPage />
            </ProtectedRoute>
        ),
    },
]);

export default router;
