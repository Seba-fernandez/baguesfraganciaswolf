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
    products, loading, promos,
    abrir, abiertoId, promoActiva, setPromoActiva,
  } = useOutletContext();

  useEffect(() => { window.scrollTo(0, 0); }, []);

  if (loading) return null;

  return (
    <ProductGrid
      products={products}
      onOpen={abrir}
      abiertoId={abiertoId}
      promos={promos}
      promoActiva={promoActiva}
      setPromoActiva={setPromoActiva}
    />
  );
}
