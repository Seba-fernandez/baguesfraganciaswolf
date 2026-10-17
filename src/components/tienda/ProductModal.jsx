import { useEffect, useRef, useState } from 'react';
import { useCart } from '../../contexts/CartContext';
import useDialogo from '../../hooks/useDialogo';
import { GENEROS, MOMENTOS } from '../../data/constants';
import { presentacionesActivas, presentacionPorDefecto, tieneNotas, tituloDe, detalleLinea } from '../../lib/producto';
import { pesos } from '../../lib/format';
import { copiarTexto, linkDeAroma } from '../../lib/compartir';
import { FICHA } from '../../config/contenido';
import { CANTIDAD_MAXIMA } from '../../config/ajustes';
import ProductThumb from './ProductThumb';
import s from './ProductModal.module.css';

/**
 * Ficha del aroma. Las presentaciones de las dos lineas conviven acá como
 * opciones: la de Bagues y la de Unlock del mismo perfume, con el nombre que
 * le pone cada proveedora en letra chica.
 */
export default function ProductModal({ producto, onClose, promos = {}, disparador = null }) {
  const { addItem } = useCart();
  const opciones = presentacionesActivas(producto);
  const [ml, setMl] = useState(() => presentacionPorDefecto(producto)?.ml ?? null);
  const [cant, setCant] = useState(1);
  const cerrarRef = useRef(null);
  const copiarRef = useRef(null);
  // '' sin tocar, 'ok' copiado, 'manual' el navegador no dejo copiar.
  const [copia, setCopia] = useState('');
  const link = linkDeAroma(producto.slug);

  async function copiarLink() {
    const ok = await copiarTexto(link);
    copiarRef.current?.focus();
    setCopia(ok ? 'ok' : 'manual');
    if (ok) setTimeout(() => setCopia((c) => (c === 'ok' ? '' : c)), 2200);
  }

  // Foco adentro al abrir, Escape cierra y al cerrar vuelve a la tarjeta.
  useDialogo({ abierto: true, onCerrar: onClose, refInicial: cerrarRef, disparador });

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const elegida = opciones.find((p) => p.ml === ml) || null;
  const titulo = tituloDe(producto);
  const promo = elegida?.grupo_promo ? promos[elegida.grupo_promo] : null;

  function sumar() {
    if (!elegida) return;
    addItem(producto, elegida, cant);
    onClose();
  }

  return (
    <>
      <div className={s.overlay} onClick={onClose} />
      <div className={s.sheet} role="dialog" aria-modal="true" aria-label={titulo} data-dialogo="ficha">
        <button ref={cerrarRef} className={s.cerrar} onClick={onClose} aria-label="Cerrar">✕</button>
        <button ref={copiarRef} type="button" className={s.copiar} onClick={copiarLink}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {copia === 'ok'
              ? <path d="M5 12.5l4.5 4.5L19 7.5" />
              : <><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" /><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" /></>}
          </svg>
          <span aria-live="polite">{copia === 'ok' ? FICHA.linkCopiado : FICHA.copiarLink}</span>
        </button>
        {copia === 'manual' && (
          <div className={s.linkManual}>
            <label htmlFor="ficha-link">{FICHA.linkManual}</label>
            <input id="ficha-link" readOnly value={link} onFocus={(e) => e.target.select()} autoFocus />
          </div>
        )}

        <div className={s.media}>
          <ProductThumb
            producto={producto}
            ratio="3 / 4"
            linea={elegida?.linea}
            sizes="(max-width: 767px) 92vw, 380px"
          />
        </div>

        <div className={s.info}>
          <p className={s.meta}>
            {(GENEROS[producto.genero]?.label || '').toUpperCase()}
            {producto.momento ? ` · ${(MOMENTOS[producto.momento]?.label || '').toUpperCase()}` : ''}
            {producto.familia_olfativa ? ` · ${producto.familia_olfativa.toUpperCase()}` : ''}
          </p>

          <h2 className={s.nombre}>{titulo}</h2>
          <p className={s.inspirado}>{FICHA.inspirado}</p>

          {producto.descripcion_larga && <p className={s.desc}>{producto.descripcion_larga}</p>}

          {tieneNotas(producto) && (
            <div className={s.piramide}>
              {producto.nota_salida && (
                <div className={s.nota}><span className={s.notaEtapa}>Salida</span><span>{producto.nota_salida}</span></div>
              )}
              {producto.nota_corazon && (
                <div className={s.nota}><span className={s.notaEtapa}>Corazón</span><span>{producto.nota_corazon}</span></div>
              )}
              {producto.nota_fondo && (
                <div className={s.nota}><span className={s.notaEtapa}>Fondo</span><span>{producto.nota_fondo}</span></div>
              )}
            </div>
          )}

          {opciones.length > 0 ? (
            <>
              <div className={s.campo}>
                <span className="tlabel">Presentación</span>
                <div className={s.opciones} role="group" aria-label="Elegir presentación">
                  {opciones.map((p) => {
                    const on = p.ml === ml;
                    return (
                      <button
                        key={`${p.ml}-${p.codigo}`}
                        type="button"
                        className={`${s.opcion} ${on ? s.opcionOn : ''}`}
                        aria-pressed={on}
                        onClick={() => setMl(p.ml)}
                      >
                        <span className={s.opIzq}>
                          <span className={`${s.opMl} tnum`}>{p.ml} ml</span>
                          <span className={s.opProv}>{detalleLinea(p, titulo)}</span>
                        </span>
                        <span className={`${s.opPrecio} tnum`}>
                          {p.precio_anterior ? <s className={s.opAntes}>{pesos(p.precio_anterior)}</s> : null}
                          <span>{pesos(p.precio)}</span>
                        </span>
                        {p.grupo_promo && promos[p.grupo_promo] && <span className={s.opSello}>2x1</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {promo && (
                <p className={`${s.promoNota} tnum`}>
                  Llevando de a pares: {pesos(promo.precio_par)} el par, {pesos(Math.round(promo.precio_par / 2))} cada uno.
                </p>
              )}

              <div className={s.fila}>
                <div className={s.stepper} role="group" aria-label="Cantidad">
                  <button type="button" onClick={() => setCant((c) => Math.max(1, c - 1))} aria-label="Restar">-</button>
                  <span className="tnum">{cant}</span>
                  <button type="button" onClick={() => setCant((c) => Math.min(CANTIDAD_MAXIMA, c + 1))} aria-label="Sumar">+</button>
                </div>
                <button type="button" className="tbtn" style={{ flex: 1 }} onClick={sumar} disabled={!elegida}>
                  {FICHA.agregar}
                </button>
              </div>
            </>
          ) : (
            <p className={s.desc}>{FICHA.sinCiclo}</p>
          )}

          <p className={s.aviso}>{FICHA.aviso}</p>
        </div>
      </div>
    </>
  );
}
