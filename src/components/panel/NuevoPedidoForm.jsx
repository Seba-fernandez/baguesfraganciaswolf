import { useState } from 'react';
import { ESTADOS_PEDIDO_LISTA } from '../../data/constants';
import { pesos } from '../../lib/format';
import s from './panel.module.css';

const itemVacio = { product_id: '', nombre_snapshot: '', ml: '', cantidad: 1, precio_unitario: '' };

export default function NuevoPedidoForm({ products, onClose, onCreate }) {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [estado, setEstado] = useState('nuevo');
  const [notas, setNotas] = useState('');
  const [items, setItems] = useState([{ ...itemVacio }]);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const activos = products.filter((p) => p.activo);

  const setItem = (i, patch) =>
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  const elegirProducto = (i, productId) => {
    const p = products.find((x) => x.id === productId);
    if (!p) { setItem(i, { product_id: '', nombre_snapshot: '' }); return; }
    const pres = (p.presentaciones || []).find((x) => x.activo !== false) || p.presentaciones?.[0];
    setItem(i, {
      product_id: p.id,
      nombre_snapshot: `${p.nombre} Bagués${pres?.ml ? ` ${pres.ml}ml` : ''}`,
      ml: pres?.ml || '',
      precio_unitario: pres?.precio || '',
    });
  };

  const elegirMl = (i, ml) => {
    const it = items[i];
    const p = products.find((x) => x.id === it.product_id);
    const pres = p?.presentaciones?.find((x) => String(x.ml) === String(ml));
    const base = p ? `${p.nombre} Bagués ${ml}ml` : it.nombre_snapshot;
    setItem(i, { ml, precio_unitario: pres?.precio ?? it.precio_unitario, nombre_snapshot: base });
  };

  const total = items.reduce(
    (acc, it) => acc + (Number(it.precio_unitario) || 0) * (Number(it.cantidad) || 1), 0
  );

  async function guardar() {
    setError(null);
    const limpios = items
      .filter((it) => it.nombre_snapshot.trim())
      .map((it) => ({
        product_id: it.product_id || null,
        nombre_snapshot: it.nombre_snapshot.trim(),
        ml: it.ml || null,
        cantidad: Number(it.cantidad) || 1,
        precio_unitario: Number(it.precio_unitario) || 0,
      }));
    if (!limpios.length) { setError('Agregá al menos un perfume'); return; }

    setGuardando(true);
    const res = await onCreate({
      cliente: { nombre, telefono },
      items: limpios,
      estado,
      notas_conversacion: notas,
    });
    setGuardando(false);
    if (res?.error) setError(res.error);
    else onClose();
  }

  return (
    <>
      <div className={s.overlay} onClick={onClose} />
      <div className={`${s.sheet} glass-strong`}>
        <span className={s.handle} />
        <h3 className={s.sheetTitle}>Nuevo pedido</h3>
        <p className={s.subtitle}>El que te llegó por WhatsApp o en persona.</p>

        <div className={s.row2}>
          <div className={s.field}>
            <label className={s.label}>Cliente</label>
            <input className={s.input} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre y apellido" />
          </div>
          <div className={s.field}>
            <label className={s.label}>WhatsApp</label>
            <input className={s.input} inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="351 555 1234" />
          </div>
        </div>

        <div className={s.field}>
          <label className={s.label}>Perfumes</label>
          {items.map((it, i) => (
            <div key={i} style={{ border: '1px solid var(--glass-border)', borderRadius: 12, padding: 10, marginBottom: 8 }}>
              <select
                className={s.select}
                value={it.product_id}
                onChange={(e) => elegirProducto(i, e.target.value)}
              >
                <option value="">— Elegir del catálogo o escribir a mano —</option>
                {activos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>

              <input
                className={s.input}
                style={{ marginTop: 8 }}
                value={it.nombre_snapshot}
                onChange={(e) => setItem(i, { nombre_snapshot: e.target.value })}
                placeholder="Nombre completo del perfume (como va en Bagués)"
              />

              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                {it.product_id ? (
                  <select className={s.select} style={{ width: 90 }} value={it.ml} onChange={(e) => elegirMl(i, e.target.value)}>
                    {(products.find((p) => p.id === it.product_id)?.presentaciones || []).map((pr) => (
                      <option key={pr.ml} value={pr.ml}>{pr.ml}ml</option>
                    ))}
                  </select>
                ) : (
                  <input className={s.input} style={{ width: 90 }} inputMode="numeric" value={it.ml}
                    onChange={(e) => setItem(i, { ml: e.target.value.replace(/\D/g, '') })} placeholder="ml" />
                )}
                <input className={s.input} style={{ width: 70 }} inputMode="numeric" value={it.cantidad}
                  onChange={(e) => setItem(i, { cantidad: e.target.value.replace(/\D/g, '') || 1 })} placeholder="cant" />
                <input className={s.input} style={{ flex: 1 }} inputMode="numeric" value={it.precio_unitario}
                  onChange={(e) => setItem(i, { precio_unitario: e.target.value.replace(/\D/g, '') })} placeholder="precio $" />
                {items.length > 1 && (
                  <button type="button" className={s.btnGhost} style={{ padding: '8px 10px', borderRadius: 10 }}
                    onClick={() => setItems((a) => a.filter((_, idx) => idx !== i))}>✕</button>
                )}
              </div>
            </div>
          ))}
          <button type="button" className={s.btnGhost} onClick={() => setItems((a) => [...a, { ...itemVacio }])}>
            + Otro perfume
          </button>
        </div>

        <div className={s.field}>
          <label className={s.label}>Estado inicial</label>
          <div className={s.options}>
            {ESTADOS_PEDIDO_LISTA.slice(0, 3).map((e) => (
              <button key={e.id} className={`${s.option} ${estado === e.id ? s.optionOn : ''}`}
                style={estado === e.id ? { background: e.bg, borderColor: e.rim, color: e.color } : undefined}
                onClick={() => setEstado(e.id)}>
                {e.label}
              </button>
            ))}
          </div>
        </div>

        <div className={s.field}>
          <label className={s.label}>Detalle de la conversación (opcional)</label>
          <textarea className={s.textarea} value={notas} onChange={(e) => setNotas(e.target.value)}
            placeholder="Ej: pagó seña de $5000, sabe que retira el viernes" />
        </div>

        <p className={s.cardMeta} style={{ textAlign: 'right', marginTop: 8 }}>
          Total estimado: <strong>{pesos(total)}</strong>
        </p>

        {error && <p className={s.err}>{error}</p>}

        <div className={s.btnRow}>
          <button className={`${s.btn} ${s.btnGhost}`} onClick={onClose}>Cancelar</button>
          <button className={`${s.btn} ${s.btnPrimary}`} onClick={guardar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar pedido'}
          </button>
        </div>
      </div>
    </>
  );
}
