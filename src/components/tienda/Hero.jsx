import { textoCiclo } from '../../lib/promos';
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
        {ciclo && <p className={s.ciclo}>{ciclo}</p>}

        <h1 className={s.titulo}>
          El perfume que ya<br />
          conoce, al precio<br />
          que todavía no.
        </h1>

        <p className={s.bajada}>
          {totalAromas || 104} fragancias inspiradas en los grandes de diseñador. Elegís, armás el
          pedido y te lo confirmo por WhatsApp. Retiro los viernes en Córdoba.
        </p>

        <div className={s.acciones}>
          <a href="#catalogo" className="tbtn">Ver el catálogo</a>
          <a href="#como" className="tbtn ghost">Cómo funciona</a>
        </div>

        {lista.length > 0 && (
          <div className={s.promos}>
            {lista.map((p) => (
              <button
                key={p.grupo}
                type="button"
                className={s.promo}
                onClick={() => onVerPromo?.(p.grupo)}
              >
                <span className={s.promoSello}>2x1</span>
                <span className={s.promoTexto}>
                  <span className={s.promoTitulo}>{p.titulo}</span>
                  <span className={`${s.promoDetalle} tnum`}>
                    {p.detalle} · {pesos(p.precio_par)} el par
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
