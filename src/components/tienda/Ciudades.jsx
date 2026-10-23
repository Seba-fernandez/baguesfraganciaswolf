import { Link } from 'react-router-dom';
import useReveal from '../../hooks/useReveal';
import useTrasCarga from '../../hooks/useTrasCarga';
import { CIUDADES } from '../../config/contenido';
import { ciudadesDe } from '../../lib/producto';
import { CIUDADES_ELEGIDAS } from '../../config/ajustes';
import { fotoDe, fotoChica } from '../../lib/fotos';
import { pesos } from '../../lib/format';
import s from './Ciudades.module.css';

/**
 * Las ciudades (rediseño D, plano 2: de día). Para qué está: la clienta busca
 * "Sauvage" y la caja que recibe dice "Arizona". Esta sección le enseña ese
 * código antes de comprar, con las cajas más conocidas (CIUDADES_ELEGIDAS en
 * ajustes.js): la ciudad enorme, "es Baccarat Rouge 540" y el precio.
 *
 * Cada fila es un link a la ficha (?aroma=); el toque normal la abre encima,
 * como la cinta del hero. Mientras no llegan los datos (y en el HTML
 * pre-generado) quedan cuatro filas vacías del mismo alto, para no empujar.
 */
export default function Ciudades({ products = [], onOpen }) {
  const ref = useReveal();
  const fotos = useTrasCarga();
  const filas = ciudadesDe(products, 4, CIUDADES_ELEGIDAS);
  const vacias = filas.length ? [] : [0, 1, 2, 3];

  function abrir(e, producto) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 || !onOpen) return;
    e.preventDefault();
    onOpen(producto);
  }

  return (
    <section className={`dia ${s.section}`} id="ciudades" ref={ref} aria-labelledby="ciudades-titulo">
      <div className="tw">
        <header className={`${s.head} treveal`}>
          <h2 id="ciudades-titulo" className={s.titulo}>{CIUDADES.titulo}</h2>
          <span className={s.mano} aria-hidden="true">{CIUDADES.rotulo}</span>
          <p className={s.bajada}>{CIUDADES.bajada}</p>
        </header>

        <ul className={s.lista} data-qa="ciudades">
          {filas.map((f, i) => {
            const foto = fotoChica(f.producto.imagen_url || fotoDe(f.producto, 'bagues'));
            return (
              <li key={f.producto.slug} className={`${s.fila} treveal`} style={{ '--i': i }}>
                <a
                  href={`/catalogo?aroma=${encodeURIComponent(f.producto.slug)}`}
                  className={s.link}
                  onClick={(e) => abrir(e, f.producto)}
                  aria-label={CIUDADES.abrir.replace('{perfume}', f.perfume).replace('{ciudad}', f.ciudad)}
                >
                  <span className={s.caja} aria-hidden="true">
                    {foto && fotos && <img src={foto} alt="" width="360" height="480" loading="lazy" decoding="async" />}
                  </span>
                  <span className={s.ciudad}>{f.ciudad}</span>
                  <span className={s.dato}>
                    <span className={s.perfume}><span className={s.es}>{CIUDADES.es} </span>{f.perfume}</span>
                    <span className={`${s.precio} tnum`}>{f.ml} ml · {pesos(f.precio)}</span>
                  </span>
                  {/* Que se note que la fila se toca: una flecha fina al final. */}
                  <svg className={s.flecha} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </a>
              </li>
            );
          })}
          {vacias.map((i) => (
            <li key={i} className={`${s.fila} ${s.vacia}`} aria-hidden="true">
              <span className={s.link}><span className={s.caja} /><span className={s.ciudad}>&nbsp;</span><span className={s.dato} /></span>
            </li>
          ))}
        </ul>

        <Link to="/catalogo" className={s.todas}>{CIUDADES.verTodas}</Link>
      </div>
    </section>
  );
}
