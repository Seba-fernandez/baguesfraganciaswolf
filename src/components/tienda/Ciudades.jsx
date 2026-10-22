import { Link } from 'react-router-dom';
import useReveal from '../../hooks/useReveal';
import { CIUDADES } from '../../config/contenido';
import { ciudadesDe } from '../../lib/producto';
import { fotoDe, fotoChica } from '../../lib/fotos';
import { pesos } from '../../lib/format';
import s from './Ciudades.module.css';

/**
 * Las ciudades (rediseño D, plano 2: de día). Después de la noche del hero,
 * papel y aire: cada caja Bagués con el nombre de su ciudad enorme, el
 * perfume que trae y el precio en mono al costado. Dice qué vendo, a cuánto y
 * con qué nombre, de un vistazo y sin un párrafo.
 *
 * Cada fila es un link a la ficha (?aroma=); el toque normal la abre encima,
 * como la cinta del hero. Mientras no llegan los datos (y en el HTML
 * pre-generado) quedan cuatro filas vacías del mismo alto, para no empujar.
 */
export default function Ciudades({ products = [], onOpen }) {
  const ref = useReveal();
  const filas = ciudadesDe(products, 4);
  const vacias = filas.length ? [] : [0, 1, 2, 3];

  function abrir(e, producto) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 || !onOpen) return;
    e.preventDefault();
    onOpen(producto);
  }

  return (
    <section className={s.section} id="ciudades" ref={ref} aria-labelledby="ciudades-titulo">
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
                    {foto && <img src={foto} alt="" width="360" height="480" loading="lazy" decoding="async" />}
                  </span>
                  <span className={s.ciudad}>{f.ciudad}</span>
                  <span className={s.dato}>
                    <span className={s.perfume}>{f.perfume}</span>
                    <span className={`${s.precio} tnum`}>{f.ml} ml · {pesos(f.precio)}</span>
                  </span>
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
