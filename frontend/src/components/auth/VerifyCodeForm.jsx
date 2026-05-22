import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './VerifyCodeForm.css';
import { validarOtp } from '../../utils/validators.js';
import { verificarOtp, reenviarOtp } from '../../services/auth.service.js';

const SEGUNDOS_ESPERA_REENVIO = 60;

export default function VerifyCodeForm({ correo, flujo, nombres, apellidos }) {
    const navigate = useNavigate();

    const [otp, setOtp] = useState('');
    const [errorOtp, setErrorOtp] = useState(null);
    const [errorGeneral, setErrorGeneral] = useState(null);
    const [mensajeOk, setMensajeOk] = useState(null);
    const [verificando, setVerificando] = useState(false);
    const [reenviando, setReenviando] = useState(false);
    const [segundos, setSegundos] = useState(SEGUNDOS_ESPERA_REENVIO);

    // Temporizador de reenvío
    useEffect(() => {
        if (segundos <= 0) return;
        const timer = setInterval(() => setSegundos((s) => s - 1), 1000);
        return () => clearInterval(timer);
    }, [segundos]);

    const manejarCambioOtp = (e) => {
        const valor = e.target.value.replace(/\D/g, '').slice(0, 6);
        setOtp(valor);
        if (errorOtp) setErrorOtp(null);
        if (errorGeneral) setErrorGeneral(null);
    };

    const manejarVerificar = async (e) => {
        e.preventDefault();

        const errOtp = validarOtp(otp);

        if (errOtp) {
            setErrorOtp(errOtp);
            return;
        }

        setVerificando(true);
        setErrorGeneral(null);

        // Intentar verificar el OTP con el backend
        try {
            await verificarOtp({ correo, token: otp, flujo, nombres, apellidos });
            navigate('/copilot', { replace: true });
        } catch (error) {
            setErrorGeneral(error.message ?? 'Error al verificar el código. Intenta de nuevo.');
            setOtp('');
        } finally {
            setVerificando(false);
        }
    };
    const manejarReenvio = async () => {
        setReenviando(true);
        setErrorGeneral(null);
        setMensajeOk(null);

        try {
            await reenviarOtp(correo, flujo);
            setSegundos(SEGUNDOS_ESPERA_REENVIO);
            setMensajeOk('Código reenviado. Revisa tu bandeja de entrada.');
            setOtp('');
        } catch (error) {
            setErrorGeneral(error.message ?? 'No se pudo reenviar el código. Intenta de nuevo.');
        } finally {
            setReenviando(false);
        }
    };

    const manejarCambiarCorreo = () => {
        navigate(flujo === 'registro' ? '/registro' : '/', { state: { correo } });
    };

    return (
        <form className="formulario-verificar-codigo" onSubmit={manejarVerificar} noValidate>
            <p className="formulario-verificar-codigo__descripcion">
                Enviamos un código de 6 dígitos a <span className="formulario-verificar-codigo__correo-resaltado">{correo}</span>. Ingrésalo a
                continuación.
            </p>

            {errorGeneral && (
                <div className="formulario-verificar-codigo__alerta-error" role="alert" aria-live="assertive">
                    {errorGeneral}
                </div>
            )}

            {mensajeOk && (
                <div className="formulario-verificar-codigo__alerta-exito" role="status" aria-live="polite">
                    {mensajeOk}
                </div>
            )}

            <div className="formulario-verificar-codigo__grupo">
                <label className="formulario-verificar-codigo__etiqueta" htmlFor="campo-codigo-verificacion">
                    Código de verificación
                </label>
                <input
                    id="campo-codigo-verificacion"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    className={`formulario-verificar-codigo__input-otp${errorOtp ? ' formulario-verificar-codigo__input-otp--invalido' : ''}`}
                    value={otp}
                    onChange={manejarCambioOtp}
                    placeholder="000000"
                    autoComplete="one-time-code"
                    autoFocus
                    disabled={verificando}
                    aria-describedby={errorOtp ? 'error-campo-otp' : undefined}
                    aria-invalid={!!errorOtp}
                />
                {errorOtp && (
                    <span id="error-campo-otp" className="formulario-verificar-codigo__error-campo" role="alert">
                        {errorOtp}
                    </span>
                )}
            </div>

            <button
                type="submit"
                className="formulario-verificar-codigo__boton-confirmar"
                disabled={verificando || otp.length < 6}
                aria-busy={verificando}
            >
                {verificando ? 'Verificando…' : 'Confirmar código'}
            </button>

            <div className="formulario-verificar-codigo__zona-reenvio">
                {segundos > 0 ? (
                    <p className="formulario-verificar-codigo__temporizador">
                        Puedes reenviar el código en <strong>{segundos}s</strong>
                    </p>
                ) : (
                    <>
                        <span className="formulario-verificar-codigo__texto-reenvio">¿No recibiste el código?</span>
                        <button
                            type="button"
                            className="formulario-verificar-codigo__boton-reenviar"
                            onClick={manejarReenvio}
                            disabled={reenviando || verificando}
                            aria-busy={reenviando}
                        >
                            {reenviando ? 'Reenviando…' : 'Reenviar código'}
                        </button>
                    </>
                )}
            </div>

            <button type="button" className="formulario-verificar-codigo__boton-cambiar-correo" onClick={manejarCambiarCorreo} disabled={verificando}>
                Usar otro correo
            </button>
        </form>
    );
}
