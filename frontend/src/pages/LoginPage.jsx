import './LoginPage.css';
import LoginForm from '../components/auth/LoginForm.jsx';
import logoMarca from '../assets/logo-with-brand.png';

export default function LoginPage() {
    return (
        <main className="pagina-inicio-sesion">
            <div id="contenedor-formulario-login">
                <header className="pagina-inicio-sesion__cabecera">
                    <div className="pagina-inicio-sesion__logo-marca" aria-hidden="true">
                        <img src={logoMarca} alt="Logotipo junto con nombre de la marca [ KreAI ]" fetchPriority="high" />
                    </div>
                    <h1 className="pagina-inicio-sesion__titulo-principal">Bienvenido</h1>
                    <p className="pagina-inicio-sesion__descripcion">
                        Ingresa tu correo para acceder a tu cuenta. Te enviaremos un código de un solo uso.
                    </p>
                </header>

                <LoginForm />
            </div>
        </main>
    );
}
