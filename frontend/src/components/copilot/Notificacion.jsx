import './Notificacion.css';

export default function Notificacion({ notificaciones = [] }) {
    if (!notificaciones.length) return null;

    return (
        <div className="notif__contenedor">
            {notificaciones.map((n) => (
                <div key={n.id} className="notif__item">
                    <span className="notif__icono" aria-hidden="true">
                        ⚠
                    </span>
                    <p className="notif__texto">{n.mensaje}</p>
                </div>
            ))}
        </div>
    );
}
