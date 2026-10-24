import { useEffect, useRef, useState } from 'react';
import { useCart } from '../../contexts/CartContext';
import { ahorroDe, esPublicable, lineaTarjeta, presentacionesActivas, presentacionPorDefecto, tituloDe } from '../../lib/producto';
import { precargarFoto } from '../../lib/fotos';
import { pesos } from '../../lib/format';
import { DESTACADOS, TARJETA, conDatos } from '../../config/contenido';
import { DESTACADOS_MAXIMO, PROPORCION } from '../../config/ajustes';
import ProductThumb from './ProductThumb';
import s from './Destacados.module.css';

/**
 * Los más pedidos (antes "Los que siempre salen"; rediseño D, plano 4: el clímax). La sección entera
 * del vino de la marca, como la banda roja de NOIR, con las fotos de producto
 * sobre la misma pared del hero. El vidrio sobre las tarjetas del rediseño C
 * se sacó: Sebas lo sintió pegado encima; el vidrio vive solo en el hero.
 * Una fila que se desliza; precio a pagar en crema y el de lista tachado al
 * lado (no negociable 11).
 * En escritorio, flechas a los costados; en el celular, el dedo.
 */
export default function Destacados({ products, onOpen, onElegir, cargando = false }) {
  const filaRef = useRef(null);
  const { addItem } = useCart();
  const destacados = products.filter((p) => p.activo && p.destacado && esPublicable(p)).slice(0, DESTACADOS_MAXIMO);
  // La flecha de la izquierda aparece recien cuando hay algo para atras: al
  // arrancar tapaba el borde de la primera foto sin llevar a ningun lado.
  const [alInicio, setAlInicio] = useState(true);
  useEffect(() => {
    const el = filaRef.current;
    if (!el) return undefined;
    const medir = () => setAlInicio(el.scrollLeft <= 4);
    medir();
    el.addEventListener('scroll', medir, { passive: true });
    return () => el.removeEventListener('scroll', medir);
  }, [cargando]);

  /** El + de la tarjeta: con un tamano agrega directo; con mas, la hoja. */
  function mas(p) {
    const base = presentacionPorDefecto(p);
    if (!base) return;
    if (presentacionesActivas(p).length > 1 && onElegir) onElegir(p);
    else addItem(p, base, 1);
  }
  // Mientras carga se dibuja la vidriera con su titulo y tarjetas de espera
  // del mismo tamano: en el celular empieza dentro de la primera pantalla, y
  // aparecer de golpe empujaba lo de abajo (CLS, etapa 3B). Tambien es lo que
  // trae el HTML pre-generado.
  if (!cargando && !destacados.length) return null;

  function mover(dir) {
    const el = filaRef.current;
    if (!el) return;
    // En el celular, de a una tarjeta (la centrada pasa a ser la siguiente);
    // en escritorio, una tanda entera: las que entran en la ventana, asi la
    // que llega queda pegada al corte izquierdo, nunca a medias.
    const primera = el.firstElementChild;
    const hueco = parseFloat(getComputedStyle(el).columnGap) || 14;
    const ancho = primera ? primera.getBoundingClientRect().width + hueco : 0;
    const paso = !ancho
      ? el.clientWidth * 0.8
      : window.innerWidth < 780
        ? ancho
        : ancho * Math.max(1, Math.floor((el.clientWidth + hueco) / ancho));
    const max = el.scrollWidth - el.clientWidth;
    const borde = 4;
    if (dir > 0) {
      // Al final, vuelve al inicio; si no, avanza una tanda.
      if (el.scrollLeft >= max - borde) el.scrollTo({ left: 0, behavior: 'smooth' });
      else el.scrollBy({ left: paso, behavior: 'smooth' });
    } else {
      if (el.scrollLeft <= borde) el.scrollTo({ left: max, behavior: 'smooth' });
      else el.scrollBy({ left: -paso, behavior: 'smooth' });
    }
  }

  return (
    <section className={s.section}>
      <div className={`tw ${s.marco}`}>
        <header className={s.head}>
          <h2 className={s.titulo}>{DESTACADOS.titulo}</h2>
          <p className={s.bajada}>{DESTACADOS.bajada}</p>
        </header>

        <div className={s.carrusel}>
          <button
            type="button"
            className={`${s.flecha} ${s.flechaIzq} ${alInicio ? s.flechaOculta : ''} tglass-clear`}
            onClick={() => mover(-1)}
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
            {!cargando && destacados.map((p) => {
              const pres = presentacionPorDefecto(p);
              return (
                <div
                  key={p.id}
                  className={s.item}
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
                        </span>
                      )}
                    </span>
                  </button>
                  {/* El + en vidrio liquido, sobre la foto: deja ver el frasco
                      a traves en vez de taparlo con un circulo de color. */}
                  {pres && (
                    <span className={s.sobreFoto} style={{ aspectRatio: PROPORCION.destacado }}>
                    <button
                      type="button"
                      className={`${s.mas} tglass-clear`}
                      onClick={() => mas(p)}
                      aria-label={conDatos(TARJETA.agregar, { nombre: tituloDe(p) })}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                    </button>
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <button type="button" className={`${s.flecha} ${s.flechaDer} tglass-clear`} onClick={() => mover(1)} aria-label="Siguiente">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
