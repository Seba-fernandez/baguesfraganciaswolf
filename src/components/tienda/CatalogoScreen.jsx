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
    if (tipo === 'POP' && guardado > 0) requestAnimationFrame(() => window.scrollTo(0, guardado));
    else window.scrollTo(0, 0);
    let y = window.scrollY;
    // Solo mientras el catalogo esta en pantalla: al cambiar de pagina el
    // navegador dispara un scroll a 0 antes de que corra la limpieza.
    const anotar = () => { if (document.getElementById('catalogo')) y = window.scrollY; };
    window.addEventListener('scroll', anotar, { passive: true });
    return () => {
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
