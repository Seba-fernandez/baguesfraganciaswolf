import { useMemo, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import useDatosTienda from '../../hooks/useDatosTienda';
import { CartProvider } from '../../contexts/CartContext';
import { indexarPromos } from '../../lib/promos';
import { esPublicable, presentacionPorDefecto, tituloDe } from '../../lib/producto';
import TiendaLayout from './TiendaLayout';
import ProductModal from './ProductModal';
import { fotoDe } from './ProductThumb';

/**
 * Cáscara de la tienda pública. Carga una sola vez los productos, los ajustes y
 * el carrito, y los reparte a las dos páginas (inicio y catálogo) por el
 * contexto del Outlet. La ficha del producto vive acá, adentro de .tienda, para
 * que se abra igual desde cualquiera de las dos.
 */
/*
 * La vuelta del ingreso con Google ya NO se resuelve acá. Google redirige a la
 * raíz con un ?code=, y antes este componente esperaba a que el contexto de
 * sesión lo procesara para mandar al admin a /panel — lo que obligaba a montar
 * ese contexto (y con él todo el cliente de base de datos) en la tienda pública.
 *
 * Ahora el desvío lo hace un script de cuatro líneas en index.html, que corre
 * antes de que baje el bundle: si hay ?code= en la raíz, redirige a /panel con
 * la query intacta y ahí el panel lo procesa. La tienda nunca se entera.
 */
export default function TiendaShell() {
  const { products, settings, loading } = useDatosTienda();
  const [abierto, setAbierto] = useState(null);
  const [promoActiva, setPromoActiva] = useState(null);
  const navigate = useNavigate();

  const promos = useMemo(() => indexarPromos(settings?.promos_ciclo), [settings]);

  // Datos que muestra el hero: se calculan una sola vez del catálogo real.
  const { totalAromas, desde, nombresAromas } = useMemo(() => {
    const publicables = products.filter((p) => p.activo && esPublicable(p));
    const precios = publicables
      .map((p) => Number(presentacionPorDefecto(p)?.precio) || 0)
      .filter(Boolean);
    const ordenados = [...publicables].sort((a, b) => (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0));
    const nombres = [...new Set(ordenados.map(tituloDe).filter((n) => n && n.length <= 22))];
    return {
      totalAromas: publicables.length,
      desde: precios.length ? Math.min(...precios) : null,
      nombresAromas: nombres.slice(0, 16),
    };
  }, [products]);

  // Frasco que protagoniza el hero: el primer destacado que tenga foto propia
  // (no placeholder), para que la portada muestre un producto de verdad.
  const heroProducto = useMemo(() => {
    const dest = products.filter((p) => p.activo && p.destacado && esPublicable(p));
    return dest.find((p) => fotoDe(p)) || dest[0] || null;
  }, [products]);

  const abrir = (producto) => setAbierto(producto);
  const cerrar = () => setAbierto(null);

  // Ver una promo lleva al catálogo con ese filtro puesto (antes hacía scroll en
  // la misma página; ahora el catálogo es una página aparte).
  const verPromo = (grupo) => {
    setPromoActiva(grupo);
    navigate('/catalogo');
  };

  const ctx = {
    products, loading, settings, promos,
    totalAromas, desde, nombresAromas, heroProducto,
    abrir, abiertoId: abierto?.id ?? null,
    promoActiva, setPromoActiva, verPromo,
  };

  return (
    <CartProvider promosCiclo={settings?.promos_ciclo}>
      <TiendaLayout settings={settings} onVerPromo={verPromo}>
        <Outlet context={ctx} />
        {abierto && <ProductModal producto={abierto} onClose={cerrar} promos={promos} />}
      </TiendaLayout>
    </CartProvider>
  );
}
