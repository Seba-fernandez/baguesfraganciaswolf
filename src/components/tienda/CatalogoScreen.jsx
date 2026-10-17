import { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import ProductGrid from './ProductGrid';

/**
 * Página del catálogo completo (/catalogo). Se llega desde el botón grande del
 * hero. Usa los mismos datos que el inicio, por contexto, para no volver a
 * pedirlos. Al entrar, arranca arriba de todo.
 */
export default function CatalogoScreen() {
  const {
    products, loading, promos, settings,
    abrir, abiertoId, promoActiva, setPromoActiva,
  } = useOutletContext();

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // Mientras la base no contesta se dibuja la misma pagina con tarjetas de
  // espera, no un hueco: antes el pie (con el aviso legal) subia hasta arriba
  // y despues bajaba de golpe al llegar los aromas.
  return (
    <ProductGrid
      cargando={loading}
      whatsapp={settings?.whatsapp_owner}
      products={products}
      onOpen={abrir}
      abiertoId={abiertoId}
      promos={promos}
      promoActiva={promoActiva}
      setPromoActiva={setPromoActiva}
    />
  );
}
