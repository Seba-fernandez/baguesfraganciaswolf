import { useMemo, useState } from 'react';
import { GENEROS } from '../../data/constants';
import { acentoPorFamilia } from '../../lib/producto';
import ProductCard from './ProductCard';
import useReveal from '../../hooks/useReveal';
import s from './ProductGrid.module.css';

const FILTROS = [
  { id: 'todos', label: 'Todos' },
  ...Object.values(GENEROS).map((g) => ({ id: g.id, label: g.label })),
];

export default function ProductGrid({ products, onOpen, abiertoId }) {
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
          {visibles.map((p, i) => {
            // Un solo card "bento" por vista: el primer destacado que aparece
            // en el orden natural se agranda, el resto queda parejo. Un solo
            // hero por grilla lee como intención editorial; medio catálogo
            // agrandado leería como una grilla rota.
            const esBento = p.destacado && !visibles.slice(0, i).some((o) => o.destacado);
            return (
              <div
                key={p.id}
                className={`treveal ${esBento ? s.featured : ''}`}
                style={{ transitionDelay: `${Math.min(i, 8) * 40}ms` }}
              >
                <ProductCard
                  producto={p}
                  onOpen={onOpen}
                  accent={acentoPorFamilia(p)}
                  featured={esBento}
                  vtName={p.id === abiertoId ? 'none' : `producto-media-${p.id}`}
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
