import { useState } from 'react';
import { useCart } from '../../contexts/CartContext';
import useCheckoutWeb from '../../hooks/useCheckoutWeb';
import { pesos } from '../../lib/format';
import { linkWhatsApp, mensajePedidoCliente, normalizarTelefono } from '../../lib/whatsapp';
import s from './CartSheet.module.css';

export default function CartSheet({ settings, onVerPromo }) {
  const { items, removeItem, setCantidad, clear, total, totalLista, ahorro, grupos, open, setOpen } = useCart();
  const { enviarPedido, loading, error } = useCheckoutWeb();
  const [paso, setPaso] = useState('carrito');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [formErr, setFormErr] = useState(null);
  const [numeroPedido, setNumeroPedido] = useState(null);

  if (!open) return null;

  function cerrar() {
    setOpen(false);
    setTimeout(() => { setPaso('carrito'); setFormErr(null); }, 300);
  }

  async function confirmar() {
    setFormErr(null);
    if (!nombre.trim()) { setFormErr('Poné tu nombre completo'); return; }
    if (normalizarTelefono(telefono).length < 8) { setFormErr('Poné un WhatsApp válido'); return; }

    const { data, error: err } = await enviarPedido({ nombre, telefono, items });
    if (err) { setFormErr(error || 'No se pudo enviar. Probá de nuevo.'); return; }

    setNumeroPedido(data?.numero ?? null);
    // El mensaje lleva el codigo de cada presentacion y el total YA con promo.
    const msg = mensajePedidoCliente({ nombre, numero: data?.numero, items, total });
    if (settings?.whatsapp_owner) {
      window.open(linkWhatsApp(settings.whatsapp_owner, msg), '_blank', 'noopener');
    }
    clear();
    setPaso('listo');
  }

  const faltantes = (grupos || []).filter((g) => g.faltaUno);

  return (
    <>
      <div className={s.overlay} onClick={cerrar} />
      <div className={s.sheet} role="dialog" aria-modal="true" aria-label="Tu pedido">
        {paso === 'carrito' && (
          <>
            <div className={s.head}>
              <h2>Tu pedido</h2>
              <button className={s.cerrar} onClick={cerrar} aria-label="Cerrar">✕</button>
            </div>

            {items.length === 0 ? (
              <div className={s.vacio}>
                <p className={s.vacioTitulo}>Todavía no agregaste nada.</p>
                <p className={s.vacioTexto}>Armá tu pedido desde el catálogo y te lo confirmo por WhatsApp.</p>
                <button type="button" className="tbtn ghost" onClick={cerrar}>Ver el catálogo</button>
              </div>
            ) : (
              <>
                <div className={s.lista}>
                  {items.map((it) => (
                    <div key={it.key} className={s.item}>
                      <div className={s.itemInfo}>
                        <p className={s.itemNombre}>{it.nombre}</p>
                        <p className={s.itemMeta}>
                          <span className="tnum">{it.ml} ml</span>
                          {it.nombre_proveedor ? ` · ${it.nombre_proveedor}` : ''}
                          {it.grupo_promo ? <span className={s.itemSello}>2x1</span> : null}
                        </p>
                        <div className={s.stepper}>
                          <button type="button" onClick={() => setCantidad(it.key, it.cantidad - 1)} aria-label="Restar">-</button>
                          <span className="tnum">{it.cantidad}</span>
                          <button type="button" onClick={() => setCantidad(it.key, it.cantidad + 1)} aria-label="Sumar">+</button>
                        </div>
                      </div>
                      <div className={s.itemDer}>
                        <span className={`${s.itemPrecio} tnum`}>{pesos(it.precio * it.cantidad)}</span>
                        <button className={s.quitar} onClick={() => removeItem(it.key)}>Quitar</button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* El detalle que mueve plata: con impares, sumar uno no cuesta nada. */}
                {faltantes.map((g) => (
                  <button
                    key={g.grupo}
                    type="button"
                    className={s.faltaUno}
                    onClick={() => { onVerPromo?.(g.grupo); cerrar(); }}
                  >
                    <span className={s.faltaTitulo}>Te falta uno</span>
                    <span className={s.faltaTexto}>
                      Agregá una fragancia más de esta promo y no pagás nada extra.
                    </span>
                  </button>
                ))}

                <div className={s.totales}>
                  {ahorro > 0 && (
                    <div className={s.filaTotal}>
                      <span className={s.totalLabel}>Precio de lista</span>
                      <span className={`${s.tachado} tnum`}>{pesos(totalLista)}</span>
                    </div>
                  )}
                  <div className={s.filaTotal}>
                    <span className={s.totalLabel}>Total estimado</span>
                    <b className={`${s.totalValor} tnum`}>{pesos(total)}</b>
                  </div>
                  {ahorro > 0 && (
                    <p className={`${s.ahorro} tnum`}>Ahorrás {pesos(ahorro)} con la promo del ciclo.</p>
                  )}
                </div>

                <button type="button" className="tbtn wide" onClick={() => setPaso('datos')}>
                  Hacer el pedido
                </button>
              </>
            )}
          </>
        )}

        {paso === 'datos' && (
          <>
            <button className={s.volver} onClick={() => setPaso('carrito')}>Volver al pedido</button>
            <div className={s.head}>
              <h2>Tus datos</h2>
              <button className={s.cerrar} onClick={cerrar} aria-label="Cerrar">✕</button>
            </div>
            <p className={s.ayuda}>Con esto guardo tu pedido y te abro WhatsApp para confirmar.</p>

            <div className={s.campo}>
              <label className="tlabel" htmlFor="co-nombre">Nombre completo</label>
              <input id="co-nombre" className={s.input} value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" />
            </div>
            <div className={s.campo}>
              <label className="tlabel" htmlFor="co-tel">Tu WhatsApp</label>
              <input id="co-tel" className={s.input} inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="351 555 1234" autoComplete="tel" />
            </div>

            {formErr && <p className={s.err}>{formErr}</p>}

            <button type="button" className="tbtn wide" onClick={confirmar} disabled={loading}>
              {loading ? 'Enviando…' : 'Confirmar pedido'}
            </button>
          </>
        )}

        {paso === 'listo' && (
          <div className={s.listo}>
            <h2>{numeroPedido ? `Pedido #${numeroPedido} recibido` : 'Pedido recibido'}</h2>
            <p className={s.ayuda}>
              Te abrimos WhatsApp para confirmar. Si no se abrió, escribinos directo: el pedido ya
              está guardado.
            </p>
            <button type="button" className="tbtn wide" onClick={cerrar}>Listo</button>
          </div>
        )}
      </div>
    </>
  );
}
