import { useEffect, useRef, useState } from 'react';
import { VOLVER_ARRIBA } from '../../config/contenido';
import { VOLVER_ARRIBA_DESDE } from '../../config/ajustes';
import { alScroll, medirDeNuevo } from '../../lib/alScroll.js';
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
  const [luz, setLuz] = useState('noche');
  const ref = useRef(null);

  // Una vez por cuadro, con el oyente compartido (lib/alScroll.js). Ademas
  // mira que hay debajo del boton, para que el vidrio tome esa luz: claro con
  // icono tinta sobre papel, rosado con icono crema sobre vino (como iOS).
  // Al terminar un salto (un link a #como, por ejemplo) se mide otra vez: la
  // seccion de destino puede no estar dibujada todavia en el primer cuadro
  // (content-visibility) y el vidrio quedaba con la luz de antes.
  useEffect(() => {
    addEventListener('scrollend', medirDeNuevo);
    return () => removeEventListener('scrollend', medirDeNuevo);
  }, []);
  useEffect(() => alScroll((y) => {
    const arriba = y > VOLVER_ARRIBA_DESDE;
    setVisible(arriba);
    const b = ref.current;
    if (!arriba || !b) return;
    const r = b.getBoundingClientRect();
    const debajo = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2).find((e) => e !== b && !b.contains(e));
    const nueva = debajo?.closest('.dia') ? 'dia' : 'noche';
    setLuz((vieja) => (vieja === nueva ? vieja : nueva));
  }), []);

  function subir() {
    const brusco = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: brusco ? 'auto' : 'smooth' });
  }

  return (
    <button
      ref={ref}
      type="button"
      data-luz={luz}
      className={`${s.boton} tglass-clear ${visible && !oculto ? s.visible : ''}`}
      onClick={subir}
      aria-label={VOLVER_ARRIBA}
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
