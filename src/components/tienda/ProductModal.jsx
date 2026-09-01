import { useEffect, useState } from 'react';
import { useCart } from '../../contexts/CartContext';
import { GENEROS, MOMENTOS } from '../../data/constants';
import { presentacionesActivas, presentacionPorDefecto, tieneNotas } from '../../lib/producto';
import { pesos } from '../../lib/format';
import ProductThumb from './ProductThumb';
import s from './ProductModal.module.css';

export default function ProductModal({ producto, onClose }) {
  const { addItem } = useCart();
  const presentaciones = presentacionesActivas(producto);
  const [ml, setMl] = useState(() => presentacionPorDefecto(producto)?.ml ?? null);
  const [cant, setCant] = useState(1);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const pres = presentaciones.find((p) => p.ml === ml) || null;

  function sumar() {
    if (!pres) return;
    addItem(producto, pres, cant);
    onClose();
  }

  return (
    <>
      <div className={s.overlay} onClick={onClose} />
      <div className={s.sheet} role="dialog" aria-modal="true" aria-label={producto.nombre}>
        <button className={s.close} onClick={onClose} aria-label="Cerrar">✕</button>

        <div className={s.media}>
          <ProductThumb src={producto.imagen_url} alt={producto.nombre} />
        </div>

        <div className={s.info}>
          <span className={s.tag}>
            {(GENEROS[producto.genero]?.label || '').toUpperCase()} · {(MOMENTOS[producto.momento]?.label || '').toUpperCase()}
            {producto.familia_olfativa ? ` · ${producto.familia_olfativa.toUpperCase()}` : ''}
          </span>
          <h2 className={s.name}>{producto.nombre}</h2>
          {producto.descripcion_larga && <p className={s.desc}>{producto.descripcion_larga}</p>}

          {tieneNotas(producto) && (
            <div className={s.pyramid}>
              {producto.nota_salida && (
                <div className={s.row}><span className={s.stage}>Salida</span><span className={s.note}>{producto.nota_salida}</span></div>
              )}
              {producto.nota_corazon && (
                <div className={s.row}><span className={s.stage}>Corazón</span><span className={s.note}>{producto.nota_corazon}</span></div>
              )}
              {producto.nota_fondo && (
                <div className={s.row}><span className={s.stage}>Fondo</span><span className={s.note}>{producto.nota_fondo}</span></div>
              )}
            </div>
          )}

          {presentaciones.length > 0 ? (
            <>
              <div className={s.field}>
                <span className={s.label}>Tamaño</span>
                <div className={s.sizes} role="group" aria-label="Elegir tamaño">
                  {presentaciones.map((p) => (
                    <button
                      key={p.ml}
                      type="button"
                      className={`${s.size} ${ml === p.ml ? s.sizeOn : ''}`}
                      aria-pressed={ml === p.ml}
                      onClick={() => setMl(p.ml)}
                    >
                      {p.ml}ml · {pesos(p.precio)}
                    </button>
                  ))}
                </div>
              </div>

              <div className={s.row2}>
                <div className={s.stepper} role="group" aria-label="Cantidad">
                  <button type="button" onClick={() => setCant((c) => Math.max(1, c - 1))} aria-label="Restar">−</button>
                  <span>{cant}</span>
                  <button type="button" onClick={() => setCant((c) => Math.min(9, c + 1))} aria-label="Sumar">+</button>
                </div>
                <button type="button" className="tbtn wide" style={{ flex: 1 }} onClick={sumar} disabled={!pres}>
                  Sumar al pedido <span className="circ">↗</span>
                </button>
              </div>
            </>
          ) : (
            <p className={s.desc}>Este perfume está fuera del catálogo por ahora.</p>
          )}

          <p className={s.notice}>
            Trabajo por encargo: <b>tu pedido me llega por WhatsApp</b> y te confirmo stock y tiempos. Retiro los viernes en Córdoba.
          </p>
        </div>
      </div>
    </>
  );
}
