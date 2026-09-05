import { useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import useProducts from '../../hooks/useProducts';
import useSettings from '../../hooks/useSettings';
import { CartProvider } from '../../contexts/CartContext';
import { indexarPromos } from '../../lib/promos';
import { esPublicable } from '../../lib/producto';
import TiendaLayout from './TiendaLayout';
import Hero from './Hero';
import FeaturedRows from './FeaturedRows';
import ProductGrid from './ProductGrid';
import Statement from './Statement';
import ProductModal from './ProductModal';

// View Transitions nativas: la miniatura se convierte en la ficha en vez de
// aparecer un modal sin relacion con lo que se toco. Con soporte ausente o
// reduced-motion, cae al fade de siempre.
function conTransicion(actualizar) {
  const soportado = typeof document !== 'undefined' && 'startViewTransition' in document;
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!soportado || reduce) { actualizar(); return; }
  document.startViewTransition(() => flushSync(actualizar));
}

export default function HomeScreen() {
  const { products, loading } = useProducts();
  const { settings } = useSettings();
  const [abierto, setAbierto] = useState(null);
  const [promoActiva, setPromoActiva] = useState(null);

  const promos = useMemo(() => indexarPromos(settings?.promos_ciclo), [settings]);
  const totalAromas = useMemo(
    () => products.filter((p) => p.activo && esPublicable(p)).length,
    [products]
  );

  const abrir = (producto) => conTransicion(() => setAbierto(producto));
  const cerrar = () => conTransicion(() => setAbierto(null));

  const verPromo = (grupo) => {
    setPromoActiva(grupo);
    document.querySelector('#catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <CartProvider promosCiclo={settings?.promos_ciclo}>
      <TiendaLayout settings={settings} onVerPromo={verPromo}>
        <Hero settings={settings} promos={promos} onVerPromo={verPromo} totalAromas={totalAromas} />
        {!loading && (
          <>
            <FeaturedRows products={products} onOpen={abrir} />
            <ProductGrid
              products={products}
              onOpen={abrir}
              abiertoId={abierto?.id ?? null}
              promos={promos}
              promoActiva={promoActiva}
              setPromoActiva={setPromoActiva}
            />
          </>
        )}
        <Statement settings={settings} />
        {abierto && <ProductModal producto={abierto} onClose={cerrar} promos={promos} />}
      </TiendaLayout>
    </CartProvider>
  );
}
