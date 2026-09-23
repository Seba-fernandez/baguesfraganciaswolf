import { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { INICIO, conDatos } from '../../config/contenido';
import { AROMAS_APROX } from '../../config/ajustes';
import { pesos } from '../../lib/format';
import s from './Hero.module.css';

gsap.registerPlugin(ScrollTrigger);

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
 * La entrada es coreografiada con GSAP y respeta prefers-reduced-motion.
 */
export default function Hero({
  settings, promos = {}, onVerPromo, onOpen,
  totalAromas, desde, nombresAromas = [], heroProducto = null,
}) {
  const lista = Object.values(promos);
  const aromas = totalAromas || AROMAS_APROX;
  const scope = useRef(null);

  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('[data-hero="corona"]', { autoAlpha: 0, y: 12, duration: 0.6 })
        .from('[data-hero="linea"]', { yPercent: 118, duration: 0.95, stagger: 0.09, ease: 'power4.out' }, 0.08)
        .from('[data-hero="bajada"]', { autoAlpha: 0, y: 14, duration: 0.6 }, '-=0.42')
        .from('[data-hero="cta"]', { autoAlpha: 0, y: 14, duration: 0.6, stagger: 0.08 }, '-=0.42')
        .from('[data-hero="meta"] > *', { autoAlpha: 0, y: 10, duration: 0.5, stagger: 0.07 }, '-=0.36')
        .from('[data-hero="escena"]', { autoAlpha: 0, scale: 1.04, duration: 1.4, ease: 'power2.out' }, 0)
        .from('[data-hero="frasco"]', { autoAlpha: 0, y: 26, duration: 1.1, ease: 'expo.out' }, 0.35)
        .from('[data-hero="sombra"]', { autoAlpha: 0, scaleX: 0.6, duration: 1.1, ease: 'expo.out' }, 0.35)
        .from('[data-hero="promos"] > *', { autoAlpha: 0, y: 14, duration: 0.6, stagger: 0.08 }, '-=0.5')
        .from('[data-hero="cinta"]', { autoAlpha: 0, duration: 0.8 }, '-=0.3');
    });

    // Parallax de la escena: la arena baja más lento que el frasco. SOLO en
    // escritorio (en el celular mover el fondo bajo el vidrio traba).
    mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
      const st = gsap.to('[data-hero="escena"]', {
        yPercent: 8, ease: 'none',
        scrollTrigger: { trigger: scope.current, start: 'top top', end: 'bottom top', scrub: true },
      });
      return () => st.scrollTrigger?.kill();
    });

    return () => mm.revert();
  }, []);

  return (
    <section className={s.hero} ref={scope} id="inicio-hero">
      <div className={s.escenario}>
      {/* La escena y el velo son decorativos. */}
      <div className={s.escena} data-hero="escena" aria-hidden="true" />
      <div className={s.velo} aria-hidden="true" />

      {/* El frasco (fondo transparente) sobre el piso de la duna, con su sombra
          de contacto. Imagen decorativa para el lector de pantalla. */}
      <div className={s.banda}>
        <div className={s.showcase} aria-hidden="true">
          <span className={s.sombra} data-hero="sombra" />
          <img src="/hero/frasco.webp" alt="" className={s.frasco} data-hero="frasco" decoding="async" fetchPriority="high" width="613" height="736" />
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
