import './VistaPerfil.css';

/**
 * VistaPerfil
 * Muestra los datos del usuario autenticado y el botón de cerrar sesión.
 * Los datos vienen de 'perfil' (tabla public.perfil) vía useAuth.
 */
export default function VistaPerfil({ usuario, onCerrarSesion }) {
    if (!usuario) {
        return (
            <div className="vista-perfil">
                <div className="vista-perfil__spinner" />
            </div>
        );
    }

    const iniciales = `${usuario.nombres?.[0] || ''}${usuario.apellidos?.[0] || ''}`.toUpperCase();
    const nombre = `${usuario.nombres || ''} ${usuario.apellidos || ''}`.trim();
    const fecha = usuario.fecha_creacion
        ? new Date(usuario.fecha_creacion).toLocaleDateString('es-CO', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
          })
        : null;

    return (
        <main className="vista-perfil">
            <div className="vista-perfil__tarjeta">
                <div className="vista-perfil__avatar">{iniciales}</div>

                <h1 className="vista-perfil__nombre">{nombre || 'Usuario'}</h1>
                {fecha && <p className="vista-perfil__fecha">Miembro desde {fecha}</p>}

                <dl className="vista-perfil__datos">
                    <div className="vista-perfil__dato">
                        <dt>Nombres</dt>
                        <dd>{usuario.nombres || '-'}</dd>
                    </div>
                    <div className="vista-perfil__dato">
                        <dt>Apellidos</dt>
                        <dd>{usuario.apellidos || '-'}</dd>
                    </div>
                    <div className="vista-perfil__dato">
                        <dt>Correo</dt>
                        <dd>{usuario.correo}</dd>
                    </div>
                </dl>

                <button className="vista-perfil__btn-salir" onClick={onCerrarSesion}>
                    Cerrar sesión
                </button>
            </div>
        </main>
    );
}
