import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import useDatosTienda from '../../hooks/useDatosTienda';
import { CartProvider, useCart } from '../../contexts/CartContext';
import { indexarPromos } from '../../lib/promos';
import { desdeYLista, esPublicable, tituloDe } from '../../lib/producto';
import { escribirFamilias, leerFamilias } from '../../lib/filtros';
import { RASTRO_MAXIMO } from '../../config/ajustes';
import { lazy, Suspense } from 'react';
import TiendaLayout from './TiendaLayout';
import { fotoDe } from '../../lib/fotos';

/** La hoja de tamanos con el carrito: agrega el tamano elegido y se cierra. */
function HojaConCarrito({ producto, onClose, ...resto }) {
  const { addItem } = useCart();
  return (
    <HojaTamanos
      producto={producto}
      onClose={onClose}
      onAgregar={(presentacion) => { addItem(producto, presentacion, 1); onClose(); }}
      {...resto}
    />
  );
}

// La ficha se carga cuando se abre una, no antes. Se lleva con ella su CSS, que
// si no viaja embebido en el HTML de la portada y el navegador lo cruza contra
// todos los elementos antes del primer dibujado, para una hoja que no se ve.
const ProductModal = lazy(() => import('./ProductModal'));
// La hoja de tamanos tambien se carga al abrirse por primera vez.
const HojaTamanos = lazy(() => import('./HojaTamanos'));
// La hoja de una familia ("¿Con cuál te identificás?"), igual.
const HojaFamilia = lazy(() => import('./HojaFamilia'));

// Marca de esta carga de la pagina. La hoja de tamanos se abre con una entrada
// propia en el historial (asi "atras" la cierra), y el estado de esa entrada
// sobrevive a recargar: sin esta marca, recargar la reabriria sola.
const SESION = Math.random().toString(36).slice(2);

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
  const { totalAromas, desde, lista, nombresAromas } = useMemo(() => {
    const publicables = products.filter((p) => p.activo && esPublicable(p));
    const precios = desdeYLista(publicables);
    const ordenados = [...publicables].sort((a, b) => (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0));
    // La cinta del hero: un nombre por aroma, con su producto, porque cada
    // nombre es un link a su ficha (E3-B5).
    const vistos = new Set();
    const nombres = ordenados
      .map((p) => ({ nombre: tituloDe(p), slug: p.slug, producto: p }))
      .filter((x) => x.nombre && x.nombre.length <= 22 && x.slug && !vistos.has(x.nombre) && vistos.add(x.nombre));
    return {
      totalAromas: publicables.length,
      desde: precios.desde,
      lista: precios.lista,
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
  //
  // Para volver de a uno sin cerrar (Sebas, 23/10: "pueda volver al que habia
  // elegido antes"), el estado de la entrada guarda la cadena de los que se
  // vieron (`rastro`, hasta RASTRO_MAXIMO), cada uno con el tamano que tenia
  // elegido. La flecha de la ficha saca el ultimo y lo vuelve a abrir.
  const rastro = useMemo(() => (Array.isArray(location.state?.rastro) ? location.state.rastro : []), [location.state]);
  const previo = useMemo(() => {
    const ultimo = rastro[rastro.length - 1];
    return (ultimo && products.find((p) => p.slug === ultimo.slug && p.activo && esPublicable(p))) || null;
  }, [rastro, products]);
  const abrir = useCallback((producto, { desdeMl = null } = {}) => {
    if (!producto?.slug) return;
    if (abierto) {
      if (producto.slug === abierto.slug) return;
      const nuevo = [...rastro, { slug: abierto.slug, ml: desdeMl }].slice(-RASTRO_MAXIMO);
      setParams(conAroma(producto.slug), { replace: true, state: { ...(location.state || {}), rastro: nuevo, mlVuelta: null } });
      return;
    }
    disparador.current = document.activeElement;
    setParams(conAroma(producto.slug), { state: { ...(location.state || {}), ficha: true, rastro: [], mlVuelta: null } });
  }, [abierto, rastro, location.state, setParams]);
  const volver = useCallback(() => {
    const ultimo = rastro[rastro.length - 1];
    if (!ultimo) return;
    setParams(conAroma(ultimo.slug), {
      replace: true,
      state: { ...(location.state || {}), rastro: rastro.slice(0, -1), mlVuelta: ultimo.ml ?? null },
    });
  }, [rastro, location.state, setParams]);
  // Cerrar deshace esa entrada. Si se entro directo con el link (no hay
  // entrada nuestra que deshacer), se saca el parametro sin dejar historial:
  // "atras" no puede llevar fuera de la tienda.
  const cerrar = useCallback(() => {
    if (location.state?.ficha) navigate(-1);
    else setParams(conAroma(null), { replace: true, state: location.state });
  }, [location.state, navigate, setParams]);

  // La hoja de tamanos: mismo criterio que la ficha (una entrada en el
  // historial, "atras" la cierra), pero en el estado de la entrada y no en la
  // direccion: no es algo para compartir.
  const disparadorHoja = useRef(null);
  const slugHoja = location.state?.sesion === SESION ? location.state?.hoja : null;
  const hojaProducto = useMemo(
    () => (slugHoja && products.find((p) => p.slug === slugHoja)) || null,
    [slugHoja, products]
  );
  const elegirTamano = useCallback((producto) => {
    disparadorHoja.current = document.activeElement;
    navigate({ pathname: location.pathname, search: location.search }, { state: { hoja: producto.slug, sesion: SESION } });
  }, [location.pathname, location.search, navigate]);
  const cerrarHoja = useCallback(() => navigate(-1), [navigate]);
  // De la hoja a la ficha: se reemplaza la entrada de la hoja por la de la
  // ficha, asi cerrar la ficha vuelve directo al catalogo.
  const hojaAFicha = useCallback(() => {
    if (!hojaProducto) return;
    setParams(conAroma(hojaProducto.slug), { replace: true, state: { ficha: true } });
  }, [hojaProducto, setParams]);

  // La hoja de una familia, encima de la portada: vive en la direccion
  // (/?familia=amaderados), como la ficha. Abrirla suma una entrada (marcada
  // `familia`), asi "atras" o tocar afuera la cierra y la clienta queda donde
  // estaba. La ficha que se abra desde ahi va por encima.
  // Admite varias (/?familia=florales,amaderados): los chips de la hoja suman
  // o sacan con replace y conservan la marca, asi "atras" sigue cerrandola.
  const familiaTexto = location.pathname === '/' ? params.get('familia') || '' : '';
  const familiasAbiertas = useMemo(() => leerFamilias(familiaTexto), [familiaTexto]);
  const disparadorFamilia = useRef(null);
  const abrirFamilia = useCallback((id) => {
    disparadorFamilia.current = document.activeElement;
    setParams((prev) => { const n = new URLSearchParams(prev); n.set('familia', id); return n; },
      { state: { ...(location.state || {}), familia: true }, preventScrollReset: true });
  }, [location.state, setParams]);
  const cambiarFamilias = useCallback((lista) => {
    const valor = escribirFamilias(lista);
    if (!valor) return;
    setParams((prev) => { const n = new URLSearchParams(prev); n.set('familia', valor); return n; },
      { replace: true, state: location.state, preventScrollReset: true });
  }, [location.state, setParams]);
  const cerrarFamilia = useCallback(() => {
    if (location.state?.familia) navigate(-1);
    else setParams((prev) => { const n = new URLSearchParams(prev); n.delete('familia'); return n; }, { replace: true, preventScrollReset: true });
  }, [location.state, navigate, setParams]);

  // Ver una promo lleva al catálogo con ese filtro puesto (antes hacía scroll en
  // la misma página; ahora el catálogo es una página aparte).
  const verPromo = (grupo) => {
    setPromoActiva(grupo);
    navigate('/catalogo');
  };

  const ctx = {
    products, loading, settings, promos,
    totalAromas, desde, lista, nombresAromas, heroProducto,
    abrir, elegirTamano, abiertoId: abierto?.id ?? null, abrirFamilia,
    promoActiva, setPromoActiva, verPromo,
  };

  return (
    <CartProvider promosCiclo={settings?.promos_ciclo}>
      <TiendaLayout
        settings={settings}
        onVerPromo={verPromo}
        capa={familiasAbiertas.length > 0 && products.length > 0 && (
          <Suspense fallback={null}>
            <HojaFamilia
              familias={familiasAbiertas}
              onCambiar={cambiarFamilias}
              products={products}
              onClose={cerrarFamilia}
              onOpen={abrir}
              onElegir={elegirTamano}
              promos={promos}
              disparador={disparadorFamilia.current}
              inert={abierto || hojaProducto ? '' : undefined}
            />
          </Suspense>
        )}
        hoja={hojaProducto && !abierto && (
          <Suspense fallback={null}>
            <HojaConCarrito
              producto={hojaProducto}
              onClose={cerrarHoja}
              onVerFicha={hojaAFicha}
              promos={promos}
              disparador={disparadorHoja.current}
            />
          </Suspense>
        )}
        ficha={abierto && (
          <Suspense fallback={null}>
            <ProductModal
              producto={abierto}
              onClose={cerrar}
              promos={promos}
              disparador={disparador.current}
              todos={products}
              onAbrir={abrir}
              previo={previo}
              onVolver={volver}
              mlInicial={location.state?.mlVuelta ?? null}
            />
          </Suspense>
        )}
      >
        <Outlet context={ctx} />
      </TiendaLayout>
    </CartProvider>
  );
}
