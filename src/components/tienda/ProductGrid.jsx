import { useMemo, useState } from 'react';
import { GENEROS } from '../../data/constants';
import { esPublicable, gruposPromoDe } from '../../lib/producto';
import ProductCard from './ProductCard';
import s from './ProductGrid.module.css';

const GENERO_FILTROS = [
  { id: 'todos', label: 'Todos' },
  ...Object.values(GENEROS).map((g) => ({ id: g.id, label: g.label })),
];

function normalizar(t) {
  return String(t || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

export default function ProductGrid({ products, onOpen, abiertoId, promos = {}, promoActiva, setPromoActiva }) {
  const [genero, setGenero] = useState('todos');
  const [q, setQ] = useState('');

  const publicables = useMemo(
    () => products.filter((p) => p.activo && esPublicable(p)),
    [products]
  );

  const visibles = useMemo(() => {
    const termino = normalizar(q).trim();
    return publicables.filter((p) => {
      if (genero !== 'todos' && p.genero !== genero) return false;
      if (promoActiva && !gruposPromoDe(p).includes(promoActiva)) return false;
      if (!termino) return true;
      const heno = normalizar(`${p.nombre} ${p.inspirado_en} ${p.familia_olfativa}`);
      return heno.includes(termino);
    });
  }, [publicables, genero, q, promoActiva]);

  const limpiarTodo = () => { setGenero('todos'); setQ(''); setPromoActiva(null); };

  return (
    <section className={`tw ${s.section}`} id="catalogo">
      <header className={s.head}>
        <h2 className={s.titulo}>El catálogo</h2>
        <p className={s.bajada}>
          {publicables.length} aromas del ciclo. Buscá por nombre o por el perfume en el que se inspira.
        </p>
      </header>

      <div className={s.controles}>
        <div className={s.buscador}>
          <input
            className={s.input}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar: Sauvage, Le Male, amaderado..."
            aria-label="Buscar aroma"
          />
        </div>

        <div className={`${s.chips} tscroll-x`} role="group" aria-label="Filtrar">
          {GENERO_FILTROS.map((f) => (
            <button
              key={f.id}
              className={`${s.chip} ${genero === f.id ? s.chipOn : ''}`}
              onClick={() => setGenero(f.id)}
              aria-pressed={genero === f.id}
            >
              {f.label}
            </button>
          ))}
          {Object.values(promos).map((p) => (
            <button
              key={p.grupo}
              className={`${s.chip} ${s.chipPromo} ${promoActiva === p.grupo ? s.chipOn : ''}`}
              onClick={() => setPromoActiva(promoActiva === p.grupo ? null : p.grupo)}
              aria-pressed={promoActiva === p.grupo}
            >
              2x1 {p.grupo === 'arabe' ? 'árabes' : 'diseñador'}
            </button>
          ))}
        </div>
      </div>

      <p className={`${s.conteo} tnum`} aria-live="polite">
        {visibles.length} {visibles.length === 1 ? 'aroma' : 'aromas'}
      </p>

      {visibles.length === 0 ? (
        <div className={s.vacio}>
          <p className={s.vacioTitulo}>No encontré ese aroma en este ciclo.</p>
          <p className={s.vacioTexto}>
            El catálogo cambia todos los meses. Si lo buscabas puntualmente, escribime y te digo
            si entra en el próximo.
          </p>
          <button type="button" className="tbtn ghost" onClick={limpiarTodo}>Ver todo el catálogo</button>
        </div>
      ) : (
        <div className={s.grid}>
          {visibles.map((p) => (
            <ProductCard
              key={p.id}
              producto={p}
              onOpen={onOpen}
              promos={promos}
              vtName={p.id === abiertoId ? 'none' : `aroma-${p.id}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
