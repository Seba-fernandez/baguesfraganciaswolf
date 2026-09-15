import { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { INICIO, conDatos } from '../../config/contenido';
import { AROMAS_APROX } from '../../config/ajustes';
import { tituloDe } from '../../lib/producto';
import { pesos } from '../../lib/format';
import ProductThumb from './ProductThumb';
import s from './Hero.module.css';

gsap.registerPlugin(ScrollTrigger);

/**
 * Hero editorial. Ya no es un cuadro de vidrio con texto adentro: el título vive
 * directo sobre el fondo cálido (la zona de la izquierda es la más oscura, así
 * se lee sin recuadro) y a la derecha flota un frasco de verdad, el más pedido
 * del ciclo, sobre su azulejo de porcelana.
 *
 *  - La corona: Wolf como firma, Casa Bagués como aval. Presencia sin explicar.
 *  - El título grande, la bajada y la fila de datos duros.
 *  - El CTA principal es una pastilla de vidrio "Clear" que lleva al catálogo.
 *  - Abajo, la promo del ciclo y la cinta de nombres que la gente reconoce.
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
        .from('[data-hero="showcase"]', { autoAlpha: 0, y: 24, scale: 0.96, duration: 1, ease: 'power2.out' }, 0.2)
        .from('[data-hero="promos"]', { autoAlpha: 0, y: 14, duration: 0.6 }, '-=0.4')
        .from('[data-hero="cinta"]', { autoAlpha: 0, duration: 0.8 }, '-=0.3');
    });

    // Parallax del fondo: SOLO en escritorio (en el celular mover el fondo mientras
    // el vidrio lo relee es lo que traba).
    mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
      const fondo = document.querySelector('.tfondo');
      if (!fondo) return;
      const st = gsap.to(fondo, {
        yPercent: -7, ease: 'none',
        scrollTrigger: { trigger: scope.current, start: 'top top', end: 'bottom top', scrub: true },
      });
      return () => st.scrollTrigger?.kill();
    });

    return () => mm.revert();
  }, []);

  return (
    <section className={s.hero} ref={scope} id="inicio-hero">
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
            <Link to="/catalogo" className="tbtn clear" data-hero="cta">
              <span>{INICIO.verCatalogo}</span>
              <span className={s.ctaFlecha} aria-hidden="true">→</span>
            </Link>
            <a href="#como" className="tbtn ghost" data-hero="cta">{INICIO.verComo}</a>
          </div>

          <div className={s.meta} data-hero="meta">
            <span className={`${s.metaDato} tnum`}>{conDatos(INICIO.metaAromas, { n: aromas })}</span>
            {desde ? (
              <span className={`${s.metaDato} tnum`}>{conDatos(INICIO.metaDesde, { desde: pesos(desde) })}</span>
            ) : null}
          </div>
        </div>

        {heroProducto && (
          <div className={s.showcase} data-hero="showcase">
            <button
              type="button"
              className={s.showcaseTile}
              onClick={() => onOpen?.(heroProducto)}
              aria-label={`Ver ${tituloDe(heroProducto)}`}
            >
              <ProductThumb producto={heroProducto} ratio="4 / 5" />
            </button>
            <span className={s.showcaseCap}>
              <span className={s.showcaseEtiqueta}>{INICIO.showcaseEtiqueta}</span>
              <span className={s.showcaseNombre}>{tituloDe(heroProducto)}</span>
            </span>
          </div>
        )}
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
