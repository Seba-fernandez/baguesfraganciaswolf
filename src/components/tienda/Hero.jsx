import { textoCiclo } from '../../lib/promos';
import { INICIO, conDatos } from '../../config/contenido';
import { AROMAS_APROX } from '../../config/ajustes';
import { pesos } from '../../lib/format';
import s from './Hero.module.css';

/**
 * Hero. Una sola promesa, sin eyebrow decorativo: el unico dato chico de
 * arriba es el ciclo, que es informacion real y perecedera.
 *
 * La promo del ciclo se lee de settings.promos_ciclo. Nada de montos
 * hardcodeados: cuando cambia el ciclo, cambia sola.
 */
export default function Hero({ settings, promos = {}, onVerPromo, totalAromas }) {
  const ciclo = textoCiclo(settings);
  const lista = Object.values(promos);

  return (
    <section className={s.hero}>
      <div className={`tw ${s.inner}`}>
        <div className={`${s.panel} tglass`}>
          {ciclo && <p className={s.ciclo}>{ciclo}</p>}

          <h1 className={s.titulo}>
            {INICIO.titulo.map((linea, i) => (
              <span key={linea}>
                {linea}
                {i < INICIO.titulo.length - 1 && <br />}
              </span>
            ))}
          </h1>

          <p className={s.bajada}>
            {conDatos(INICIO.bajada, { aromas: totalAromas || AROMAS_APROX })}
          </p>

          <div className={s.acciones}>
            <a href="#catalogo" className="tbtn">{INICIO.verCatalogo}</a>
            <a href="#como" className="tbtn ghost">{INICIO.verComo}</a>
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
    </section>
  );
}
