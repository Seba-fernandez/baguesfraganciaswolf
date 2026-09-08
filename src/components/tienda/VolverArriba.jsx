import { useEffect, useState } from 'react';
import s from './VolverArriba.module.css';

/**
 * Botón para volver al principio. Aparece recién cuando ya se bajó bastante,
 * así no molesta en la primera pantalla, y se esconde cuando el carrito o la
 * ficha están abiertos para no pisarlos.
 *
 * El aviso de scroll se escucha con `passive: true`: sin eso, el navegador
 * tiene que esperar a ver si el manejador cancela el gesto, y el
 * desplazamiento con el dedo se siente pesado.
 */
export default function VolverArriba({ oculto = false }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const mirar = () => setVisible(window.scrollY > 900);
    mirar();
    window.addEventListener('scroll', mirar, { passive: true });
    return () => window.removeEventListener('scroll', mirar);
  }, []);

  function subir() {
    const brusco = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: brusco ? 'auto' : 'smooth' });
  }

  return (
    <button
      type="button"
      className={`${s.boton} ${visible && !oculto ? s.visible : ''}`}
      onClick={subir}
      aria-label="Volver al principio"
      tabIndex={visible && !oculto ? 0 : -1}
      aria-hidden={!visible || oculto}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 19V5" />
        <path d="M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}
