import { useEffect, useState } from 'react';

/**
 * Si la pantalla cumple una media query, y se actualiza al girar el celular o
 * cambiar el ancho. En el render del build (sin window) da false: la cascara
 * de /catalogo se dibuja como escritorio, y como esa pagina se monta con
 * createRoot (no se hidrata), el navegador arranca con el valor real.
 */
export default function useMedia(query) {
  const [cumple, setCumple] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const cambiar = () => setCumple(mq.matches);
    cambiar();
    mq.addEventListener('change', cambiar);
    return () => mq.removeEventListener('change', cambiar);
  }, [query]);
  return cumple;
}
