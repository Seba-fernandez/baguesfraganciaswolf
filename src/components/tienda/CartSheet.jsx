import { useState } from 'react';
import { useCart } from '../../contexts/CartContext';
import useCheckoutWeb from '../../hooks/useCheckoutWeb';
import { pesos } from '../../lib/format';
import { linkWhatsApp, mensajePedidoCliente, normalizarTelefono } from '../../lib/whatsapp';
import ProductThumb from './ProductThumb';
import s from './CartSheet.module.css';

export default function CartSheet({ settings }) {
  const { items, removeItem, setCantidad, clear, total, open, setOpen } = useCart();
  const { enviarPedido, loading, error } = useCheckoutWeb();
  const [step, setStep] = useState('carrito'); // carrito | checkout | listo
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [formErr, setFormErr] = useState(null);
  const [numeroPedido, setNumeroPedido] = useState(null);

  if (!open) return null;

  function cerrar() {
    setOpen(false);
    setTimeout(() => { setStep('carrito'); setFormErr(null); }, 300);
  }

  async function confirmar() {
    setFormErr(null);
    if (!nombre.trim()) { setFormErr('Poné tu nombre completo'); return; }
    if (normalizarTelefono(telefono).length < 8) { setFormErr('Poné un WhatsApp válido'); return; }

    const { data, error: err } = await enviarPedido({ nombre, telefono, items });
    if (err) { setFormErr(error || 'No se pudo enviar. Probá de nuevo.'); return; }

    setNumeroPedido(data?.numero ?? null);
    const msg = mensajePedidoCliente({ nombre, numero: data?.numero, items });
    if (settings?.whatsapp_owner) {
      window.open(linkWhatsApp(settings.whatsapp_owner, msg), '_blank', 'noopener');
    }
    clear();
    setStep('listo');
  }

  return (
    <>
      <div className={s.overlay} onClick={cerrar} />
      <div className={s.sheet} role="dialog" aria-modal="true" aria-label="Carrito">
        {step === 'carrito' && (
          <>
            <div className={s.head}>
              <h2>Tu pedido</h2>
              <button className={s.close} onClick={cerrar} aria-label="Cerrar">✕</button>
            </div>

            {items.length === 0 ? (
              <p className={s.empty}>Todavía no agregaste ningún perfume.</p>
            ) : (
              <>
                <div className={s.list}>
                  {items.map((it) => (
                    <div key={it.key} className={s.item}>
                      <div className={s.thumb}><ProductThumb src={it.imagen_url} alt={it.nombre} /></div>
                      <div>
                        <div className={s.name}>{it.nombre}</div>
                        <div className={s.meta}>{it.ml ? `${it.ml}ml` : ''}</div>
                        <div className={s.stepper}>
                          <button type="button" onClick={() => setCantidad(it.key, it.cantidad - 1)} aria-label="Restar">−</button>
                          <span>{it.cantidad}</span>
                          <button type="button" onClick={() => setCantidad(it.key, it.cantidad + 1)} aria-label="Sumar">+</button>
                        </div>
                      </div>
                      <div>
                        <div className={s.price}>{pesos(it.precio * it.cantidad)}</div>
                        <button className={s.remove} onClick={() => removeItem(it.key)}>Quitar</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={s.totalRow}>
                  <span className="tmono">Total estimado</span>
                  <b>{pesos(total)}</b>
                </div>

                <button type="button" className="tbtn wide" style={{ marginTop: 20 }} onClick={() => setStep('checkout')}>
                  Hacer pedido <span className="circ">↗</span>
                </button>
              </>
            )}
          </>
        )}

        {step === 'checkout' && (
          <>
            <button className={s.back} onClick={() => setStep('carrito')}>← Volver al pedido</button>
            <div className={s.head}>
              <h2>Tus datos</h2>
              <button className={s.close} onClick={cerrar} aria-label="Cerrar">✕</button>
            </div>
            <p className="tmono">Con esto guardo tu pedido y te abro WhatsApp para confirmar.</p>

            <div className={s.field}>
              <label className={s.label} htmlFor="co-nombre">Nombre completo</label>
              <input id="co-nombre" className={s.input} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Cómo te llamamos" autoComplete="name" />
            </div>
            <div className={s.field}>
              <label className={s.label} htmlFor="co-tel">Tu WhatsApp</label>
              <input id="co-tel" className={s.input} inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="351 555 1234" autoComplete="tel" />
            </div>

            {formErr && <p className={s.err}>{formErr}</p>}

            <button type="button" className="tbtn wide" style={{ marginTop: 20 }} onClick={confirmar} disabled={loading}>
              {loading ? 'Enviando…' : 'Confirmar pedido'} <span className="circ">↗</span>
            </button>
          </>
        )}

        {step === 'listo' && (
          <div className={s.confirm}>
            <div className={s.big}>✓</div>
            <h2>{numeroPedido ? `Pedido #${numeroPedido} recibido` : 'Pedido recibido'}</h2>
            <p className="tmono" style={{ marginTop: 10 }}>
              Te abrimos WhatsApp para confirmar. Si no se abrió, escribinos directo — ya tenemos tu pedido guardado.
            </p>
            <button type="button" className="tbtn wide" style={{ marginTop: 22 }} onClick={cerrar}>Listo</button>
          </div>
        )}
      </div>
    </>
  );
}
