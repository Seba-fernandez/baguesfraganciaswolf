import { Link } from 'react-router-dom';
import { INICIO, conDatos } from '../../config/contenido';
import { AROMAS_APROX } from '../../config/ajustes';
import { pesos } from '../../lib/format';
import s from './Hero.module.css';

/**
 * Hero editorial sobre un escenario: dunas de arena al atardecer (public/hero/
 * duna.svg, lo genera scripts/fondo/generar-duna.mjs) a sangre, y el frasco
 * parado sobre el piso de la duna con su sombra de contacto. Nada de caja ni
 * azulejo: el frasco está EN la escena.
 *
 *  - La corona: Wolf como firma, Casa Bagués como aval. Presencia sin explicar.
 *  - El título grande, la bajada y la fila de datos duros, sobre un velo que
 *    oscurece sólo detrás del texto.
 *  - Los CTA y las promos del ciclo son vidrio: flotan sobre la arena, que es
 *    donde el vidrio tiene algo que refractar.
 *  - Abajo, fuera de la escena, la cinta de nombres que la gente reconoce.
 *
 * La entrada es la MISMA coreografía que antes hacía GSAP, ahora en CSS puro
 * (ver los @keyframes de Hero.module.css). Se cambió por peso: gsap más
 * ScrollTrigger eran 49 kB comprimidos en el chunk de la portada, para una
 * línea de tiempo que arranca sola y un parallax. Los `data-hero` quedaron
 * porque ahora son los ganchos de los `animation-delay` en el CSS.
 *
 * Como las animaciones son declarativas, corren apenas el navegador dibuja, sin
 * esperar a que el JavaScript se descargue y se ejecute: además de pesar menos,
 * la entrada se ve antes. El parallax pasó a scroll-driven animation nativa y
 * el respeto por prefers-reduced-motion lo hace una media query.
 */
export default function Hero({
  settings, promos = {}, onVerPromo, onOpen,
  totalAromas, desde, nombresAromas = [], heroProducto = null,
}) {
  const lista = Object.values(promos);
  const aromas = totalAromas || AROMAS_APROX;

  return (
    <section className={s.hero} id="inicio-hero">
      <div className={s.escenario}>
      {/* La escena y el velo son decorativos.

          La escena se dibuja como background-image y no como <img>. Se probaron
          las dos: con <img> el LCP medido empeoraba ~150 ms (2557 contra 2411),
          porque el pintado queda atado a la decodificación del elemento. El
          fondo lo descubre igual de temprano el <link rel=preload> de
          index.html, que va con fetchpriority alta. */}
      <div className={s.escena} data-hero="escena" aria-hidden="true" />
      <div className={s.velo} aria-hidden="true" />

      {/* El frasco (fondo transparente) sobre el piso de la duna, con su sombra
          de contacto. Imagen decorativa para el lector de pantalla. */}
      <div className={s.banda}>
        <div className={s.showcase} aria-hidden="true">
          <span className={s.sombra} data-hero="sombra" />
          {/* <picture> con media, no srcset con anchos: el frasco se ve a ~196
              px en el celular, y con `sizes` el navegador multiplica por la
              densidad de pantalla (2,6 en el Moto G del test) y termina
              eligiendo igual el archivo grande. Con media la decisión es
              explícita y no depende de esa cuenta: el teléfono baja 47 kB en vez
              de 101 kB.

              fetchpriority alta porque compite por el ancho de banda con la
              escena del fondo. Va en minúsculas a propósito: React 18 no conoce
              fetchPriority en camelCase y lo descarta sin escribirlo. */}
          <picture>
            <source media="(max-width: 899px)" srcSet="/hero/frasco-420.webp" width="420" height="504" />
            <img
              src="/hero/frasco-613.webp"
              alt=""
              className={s.frasco}
              data-hero="frasco"
              decoding="async"
              fetchpriority="high"
              width="613"
              height="736"
            />
          </picture>
        </div>
      </div>

      <div className={`tw ${s.inner}`}>
        <div className={s.texto}>
          <p className={s.corona} data-hero="corona">
            <span className={s.coronaMarca}>{INICIO.corona}</span>
            <span className={s.coronaAval}>{INICIO.aval}</span>
          </p>

          <h1 className={s.titulo}>
            {INICIO.titulo.map((linea) => (
              <span key={linea} className={s.lineaWrap}>
                <span className={s.linea} data-hero="linea">{linea}</span>
              </span>
            ))}
          </h1>

          <p className={s.bajada} data-hero="bajada">{INICIO.bajada}</p>

          <div className={s.acciones}>
            <Link to="/catalogo" className="tbtn" data-hero="cta">
              <span>{INICIO.verCatalogo}</span>
              <span className={s.ctaFlecha} aria-hidden="true">→</span>
            </Link>
            <a href="#como" className="tbtn clear" data-hero="cta">{INICIO.verComo}</a>
          </div>

          <div className={s.meta} data-hero="meta">
            <span className={`${s.metaDato} tnum`}>{conDatos(INICIO.metaAromas, { n: aromas })}</span>
            {desde ? (
              <span className={`${s.metaDato} tnum`}>{conDatos(INICIO.metaDesde, { desde: pesos(desde) })}</span>
            ) : null}
          </div>
        </div>
      </div>

      {lista.length > 0 && (
        <div className={`tw ${s.promos}`} data-hero="promos">
          {lista.map((p) => (
            <button
              key={p.grupo}
              type="button"
              className={`${s.promo} tbtn clear`}
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

      {/* La cinta de nombres, de borde a borde, en movimiento. Duplicada para que
          el bucle no tenga costura. Se frena al pasar el mouse. */}
      {nombresAromas.length >= 6 && (
        <div className={s.cinta} data-hero="cinta" aria-hidden="true">
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
