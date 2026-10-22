import { Link } from 'react-router-dom';
import { INICIO } from '../../config/contenido';
import { pesos } from '../../lib/format';
import Flecha from './Flecha';
import s from './Hero.module.css';

/**
 * Hero D, "Cada perfume, una ciudad." (22/10/2026), sobre la escena del C.
 * Letra: Melodrama con el giro en la itálica de Boska. El botón va entre dos
 * trazos de plumilla, como el cierre de una carta (public/trazo.svg, lo dibuja
 * scripts/rediseno/trazo.py). En el celular todo va centrado; en escritorio el
 * texto sigue a la izquierda (decisión de Sebas: la imagen queda como está).
 *
 * Lo que sigue es de la versión C y sigue valiendo:
 *
 * La escena es UNA imagen horneada (public/hero/c/, la arma
 * hornear_hero.py del rediseño): pared vino con un halo rosa, cajas Bagués
 * reales detrás de un vidrio acanalado y una ventana en arco donde una caja se
 * ve nítida. "El mismo aroma, visto en otro frasco." Nada de WebGL: el vidrio
 * ya viene dibujado, así el LCP es una sola imagen precargada.
 *
 * La imagen deja libres las zonas del texto. En el celular el hero mide lo
 * mismo que la imagen (390 x 844, escalado al ancho): titular arriba, ventana
 * en el medio, precio y botón abajo, dentro del visor de Instagram (664). En
 * escritorio el texto va en la franja izquierda y la ventana queda a la derecha.
 *
 * Se conservan los ganchos que mide el banco (data-hero, data-qa): el sello,
 * la línea de datos, el botón y la cinta de nombres, que ahora son links a la
 * ficha de cada aroma (E3-B5).
 */
export default function Hero({
  settings, promos = {}, onVerPromo, onOpen,
  totalAromas, desde, nombresAromas = [],
}) {
  const lista = Object.values(promos);
  // El precio minimo y el numero de aromas llegan con la base. Hasta entonces
  // (y en el HTML pre-generado) su lugar queda reservado y vacio (UX-17).
  const [antesDesde, despuesDesde] = INICIO.datosDesde.split('{desde}');
  const [antesAromas, despuesAromas] = INICIO.datosAromas.split('{n}');

  function abrirAroma(e, item) {
    // Con el link de verdad en el href (se puede abrir en otra pestaña); el
    // toque normal abre la ficha encima de la portada, sin cambiar de página.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 || !onOpen) return;
    e.preventDefault();
    onOpen(item.producto);
  }

  return (
    <section className={s.hero} id="inicio-hero">
      <div className={s.caja}>
      <div className={s.escena} data-hero="escena" aria-hidden="true" />

      <div className={`tw ${s.inner}`}>
        <div className={s.texto}>
          <p className={s.corona} data-hero="corona">
            <span className={s.coronaMarca}>{INICIO.corona}</span>
            <span className={s.coronaAval}>{INICIO.aval}</span>
          </p>

          <h1 className={s.titulo}>
            {INICIO.titulo.map((linea, i) => (
              <span key={linea} className={s.lineaWrap}>
                <span className={`${s.linea} ${i === INICIO.titulo.length - 1 ? s.lineaItalica : ''}`} data-hero="linea">{linea}</span>
              </span>
            ))}
          </h1>

          <p className={s.bajada} data-hero="bajada">{INICIO.bajada}</p>
        </div>

        <div className={s.compra}>
          {/* El precio es lo que la clienta busca primero: grande y en tinta. */}
          <p className={`${s.meta} tnum`} data-hero="meta" data-qa="hero-datos">
            <span className={`${s.metaDato} ${s.metaDesde}`}>
              {antesDesde}<span className={`${s.metaNum} ${s.metaPrecio}`}>{desde ? pesos(desde) : ''}</span>{despuesDesde}
            </span>
            <span className={s.metaSep} aria-hidden="true"> · </span>
            <span className={s.metaDato}>
              {antesAromas}<span className={s.metaNum}>{totalAromas || ''}</span>{despuesAromas}
            </span>
            <span className={s.metaSep} aria-hidden="true"> · </span>
            <span className={s.metaDato}>{INICIO.datosEnvio}</span>
          </p>

          <div className={s.acciones}>
            <span className={s.carta}>
              <span className={s.trazo} aria-hidden="true" />
              <Link to="/catalogo" className={`tbtn ${s.cta}`} data-hero="cta" data-qa="hero-cta">
                <span>{INICIO.verCatalogo}</span>
                <span className={s.ctaFlecha} aria-hidden="true"><Flecha /></span>
              </Link>
              <span className={`${s.trazo} ${s.trazoDer}`} aria-hidden="true" />
            </span>
            <a href="#como" className={s.como} data-hero="como" data-qa="hero-como">{INICIO.verComo}</a>
          </div>

          {lista.length > 0 && (
            <div className={s.promos} data-hero="promos">
              {lista.map((p) => (
                <button key={p.grupo} type="button" className={`${s.promo} tbtn clear`} onClick={() => onVerPromo?.(p.grupo)}>
                  <span className={s.promoSello}>{INICIO.selloPromo}</span>
                  <span className={`${s.promoTexto} tnum`}>{p.titulo} · {pesos(p.precio_par)} {INICIO.porPar}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>

      {/* La cinta de nombres, de borde a borde. Duplicada para que el bucle no
          tenga costura: la copia va aria-hidden y fuera del orden de tabulación.
          Se frena con el puntero encima o con el foco adentro; quieta con
          movimiento reducido. Mientras no llegan los nombres conserva su alto. */}
      <nav className={s.cinta} data-hero="cinta" aria-label={INICIO.cintaEtiqueta}>
        <div className={s.cintaPista}>
          {nombresAromas.length < 6 && <span className={s.cintaItem}>&nbsp;</span>}
          {nombresAromas.length >= 6 && [0, 1].map((copia) => nombresAromas.map((n) => (
            <a
              key={`${n.slug}-${copia}`}
              href={`/catalogo?aroma=${encodeURIComponent(n.slug)}`}
              className={s.cintaItem}
              data-qa="cinta-aroma"
              onClick={(e) => abrirAroma(e, n)}
              {...(copia ? { 'aria-hidden': 'true', tabIndex: -1 } : {})}
            >
              {n.nombre}
              <span className={s.cintaPunto} aria-hidden="true">·</span>
            </a>
          )))}
        </div>
      </nav>
    </section>
  );
}
