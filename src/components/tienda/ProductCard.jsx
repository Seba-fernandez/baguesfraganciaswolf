import { useState } from 'react';
import { useCart } from '../../contexts/CartContext';
import { presentacionesActivas, presentacionPorDefecto, tituloDe } from '../../lib/producto';
import { pesos } from '../../lib/format';
import { TARJETA } from '../../config/contenido';
import ProductThumb from './ProductThumb';
import s from './ProductCard.module.css';

/**
 * Una tarjeta por AROMA, compacta: entra de a dos por fila en el celular.
 *
 * Lo justo para decidir: foto, nombre del perfume, el tamano (si hay mas de
 * uno) y el precio. El detalle fino (de que linea es cada frasco, su nombre de
 * proveedor, la piramide olfativa) vive en la ficha, que se abre tocando la
 * tarjeta. Antes estaba todo apretado en la tarjeta y se leia cargado.
 */
export default function ProductCard({ producto, onOpen, promos = {} }) {
  const { addItem } = useCart();
  const opciones = presentacionesActivas(producto);
  const [ml, setMl] = useState(() => presentacionPorDefecto(producto)?.ml ?? null);
  const elegida = opciones.find((p) => p.ml === ml) || opciones[0] || null;
  const titulo = tituloDe(producto);
  const hayPromo = opciones.some((p) => p.grupo_promo && promos[p.grupo_promo]);

  return (
    <article className={`${s.card} tglass-lite`}>
      <button
        type="button"
        className={s.media}
        onClick={() => onOpen(producto)}
        aria-label={`Ver ${titulo}`}
      >
        <ProductThumb producto={producto} linea={elegida?.linea} />
        {hayPromo && <span className={s.promoTag}>2x1</span>}
      </button>

      <div className={s.body}>
        <button type="button" className={s.titulo} onClick={() => onOpen(producto)}>
          {titulo}
        </button>
        <p className={s.inspirado}>{TARJETA.inspirado}</p>

        {opciones.length > 1 && (
          <div className={s.tallas} role="group" aria-label="Elegir tamaño">
            {opciones.map((p) => (
              <button
                key={`${p.ml}-${p.codigo}`}
                type="button"
                className={`${s.talla} tnum ${p.ml === elegida?.ml ? s.tallaOn : ''}`}
                aria-pressed={p.ml === elegida?.ml}
                onClick={() => setMl(p.ml)}
              >
                {p.ml} ml
              </button>
            ))}
          </div>
        )}

        <div className={s.pie}>
          <span className={s.precioWrap}>
            {elegida?.precio_anterior ? (
              <span className={`${s.antes} tnum`}>{pesos(elegida.precio_anterior)}</span>
            ) : null}
            <span className={`${s.precio} tnum`}>{pesos(elegida?.precio)}</span>
          </span>
          <button
            type="button"
            className={s.add}
            onClick={() => addItem(producto, elegida, 1)}
            disabled={!elegida}
            aria-label={`Agregar ${titulo} al pedido`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      </div>
    </article>
  );
}
