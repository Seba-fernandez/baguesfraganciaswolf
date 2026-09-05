import { esPublicable, presentacionPorDefecto } from '../../lib/producto';
import { pesos } from '../../lib/format';
import useReveal from '../../hooks/useReveal';
import ProductThumb from './ProductThumb';
import s from './FeaturedRows.module.css';

/**
 * Seleccion curada. No repite el tratamiento del catalogo: acá cada aroma se
 * presenta por el perfume que todos conocen (inspirado_en como titulo), que
 * es lo que la clienta busca. El catálogo completo, abajo, ordena por nombre
 * de la casa. Dos secciones, dos trabajos distintos.
 */
export default function FeaturedRows({ products, onOpen }) {
  const ref = useReveal();
  const destacados = products.filter((p) => p.activo && p.destacado && esPublicable(p)).slice(0, 6);
  if (!destacados.length) return null;

  return (
    <section className={`tw ${s.section}`} ref={ref}>
      <header className={s.head}>
        <h2 className={s.titulo}>Los que siempre salen</h2>
        <p className={s.bajada}>Los que más pide la gente, ciclo tras ciclo.</p>
      </header>

      <div className={s.fila}>
        {destacados.map((p, i) => {
          const pres = presentacionPorDefecto(p);
          return (
            <button
              key={p.id}
              type="button"
              className={`${s.item} treveal`}
              style={{ transitionDelay: `${Math.min(i, 5) * 60}ms` }}
              onClick={() => onOpen(p)}
            >
              <span className={s.media}>
                <ProductThumb producto={p} ratio="4 / 5" />
              </span>
              <span className={s.info}>
                <span className={s.nombre}>{p.inspirado_en || p.nombre}</span>
                <span className={s.casa}>{p.nombre}</span>
                {pres && <span className={`${s.precio} tnum`}>desde {pesos(pres.precio)}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
