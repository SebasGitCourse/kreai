import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './RegisterForm.css';
import { validarCorreo, validarNombres, validarApellidos } from '../../utils/validators.js';
import { enviarOtpRegistro } from '../../services/auth.service.js';

export default function RegisterForm() {
    const navigate = useNavigate();
    const location = useLocation();

    const correoInicial = location.state?.correo ?? '';

    const [correo, setCorreo] = useState(correoInicial);
    const [nombres, setNombres] = useState('');
    const [apellidos, setApellidos] = useState('');
    const [errorCorreo, setErrorCorreo] = useState(null);
    const [errorNombres, setErrorNombres] = useState(null);
    const [errorApellidos, setErrorApellidos] = useState(null);
    const [errorGeneral, setErrorGeneral] = useState(null);
    const [enviando, setEnviando] = useState(false);

    const manejarCambio = (setter, errorSetter) => (e) => {
        setter(e.target.value);
        errorSetter(null);
        if (errorGeneral) setErrorGeneral(null);
    };

    const validarTodosLosCampos = () => {
        const eCorreo = validarCorreo(correo);
        const eNombres = validarNombres(nombres);
        const eApellidos = validarApellidos(apellidos);
        setErrorCorreo(eCorreo);
        setErrorNombres(eNombres);
        setErrorApellidos(eApellidos);
        return !eCorreo && !eNombres && !eApellidos;
    };

    const manejarEnvio = async (e) => {
        e.preventDefault();
        if (!validarTodosLosCampos()) return;

        setEnviando(true);
        setErrorGeneral(null);

        try {
            await enviarOtpRegistro(correo);
            navigate('/verificar', {
                state: {
                    correo: correo.trim().toLowerCase(),
                    nombres: nombres.trim(),
                    apellidos: apellidos.trim(),
                    flujo: 'registro',
                },
            });
        } catch (error) {
            // El backend devuelve 409 cuando el correo ya está registrado
            if (error.code === 'CORREO_YA_REGISTRADO' || error.estado === 409) {
                setErrorCorreo('Ya existe una cuenta con este correo. Intenta iniciar sesión.');
            } else {
                setErrorGeneral(error.message ?? 'Error al enviar el código de registro. Intenta de nuevo.');
            }
        } finally {
            setEnviando(false);
        }
    };

    return (
        <form className="formulario-nuevo-usuario" onSubmit={manejarEnvio} noValidate>
            {errorGeneral && (
                <div className="formulario-nuevo-usuario__alerta-error" role="alert" aria-live="assertive">
                    {errorGeneral}
                </div>
            )}

            <div className="formulario-nuevo-usuario__grupo">
                <label className="formulario-nuevo-usuario__etiqueta" htmlFor="campo-correo-registro">
                    Correo electrónico
                </label>
                <input
                    id="campo-correo-registro"
                    type="email"
                    className={`formulario-nuevo-usuario__campo${errorCorreo ? ' formulario-nuevo-usuario__campo--invalido' : ''}`}
                    value={correo}
                    onChange={manejarCambio(setCorreo, setErrorCorreo)}
                    placeholder="usuario@correo.com"
                    autoComplete="email"
                    autoFocus={!correoInicial}
                    disabled={enviando}
                    aria-describedby={errorCorreo ? 'error-correo-registro' : undefined}
                    aria-invalid={!!errorCorreo}
                />
                {errorCorreo && (
                    <span id="error-correo-registro" className="formulario-nuevo-usuario__error-campo" role="alert">
                        {errorCorreo}
                    </span>
                )}
            </div>

            <div className="formulario-nuevo-usuario__fila-nombre-apellido">
                <div className="formulario-nuevo-usuario__grupo">
                    <label className="formulario-nuevo-usuario__etiqueta" htmlFor="campo-nombres-registro">
                        Nombres
                    </label>
                    <input
                        id="campo-nombres-registro"
                        type="text"
                        className={`formulario-nuevo-usuario__campo${errorNombres ? ' formulario-nuevo-usuario__campo--invalido' : ''}`}
                        value={nombres}
                        onChange={manejarCambio(setNombres, setErrorNombres)}
                        placeholder="Juan Carlos"
                        autoComplete="given-name"
                        autoFocus={!!correoInicial}
                        disabled={enviando}
                        aria-describedby={errorNombres ? 'error-nombres-registro' : undefined}
                        aria-invalid={!!errorNombres}
                    />
                    {errorNombres && (
                        <span id="error-nombres-registro" className="formulario-nuevo-usuario__error-campo" role="alert">
                            {errorNombres}
                        </span>
                    )}
                </div>

                <div className="formulario-nuevo-usuario__grupo">
                    <label className="formulario-nuevo-usuario__etiqueta" htmlFor="campo-apellidos-registro">
                        Apellidos
                    </label>
                    <input
                        id="campo-apellidos-registro"
                        type="text"
                        className={`formulario-nuevo-usuario__campo${errorApellidos ? ' formulario-nuevo-usuario__campo--invalido' : ''}`}
                        value={apellidos}
                        onChange={manejarCambio(setApellidos, setErrorApellidos)}
                        placeholder="García López"
                        autoComplete="family-name"
                        disabled={enviando}
                        aria-describedby={errorApellidos ? 'error-apellidos-registro' : undefined}
                        aria-invalid={!!errorApellidos}
                    />
                    {errorApellidos && (
                        <span id="error-apellidos-registro" className="formulario-nuevo-usuario__error-campo" role="alert">
                            {errorApellidos}
                        </span>
                    )}
                </div>
            </div>

            <button type="submit" className="formulario-nuevo-usuario__boton-crear" disabled={enviando} aria-busy={enviando}>
                {enviando ? 'Enviando código…' : 'Crear cuenta'}
            </button>

            <p className="formulario-nuevo-usuario__pie-texto">
                ¿Ya tienes cuenta?{' '}
                <a
                    href="/"
                    className="formulario-nuevo-usuario__enlace-login"
                    onClick={(e) => {
                        e.preventDefault();
                        navigate('/');
                    }}
                >
                    Inicia sesión
                </a>
            </p>
        </form>
    );
}
