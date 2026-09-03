import useProducts from '../../hooks/useProducts';
import usePromos from '../../hooks/usePromos';
import useSettings from '../../hooks/useSettings';
import { CartProvider } from '../../contexts/CartContext';
import TiendaLayout from './TiendaLayout';
import Hero from './Hero';
import FeaturedRows from './FeaturedRows';
import ProductGrid from './ProductGrid';
import Statement from './Statement';
import ProductModal from './ProductModal';
import { useState } from 'react';
import { flushSync } from 'react-dom';

// Si el navegador soporta View Transitions y el usuario no pidió movimiento
// reducido, la apertura/cierre del modal se envuelve en una transición nativa:
// la miniatura del card se "convierte" en la imagen del modal en vez de que
// el modal aparezca encima sin relación visual con lo que tocaste.
function conTransicion(actualizar) {
  const soportado = typeof document !== 'undefined' && 'startViewTransition' in document;
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!soportado || reduce) {
    actualizar();
    return;
  }
  document.startViewTransition(() => flushSync(actualizar));
}

export default function HomeScreen() {
  const { products, loading } = useProducts();
  const { promos } = usePromos();
  const { settings } = useSettings();
  const [abierto, setAbierto] = useState(null);

  const promoHero = promos.find((p) => p.activo && p.ubicacion === 'hero');

  const abrir = (producto) => conTransicion(() => setAbierto(producto));
  const cerrar = () => conTransicion(() => setAbierto(null));

  return (
    <CartProvider>
      <TiendaLayout settings={settings}>
        <Hero promo={promoHero} />
        {!loading && (
          <>
            <FeaturedRows products={products} onOpen={abrir} />
            <ProductGrid products={products} onOpen={abrir} abiertoId={abierto?.id ?? null} />
          </>
        )}
        <Statement />
        {abierto && <ProductModal producto={abierto} onClose={cerrar} />}
      </TiendaLayout>
    </CartProvider>
  );
}
