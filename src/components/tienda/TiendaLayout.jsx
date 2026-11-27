import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { precargarCatalogoCuandoConvenga } from './precargaCatalogo.js';
// En el prerender no hay pantalla: ahi va el useEffect comun, que no avisa.
const useAntesDePintar = typeof window === 'undefined' ? useEffect : useLayoutEffect;
import { alScroll, medirDeNuevo } from '../../lib/alScroll.js';
import { montarVidrioLiquido } from '../../lib/vidrioLiquido';
import { montarScrollSuave, irASeccion } from '../../lib/scrollSuave.js';
import { useCart } from '../../contexts/CartContext';
// El cajón del pedido, igual que la ficha: se carga la primera vez que se abre.
// Mientras tanto no existe ni su JavaScript ni su CSS, y no se ve nunca al
// entrar. Una vez cargado se queda montado, así la animación de cierre corre.
const CartSheet = lazy(() => import('./CartSheet'));
import VolverArriba from './VolverArriba';
import AvisoAgregado from './AvisoAgregado';
import { MARCA, CABECERA, LEGAL, PIE, COMO_FUNCIONA } from '../../config/contenido';
import { linkWhatsApp } from '../../lib/whatsapp';
import { Bolsa, WhatsApp, Instagram, Documento } from './Iconos.jsx';
import '../../styles/tienda.css';
import s from './TiendaLayout.module.css';

// Marca de esta carga de la pagina para la entrada del cajon en el historial
// (mismo criterio que SESION en TiendaShell): el estado de una entrada
// sobrevive a recargar y sin la marca el cajon se tomaria por abierto.
const SESION_PEDIDO = Math.random().toString(36).slice(2);

export default function TiendaLayout({ children, ficha = null, hoja = null, capa = null, settings, onVerPromo }) {
  const { count, open, setOpen, ultimo } = useCart();
  const [avisoVisible, setAvisoVisible] = useState(false);
  const raiz = useRef(null);
  const botonPedido = useRef(null);
  const [pedidoUsado, setPedidoUsado] = useState(false);

  // Con la ficha o el cajón abiertos, el resto de la página queda inert: no se
  // puede tocar, Tab no se escapa del diálogo y el lector de pantalla no lee lo
  // de atrás. React 18 no conoce el atributo, por eso va como texto vacío.
  const hayDialogo = open || Boolean(ficha) || Boolean(hoja) || Boolean(capa);
  const inert = hayDialogo ? '' : undefined;

  // Lente de vidrio liquido en el canto de cada superficie de vidrio (solo
  // Chromium de escritorio; ver src/lib/vidrioLiquido.js).
  // Y el sistema flotante (iman, flotar, acercarse el cursor), que llega
  // aparte y despues: si no esta, la pagina anda igual.
  useEffect(() => {
    const a = montarVidrioLiquido(raiz.current);
    let b;
    let vivo = true;
    // Solo con mouse y sin reduced-motion: en el celular ni se descarga.
    const conMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (conMouse) {
      import('../../lib/flotante.js')
        .then((m) => { if (vivo) b = m.montarFlotantes(raiz.current); })
        .catch(() => {});
    }
    return () => { vivo = false; a?.(); b?.(); };
  }, []);

  const ubicacion = useLocation();
  const { pathname, hash } = ubicacion;
  const tipoNavegacion = useNavigationType();
  const navigate = useNavigate();

  // El cajon con su entrada en el historial, como la ficha y la hoja de
  // tamanos: "atras" lo cierra (Sebas, 31/10: con el cajon abierto, el gesto
  // de atras del celular sacaba de la pagina y dejaba el cajon encima de la
  // anterior). La entrada se suma recien cuando no queda otro dialogo: al
  // agregar desde la ficha o la hoja, esas se cierran con un "atras" que
  // todavia no termino, y empujar antes haria que ese "atras" se coma la
  // entrada del cajon.
  const enEntradaPedido = ubicacion.state?.pedido === SESION_PEDIDO;
  const otroDialogo = Boolean(ficha) || Boolean(hoja);
  const empujado = useRef(false);
  useEffect(() => {
    if (!open || otroDialogo || enEntradaPedido || empujado.current) return;
    empujado.current = true;
    navigate(
      { pathname: ubicacion.pathname, search: ubicacion.search, hash: ubicacion.hash },
      { state: { ...(ubicacion.state?.familia ? { familia: true } : {}), pedido: SESION_PEDIDO }, preventScrollReset: true }
    );
  }, [open, otroDialogo, enEntradaPedido, ubicacion, navigate]);
  // Se salio de la entrada con "atras": se cierra.
  useEffect(() => {
    if (open && empujado.current && !enEntradaPedido) {
      empujado.current = false;
      setOpen(false);
    }
  }, [enEntradaPedido]); // eslint-disable-line react-hooks/exhaustive-deps
  // Se cerro con la X, tocando afuera o con Escape: se deshace la entrada.
  useEffect(() => {
    if (open || !empujado.current) return;
    empujado.current = false;
    if (enEntradaPedido) navigate(-1);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // El catalogo se trae antes de que lo pidan (ver precargaCatalogo.js).
  useEffect(() => precargarCatalogoCuandoConvenga(), []);

  // Al cambiar de pagina con un link, arriba de todo ANTES de pintar: si no,
  // por un cuadro se veia la pagina nueva parada a la altura de la vieja (en
  // el catalogo, el pie con el aviso). "Atras" (POP) y los links a una
  // seccion (#como) se manejan aparte.
  const primera = useRef(true);
  useAntesDePintar(() => {
    if (primera.current) { primera.current = false; return; }
    if (tipoNavegacion !== 'POP' && !hash) window.scrollTo(0, 0);
  }, [pathname]);

  // Scroll suave con la ruedita, solo en escritorio y despues de cargar.
  useEffect(() => montarScrollSuave(), []);

  // Los links a una seccion de la portada (#como, /#como): con la portada en
  // pantalla, se va con irASeccion (medido bien, debajo de la barra). Si se
  // llega desde otra pagina con #como, se hace lo mismo al montar.
  useEffect(() => {
    const alTocar = (e) => {
      const a = e.target.closest?.('a[href*="#"]');
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      const url = new URL(a.href, location.href);
      if (url.pathname !== location.pathname || !url.hash) return;
      if (irASeccion(decodeURIComponent(url.hash.slice(1)))) {
        e.preventDefault();
        history.replaceState(history.state, '', url.hash);
      }
    };
    document.addEventListener('click', alTocar);
    if (location.hash) {
      const id = decodeURIComponent(location.hash.slice(1));
      setTimeout(() => irASeccion(id, { suave: false }), 350);
    }
    return () => document.removeEventListener('click', alTocar);
  }, [pathname]);

  // Apenas se abre una vez, el cajón queda montado para siempre: necesita seguir
  // vivo después de cerrarse para animar la salida.
  useEffect(() => { if (open) setPedidoUsado(true); }, [open]);

  // Y se trae el código del cajón en el primer rato libre, sin esperar a que lo
  // abran: así el primer toque no tiene espera en una conexión lenta. Es un
  // chunk de 2,5 kB y para cuando corre esto la primera pantalla ya está.
  // Rediseño D: la barra queda fija al bajar y toma la luz de lo que tiene
  // debajo: 'hero' (velo sobre la escena), 'dia' (papel) o 'noche' (vino
  // hondo). Se mira el elemento que esta justo abajo de la barra en cada
  // cuadro de scroll (elementsFromPoint, una llamada por cuadro): con
  // IntersectionObserver no alcanzaba, porque el catalogo arma sus secciones
  // despues de que llegan los datos.
  const [luz, setLuz] = useState(pathname === '/' ? 'hero' : 'noche');
  useEffect(() => {
    const medir = () => {
      const barra = document.querySelector('.tienda > header');
      const y = (barra?.offsetHeight || 74) + 2;
      const debajo = document.elementsFromPoint(Math.min(24, innerWidth - 1), y).find((e) => !e.closest('.tienda > header'));
      // Los panos de "Los mas pedidos" tienen pointer-events none: elementsFromPoint
      // no los ve, asi que con la banda inmersa la luz es noche (vino que cubre todo).
      const nueva = !debajo || document.querySelector('[data-inmerso]') ? 'noche'
        : debajo.closest('#inicio-hero') && !debajo.closest('[data-hero=cinta]') ? 'hero'
        : debajo.closest('.dia') ? 'dia'
        : 'noche';
      setLuz((vieja) => (vieja === nueva ? vieja : nueva));
    };
    // Un solo oyente de scroll para toda la tienda (lib/alScroll.js).
    const soltar = alScroll(medir);
    const t = setTimeout(medirDeNuevo, 600); // el catalogo llega un rato despues
    return () => { soltar(); clearTimeout(t); };
  }, [pathname]);

  useEffect(() => {
    if (!('requestIdleCallback' in window)) return;
    const id = requestIdleCallback(() => { import('./CartSheet'); }, { timeout: 4000 });
    return () => cancelIdleCallback(id);
  }, []);

  // La marca de la barra, ya en la portada: sube al principio (Sebas, 23/10:
  // al bajar, tocarla no hacia nada, porque el link iba a la misma pagina).
  function alTocarMarca(e) {
    if (pathname !== '/' || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (location.hash) history.replaceState(history.state, '', location.pathname + location.search);
    const brusco = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: brusco ? 'auto' : 'smooth' });
  }

  // "Catálogo" estando ya en el catálogo: el reseteo de arriba mira solo el
  // pathname, y de /catalogo?ver=36 a /catalogo no cambia. La lista volvía a
  // 12, la página se achicaba y el scroll quedaba recortado en el pie (Sebas,
  // 31/10). Acá se vuelve arriba a mano.
  function alTocarCatalogo(e) {
    if (pathname !== '/catalogo' || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    navigate('/catalogo');
    window.scrollTo(0, 0);
  }

  return (
    <div className="tienda" ref={raiz}>
      <div className="tfondo" aria-hidden="true" />

      <header className={`${s.bar} ${luz === 'dia' ? 'dia' : ''}`} data-luz={luz} inert={inert}>
        <Link to="/" className={s.marca} onClick={alTocarMarca}>
          <span className={s.marcaTexto}>
            {MARCA.nombre}{' '}<span className={s.marcaWolf}>{MARCA.complemento}</span>
          </span>
        </Link>
        <nav className={s.nav} aria-label={CABECERA.etiqueta}>
          <Link
            to="/catalogo"
            className={s.link}
            onClick={alTocarCatalogo}
            aria-current={pathname === '/catalogo' ? 'page' : undefined}
          >
            <span className={s.linkTexto}>{CABECERA.catalogo}</span>
          </Link>
          <a href="/#como" className={s.link}><span className={s.linkTexto}>{CABECERA.como}</span></a>
        </nav>
        <button
          ref={botonPedido}
          className={`${s.carrito} tglass-clear`}
          onClick={() => setOpen(true)}
          aria-label={`${CABECERA.verPedido} (${count} ${count === 1 ? 'ítem' : 'ítems'})`}
        >
          {/* El carrito da un latido al sumar (la key reinicia la animacion). */}
          <span key={`c${ultimo?.t ?? 0}`} className={`${s.icoCarrito} ${ultimo ? s.latido : ''}`}><Bolsa size={22} /></span>
          {/* La key cambia en cada agregado: reinicia el pulso del numero. */}
          {count > 0 && (
            <span key={ultimo?.t ?? 0} className={`${s.badge} ${ultimo ? s.pulso : ''} tnum`}>{count}</span>
          )}
        </button>
      </header>

      <main id="inicio" inert={inert}>{children}</main>

      <footer className={s.footer} inert={inert}>
        {/* Rediseño D (plano 7): de noche otra vez, con la marca de vuelta a
            todo el ancho, como el cierre de los créditos. */}
        <p className={`tw ${s.firma}`} aria-hidden="true">
          {MARCA.nombre} <span className={s.firmaWolf}>{MARCA.complemento}</span>
        </p>
        <nav className={`tw ${s.fenlaces}`} aria-label={PIE.etiqueta}>
          {settings?.link_catalogo && (
            <a href={settings.link_catalogo} target="_blank" rel="noopener noreferrer" className={s.flink}>
              <Documento size={18} /><span className={s.flinkTexto}>{PIE.catalogoPdf}</span>
            </a>
          )}
          {settings?.whatsapp_owner && (
            <a href={linkWhatsApp(settings.whatsapp_owner, COMO_FUNCIONA.mensajeConsulta)} target="_blank" rel="noopener noreferrer" className={s.flink}>
              <WhatsApp size={18} /><span className={s.flinkTexto}>{PIE.whatsapp}</span>
            </a>
          )}
          {settings?.instagram_user && (
            <a href={`https://instagram.com/${settings.instagram_user}`} target="_blank" rel="noopener noreferrer" className={s.flink}>
              <Instagram size={18} /><span className={s.flinkTexto}>{PIE.instagram}</span>
            </a>
          )}
        </nav>

        <div className={`tw ${s.legal}`}>
          <h4 className={s.ftitulo}>{LEGAL.titulo}</h4>
          {LEGAL.parrafos.map((parrafo) => (
            <p key={parrafo.slice(0, 24)}>{parrafo}</p>
          ))}
        </div>

        <p className={`tw ${s.copy}`}>
          © {new Date().getFullYear()} {MARCA.nombre} {MARCA.complemento}
          <span className={s.punto} aria-hidden="true"> · </span>
          {settings?.aclaracion_pedido || PIE.aclaracionPorDefecto}
        </p>
      </footer>

      <VolverArriba oculto={hayDialogo || avisoVisible} />
      <AvisoAgregado onVisible={setAvisoVisible} />

      {capa}
      {ficha}
      {hoja}

      {pedidoUsado && (
        <Suspense fallback={null}>
          <CartSheet settings={settings} onVerPromo={onVerPromo} refRespaldo={botonPedido} />
        </Suspense>
      )}
    </div>
  );
}
