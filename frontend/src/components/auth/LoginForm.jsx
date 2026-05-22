import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginForm.css';
import { validarCorreo } from '../../utils/validators.js';
import { enviarOtpLogin } from '../../services/auth.service.js';

export default function LoginForm() {
    const navigate = useNavigate();

    const [correo, setCorreo] = useState('');
    const [errorCorreo, setErrorCorreo] = useState(null);
    const [errorGeneral, setErrorGeneral] = useState(null);
    const [enviando, setEnviando] = useState(false);

    const manejarCambioCorreo = (e) => {
        setCorreo(e.target.value);
        if (errorCorreo) setErrorCorreo(null);
        if (errorGeneral) setErrorGeneral(null);
    };

    const manejarEnvio = async (e) => {
        e.preventDefault();

        const err = validarCorreo(correo);
        if (err) {
            setErrorCorreo(err);
            return;
        }

        setEnviando(true);
        setErrorGeneral(null);

        try {
            await enviarOtpLogin(correo);
            // OTP enviado -> ir a verificación con flujo de login
            navigate('/verificar', {
                state: {
                    correo: correo.trim().toLowerCase(),
                    flujo: 'login',
                },
            });
        } catch (error) {
            if (error.code === 'USUARIO_NO_ENCONTRADO' || error.estado === 404) {
                // El correo no está registrado -> redirigir a registro
                navigate('/registro', {
                    state: { correo: correo.trim().toLowerCase() },
                });
            } else {
                setErrorGeneral(error.message ?? 'Ocurrió un error inesperado. Intenta de nuevo.');
            }
        } finally {
            setEnviando(false);
        }
    };

    return (
        <form className="formulario-inicio-sesion" onSubmit={manejarEnvio} noValidate>
            {errorGeneral && (
                <div className="formulario-inicio-sesion__alerta-error" role="alert" aria-live="assertive">
                    {errorGeneral}
                </div>
            )}

            <div className="formulario-inicio-sesion__grupo">
                <label className="formulario-inicio-sesion__etiqueta" htmlFor="campo-correo-login">
                    Correo electrónico
                </label>
                <input
                    id="campo-correo-login"
                    type="email"
                    className={`formulario-inicio-sesion__campo${errorCorreo ? ' formulario-inicio-sesion__campo--invalido' : ''}`}
                    value={correo}
                    onChange={manejarCambioCorreo}
                    placeholder="usuario@correo.com"
                    autoComplete="email"
                    autoFocus
                    disabled={enviando}
                    aria-describedby={errorCorreo ? 'error-campo-correo-login' : undefined}
                    aria-invalid={!!errorCorreo}
                />
                {errorCorreo && (
                    <span id="error-campo-correo-login" className="formulario-inicio-sesion__error-campo" role="alert">
                        {errorCorreo}
                    </span>
                )}
            </div>

            <button type="submit" className="formulario-inicio-sesion__boton-continuar" disabled={enviando} aria-busy={enviando}>
                {enviando ? 'Verificando…' : 'Iniciar Sesión'}
            </button>

            <p className="formulario-inicio-sesion__pie-texto">
                ¿No tienes cuenta?{' '}
                <a
                    href="/registro"
                    className="formulario-inicio-sesion__enlace-registro"
                    onClick={(e) => {
                        e.preventDefault();
                        navigate('/registro');
                    }}
                >
                    Regístrate aquí
                </a>
            </p>
        </form>
    );
}
