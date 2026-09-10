import { useMemo, useState } from 'react';
import useProducts from '../../hooks/useProducts';
import useSettings from '../../hooks/useSettings';
import { CartProvider } from '../../contexts/CartContext';
import { indexarPromos } from '../../lib/promos';
import { esPublicable, presentacionPorDefecto, tituloDe } from '../../lib/producto';
import TiendaLayout from './TiendaLayout';
import Hero from './Hero';
import Destacados from './Destacados';
import ProductGrid from './ProductGrid';
import ComoFunciona from './ComoFunciona';
import ProductModal from './ProductModal';

// La ficha abre con una animacion propia de CSS (ver ProductModal), no con la
// View Transitions API. El morph tarjeta -> ficha se veia "cortado y se
// acomodaba despues" en el celular: la API saca una foto del antes y el
// despues y los cruza, y con el vidrio pesado de la ficha eso trababa. Un
// fade con leve escala es instantaneo y no falla nunca.
function conTransicion(actualizar) {
  actualizar();
}

export default function HomeScreen() {
  const { products, loading } = useProducts();
  const { settings } = useSettings();
  const [abierto, setAbierto] = useState(null);
  const [promoActiva, setPromoActiva] = useState(null);

  const promos = useMemo(() => indexarPromos(settings?.promos_ciclo), [settings]);

  // Todo lo que el hero muestra del catalogo se calcula una vez, aca: cuantos
  // aromas hay, desde que precio arrancan y los nombres que la gente reconoce
  // para la cinta. Nada hardcodeado: cambia con el ciclo, sin tocar codigo.
  const { totalAromas, desde, nombresAromas } = useMemo(() => {
    const publicables = products.filter((p) => p.activo && esPublicable(p));
    const precios = publicables
      .map((p) => Number(presentacionPorDefecto(p)?.precio) || 0)
      .filter(Boolean);
    // Los destacados primero: son los nombres mas fuertes para la cinta.
    const ordenados = [...publicables].sort((a, b) => (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0));
    const nombres = [...new Set(ordenados.map(tituloDe).filter((n) => n && n.length <= 22))];
    return {
      totalAromas: publicables.length,
      desde: precios.length ? Math.min(...precios) : null,
      nombresAromas: nombres.slice(0, 16),
    };
  }, [products]);

  const abrir = (producto) => conTransicion(() => setAbierto(producto));
  const cerrar = () => conTransicion(() => setAbierto(null));

  const verPromo = (grupo) => {
    setPromoActiva(grupo);
    document.querySelector('#catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <CartProvider promosCiclo={settings?.promos_ciclo}>
      <TiendaLayout settings={settings} onVerPromo={verPromo}>
        <Hero
          settings={settings}
          promos={promos}
          onVerPromo={verPromo}
          totalAromas={totalAromas}
          desde={desde}
          nombresAromas={nombresAromas}
        />
        {!loading && (
          <>
            <Destacados products={products} onOpen={abrir} />
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
        <ComoFunciona settings={settings} />
        {abierto && <ProductModal producto={abierto} onClose={cerrar} promos={promos} />}
      </TiendaLayout>
    </CartProvider>
  );
}
