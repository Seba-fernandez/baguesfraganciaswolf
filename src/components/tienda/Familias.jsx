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
export default function Familias() {
  const ref = useReveal();
  const fotos = useTrasCarga();
  return (
    <section className={`dia ${s.section}`} id="familias" ref={ref} aria-labelledby="familias-titulo">
      <div className="tw">
      <h2 id="familias-titulo" className={s.titulo}>{FAMILIAS_PORTADA.titulo}</h2>
      <p className={s.bajada}>{FAMILIAS_PORTADA.bajada}</p>
      <ul className={s.fila}>
        {FAMILIAS.map((f, i) => (
          <li key={f.id} className={`${s.item} treveal`} style={{ transitionDelay: `${i * 70}ms` }}>
            <Link to={`/catalogo?familia=${f.id}`} className={s.link} data-qa="familia-portada">
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
      </div>
    </section>
  );
}
