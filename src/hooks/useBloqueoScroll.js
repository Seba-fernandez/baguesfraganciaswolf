import { useEffect } from 'react';

/**
 * Mientras un dialogo de la tienda esta abierto (la ficha, la hoja de
 * tamanos), la pagina de atras no se mueve. Un solo lugar para los dos: se
 * cuenta cuantos dialogos lo piden y se suelta con el ultimo.
 *
 * Antes era `overflow: hidden` en el body. En Chromium movil eso llegaba a
 * llevar la pagina arriba de todo, y en iOS no frena el scroll de atras. El
 * patron que conserva la posicion en todos los motores: el body pasa a
 * `position: fixed` corrido hacia arriba lo que estaba scrolleado (la pagina
 * se ve exactamente igual), y al cerrar se devuelve al mismo lugar.
 */
let pedidos = 0;
let guardado = 0;

export default function useBloqueoScroll(activo = true) {
  useEffect(() => {
    if (!activo) return undefined;
    pedidos += 1;
    if (pedidos === 1) {
      guardado = window.scrollY;
      const b = document.body.style;
      b.position = 'fixed';
      b.top = `-${guardado}px`;
      b.left = '0';
      b.right = '0';
      b.width = '100%';
    }
    return () => {
      pedidos -= 1;
      if (pedidos > 0) return;
      const b = document.body.style;
      b.position = '';
      b.top = '';
      b.left = '';
      b.right = '';
      b.width = '';
      // Sin animacion: tiene que aparecer donde estaba, no viajar hasta ahi.
      window.scrollTo({ top: guardado, left: 0, behavior: 'instant' });
    };
  }, [activo]);
}
