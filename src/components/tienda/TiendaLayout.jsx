import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { montarVidrioLiquido } from '../../lib/vidrioLiquido';
import { useCart } from '../../contexts/CartContext';
// El cajón del pedido, igual que la ficha: se carga la primera vez que se abre.
// Mientras tanto no existe ni su JavaScript ni su CSS, y no se ve nunca al
// entrar. Una vez cargado se queda montado, así la animación de cierre corre.
const CartSheet = lazy(() => import('./CartSheet'));
import VolverArriba from './VolverArriba';
import { MARCA, CABECERA, LEGAL, PIE } from '../../config/contenido';
import '../../styles/tienda.css';
import s from './TiendaLayout.module.css';

const CartIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);

export default function TiendaLayout({ children, settings, onVerPromo }) {
  const { count, open, setOpen } = useCart();
  const raiz = useRef(null);
  const [pedidoUsado, setPedidoUsado] = useState(false);

  // Lente de vidrio liquido en el canto de cada superficie de vidrio (solo
  // Chromium de escritorio; ver src/lib/vidrioLiquido.js).
  useEffect(() => montarVidrioLiquido(raiz.current), []);

  // Apenas se abre una vez, el cajón queda montado para siempre: necesita seguir
  // vivo después de cerrarse para animar la salida.
  useEffect(() => { if (open) setPedidoUsado(true); }, [open]);

  // Y se trae el código del cajón en el primer rato libre, sin esperar a que lo
  // abran: así el primer toque no tiene espera en una conexión lenta. Es un
  // chunk de 2,5 kB y para cuando corre esto la primera pantalla ya está.
  useEffect(() => {
    if (!('requestIdleCallback' in window)) return;
    const id = requestIdleCallback(() => { import('./CartSheet'); }, { timeout: 4000 });
    return () => cancelIdleCallback(id);
  }, []);

  return (
    <div className="tienda" ref={raiz}>
      <div className="tfondo" aria-hidden="true" />

      <header className={s.bar}>
        <Link to="/" className={s.marca}>
          {MARCA.nombre} <span className={s.marcaWolf}>{MARCA.complemento}</span>
        </Link>
        <nav className={s.nav}>
          <Link to="/catalogo">{CABECERA.catalogo}</Link>
          <a href="/#como">{CABECERA.como}</a>
        </nav>
        <button
          className={`${s.carrito} tglass-clear`}
          onClick={() => setOpen(true)}
          aria-label={`${CABECERA.verPedido} (${count} ${count === 1 ? 'ítem' : 'ítems'})`}
        >
          <CartIcon />
          {count > 0 && <span className={`${s.badge} tnum`}>{count}</span>}
        </button>
      </header>

      <main id="inicio">{children}</main>

      <footer className={s.footer}>
        <div className={`tw ${s.fcols}`}>
          <div className={s.fcol}>
            <h4 className="tlabel">{PIE.tienda}</h4>
            <Link to="/catalogo">{CABECERA.catalogo}</Link>
            <a href="/#como">{CABECERA.como}</a>
            {settings?.link_catalogo && (
              <a href={settings.link_catalogo} target="_blank" rel="noopener">{PIE.catalogoPdf}</a>
            )}
          </div>
          <div className={s.fcol}>
            <h4 className="tlabel">{PIE.contacto}</h4>
            {settings?.whatsapp_owner && (
              <a href={`https://wa.me/${settings.whatsapp_owner}`} target="_blank" rel="noopener">WhatsApp</a>
            )}
            {settings?.instagram_user && (
              <a href={`https://instagram.com/${settings.instagram_user}`} target="_blank" rel="noopener">Instagram</a>
            )}
          </div>
          <div className={s.fcol}>
            <h4 className="tlabel">{PIE.gestion}</h4>
            <a href="/panel">{PIE.panel}</a>
          </div>
          <p className={s.copy}>
            © {new Date().getFullYear()} {MARCA.nombre} {MARCA.complemento}<br />
            {settings?.aclaracion_pedido || PIE.aclaracionPorDefecto}
          </p>
        </div>

        <div className={`tw ${s.legal}`}>
          <h4 className="tlabel">{LEGAL.titulo}</h4>
          {LEGAL.parrafos.map((parrafo) => (
            <p key={parrafo.slice(0, 24)}>{parrafo}</p>
          ))}
        </div>
      </footer>

      <VolverArriba oculto={open} />

      {pedidoUsado && (
        <Suspense fallback={null}>
          <CartSheet settings={settings} onVerPromo={onVerPromo} />
        </Suspense>
      )}
    </div>
  );
}
