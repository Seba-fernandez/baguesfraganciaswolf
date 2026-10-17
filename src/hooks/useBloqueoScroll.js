import { useEffect } from 'react';

/**
 * Mientras un dialogo de la tienda esta abierto (la ficha, la hoja de
 * tamanos), la pagina de atras no se mueve con el dedo. Un solo lugar para
 * las dos: se cuenta cuantos dialogos lo piden y se suelta con el ultimo.
 */
let pedidos = 0;

export default function useBloqueoScroll(activo = true) {
  useEffect(() => {
    if (!activo) return undefined;
    pedidos += 1;
    if (pedidos === 1) document.body.style.overflow = 'hidden';
    return () => {
      pedidos -= 1;
      if (pedidos === 0) document.body.style.overflow = '';
    };
  }, [activo]);
}
