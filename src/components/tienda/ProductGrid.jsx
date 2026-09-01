import { useMemo, useState } from 'react';
import { GENEROS } from '../../data/constants';
import ProductCard from './ProductCard';
import useReveal from '../../hooks/useReveal';
import s from './ProductGrid.module.css';

const FILTROS = [
  { id: 'todos', label: 'Todos' },
  ...Object.values(GENEROS).map((g) => ({ id: g.id, label: g.label })),
];

// Variedad controlada: cream domina, wine y pine aparecen de vez en cuando.
function acentoDe(i) {
  if (i % 7 === 3) return 'pine';
  if (i % 5 === 1) return 'wine';
  return 'cream';
}

export default function ProductGrid({ products, onOpen }) {
  const [filtro, setFiltro] = useState('todos');
  const ref = useReveal();

  const visibles = useMemo(() => {
    const activos = products.filter((p) => p.activo);
    if (filtro === 'todos') return activos;
    return activos.filter((p) => p.genero === filtro);
  }, [products, filtro]);

  return (
    <section className={`tw ${s.section}`} id="catalogo" ref={ref}>
      <div className={s.head}>
        <h2>Encontrá el tuyo</h2>
        <span className="tmono">{visibles.length} {visibles.length === 1 ? 'perfume' : 'perfumes'}</span>
      </div>

      <div className={`${s.chips} tscroll-x`} role="group" aria-label="Filtrar por género">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            className={`${s.chip} ${filtro === f.id ? s.chipOn : ''}`}
            onClick={() => setFiltro(f.id)}
            aria-pressed={filtro === f.id}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <p className={s.empty}>No hay perfumes en esta categoría por ahora.</p>
      ) : (
        <div className={s.grid}>
          {visibles.map((p, i) => (
            <div key={p.id} className="treveal" style={{ transitionDelay: `${Math.min(i, 8) * 40}ms` }}>
              <ProductCard producto={p} onOpen={onOpen} accent={acentoDe(i)} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
