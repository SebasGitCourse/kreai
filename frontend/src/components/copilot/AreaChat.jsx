import { useEffect, useRef } from 'react';
import BurbujaMensaje from './BurbujaMensaje.jsx';
import './AreaChat.css';

export default function AreaChat({ mensajes, cargando, onReintento, onReenvio }) {
    const finRef = useRef(null);

    useEffect(() => {
        finRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [mensajes]);

    return (
        <div className="area-chat" role="log" aria-live="polite">
            {cargando ? (
                <div className="area-chat__cargando">
                    <div className="area-chat__spinner" />
                    <span className="area-chat__cargando-txt">Cargando mensajes…</span>
                </div>
            ) : (
                <div className="area-chat__mensajes">
                    {mensajes.length === 0 && <p className="area-chat__vacio">Envía un mensaje para comenzar</p>}
                    {mensajes.map((msg) => (
                        <BurbujaMensaje key={msg.id} mensaje={msg} onReintento={onReintento} onReenvio={onReenvio} />
                    ))}
                    <div ref={finRef} />
                </div>
            )}
        </div>
    );
}
