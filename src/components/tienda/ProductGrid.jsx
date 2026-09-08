import { useEffect, useMemo, useRef, useState } from 'react';
import { GENEROS } from '../../data/constants';
import { esPublicable, gruposPromoDe, tituloDe } from '../../lib/producto';
import ProductCard from './ProductCard';
import s from './ProductGrid.module.css';

const POR_PAGINA = 12;

function normalizar(t) {
  return String(t || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

/** Filtros como pastillas que se prenden y apagan tocando la misma. */
function Pastilla({ activa, onClick, children, tono = '' }) {
  return (
    <button
      type="button"
      className={`${s.chip} ${tono} ${activa ? s.chipOn : ''}`}
      onClick={onClick}
      aria-pressed={activa}
    >
      {activa && <span className={s.tilde} aria-hidden="true">✓</span>}
      {children}
    </button>
  );
}

export default function ProductGrid({ products, onOpen, abiertoId, promos = {}, promoActiva, setPromoActiva }) {
  const [genero, setGenero] = useState(null);   // null = sin filtrar
  const [momento, setMomento] = useState(null);
  const [rebaja, setRebaja] = useState(false);
  const [q, setQ] = useState('');
  const [pagina, setPagina] = useState(0);
  const tope = useRef(null);

  const publicables = useMemo(
    () => products.filter((p) => p.activo && esPublicable(p)),
    [products]
  );

  const visibles = useMemo(() => {
    const termino = normalizar(q).trim();
    return publicables.filter((p) => {
      if (genero && p.genero !== genero) return false;
      if (momento && p.momento !== momento) return false;
      if (promoActiva && !gruposPromoDe(p).includes(promoActiva)) return false;
      if (rebaja && !(p.presentaciones || []).some((x) => x.precio_anterior)) return false;
      if (!termino) return true;
      const heno = normalizar(`${tituloDe(p)} ${p.nombre} ${p.familia_olfativa}`);
      return heno.includes(termino);
    });
  }, [publicables, genero, momento, rebaja, q, promoActiva]);

  const paginas = Math.max(1, Math.ceil(visibles.length / POR_PAGINA));
  const pagActual = Math.min(pagina, paginas - 1);
  const enPantalla = visibles.slice(pagActual * POR_PAGINA, (pagActual + 1) * POR_PAGINA);

  // Cambiar un filtro siempre devuelve a la primera pagina: si no, la clienta
  // filtra y le queda una pantalla vacia porque seguia parada en la pagina 4.
  useEffect(() => { setPagina(0); }, [genero, momento, rebaja, q, promoActiva]);

  const activos = [genero, momento, promoActiva].filter(Boolean).length + (rebaja ? 1 : 0);
  const limpiar = () => { setGenero(null); setMomento(null); setRebaja(false); setPromoActiva(null); setQ(''); };

  function irA(n) {
    setPagina(n);
    tope.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <section className={`tw ${s.section}`} id="catalogo">
      <header className={s.head} ref={tope}>
        <h2 className={s.titulo}>El catálogo</h2>
        <p className={s.bajada}>
          {publicables.length} aromas del ciclo. Buscá por el perfume en el que se inspira.
        </p>
        <p className={s.aviso}>
          Los nombres de diseñador se citan solo como referencia olfativa. Todos los
          productos son versiones inspiradas de la casa Bagués, así rotuladas en cada envase.
        </p>
      </header>

      {/* Barra de filtros: se pega abajo del encabezado al scrollear, así se
          puede cambiar de filtro sin volver arriba. */}
      <div className={`${s.barra} tglass`}>
        <input
          className={s.input}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar: Sauvage, Le Male, amaderado..."
          aria-label="Buscar aroma"
        />

        <div className={`${s.chips} tscroll-x`} role="group" aria-label="Filtrar el catálogo">
          {Object.values(GENEROS).map((g) => (
            <Pastilla key={g.id} activa={genero === g.id} onClick={() => setGenero(genero === g.id ? null : g.id)}>
              {g.label}
            </Pastilla>
          ))}

          <span className={s.corte} aria-hidden="true" />

          {Object.values(promos).map((p) => (
            <Pastilla
              key={p.grupo}
              tono={s.chipPromo}
              activa={promoActiva === p.grupo}
              onClick={() => setPromoActiva(promoActiva === p.grupo ? null : p.grupo)}
            >
              2x1 {p.grupo === 'arabe' ? 'árabes' : 'diseñador'}
            </Pastilla>
          ))}

          <Pastilla tono={s.chipPromo} activa={rebaja} onClick={() => setRebaja(!rebaja)}>
            Rebajados
          </Pastilla>

          <span className={s.corte} aria-hidden="true" />

          <Pastilla activa={momento === 'verano'} onClick={() => setMomento(momento === 'verano' ? null : 'verano')}>
            Verano
          </Pastilla>
          <Pastilla activa={momento === 'invierno'} onClick={() => setMomento(momento === 'invierno' ? null : 'invierno')}>
            Invierno
          </Pastilla>
        </div>

        <div className={s.resumen}>
          <span className={`${s.conteo} tnum`} aria-live="polite">
            {visibles.length} {visibles.length === 1 ? 'aroma' : 'aromas'}
            {paginas > 1 ? ` · página ${pagActual + 1} de ${paginas}` : ''}
          </span>
          {activos > 0 && (
            <button type="button" className={s.limpiar} onClick={limpiar}>
              Quitar filtros ({activos})
            </button>
          )}
        </div>
      </div>

      {visibles.length === 0 ? (
        <div className={s.vacio}>
          <p className={s.vacioTitulo}>No encontré ese aroma en este ciclo.</p>
          <p className={s.vacioTexto}>
            El catálogo cambia todos los meses. Si lo buscabas puntualmente, escribime y te digo
            si entra en el próximo.
          </p>
          <button type="button" className="tbtn ghost" onClick={limpiar}>Ver todo el catálogo</button>
        </div>
      ) : (
        <>
          <div className={s.grid}>
            {enPantalla.map((p) => (
              <ProductCard
                key={p.id}
                producto={p}
                onOpen={onOpen}
                promos={promos}
                vtName={p.id === abiertoId ? 'none' : `aroma-${p.id}`}
              />
            ))}
          </div>

          {paginas > 1 && (
            <nav className={s.paginador} aria-label="Páginas del catálogo">
              <button
                type="button"
                className={s.flecha}
                onClick={() => irA(pagActual - 1)}
                disabled={pagActual === 0}
                aria-label="Página anterior"
              >
                ←
              </button>

              <div className={s.numeros}>
                {Array.from({ length: paginas }, (_, i) => i)
                  .filter((i) => i === 0 || i === paginas - 1 || Math.abs(i - pagActual) <= 1)
                  .reduce((acc, i, idx, arr) => {
                    if (idx > 0 && i - arr[idx - 1] > 1) acc.push('...');
                    acc.push(i);
                    return acc;
                  }, [])
                  .map((i, idx) =>
                    i === '...' ? (
                      <span key={`s${idx}`} className={s.puntos}>…</span>
                    ) : (
                      <button
                        key={i}
                        type="button"
                        className={`${s.numero} ${i === pagActual ? s.numeroOn : ''} tnum`}
                        onClick={() => irA(i)}
                        aria-current={i === pagActual ? 'page' : undefined}
                      >
                        {i + 1}
                      </button>
                    )
                  )}
              </div>

              <button
                type="button"
                className={s.flecha}
                onClick={() => irA(pagActual + 1)}
                disabled={pagActual === paginas - 1}
                aria-label="Página siguiente"
              >
                →
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
