import { useEffect, useMemo, useState } from 'react';
import useOrders from '../../hooks/useOrders';
import useProducts from '../../hooks/useProducts';
import { ESTADOS_PEDIDO, ESTADOS_PEDIDO_LISTA, ESTADOS_ABIERTOS, PAGO } from '../../data/constants';
import { pesos, fechaCorta } from '../../lib/format';
import FAB from '../ui/FAB';
import { IconClipboard } from '../ui/Icon';
import PedidoSheet from './PedidoSheet';
import NuevoPedidoForm from './NuevoPedidoForm';
import s from './panel.module.css';

export default function PedidosScreen() {
  const { orders, loading, updateOrder, createOrderManual, deleteOrder } = useOrders();
  const { products } = useProducts();
  const [abrir, setAbrir] = useState(null);   // order | null
  const [nuevo, setNuevo] = useState(false);
  const [verCerrados, setVerCerrados] = useState(false);

  const columnas = useMemo(() => {
    const ids = verCerrados
      ? ESTADOS_PEDIDO_LISTA.map((e) => e.id)
      : ESTADOS_ABIERTOS;
    return ids
      .map((id) => ({ ...ESTADOS_PEDIDO[id], pedidos: orders.filter((o) => o.estado === id) }))
      .filter((c) => c.pedidos.length > 0 || ESTADOS_ABIERTOS.includes(c.id));
  }, [orders, verCerrados]);

  const abiertos = orders.filter((o) => ESTADOS_ABIERTOS.includes(o.estado)).length;
  const sinAbrir = orders.filter((o) => o.estado === 'nuevo').length;

  // Reemplaza al bot que avisaba por WhatsApp: ese mensaje era duplicado (el
  // pedido ya llega en la conversacion de la clienta) y encima disparaba antes
  // de que se escribieran los items. Aca useOrders ya escucha la tabla por
  // Realtime, asi que alcanza con reflejarlo en el titulo de la pestana: si el
  // panel esta abierto de fondo, el pedido nuevo se ve sin repetir nada.
  useEffect(() => {
    document.title = sinAbrir > 0
      ? `(${sinAbrir}) Pedidos nuevos · Bagues Grupo Wolf`
      : 'Bagues Grupo Wolf · Perfumes';
    return () => { document.title = 'Bagues Grupo Wolf · Perfumes'; };
  }, [sinAbrir]);

  if (loading) return <div className={s.loading}>Cargando pedidos…</div>;

  return (
    <div className={s.screen}>
      <div className={s.head}>
        <h2 className={s.title}>Pedidos</h2>
        <span className={s.subtitle}>{abiertos} abiertos · {orders.length} en total</span>
      </div>

      <div className={s.chips}>
        <button className={`${s.chip} ${!verCerrados ? s.chipOn : ''}`} onClick={() => setVerCerrados(false)}>Abiertos</button>
        <button className={`${s.chip} ${verCerrados ? s.chipOn : ''}`} onClick={() => setVerCerrados(true)}>Todos</button>
      </div>

      {orders.length === 0 ? (
        <div className={s.empty}>
          <span className={s.emptyIcon}><IconClipboard size={24} /></span>
          Todavía no cargaste pedidos. Tocá + para anotar el primero.
        </div>
      ) : (
        <div className={s.board}>
          {columnas.map((col) => (
            <div key={col.id} className={s.column}>
              <div className={s.columnHead}>
                <span className={s.columnDot} style={{ background: col.color, boxShadow: `0 0 8px ${col.color}` }} />
                <span className={s.columnLabel}>{col.label}</span>
                <span className={s.columnCount}>{col.pedidos.length}</span>
              </div>
              {col.pedidos.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-quaternary)', padding: '2px 4px 4px' }}>—</div>
              ) : (
                <div className={s.list}>
                  {col.pedidos.map((o) => (
                    <button key={o.id} className={s.card} onClick={() => setAbrir(o)}>
                      <div className={s.cardRow}>
                        <span className={s.cardName}>#{o.numero} · {o.customer?.nombre || 'Sin nombre'}</span>
                        <span className={s.cardMoney}>{pesos(o.total_estimado)}</span>
                      </div>
                      <div className={s.cardRow}>
                        <span className={s.cardMeta}>
                          {(o.items?.length || 0)} {o.items?.length === 1 ? 'ítem' : 'ítems'}
                          {o.canal === 'web' ? ' · web' : ''}
                        </span>
                        <span className={s.cardMeta} style={{ color: PAGO[o.pago]?.color }}>
                          {PAGO[o.pago]?.label}
                          {o.fecha_retiro_estimada ? ` · retira ${fechaCorta(o.fecha_retiro_estimada)}` : ''}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <FAB onClick={() => setNuevo(true)} ariaLabel="Nuevo pedido" fixed />

      {abrir && (
        <PedidoSheet
          pedido={orders.find((o) => o.id === abrir.id) || abrir}
          onClose={() => setAbrir(null)}
          onUpdate={updateOrder}
          onDelete={deleteOrder}
        />
      )}
      {nuevo && (
        <NuevoPedidoForm
          products={products}
          onClose={() => setNuevo(false)}
          onCreate={createOrderManual}
        />
      )}
    </div>
  );
}
