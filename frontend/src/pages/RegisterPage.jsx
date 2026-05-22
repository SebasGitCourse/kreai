import './RegisterPage.css';
import RegisterForm from '../components/auth/RegisterForm.jsx';
import logoTipo from '../assets/logo-with-brand.png';

export default function RegisterPage() {
    return (
        <main className="pagina-crear-cuenta">
            <div id="contenedor-formulario-registro">
                <header className="pagina-crear-cuenta__cabecera">
                    <div className="pagina-crear-cuenta__logo-marca" aria-hidden="true">
                        <img src={logoTipo} alt="Logotipo de la aplicación KreAI" className="pagina-crear-cuenta__logo" />
                    </div>
                    <h1 className="pagina-crear-cuenta__titulo-principal">Crear cuenta</h1>
                    <p className="pagina-crear-cuenta__descripcion">
                        Completa tus datos para registrarte. Recibirás un código de verificación en tu correo.
                    </p>
                </header>
                <RegisterForm />
            </div>
        </main>
    );
}
