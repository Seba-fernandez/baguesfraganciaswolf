import { useMemo, useState } from 'react';
import useProducts from '../../hooks/useProducts';
import { pesos } from '../../lib/format';
import Toggle from '../ui/Toggle';
import FAB from '../ui/FAB';
import { IconBottle } from '../ui/Icon';
import ProductoEditor from './ProductoEditor';
import ProductosTabla from './ProductosTabla';
import s from './panel.module.css';
import p from './ProductosScreen.module.css';

const rango = (presentaciones = []) => {
  const precios = presentaciones.map((x) => Number(x.precio) || 0).filter(Boolean);
  if (!precios.length) return 'Sin precio';
  const min = Math.min(...precios);
  const max = Math.max(...precios);
  return min === max ? pesos(min) : `${pesos(min)} – ${pesos(max)}`;
};

const GridIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" /></svg>
);
const TableIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
);

export default function ProductosScreen() {
  const { products, loading, createProduct, updateProduct, toggleActivo, deleteProduct } = useProducts();
  const [filtro, setFiltro] = useState('todos');
  const [editando, setEditando] = useState(null); // producto | 'nuevo' | null
  const [vista, setVista] = useState('tarjetas'); // tarjetas | tabla

  const visibles = useMemo(() => {
    if (filtro === 'activos') return products.filter((x) => x.activo);
    if (filtro === 'pausados') return products.filter((x) => !x.activo);
    return products;
  }, [products, filtro]);

  const activos = products.filter((x) => x.activo).length;

  if (loading) return <div className={s.loading}>Cargando catálogo…</div>;

  return (
    <div className={s.screen}>
      <div className={s.head}>
        <h2 className={s.title}>Catálogo</h2>
        <span className={s.subtitle}>{activos} activos · {products.length} en total</span>
      </div>

      <div className={s.cardRow}>
        <div className={s.chips} style={{ flex: 1 }}>
          {[['todos', 'Todos'], ['activos', 'Activos'], ['pausados', 'Pausados']].map(([id, label]) => (
            <button key={id} className={`${s.chip} ${filtro === id ? s.chipOn : ''}`} onClick={() => setFiltro(id)}>
              {label}
            </button>
          ))}
        </div>
        <div className={`${s.chips} ${p.viewToggle}`}>
          <button className={`${s.chip} ${vista === 'tarjetas' ? s.chipOn : ''}`} onClick={() => setVista('tarjetas')} aria-label="Vista tarjetas" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <GridIcon /> Tarjetas
          </button>
          <button className={`${s.chip} ${vista === 'tabla' ? s.chipOn : ''}`} onClick={() => setVista('tabla')} aria-label="Vista tabla rápida" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <TableIcon /> Tabla rápida
          </button>
        </div>
      </div>

      {visibles.length === 0 ? (
        <div className={s.empty}>
          <span className={s.emptyIcon}><IconBottle size={24} /></span>
          Todavía no hay perfumes en esta vista. Tocá + para agregar.
        </div>
      ) : vista === 'tabla' ? (
        <ProductosTabla products={visibles} onUpdate={updateProduct} onOpen={setEditando} />
      ) : (
        <div className={p.grid}>
          {visibles.map((producto) => (
            <div key={producto.id} className={`${p.card} ${!producto.activo ? p.paused : ''}`}>
              <button type="button" className={p.thumbBtn} onClick={() => setEditando(producto)} aria-label={`Editar ${producto.nombre}`}>
                {producto.imagen_url ? <img src={producto.imagen_url} alt="" /> : <IconBottle size={22} />}
              </button>
              <button type="button" className={p.body} onClick={() => setEditando(producto)}>
                <span className={p.name}>{producto.nombre}</span>
                <span className={p.meta}>
                  {rango(producto.presentaciones)}
                  {producto.destacado && <span className={p.star}>★ destacado</span>}
                </span>
              </button>
              <div className={p.right}>
                <Toggle
                  checked={producto.activo}
                  onChange={() => toggleActivo(producto)}
                  label={`${producto.activo ? 'Pausar' : 'Activar'} ${producto.nombre}`}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <FAB onClick={() => setEditando('nuevo')} ariaLabel="Agregar perfume" fixed />

      {editando && (
        <ProductoEditor
          producto={editando === 'nuevo' ? null : editando}
          onClose={() => setEditando(null)}
          onCreate={createProduct}
          onUpdate={updateProduct}
          onDelete={deleteProduct}
        />
      )}
    </div>
  );
}
