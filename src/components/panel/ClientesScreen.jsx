import { useMemo, useState } from 'react';
import useCustomers from '../../hooks/useCustomers';
import { ESTADOS_PEDIDO, PAGO } from '../../data/constants';
import { pesos, desdeAhora } from '../../lib/format';
import { linkWhatsApp } from '../../lib/whatsapp';
import Avatar from '../ui/Avatar';
import s from './panel.module.css';

export default function ClientesScreen() {
  const { customers, loading, updateCustomer } = useCustomers();
  const [q, setQ] = useState('');
  const [abrir, setAbrir] = useState(null);

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return customers;
    return customers.filter(
      (c) => c.nombre.toLowerCase().includes(t) || c.telefono.includes(t)
    );
  }, [customers, q]);

  if (loading) return <div className={s.loading}>Cargando clientes…</div>;

  return (
    <div className={s.screen}>
      <div className={s.head}>
        <h2 className={s.title}>Clientes</h2>
        <span className={s.subtitle}>{customers.length}</span>
      </div>

      <div className={s.search}>
        <input className={s.searchInput} placeholder="Buscar por nombre o teléfono" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {visibles.length === 0 ? (
        <div className={s.empty}>
          <span className={s.emptyIcon}>👤</span>
          {customers.length === 0 ? 'Los clientes se crean solos al cargar un pedido.' : 'Sin resultados.'}
        </div>
      ) : (
        <div className={s.list}>
          {visibles.map((c) => (
            <button key={c.id} className={s.card} onClick={() => setAbrir(c)}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <Avatar name={c.nombre} size={40} radius={12} />
                <span style={{ flex: 1 }}>
                  <span className={s.cardName} style={{ display: 'block' }}>{c.nombre}</span>
                  <span className={s.cardMeta}>
                    {c.totalPedidos} {c.totalPedidos === 1 ? 'pedido' : 'pedidos'}
                    {c.pedidos[0] ? ` · último ${desdeAhora(c.pedidos[0].created_at)}` : ''}
                  </span>
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {abrir && (
        <ClienteSheet
          cliente={customers.find((c) => c.id === abrir.id) || abrir}
          onClose={() => setAbrir(null)}
          onUpdate={updateCustomer}
        />
      )}
    </div>
  );
}

function ClienteSheet({ cliente, onClose, onUpdate }) {
  const [notas, setNotas] = useState(cliente.notas || '');

  return (
    <>
      <div className={s.overlay} onClick={onClose} />
      <div className={`${s.sheet} glass-strong`}>
        <span className={s.handle} />
        <h3 className={s.sheetTitle}>{cliente.nombre}</h3>
        <p className={s.subtitle}>{cliente.telefono}</p>

        <button
          className={`${s.btn} ${s.btnGhost}`}
          style={{ marginTop: 12 }}
          onClick={() => window.open(linkWhatsApp(cliente.telefono), '_blank', 'noopener')}
        >
          💬 Abrir chat de WhatsApp
        </button>

        <div className={s.field}>
          <label className={s.label}>Notas del cliente</label>
          <textarea
            className={s.textarea}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            onBlur={() => onUpdate(cliente.id, { notas })}
            placeholder="Preferencias, dirección, lo que quieras recordar"
          />
        </div>

        <div className={s.field}>
          <label className={s.label}>Historial de pedidos</label>
          <div className={s.list}>
            {(cliente.pedidos || []).map((p) => (
              <div key={p.id} className={s.card} style={{ padding: 12 }}>
                <div className={s.cardRow}>
                  <span className={s.cardName} style={{ fontSize: 14 }}>#{p.numero}</span>
                  <span className={s.cardMoney}>{pesos(p.total_estimado)}</span>
                </div>
                <span className={s.cardMeta} style={{ color: ESTADOS_PEDIDO[p.estado]?.color }}>
                  {ESTADOS_PEDIDO[p.estado]?.label} · {desdeAhora(p.created_at)}
                </span>
              </div>
            ))}
            {!cliente.pedidos?.length && <p className={s.cardMeta}>Sin pedidos.</p>}
          </div>
        </div>

        <button className={`${s.btn} ${s.btnPrimary} ${s.btnWide}`} onClick={onClose}>Listo</button>
      </div>
    </>
  );
}
