import { useCart } from '../../contexts/CartContext';
import CartSheet from './CartSheet';
import '../../styles/tienda.css';
import s from './TiendaLayout.module.css';

const CartIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);

export default function TiendaLayout({ children, settings }) {
  const { count, setOpen } = useCart();

  return (
    <div className="tienda">
      <header className={s.bar}>
        <a href="#inicio" className={s.logo}>W</a>
        <nav className={s.nav}>
          <a href="#catalogo">Catálogo</a>
          <a href="#contacto">Contacto</a>
        </nav>
        <span className={s.spacer} />
        <button
          className={s.cartBtn}
          onClick={() => setOpen(true)}
          aria-label={`Ver carrito (${count} ${count === 1 ? 'ítem' : 'ítems'})`}
        >
          <CartIcon />
          {count > 0 && <span className={s.badge}>{count}</span>}
        </button>
      </header>

      <main id="inicio">{children}</main>

      <footer className={s.footer}>
        <div className={`tw ${s.fcols}`}>
          <div>
            <h4 className="tmono up">Tienda</h4>
            <a href="#catalogo">Catálogo</a>
            <a href="#contacto">Cómo funciona</a>
          </div>
          <div>
            <h4 className="tmono up">Contacto</h4>
            {settings?.whatsapp_owner && (
              <a href={`https://wa.me/${settings.whatsapp_owner}`} target="_blank" rel="noopener">WhatsApp</a>
            )}
            {settings?.instagram_user && (
              <a href={`https://instagram.com/${settings.instagram_user}`} target="_blank" rel="noopener">Instagram</a>
            )}
          </div>
          <div className={`tmono ${s.copy}`}>
            © {new Date().getFullYear()} Bagues Grupo Wolf<br />
            {settings?.aclaracion_pedido || 'Venta particular · catálogo Bagués'}
          </div>
        </div>
        <div className="tw">
          <div className={s.wordmark}>grupo wolf<sup>®</sup></div>
        </div>
      </footer>

      <CartSheet settings={settings} />
    </div>
  );
}
