import { useEffect } from 'react';
import useHistorial from '../../hooks/useHistorial';
import { deshacer, rehacer, olvidarMensaje } from '../../lib/historialPanel';
import s from './TopBar.module.css';

const UndoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </svg>
);
const RedoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m15 14 5-5-5-5" />
    <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
  </svg>
);

const escribiendo = (el) => el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable);

/**
 * Las flechas de deshacer / rehacer de la barra de arriba, como en Canva o
 * CapCut. Recorren los cambios hechos desde que se entró al panel (se
 * vuelve a cero al salir). También andan con Ctrl+Z y Ctrl+Mayús+Z, salvo
 * cuando se está escribiendo en un campo: ahí manda el deshacer del texto.
 */
export default function Historial() {
  const h = useHistorial();

  useEffect(() => {
    function alTeclear(e) {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || escribiendo(e.target)) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); deshacer(); }
      else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); rehacer(); }
    }
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, []);

  useEffect(() => {
    if (!h.mensaje) return undefined;
    const t = setTimeout(olvidarMensaje, h.mensaje.tipo === 'error' ? 8000 : 3500);
    return () => clearTimeout(t);
  }, [h.mensaje]);

  return (
    <>
      <div className={s.historial} role="group" aria-label="Deshacer y rehacer cambios">
        <button
          type="button"
          className={s.flecha}
          onClick={() => deshacer()}
          disabled={!h.puedeDeshacer}
          aria-label={h.etiquetaDeshacer ? `Deshacer: ${h.etiquetaDeshacer}` : 'Deshacer (no hay cambios para deshacer)'}
          title={h.etiquetaDeshacer ? `Deshacer: ${h.etiquetaDeshacer}` : 'Nada para deshacer'}
        >
          <UndoIcon />
          {h.cantidad > 0 && <span className={s.cuenta} aria-hidden="true">{h.cantidad > 99 ? '99+' : h.cantidad}</span>}
        </button>
        <button
          type="button"
          className={s.flecha}
          onClick={() => rehacer()}
          disabled={!h.puedeRehacer}
          aria-label={h.etiquetaRehacer ? `Rehacer: ${h.etiquetaRehacer}` : 'Rehacer (no hay nada para rehacer)'}
          title={h.etiquetaRehacer ? `Rehacer: ${h.etiquetaRehacer}` : 'Nada para rehacer'}
        >
          <RedoIcon />
        </button>
      </div>
      <div className={s.avisoHistorial} role="status" aria-live="polite">
        {h.mensaje && <span className={h.mensaje.tipo === 'error' ? s.avisoError : s.avisoOk}>{h.mensaje.texto}</span>}
      </div>
    </>
  );
}
