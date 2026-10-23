import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import useReveal from '../../hooks/useReveal';
import useTrasCarga from '../../hooks/useTrasCarga';
import { FAMILIAS } from '../../lib/familias';
import { FAMILIAS_PORTADA } from '../../config/contenido';
import s from './Familias.module.css';

/**
 * "¿Qué te gusta oler?" (rediseño C). Las cinco familias del filtro como
 * ventanas con la silueta del frasco Bagués y el ingrediente detrás del vidrio
 * acanalado (las imágenes las hornea el rediseño: public/familias/). Cada una
 * lleva al catálogo ya filtrado (?familia=). Es la puerta para quien no sabe
 * qué perfume quiere, o lo busca para regalar.
 *
 * Celular: una fila que se desliza (es una vidriera, no un filtro). Escritorio:
 * las cinco a la vista.
 *
 * Rediseño D (plano 3): de día, sobre papel, con las cinco ventanas de noche.
 * El vino entra de a poco antes de la banda vino de los destacados.
 */
export default function Familias({ onAbrir }) {
  const ref = useReveal();
  const fotos = useTrasCarga();
  // Los puntitos de abajo (celular): se encienden los de las ventanas que se
  // ven enteras, asi se sabe que la fila sigue y por donde va (Sebas, 23/10).
  const filaRef = useRef(null);
  const [visibles, setVisibles] = useState(() => new Set([0, 1]));
  useEffect(() => {
    const fila = filaRef.current;
    if (!fila || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver((entradas) => {
      setVisibles((prev) => {
        const n = new Set(prev);
        for (const e of entradas) {
          const i = Number(e.target.dataset.i);
          if (e.intersectionRatio >= 0.6) n.add(i); else n.delete(i);
        }
        return n;
      });
    }, { root: fila, threshold: [0.6] });
    fila.querySelectorAll('li').forEach((li) => io.observe(li));
    return () => io.disconnect();
  }, []);
  return (
    <section className={`dia ${s.section}`} id="familias" ref={ref} aria-labelledby="familias-titulo">
      <div className="tw">
      <h2 id="familias-titulo" className={s.titulo}>{FAMILIAS_PORTADA.titulo}</h2>
      <p className={s.bajada}>{FAMILIAS_PORTADA.bajada}</p>
      <ul className={s.fila} ref={filaRef}>
        {FAMILIAS.map((f, i) => (
          <li key={f.id} data-i={i} className={`${s.item} treveal`} style={{ transitionDelay: `${i * 70}ms` }}>
            {/* Abre la hoja de la familia encima de la portada (/?familia=).
                Sin JavaScript, el link sigue llevando al catalogo filtrado. */}
            <Link
              to={`/catalogo?familia=${f.id}`}
              className={s.link}
              data-qa="familia-portada"
              onClick={(e) => {
                if (!onAbrir || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                e.preventDefault();
                onAbrir(f.id);
              }}
            >
              <span className={s.ventana}>
                {fotos && <img
                  src={`/familias/${FAMILIAS_PORTADA.archivo[f.id]}-240.webp`}
                  srcSet={`/familias/${FAMILIAS_PORTADA.archivo[f.id]}-240.webp 240w, /familias/${FAMILIAS_PORTADA.archivo[f.id]}-420.webp 420w`}
                  sizes="(max-width: 767px) 38vw, 180px"
                  width="240" height="517"
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className={s.frasco}
                />}
              </span>
              <span className={s.nombre}>{f.nombre}</span>
              <span className={s.ejemplo}>{FAMILIAS_PORTADA.ejemplos[f.id]}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className={s.puntos} aria-hidden="true">
        {FAMILIAS.map((f, i) => <span key={f.id} className={`${s.punto} ${visibles.has(i) ? s.puntoOn : ''}`} />)}
      </div>
      </div>
    </section>
  );
}
