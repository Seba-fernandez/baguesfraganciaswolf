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

export default function HomeScreen() {
  const { products, loading } = useProducts();
  const { promos } = usePromos();
  const { settings } = useSettings();
  const [abierto, setAbierto] = useState(null);

  const promoHero = promos.find((p) => p.activo && p.ubicacion === 'hero');

  return (
    <CartProvider>
      <TiendaLayout settings={settings}>
        <Hero promo={promoHero} />
        {!loading && (
          <>
            <FeaturedRows products={products} onOpen={setAbierto} />
            <ProductGrid products={products} onOpen={setAbierto} />
          </>
        )}
        <Statement />
        {abierto && <ProductModal producto={abierto} onClose={() => setAbierto(null)} />}
      </TiendaLayout>
    </CartProvider>
  );
}
