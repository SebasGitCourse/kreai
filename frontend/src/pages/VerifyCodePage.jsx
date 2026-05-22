import { useLocation, useNavigate } from 'react-router-dom';
import './VerifyCodePage.css';
import VerifyCodeForm from '../components/auth/VerifyCodeForm.jsx';
import iconTeacherError from '../assets/icon-teacher.png'; // recomendable importar imságenes para optimización y gestión de recursos

export default function VerifyCodePage() {
    const location = useLocation();
    const navigate = useNavigate();
    const estado = location.state;

    // Guardia: si no hay datos de flujo, no proceder
    if (!estado?.correo || !estado?.flujo) {
        return (
            <main className="pagina-verificar-otp">
                <div id="contenedor-verificacion-otp">
                    <img
                        src={iconTeacherError}
                        alt="Ilustración de atencion de un profesor por error en el flujo de registro"
                        className="pagina-verificar-otp__ilustracion-error"
                    />
                    <div className="pagina-verificar-otp__aviso-sin-datos">
                        <p className="pagina-verificar-otp__texto-sin-datos">No hay una solicitud de verificación activa.</p>
                        <button type="button" className="pagina-verificar-otp__boton-ir-inicio" onClick={() => navigate('/', { replace: true })}>
                            Ir al inicio
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    const etiquetaFlujo = estado.flujo === 'registro' ? 'Verificar nuevo registro' : 'Verificar inicio de sesión';

    return (
        <main className="pagina-verificar-otp">
            <div id="contenedor-verificacion-otp">
                <header className="pagina-verificar-otp__cabecera">
                    <div className="pagina-verificar-otp__icono-correo" aria-hidden="true"></div>
                    <h1 className="pagina-verificar-otp__titulo">Revisa tu correo</h1>
                    <p className="pagina-verificar-otp__subtitulo">{etiquetaFlujo}</p>
                </header>

                <VerifyCodeForm correo={estado.correo} flujo={estado.flujo} nombres={estado.nombres ?? ''} apellidos={estado.apellidos ?? ''} />
            </div>
        </main>
    );
}
