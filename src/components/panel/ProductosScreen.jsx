import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import useProducts from '../../hooks/useProducts';
import { pesos } from '../../lib/format';
import Toggle from '../ui/Toggle';
import FAB from '../ui/FAB';
import { IconBottle } from '../ui/Icon';
import { fotoDe, fotoChica } from '../../lib/fotos';
import ProductoEditor from './ProductoEditor';
import ProductosTabla from './ProductosTabla';
import PreciosMinis from './PreciosMinis';
import { filtrarCatalogo, LETRAS } from '../../lib/buscarPanel.js';
import s from './panel.module.css';
import p from './ProductosScreen.module.css';

const rango = (presentaciones = []) => {
  const precios = presentaciones.map((x) => Number(x.precio) || 0).filter(Boolean);
  if (!precios.length) return 'Sin precio';
  const min = Math.min(...precios);
  const max = Math.max(...precios);
  return min === max ? pesos(min) : `${pesos(min)} a ${pesos(max)}`;
};

const GridIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" /></svg>
);
const TableIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
);

export default function ProductosScreen() {
  const { products, loading, reload, createProduct, updateProduct, toggleActivo, deleteProduct } = useProducts();
  const [minis, setMinis] = useState(false);
  const [filtro, setFiltro] = useState('todos');
  const [editando, setEditando] = useState(null); // producto | 'nuevo' | null
  const [vista, setVista] = useState('tarjetas'); // tarjetas | tabla
  const [texto, setTexto] = useState('');
  const [letra, setLetra] = useState(null); // 'A'..'Z' | '#' | null

  const porEstado = useMemo(() => {
    if (filtro === 'activos') return products.filter((x) => x.activo);
    if (filtro === 'pausados') return products.filter((x) => !x.activo);
    return products;
  }, [products, filtro]);
  // Buscador y abecedario: ver lib/buscarPanel.js (nombre, caja o codigo, sin tildes).
  const { lista: visibles, letras } = useMemo(
    () => filtrarCatalogo(porEstado, { texto, letra }),
    [porEstado, texto, letra],
  );
  const filtrando = Boolean(texto.trim() || letra);

  const activos = products.filter((x) => x.activo).length;

  if (loading) return <div className={s.loading}>Cargando catálogo…</div>;

  return (
    <div className={s.screen}>
      <div className={s.head}>
        <h2 className={s.title}>Catálogo</h2>
        <span className={s.subtitle}>{activos} activos · {products.length} en total</span>
      </div>

      <div className={p.acciones}>
        <Link to="/panel/productos/ciclo" className={`${s.btn} ${s.btnGhost}`}>
          Cargar ciclo nuevo
        </Link>
        <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={() => setMinis(true)}>
          Precio de las minis
        </button>
      </div>

      <div className={p.buscador}>
        <input
          type="search" className={s.input} value={texto} onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar por nombre, caja o código" aria-label="Buscar perfume por nombre, caja o código"
          autoComplete="off" spellCheck={false} enterKeyHint="search"
        />
        {texto && (
          <button type="button" className={p.limpiar} onClick={() => setTexto('')} aria-label="Borrar la búsqueda">×</button>
        )}
      </div>

      <div className={p.letras} role="group" aria-label="Filtrar por letra">
        <button type="button" className={`${p.letra} ${p.letraTodas} ${!letra ? p.letraOn : ''}`} aria-pressed={!letra} onClick={() => setLetra(null)}>
          Todas
        </button>
        {LETRAS.map((l) => {
          const hay = letras.has(l);
          return (
            <button
              key={l} type="button" className={`${p.letra} ${letra === l ? p.letraOn : ''}`}
              aria-pressed={letra === l} disabled={!hay && letra !== l}
              aria-label={l === '#' ? 'Empiezan con número' : `Empiezan con ${l}`}
              onClick={() => setLetra(letra === l ? null : l)}
            >{l}</button>
          );
        })}
      </div>

      <div className={`${s.cardRow} ${p.filaFiltros}`}>
        <div className={s.chips}>
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

      {filtrando && visibles.length > 0 && (
        <p className={p.cuenta} aria-live="polite">{visibles.length === 1 ? '1 perfume' : `${visibles.length} perfumes`}</p>
      )}

      {visibles.length === 0 ? (
        <div className={s.empty} aria-live="polite">
          <span className={s.emptyIcon}><IconBottle size={24} /></span>
          {texto.trim()
            ? <>No hay ningún perfume con «{texto.trim()}»{letra ? ` que empiece con ${letra === '#' ? 'número' : letra}` : ''}{filtro !== 'todos' ? ` en ${filtro}` : ''}.</>
            : letra
              ? <>No hay perfumes que empiecen con {letra === '#' ? 'número' : letra}{filtro !== 'todos' ? ` en ${filtro}` : ''}.</>
              : 'Todavía no hay perfumes en esta vista. Tocá + para agregar.'}
          {filtrando && (
            <button type="button" className={`${s.btn} ${s.btnGhost}`} style={{ marginTop: 12 }} onClick={() => { setTexto(''); setLetra(null); }}>
              Ver todos
            </button>
          )}
        </div>
      ) : vista === 'tabla' ? (
        <ProductosTabla products={visibles} onUpdate={updateProduct} onOpen={setEditando} />
      ) : (
        <div className={p.grid}>
          {visibles.map((producto) => (
            <div key={producto.id} className={`${p.card} ${!producto.activo ? p.paused : ''}`}>
              <button type="button" className={p.thumbBtn} onClick={() => setEditando(producto)} aria-label={`Editar ${producto.nombre}`}>
                {(() => {
                  // La foto subida a mano gana; si no hay, la del catálogo (la misma que ve la clienta).
                  const src = producto.imagen_url || fotoChica(fotoDe(producto));
                  return src ? <img src={src} alt="" loading="lazy" decoding="async" /> : <IconBottle size={22} />;
                })()}
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

      {minis && <PreciosMinis products={products} onClose={() => setMinis(false)} onAplicado={reload} />}

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
