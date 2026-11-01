import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType, useOutletContext } from 'react-router-dom';
import ProductGrid from './ProductGrid';

/**
 * Página del catálogo completo (/catalogo). Se llega desde el botón grande del
 * hero. Usa los mismos datos que el inicio, por contexto, para no volver a
 * pedirlos. Al entrar, arranca arriba de todo.
 */
export default function CatalogoScreen() {
  const {
    products, loading, promos, settings,
    abrir, elegirTamano, abiertoId, promoActiva, setPromoActiva,
  } = useOutletContext();

  // Al entrar desde un link, arriba de todo. Al volver con "atras" (desde la
  // portada, por ejemplo), al mismo lugar: con ?ver=36 la lista ya vuelve
  // larga, y aca se recupera la altura. Se guarda por entrada del historial.
  const location = useLocation();
  const tipo = useNavigationType();
  const clave = useRef(location.key);
  clave.current = location.key;
  // La altura se anota mientras se scrollea: al desmontar ya es tarde, la
  // portada reemplazo al catalogo y el documento recorto el scroll.
  useEffect(() => {
    let guardado = null;
    try { guardado = Number(sessionStorage.getItem(`bgw-scroll:${location.key}`)); } catch { /* sin almacenamiento */ }
    // Volviendo con "atras" o "adelante", la lista todavia no tiene su alto
    // final y el navegador recortaba el scroll al maximo: se quedaba en el pie
    // (Sebas, 31/10). Se espera a que el documento alcance la altura guardada,
    // hasta un segundo, y se suelta si la clienta toca o scrollea antes.
    let cuadro = 0;
    const soltar = () => cancelAnimationFrame(cuadro);
    if (tipo === 'POP' && guardado > 0) {
      const limite = performance.now() + 1000;
      const paso = () => {
        const maximo = document.documentElement.scrollHeight - window.innerHeight;
        if (maximo >= guardado || performance.now() > limite) window.scrollTo(0, Math.min(guardado, maximo));
        else cuadro = requestAnimationFrame(paso);
      };
      cuadro = requestAnimationFrame(paso);
      ['touchstart', 'wheel', 'keydown'].forEach((t) => window.addEventListener(t, soltar, { once: true, passive: true }));
    } else window.scrollTo(0, 0);
    let y = window.scrollY;
    // Solo mientras el catalogo esta en pantalla: al cambiar de pagina el
    // navegador dispara un scroll a 0 antes de que corra la limpieza. Y al
    // salir con "atras" restaura el scroll de la pagina anterior con el
    // catalogo todavia montado: desde ese popstate no se anota nada mas (si
    // no, se guardaba la altura de la portada como si fuera del catalogo).
    let saliendo = false;
    const alVolver = () => { if (window.location.pathname !== '/catalogo') saliendo = true; };
    const anotar = () => {
      if (saliendo || document.body.style.position === 'fixed') return;
      if (document.getElementById('catalogo')) y = window.scrollY;
    };
    window.addEventListener('popstate', alVolver);
    window.addEventListener('scroll', anotar, { passive: true });
    return () => {
      soltar();
      ['touchstart', 'wheel', 'keydown'].forEach((t) => window.removeEventListener(t, soltar));
      window.removeEventListener('popstate', alVolver);
      window.removeEventListener('scroll', anotar);
      try { sessionStorage.setItem(`bgw-scroll:${clave.current}`, String(Math.round(y))); } catch { /* idem */ }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Mientras la base no contesta se dibuja la misma pagina con tarjetas de
  // espera, no un hueco: antes el pie (con el aviso legal) subia hasta arriba
  // y despues bajaba de golpe al llegar los aromas.
  return (
    <ProductGrid
      cargando={loading}
      whatsapp={settings?.whatsapp_owner}
      settings={settings}
      products={products}
      onOpen={abrir}
      onElegir={elegirTamano}
      abiertoId={abiertoId}
      promos={promos}
      promoActiva={promoActiva}
      setPromoActiva={setPromoActiva}
    />
  );
}
