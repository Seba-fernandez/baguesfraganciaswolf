import { useEffect, useState } from 'react';

/**
 * true recien cuando la pagina termino de cargar (evento load, que espera a la
 * imagen del hero) y el navegador tiene un rato libre. Para fotos que estan
 * cerca de la primera pantalla pero no adentro: con loading="lazy" solo,
 * Chrome las pide apenas abre la pagina (su margen de carga diferida es de
 * mas de 1000 px) y le sacan ancho de banda a la imagen que define el LCP.
 * Medido el 23/10: las fotos de "Las ciudades" y de las familias sumaban
 * 120 kB antes del LCP y lo corrian unos 400 ms en la simulacion de Lighthouse.
 *
 * Empieza en false tambien en el HTML pre-generado: las fotos no van en el
 * HTML, asi el navegador no las descubre antes de tiempo.
 */
export default function useTrasCarga() {
  const [listo, setListo] = useState(false);
  useEffect(() => {
    let id = 0;
    const libre = () => {
      if ('requestIdleCallback' in window) id = requestIdleCallback(() => setListo(true), { timeout: 1500 });
      else id = setTimeout(() => setListo(true), 200);
    };
    if (document.readyState === 'complete') libre();
    else addEventListener('load', libre, { once: true });
    return () => {
      removeEventListener('load', libre);
      if ('cancelIdleCallback' in window) cancelIdleCallback(id); else clearTimeout(id);
    };
  }, []);
  return listo;
}
