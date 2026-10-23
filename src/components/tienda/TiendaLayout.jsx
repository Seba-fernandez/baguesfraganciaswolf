import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigationType } from 'react-router-dom';
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
import '../../styles/tienda.css';
import s from './TiendaLayout.module.css';

const CartIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);

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
  useEffect(() => montarVidrioLiquido(raiz.current), []);

  const { pathname, hash } = useLocation();
  const tipoNavegacion = useNavigationType();

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
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

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
      const nueva = !debajo ? 'noche'
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

  return (
    <div className="tienda" ref={raiz}>
      <div className="tfondo" aria-hidden="true" />

      <header className={`${s.bar} ${luz === 'dia' ? 'dia' : ''}`} data-luz={luz} inert={inert}>
        <Link to="/" className={s.marca}>
          {MARCA.nombre} <span className={s.marcaWolf}>{MARCA.complemento}</span>
        </Link>
        <nav className={s.nav}>
          <Link to="/catalogo">{CABECERA.catalogo}</Link>
          <a href="/#como">{CABECERA.como}</a>
        </nav>
        <button
          ref={botonPedido}
          className={`${s.carrito} tglass-clear`}
          onClick={() => setOpen(true)}
          aria-label={`${CABECERA.verPedido} (${count} ${count === 1 ? 'ítem' : 'ítems'})`}
        >
          <CartIcon />
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
        <div className={`tw ${s.fcols}`}>
          <div className={s.fcol}>
            <h4 className={s.ftitulo}>{PIE.tienda}</h4>
            <Link to="/catalogo">{CABECERA.catalogo}</Link>
            <a href="/#como">{CABECERA.como}</a>
            {settings?.link_catalogo && (
              <a href={settings.link_catalogo} target="_blank" rel="noopener">{PIE.catalogoPdf}</a>
            )}
          </div>
          <div className={s.fcol}>
            <h4 className={s.ftitulo}>{PIE.contacto}</h4>
            {settings?.whatsapp_owner && (
              <a href={linkWhatsApp(settings.whatsapp_owner, COMO_FUNCIONA.mensajeConsulta)} target="_blank" rel="noopener">WhatsApp</a>
            )}
            {settings?.instagram_user && (
              <a href={`https://instagram.com/${settings.instagram_user}`} target="_blank" rel="noopener">Instagram</a>
            )}
          </div>
          <p className={s.copy}>
            © {new Date().getFullYear()} {MARCA.nombre} {MARCA.complemento}<br />
            {settings?.aclaracion_pedido || PIE.aclaracionPorDefecto}
          </p>
        </div>

        <div className={`tw ${s.legal}`}>
          <h4 className={s.ftitulo}>{LEGAL.titulo}</h4>
          {LEGAL.parrafos.map((parrafo) => (
            <p key={parrafo.slice(0, 24)}>{parrafo}</p>
          ))}
        </div>
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
