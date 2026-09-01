import { useMemo, useState } from 'react';
import useProducts from '../../hooks/useProducts';
import { pesos } from '../../lib/format';
import Toggle from '../ui/Toggle';
import FAB from '../ui/FAB';
import ProductoEditor from './ProductoEditor';
import ProductosTabla from './ProductosTabla';
import s from './panel.module.css';

const rango = (presentaciones = []) => {
  const precios = presentaciones.map((p) => Number(p.precio) || 0).filter(Boolean);
  if (!precios.length) return 'Sin precio';
  const min = Math.min(...precios);
  const max = Math.max(...precios);
  return min === max ? pesos(min) : `${pesos(min)} – ${pesos(max)}`;
};

export default function ProductosScreen() {
  const { products, loading, createProduct, updateProduct, toggleActivo, deleteProduct } = useProducts();
  const [filtro, setFiltro] = useState('todos');
  const [editando, setEditando] = useState(null); // producto | 'nuevo' | null
  const [vista, setVista] = useState('tarjetas'); // tarjetas | tabla

  const visibles = useMemo(() => {
    if (filtro === 'activos') return products.filter((p) => p.activo);
    if (filtro === 'pausados') return products.filter((p) => !p.activo);
    return products;
  }, [products, filtro]);

  const activos = products.filter((p) => p.activo).length;

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
            <button
              key={id}
              className={`${s.chip} ${filtro === id ? s.chipOn : ''}`}
              onClick={() => setFiltro(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className={s.chips}>
          {[['tarjetas', '▦ Tarjetas'], ['tabla', '☰ Tabla rápida']].map(([id, label]) => (
            <button
              key={id}
              className={`${s.chip} ${vista === id ? s.chipOn : ''}`}
              onClick={() => setVista(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {visibles.length === 0 ? (
        <div className={s.empty}>
          <span className={s.emptyIcon}>🧴</span>
          Todavía no hay perfumes en esta vista. Tocá + para agregar.
        </div>
      ) : vista === 'tabla' ? (
        <ProductosTabla products={visibles} onUpdate={updateProduct} onOpen={setEditando} />
      ) : (
        <div className={s.list}>
          {visibles.map((p) => (
            <div key={p.id} className={s.card} style={{ opacity: p.activo ? 1 : 0.55 }}>
              <div className={s.cardRow}>
                <button
                  type="button"
                  style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1, textAlign: 'left' }}
                  onClick={() => setEditando(p)}
                >
                  {p.imagen_url
                    ? <img src={p.imagen_url} alt="" style={{ width: 44, height: 54, objectFit: 'cover', borderRadius: 8 }} />
                    : <span style={{ width: 44, height: 54, borderRadius: 8, background: 'var(--glass-bg)', display: 'grid', placeItems: 'center' }}>🧴</span>}
                  <span>
                    <span className={s.cardName} style={{ display: 'block' }}>{p.nombre}</span>
                    <span className={s.cardMeta}>{rango(p.presentaciones)}{p.destacado ? ' · ★ destacado' : ''}</span>
                  </span>
                </button>
                <Toggle
                  checked={p.activo}
                  onChange={() => toggleActivo(p)}
                  label={`${p.activo ? 'Pausar' : 'Activar'} ${p.nombre}`}
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
