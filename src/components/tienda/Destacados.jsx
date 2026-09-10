import { useRef } from 'react';
import { esPublicable, presentacionPorDefecto } from '../../lib/producto';
import { pesos } from '../../lib/format';
import useReveal from '../../hooks/useReveal';
import { DESTACADOS } from '../../config/contenido';
import { DESTACADOS_MAXIMO, PROPORCION } from '../../config/ajustes';
import ProductThumb from './ProductThumb';
import s from './Destacados.module.css';

/**
 * Seleccion curada. Va CONTENIDA en un marco propio, con su eyebrow, para que
 * se lea como una vidriera aparte del catalogo abierto de abajo. Es un carrusel
 * horizontal: se puede arrastrar, o pasar con las flechas de cada costado, que
 * al llegar al tope vuelven al inicio.
 */
export default function Destacados({ products, onOpen }) {
  const ref = useReveal();
  const filaRef = useRef(null);
  const destacados = products.filter((p) => p.activo && p.destacado && esPublicable(p)).slice(0, DESTACADOS_MAXIMO);
  if (!destacados.length) return null;

  function mover(dir) {
    const el = filaRef.current;
    if (!el) return;
    const paso = Math.max(220, el.clientWidth * 0.8);
    const max = el.scrollWidth - el.clientWidth;
    const borde = 4;
    if (dir > 0) {
      // Al final, vuelve al inicio; si no, avanza una tanda.
      if (el.scrollLeft >= max - borde) el.scrollTo({ left: 0, behavior: 'smooth' });
      else el.scrollBy({ left: paso, behavior: 'smooth' });
    } else {
      if (el.scrollLeft <= borde) el.scrollTo({ left: max, behavior: 'smooth' });
      else el.scrollBy({ left: -paso, behavior: 'smooth' });
    }
  }

  return (
    <section className={`tw ${s.section}`} ref={ref}>
      <div className={s.marco}>
        <header className={s.head}>
          <p className={s.eyebrow}>{DESTACADOS.eyebrow}</p>
          <h2 className={s.titulo}>{DESTACADOS.titulo}</h2>
          <p className={s.bajada}>{DESTACADOS.bajada}</p>
        </header>

        <div className={s.carrusel}>
          <button type="button" className={`${s.flecha} ${s.flechaIzq}`} onClick={() => mover(-1)} aria-label="Anterior">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>

          <div className={s.fila} ref={filaRef}>
            {destacados.map((p, i) => {
              const pres = presentacionPorDefecto(p);
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`${s.item} treveal`}
                  style={{ transitionDelay: `${Math.min(i, DESTACADOS_MAXIMO - 1) * 60}ms` }}
                  onClick={() => onOpen(p)}
                >
                  <span className={s.media}>
                    <ProductThumb producto={p} ratio={PROPORCION.destacado} />
                  </span>
                  <span className={s.info}>
                    <span className={s.nombre}>{p.inspirado_en || p.nombre}</span>
                    <span className={s.casa}>{p.nombre}</span>
                    {pres && <span className={`${s.precio} tnum`}>{DESTACADOS.desde} {pesos(pres.precio)}</span>}
                  </span>
                </button>
              );
            })}
          </div>

          <button type="button" className={`${s.flecha} ${s.flechaDer}`} onClick={() => mover(1)} aria-label="Siguiente">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
