import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { textoCiclo } from '../../lib/promos';
import { INICIO, conDatos } from '../../config/contenido';
import { AROMAS_APROX } from '../../config/ajustes';
import { pesos } from '../../lib/format';
import s from './Hero.module.css';

gsap.registerPlugin(ScrollTrigger);

/**
 * Hero. Tres piezas que trabajan juntas:
 *
 *  - La corona: Wolf como firma, Casa Bagués como aval. Marca presencia arriba
 *    de todo, sin explicar nada.
 *  - El titulo sobre la placa de vidrio, con la fila de datos duros abajo
 *    (cuantos aromas, desde cuanto, hasta cuando): concreto, de un vistazo.
 *  - La cinta de nombres que la gente reconoce, en movimiento. Comunica el
 *    valor al toque: "estos son los que tengo".
 *
 * La entrada es coreografiada con GSAP: la corona sube, el titulo se revela
 * linea por linea detras de su propio renglon, y los datos aparecen
 * escalonados. Es lo que separa un hero que se siente vivo de un bloque que
 * aparece de golpe. Todo respeta prefers-reduced-motion: si la persona pidio
 * menos movimiento, no corre nada y el contenido se ve igual.
 *
 * Nada de montos hardcodeados: todo llega por props del catalogo real.
 */
export default function Hero({ settings, promos = {}, onVerPromo, totalAromas, desde, nombresAromas = [] }) {
  const ciclo = textoCiclo(settings);
  const lista = Object.values(promos);
  const aromas = totalAromas || AROMAS_APROX;
  const scope = useRef(null);

  useLayoutEffect(() => {
    // matchMedia hace dos cosas de una: solo corre cuando hay movimiento
    // permitido, y limpia solo al desmontar o si cambia la preferencia.
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('[data-hero="panel"]', { autoAlpha: 0, y: 26, scale: 0.985, duration: 0.9, ease: 'power2.out' })
        .from('[data-hero="corona"]', { autoAlpha: 0, y: 12, duration: 0.6 }, 0.18)
        .from('[data-hero="linea"]', { yPercent: 118, duration: 0.95, stagger: 0.09, ease: 'power4.out' }, 0.28)
        .from('[data-hero="bajada"]', { autoAlpha: 0, y: 14, duration: 0.6 }, '-=0.4')
        .from('[data-hero="cta"]', { autoAlpha: 0, y: 14, duration: 0.6, stagger: 0.08 }, '-=0.42')
        .from('[data-hero="meta"] > *', { autoAlpha: 0, y: 10, duration: 0.5, stagger: 0.07 }, '-=0.36')
        .from('[data-hero="cinta"]', { autoAlpha: 0, duration: 0.8 }, '-=0.3');

      // Parallax del fondo: se corre mas lento que el contenido, da profundidad.
      // Solo transform, y el desvanecido de abajo tapa cualquier borde.
      const fondo = document.querySelector('.tfondo');
      const st = fondo
        ? gsap.to(fondo, {
            yPercent: -7,
            ease: 'none',
            scrollTrigger: { trigger: scope.current, start: 'top top', end: 'bottom top', scrub: true },
          })
        : null;

      return () => st?.scrollTrigger?.kill();
    });
    return () => mm.revert();
  }, []);

  return (
    <section className={s.hero} ref={scope}>
      <div className={`tw ${s.inner}`}>
        <div className={`${s.panel} tglass`} data-hero="panel">
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
            <a href="#catalogo" className="tbtn" data-hero="cta">{INICIO.verCatalogo}</a>
            <a href="#como" className="tbtn ghost" data-hero="cta">{INICIO.verComo}</a>
          </div>

          <div className={s.meta} data-hero="meta">
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

      {/* La cinta de nombres. De borde a borde, se mueve sola. Duplicada dos
          veces para que el bucle no tenga costura. Se frena al pasar el mouse y
          queda quieta si la persona pidio menos movimiento (ver CSS). */}
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
