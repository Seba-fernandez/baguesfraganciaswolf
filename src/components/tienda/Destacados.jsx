import { Fragment, memo, useCallback, useEffect, useRef, useState } from 'react';
import { useCart } from '../../contexts/CartContext';
import { ahorroDe, esPublicable, lineaTarjeta, presentacionesActivas, presentacionPorDefecto, tituloDe } from '../../lib/producto';
import { precargarFoto } from '../../lib/fotos';
import { medirDeNuevo } from '../../lib/alScroll';
import { pesos } from '../../lib/format';
import { DESTACADOS, TARJETA, conDatos } from '../../config/contenido';
import { PROPORCION } from '../../config/ajustes';
import ProductThumb from './ProductThumb';
import s from './Destacados.module.css';

const dos = (n) => String(n).padStart(2, '0');

/**
 * Una tarjeta. Despues de agregar, el + pasa a tilde 1,2 s y suelta una onda
 * (como ProductCard): confirma sin abrir nada, venga de donde venga.
 */
const Tarjeta = memo(function Tarjeta({ p, activa, onOpen, onMas }) {
  const { ultimo } = useCart();
  const [hecho, setHecho] = useState(false);
  useEffect(() => {
    if (!ultimo || ultimo.productId !== p.id || Date.now() - ultimo.t > 1000) return undefined;
    setHecho(true);
    const t = setTimeout(() => setHecho(false), 1200);
    return () => clearTimeout(t);
  }, [ultimo, p.id]);
  const pres = presentacionPorDefecto(p);
  return (
    <div
      className={s.item}
      data-activa={activa || undefined}
      onPointerEnter={() => precargarFoto(p, pres?.linea)}
      onPointerDown={() => precargarFoto(p, pres?.linea)}
    >
      <button type="button" className={s.abrir} onClick={() => onOpen(p)}>
        <span className={s.media}>
          <ProductThumb producto={p} ratio={PROPORCION.destacado} sizes="(max-width: 779px) 62vw, 260px" />
        </span>
        <span className={s.info}>
          <span className={s.nombre}>{tituloDe(p)}</span>
          {lineaTarjeta(p) && <span className={s.casa}>{lineaTarjeta(p)}</span>}
          {pres && (
            <span className={`${s.precio} tnum`}>
              {pesos(pres.precio)}
              {ahorroDe(pres) > 0 && <s className={s.antes}>{pesos(pres.precio_anterior)}</s>}
              <svg className={s.ver} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
          )}
        </span>
      </button>
      {/* El + en vidrio liquido, sobre la foto (no puede ir dentro del boton
          que abre la ficha): deja ver el frasco a traves. */}
      {pres && (
        <span className={s.sobreFoto} style={{ aspectRatio: PROPORCION.destacado }}>
          <button
            type="button"
            className={`${s.mas} tglass-clear`}
            data-estado={hecho ? 'hecho' : undefined}
            onClick={() => onMas(p)}
            aria-label={conDatos(TARJETA.agregar, { nombre: tituloDe(p) })}
          >
            {hecho && <span className={s.onda} aria-hidden="true" />}
            <svg className={s.icoMas} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            <svg className={s.icoHecho} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
          </button>
        </span>
      )}
    </div>
  );
});

/**
 * Los más pedidos (rediseño D, plano 4: el clímax). La sección entera del vino
 * de la marca, con las fotos sobre la misma pared del hero. Una fila que se
 * desliza; precio a pagar en crema y el de lista tachado (no negociable 11).
 *
 * Banda recta que, al quedar en pantalla, se expande en vino hasta cubrirla
 * entera (dos panos con scaleY) y vuelve a su lugar al seguir de largo.
 *
 * El movimiento (26/11, "a la altura de un estudio"): nada atado a pausar el
 * scroll. El titulo sube palabra por palabra al entrar; en el celular la
 * tarjeta del medio queda entera y las de los costados se achican apenas,
 * siguiendo al dedo; abajo, un selector con una pildora que corre con la fila
 * y un contador que rueda. Flechas magneticas en escritorio.
 */
export default function Destacados({ products, onOpen, onElegir, cargando = false }) {
  const seccionRef = useRef(null);
  const filaRef = useRef(null);
  const pildoraRef = useRef(null);
  const { addItem } = useCart();
  const destacados = products.filter((p) => p.activo && p.destacado && esPublicable(p));
  const total = destacados.length;

  // Lo que mide la fila: la tarjeta activa (la del medio en el celular, la
  // primera de la tanda en escritorio), cuantas entran y si hay para atras.
  // Un solo oyente, el de la propia fila, con una pasada por cuadro. La
  // pildora se mueve por estilo directo (transform): React solo se entera
  // cuando cambia la tarjeta activa.
  const [activa, setActiva] = useState(0);
  const [visibles, setVisibles] = useState(1);
  const [alInicio, setAlInicio] = useState(true);
  useEffect(() => {
    const el = filaRef.current;
    if (!el || cargando) return undefined;
    let cuadro = 0;
    const medir = () => {
      cuadro = 0;
      const primera = el.firstElementChild;
      const hueco = parseFloat(getComputedStyle(el).columnGap) || 14;
      const ancho = primera ? primera.getBoundingClientRect().width + hueco : 0;
      if (!ancho) return;
      const n = el.childElementCount;
      const entran = window.innerWidth < 780 ? 1 : Math.max(1, Math.min(n, Math.round((el.clientWidth + hueco) / ancho)));
      const max = el.scrollWidth - el.clientWidth;
      const avance = max > 0 ? Math.min(1, Math.max(0, el.scrollLeft / max)) : 0;
      setActiva(Math.min(n - entran, Math.max(0, Math.round(el.scrollLeft / ancho))));
      setVisibles(entran);
      setAlInicio(el.scrollLeft <= 4);
      const pil = pildoraRef.current;
      if (pil) pil.style.transform = `translate3d(${(avance * (n - entran) * 100) / entran}%, 0, 0)`;
    };
    const pedir = () => { if (!cuadro) cuadro = requestAnimationFrame(medir); };
    medir();
    el.addEventListener('scroll', pedir, { passive: true });
    window.addEventListener('resize', pedir, { passive: true });
    return () => {
      el.removeEventListener('scroll', pedir);
      window.removeEventListener('resize', pedir);
      if (cuadro) cancelAnimationFrame(cuadro);
    };
  }, [cargando, total]);

  // La entrada del titulo: cuando la seccion asoma, una clase. Solo si
  // arranca por debajo de la pantalla (si ya se ve, no se esconde nada) y con
  // movimiento permitido. Sin JS, todo queda a la vista desde el HTML.
  const hay = cargando || total > 0;
  useEffect(() => {
    const sec = seccionRef.current;
    if (!hay || !sec || typeof IntersectionObserver === 'undefined') return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    if (sec.getBoundingClientRect().top < window.innerHeight * 0.85) return undefined;
    sec.dataset.entrada = 'espera';
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      sec.dataset.entrada = 'llego';
      io.disconnect();
    }, { rootMargin: '0px 0px -18% 0px' });
    io.observe(sec);
    return () => { io.disconnect(); delete sec.dataset.entrada; };
  }, [hay]);

  // La banda inmersiva: los dos panos vino (scaleY) cubren todo cuando la
  // seccion ya ocupa casi toda la pantalla. Un IntersectionObserver sin
  // rootMargin y con muchos umbrales (de a 0,02), sin oyente de scroll nuevo.
  // Disparo "cloc" (Sebas, 26/11: "que no aparezca taaan antes ni que haya que
  // scrollear demasiado; como un cloc que se acomoda en los topes y apenas
  // scrolleas se despega"): prende cuando se ve el 90 % de lo que podria verse
  // y apaga por debajo del 85 % (con 80 % hacian falta ~150 px para
  // despegarlo en el celular; asi, ~100). Entre medio no cambia (histeresis):
  // no titila en el borde. Como la barra decide su color con elementsFromPoint
  // (que no ve los panos, pointer-events none), solo cuando el estado cambia
  // de verdad se pide una pasada a alScroll (medirDeNuevo) y la barra mira
  // data-inmerso. Sin JS o con movimiento reducido: banda recta.
  useEffect(() => {
    const sec = seccionRef.current;
    if (!hay || !sec || typeof IntersectionObserver === 'undefined') return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const umbrales = Array.from({ length: 51 }, (_, i) => i / 50);
    let dentro = false;
    const io = new IntersectionObserver(([e]) => {
      const visible = e.intersectionRect.height;
      const cabe = Math.min(e.boundingClientRect.height, window.innerHeight);
      let ahora = dentro;
      if (visible >= cabe * 0.9) ahora = true;
      else if (visible < cabe * 0.85) ahora = false;
      if (ahora === dentro) return;
      dentro = ahora;
      if (dentro) sec.dataset.inmerso = '';
      else delete sec.dataset.inmerso;
      medirDeNuevo();
    }, { threshold: umbrales });
    io.observe(sec);
    return () => { io.disconnect(); delete sec.dataset.inmerso; medirDeNuevo(); };
  }, [hay]);

  /** El + de la tarjeta: con un tamano agrega directo; con mas, la hoja.
   *  Estable (useCallback): las tarjetas van con memo y, al cambiar la activa
   *  mientras se desliza la fila, solo se vuelven a dibujar las dos que cambian. */
  const mas = useCallback((p) => {
    const base = presentacionPorDefecto(p);
    if (!base) return;
    if (presentacionesActivas(p).length > 1 && onElegir) onElegir(p);
    else addItem(p, base, 1);
  }, [onElegir, addItem]);
  // Mientras carga se dibuja la vidriera con su titulo y tarjetas de espera
  // del mismo tamano: aparecer de golpe empujaba lo de abajo (CLS, etapa 3B).
  // Tambien es lo que trae el HTML pre-generado.
  if (!hay) return null;

  function irA(i) {
    const el = filaRef.current;
    const destino = el?.children[i];
    if (!destino) return;
    const movil = window.innerWidth < 780;
    const izq = movil
      ? destino.offsetLeft - (el.clientWidth - destino.offsetWidth) / 2
      : destino.offsetLeft - parseFloat(getComputedStyle(el).paddingLeft || 0);
    el.scrollTo({ left: Math.max(0, izq), behavior: 'smooth' });
  }

  function mover(dir) {
    const el = filaRef.current;
    if (!el) return;
    const n = el.childElementCount;
    const paso = visibles;
    const ultimaTanda = Math.max(0, n - visibles);
    if (dir > 0) irA(activa >= ultimaTanda ? 0 : Math.min(ultimaTanda, activa + paso));
    else irA(activa <= 0 ? ultimaTanda : Math.max(0, activa - paso));
  }

  // Flechas magneticas (escritorio, con mouse): se corren unos pixeles hacia
  // el puntero y vuelven al soltarlo. `translate` y no `transform`: el toque
  // del vidrio usa transform.
  function iman(e) {
    if (e.pointerType !== 'mouse') return;
    const b = e.currentTarget;
    const r = b.getBoundingClientRect();
    const dx = ((e.clientX - r.left) / r.width - 0.5) * 8;
    const dy = ((e.clientY - r.top) / r.height - 0.5) * 8;
    b.style.translate = `${dx.toFixed(1)}px calc(-50% + ${dy.toFixed(1)}px)`;
  }
  function soltar(e) { e.currentTarget.style.translate = ''; }

  const palabras = DESTACADOS.titulo.split(' ');
  const hayPaginas = !cargando && total > visibles;
  const hasta = Math.min(total, activa + visibles);

  return (
    <section className={s.section} ref={seccionRef}>
      <div className={s.pano} data-pano="arriba" aria-hidden="true" />
      <div className={s.pano} data-pano="abajo" aria-hidden="true" />
      <div className={s.banda}>
        <div className={`tw ${s.marco}`}>
          <header className={s.head}>
            <h2 className={s.titulo} aria-label={DESTACADOS.titulo}>
              {palabras.map((w, i) => (
                <Fragment key={i}>
                  {i > 0 && ' '}
                  <span className={s.palabra} aria-hidden="true">
                    <span className={s.sube} style={{ '--i': i }}>{w}</span>
                  </span>
                </Fragment>
              ))}
            </h2>
            <p className={s.bajada}>{DESTACADOS.bajada}</p>
          </header>

          <div className={s.carrusel}>
            <button
              type="button"
              className={`${s.flecha} ${s.flechaIzq} ${alInicio ? s.flechaOculta : ''} tglass-clear`}
              onClick={() => mover(-1)}
              onPointerMove={iman}
              onPointerLeave={soltar}
              aria-label="Anterior"
              tabIndex={alInicio ? -1 : undefined}
              aria-hidden={alInicio || undefined}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>

            <div className={s.fila} ref={filaRef}>
              {cargando && Array.from({ length: 4 }, (_, i) => (
                <span key={i} className={`${s.item} ${s.espera}`} aria-hidden="true">
                  <span className={s.esperaFoto} />
                  <span className={s.info}>
                    <span className={s.esperaLinea} />
                    <span className={`${s.esperaLinea} ${s.esperaCorta}`} />
                    <span className={`${s.esperaLinea} ${s.esperaCorta}`} />
                  </span>
                </span>
              ))}
              {!cargando && destacados.map((p, i) => (
                <Tarjeta key={p.id} p={p} activa={i === activa} onOpen={onOpen} onMas={mas} />
              ))}
            </div>

            <button
              type="button"
              className={`${s.flecha} ${s.flechaDer} tglass-clear`}
              onClick={() => mover(1)}
              onPointerMove={iman}
              onPointerLeave={soltar}
              aria-label="Siguiente"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>

          {/* El selector: contador que rueda y una pista con la pildora que
              corre con la fila. Cada tramo de la pista lleva a su tarjeta. */}
          <div className={`${s.selector} ${hayPaginas ? '' : s.selectorOculto}`} aria-hidden={!hayPaginas || undefined}>
            <span className={`${s.contador} tnum`} aria-hidden="true">
              <span className={s.rueda}><span key={activa} className={s.cifra}>{dos(activa + 1)}</span></span>
              {visibles > 1 && <span className={s.rueda}>{' a '}<span key={`h${hasta}`} className={s.cifra}>{dos(hasta)}</span></span>}
              <span className={s.de}>/ {dos(total)}</span>
            </span>
            <div className={s.pista}>
              <span className={s.riel} aria-hidden="true">
                <span ref={pildoraRef} className={s.pildora} style={{ width: `${(visibles / Math.max(1, total)) * 100}%` }} />
              </span>
              {!cargando && destacados.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  className={s.tramo}
                  onClick={() => irA(Math.min(i, Math.max(0, total - visibles)))}
                  aria-label={`Ir a ${tituloDe(p)}`}
                  tabIndex={hayPaginas ? undefined : -1}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
