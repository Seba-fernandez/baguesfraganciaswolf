import { textoCiclo } from '../../lib/promos';
import { INICIO, conDatos } from '../../config/contenido';
import { AROMAS_APROX } from '../../config/ajustes';
import { pesos } from '../../lib/format';
import s from './Hero.module.css';

/**
 * Hero. Tres piezas que trabajan juntas:
 *
 *  - La corona: Wolf como firma, Casa Bagués como aval. Marca presencia arriba
 *    de todo, sin explicar nada.
 *  - El titulo sobre la placa de vidrio, con la fila de datos duros abajo
 *    (cuantos aromas, desde cuanto, hasta cuando): concreto, de un vistazo.
 *  - La cinta de nombres que la gente reconoce, en movimiento. Es lo que rompe
 *    el bloque de texto en el celular y comunica el valor al toque: "estos son
 *    los que tengo".
 *
 * Nada de montos ni cuentas hardcodeadas: todo llega por props desde el
 * catalogo real y cambia solo cuando cambia el ciclo.
 */
export default function Hero({ settings, promos = {}, onVerPromo, totalAromas, desde, nombresAromas = [] }) {
  const ciclo = textoCiclo(settings);
  const lista = Object.values(promos);
  const aromas = totalAromas || AROMAS_APROX;

  return (
    <section className={s.hero}>
      <div className={`tw ${s.inner}`}>
        <div className={`${s.panel} tglass`}>
          <p className={s.corona}>
            <span className={s.coronaMarca}>{INICIO.corona}</span>
            <span className={s.coronaAval}>{INICIO.aval}</span>
          </p>

          <h1 className={s.titulo}>
            {INICIO.titulo.map((linea, i) => (
              <span key={linea}>
                {linea}
                {i < INICIO.titulo.length - 1 && <br />}
              </span>
            ))}
          </h1>

          <p className={s.bajada}>{INICIO.bajada}</p>

          <div className={s.acciones}>
            <a href="#catalogo" className="tbtn">{INICIO.verCatalogo}</a>
            <a href="#como" className="tbtn ghost">{INICIO.verComo}</a>
          </div>

          <div className={s.meta}>
            <span className={`${s.metaDato} tnum`}>{conDatos(INICIO.metaAromas, { n: aromas })}</span>
            {desde ? (
              <span className={`${s.metaDato} tnum`}>{conDatos(INICIO.metaDesde, { desde: pesos(desde) })}</span>
            ) : null}
            {ciclo ? <span className={`${s.metaDato} tnum`}>{ciclo}</span> : null}
          </div>
        </div>

        {lista.length > 0 && (
          <div className={s.promos}>
            {lista.map((p) => (
              <button
                key={p.grupo}
                type="button"
                className={`${s.promo} tglass`}
                onClick={() => onVerPromo?.(p.grupo)}
              >
                <span className={s.promoSello}>{INICIO.selloPromo}</span>
                <span className={s.promoTexto}>
                  <span className={s.promoTitulo}>{p.titulo}</span>
                  <span className={`${s.promoDetalle} tnum`}>
                    {p.detalle} · {pesos(p.precio_par)} {INICIO.porPar}
                  </span>
                </span>
                <span className={s.promoFlecha} aria-hidden="true">→</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* La cinta de nombres. Va fuera del ancho contenido, de borde a borde, y
          se mueve sola. Duplicada dos veces para que el bucle no tenga costura.
          Se detiene si la persona pidió menos movimiento (ver CSS). */}
      {nombresAromas.length >= 6 && (
        <div className={s.cinta} aria-hidden="true">
          <div className={s.cintaPista}>
            {[...nombresAromas, ...nombresAromas].map((n, i) => (
              <span key={`${n}-${i}`} className={s.cintaItem}>
                {n}
                <span className={s.cintaPunto}>·</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
