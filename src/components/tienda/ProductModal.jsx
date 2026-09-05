import { useEffect, useRef, useState } from 'react';
import { useCart } from '../../contexts/CartContext';
import { GENEROS, MOMENTOS } from '../../data/constants';
import { presentacionesActivas, presentacionPorDefecto, tieneNotas } from '../../lib/producto';
import { pesos } from '../../lib/format';
import ProductThumb from './ProductThumb';
import s from './ProductModal.module.css';

/**
 * Ficha del aroma. Las presentaciones de las dos lineas conviven acá como
 * opciones: la de Bagues y la de Unlock del mismo perfume, con el nombre que
 * le pone cada proveedora en letra chica.
 */
export default function ProductModal({ producto, onClose, promos = {} }) {
  const { addItem } = useCart();
  const opciones = presentacionesActivas(producto);
  const [ml, setMl] = useState(() => presentacionPorDefecto(producto)?.ml ?? null);
  const [cant, setCant] = useState(1);
  const cerrarRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    cerrarRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const elegida = opciones.find((p) => p.ml === ml) || null;
  const promo = elegida?.grupo_promo ? promos[elegida.grupo_promo] : null;

  function sumar() {
    if (!elegida) return;
    addItem(producto, elegida, cant);
    onClose();
  }

  return (
    <>
      <div className={s.overlay} onClick={onClose} />
      <div className={s.sheet} role="dialog" aria-modal="true" aria-label={producto.inspirado_en || producto.nombre}>
        <button ref={cerrarRef} className={s.cerrar} onClick={onClose} aria-label="Cerrar">✕</button>

        <div className={s.media} style={{ viewTransitionName: `aroma-${producto.id}` }}>
          <ProductThumb producto={producto} ratio="1 / 1" />
        </div>

        <div className={s.info}>
          <p className={s.meta}>
            {(GENEROS[producto.genero]?.label || '').toUpperCase()}
            {producto.momento ? ` · ${(MOMENTOS[producto.momento]?.label || '').toUpperCase()}` : ''}
            {producto.familia_olfativa ? ` · ${producto.familia_olfativa.toUpperCase()}` : ''}
          </p>

          <h2 className={s.nombre}>{producto.nombre}</h2>
          {producto.inspirado_en && (
            <p className={s.inspirado}>inspirado en {producto.inspirado_en}</p>
          )}

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
                        <span className={`${s.opMl} tnum`}>{p.ml} ml</span>
                        <span className={`${s.opPrecio} tnum`}>{pesos(p.precio)}</span>
                        {p.nombre_proveedor && (
                          <span className={s.opProv}>
                            {p.linea === 'unlock' ? 'Unlock' : 'Bagues'} · {p.nombre_proveedor}
                          </span>
                        )}
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
                  <button type="button" onClick={() => setCant((c) => Math.min(9, c + 1))} aria-label="Sumar">+</button>
                </div>
                <button type="button" className="tbtn" style={{ flex: 1 }} onClick={sumar} disabled={!elegida}>
                  Agregar al pedido
                </button>
              </div>
            </>
          ) : (
            <p className={s.desc}>Este aroma no está disponible en este ciclo.</p>
          )}

          <p className={s.aviso}>
            Trabajo por encargo: el pedido me llega por WhatsApp y te confirmo stock y tiempos.
            Retiro los viernes en Córdoba.
          </p>
        </div>
      </div>
    </>
  );
}
