import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import useDatosTienda from '../../hooks/useDatosTienda';
import { CartProvider } from '../../contexts/CartContext';
import { indexarPromos } from '../../lib/promos';
import { esPublicable, presentacionPorDefecto, tituloDe } from '../../lib/producto';
import { lazy, Suspense } from 'react';
import TiendaLayout from './TiendaLayout';
import { fotoDe } from '../../lib/fotos';

// La ficha se carga cuando se abre una, no antes. Se lleva con ella su CSS, que
// si no viaja embebido en el HTML de la portada y el navegador lo cruza contra
// todos los elementos antes del primer dibujado, para una hoja que no se ve.
const ProductModal = lazy(() => import('./ProductModal'));

/**
 * Cáscara de la tienda pública. Carga una sola vez los productos, los ajustes y
 * el carrito, y los reparte a las dos páginas (inicio y catálogo) por el
 * contexto del Outlet. La ficha del producto vive acá, adentro de .tienda, para
 * que se abra igual desde cualquiera de las dos.
 *
 * La ficha NO va adentro de <main>: TiendaLayout la dibuja al lado del cajón.
 * <main> arma su propio contexto de apilamiento (z-index: 1) y el pie, que es
 * hermano y viene después, se pintaba encima de la ficha aunque ella tuviera
 * z-index 101: el toque en "Agregar al pedido" le llegaba a un enlace del pie.
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
  const [promoActiva, setPromoActiva] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();

  // La ficha abierta vive en la direccion (?aroma=sauvage), no en un estado
  // suelto: asi cada perfume tiene su link para mandar por WhatsApp o
  // Instagram, y el gesto de "atras" del celular cierra la ficha en vez de
  // sacar a la clienta de la tienda.
  //
  // Mientras la base no contesto, `products` esta vacio y la ficha no se abre:
  // al hidratar la portada pre-generada en "/?aroma=..." el primer dibujado es
  // igual al del servidor (sin ficha), como pide hydrateRoot.
  const slugAbierto = params.get('aroma');
  const abierto = useMemo(
    () => (slugAbierto && products.find((p) => p.slug === slugAbierto && p.activo && esPublicable(p))) || null,
    [slugAbierto, products]
  );

  // Un slug que no existe (un ciclo viejo, un link mal copiado) no rompe nada:
  // apenas contesta la base, se saca de la direccion sin dejar historial.
  useEffect(() => {
    if (loading || !slugAbierto || abierto || !products.length) return;
    setParams((prev) => { const n = new URLSearchParams(prev); n.delete('aroma'); return n; }, { replace: true, state: location.state });
  }, [loading, slugAbierto, abierto, products.length]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Quien abrio la ficha (la tarjeta), para devolverle el foco al cerrar. Se
  // anota al tocarla: cuando la ficha termina de cargar, la tarjeta ya quedo
  // detras de `inert` y perdio el foco.
  const disparador = useRef(null);
  const conAroma = (slug) => (prev) => {
    const n = new URLSearchParams(prev);
    if (slug) n.set('aroma', slug); else n.delete('aroma');
    return n;
  };
  // Abrir suma una entrada al historial (marcada `ficha` en el estado): por eso
  // "atras" la cierra. Si ya hay una ficha abierta (un "mira tambien"), la
  // reemplaza: "atras" sigue cerrando la ficha y no recorre cada perfume visto.
  const abrir = useCallback((producto) => {
    if (!producto?.slug) return;
    if (abierto) {
      setParams(conAroma(producto.slug), { replace: true, state: location.state });
      return;
    }
    disparador.current = document.activeElement;
    setParams(conAroma(producto.slug), { state: { ...(location.state || {}), ficha: true } });
  }, [abierto, location.state, setParams]);
  // Cerrar deshace esa entrada. Si se entro directo con el link (no hay
  // entrada nuestra que deshacer), se saca el parametro sin dejar historial:
  // "atras" no puede llevar fuera de la tienda.
  const cerrar = useCallback(() => {
    if (location.state?.ficha) navigate(-1);
    else setParams(conAroma(null), { replace: true, state: location.state });
  }, [location.state, navigate, setParams]);

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
      <TiendaLayout
        settings={settings}
        onVerPromo={verPromo}
        ficha={abierto && (
          <Suspense fallback={null}>
            <ProductModal
              producto={abierto}
              onClose={cerrar}
              promos={promos}
              disparador={disparador.current}
            />
          </Suspense>
        )}
      >
        <Outlet context={ctx} />
      </TiendaLayout>
    </CartProvider>
  );
}
