import { useState } from 'react';
import Toggle from '../ui/Toggle';
import s from './panel.module.css';

/**
 * Carga rápida del catálogo mensual: precio y disponibilidad de cada
 * presentación, editable en línea, sin abrir el sheet de cada producto.
 * Pensada para cuando solo cambian precios/disponibilidad (el caso común).
 */
export default function ProductosTabla({ products, onUpdate, onOpen }) {
  const [editValues, setEditValues] = useState({}); // `${productId}:${ml}` -> string en edición

  const keyOf = (id, ml) => `${id}:${ml}`;

  function guardarPrecio(producto, ml) {
    const k = keyOf(producto.id, ml);
    const raw = editValues[k];
    if (raw === undefined) return;
    const nuevoPrecio = Number(raw.replace(/\D/g, '')) || 0;
    const presentaciones = producto.presentaciones.map((p) =>
      p.ml === ml ? { ...p, precio: nuevoPrecio } : p
    );
    onUpdate(producto.id, { presentaciones });
    setEditValues((v) => { const c = { ...v }; delete c[k]; return c; });
  }

  function toggleDisponible(producto, ml) {
    const presentaciones = producto.presentaciones.map((p) =>
      p.ml === ml ? { ...p, activo: p.activo === false } : p
    );
    onUpdate(producto.id, { presentaciones });
  }

  return (
    <div className={s.tableWrap}>
      <table className={s.table}>
        <thead>
          <tr>
            <th>Perfume</th>
            <th>Presentaciones · precio</th>
            <th>En catálogo</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} style={{ opacity: p.activo ? 1 : 0.5 }}>
              <td><button type="button" className={s.tableName} onClick={() => onOpen(p)}>{p.nombre}</button></td>
              <td>
                <div className={s.tablePresCell}>
                  {(p.presentaciones || []).map((pres) => {
                    const k = keyOf(p.id, pres.ml);
                    const valor = editValues[k] ?? String(pres.precio ?? '');
                    return (
                      <div key={pres.ml} className={s.tablePresOne} style={{ opacity: pres.activo === false ? 0.45 : 1 }}>
                        <span className={s.tableMl}>{pres.ml}ml</span>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <input
                            className={s.tablePriceInput}
                            inputMode="numeric"
                            value={valor}
                            onChange={(e) => setEditValues((v) => ({ ...v, [k]: e.target.value.replace(/\D/g, '') }))}
                            onBlur={() => guardarPrecio(p, pres.ml)}
                            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                          />
                          <button
                            type="button"
                            title={pres.activo === false ? 'Reactivar tamaño' : 'Pausar tamaño'}
                            onClick={() => toggleDisponible(p, pres.ml)}
                            style={{ fontSize: 14, lineHeight: 1, padding: 4 }}
                          >
                            {pres.activo === false ? '⏸' : '✓'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {!p.presentaciones?.length && <span className={s.cardMeta}>Sin presentaciones</span>}
                </div>
              </td>
              <td>
                <Toggle
                  checked={p.activo}
                  onChange={(v) => onUpdate(p.id, { activo: v })}
                  label={`${p.activo ? 'Pausar' : 'Activar'} ${p.nombre}`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
