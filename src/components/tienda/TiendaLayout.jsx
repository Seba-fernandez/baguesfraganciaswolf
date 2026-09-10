import { useCart } from '../../contexts/CartContext';
import CartSheet from './CartSheet';
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

  return (
    <div className="tienda">
      <div className="tfondo" aria-hidden="true" />

      <header className={`${s.bar} tglass`}>
        <a href="#inicio" className={s.marca}>
          {MARCA.nombre} <span className={s.marcaWolf}>{MARCA.complemento}</span>
        </a>
        <nav className={s.nav}>
          <a href="#catalogo">{CABECERA.catalogo}</a>
          <a href="#como">{CABECERA.como}</a>
        </nav>
        <button
          className={s.carrito}
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
            <a href="#catalogo">{CABECERA.catalogo}</a>
            <a href="#como">{CABECERA.como}</a>
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

      <CartSheet settings={settings} onVerPromo={onVerPromo} />
    </div>
  );
}
