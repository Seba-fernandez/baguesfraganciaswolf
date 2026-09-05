import { useState } from 'react';
import { useCart } from '../../contexts/CartContext';
import { presentacionesActivas, presentacionPorDefecto } from '../../lib/producto';
import { pesos } from '../../lib/format';
import ProductThumb from './ProductThumb';
import s from './ProductCard.module.css';

/**
 * Una tarjeta por AROMA. Las presentaciones son opciones adentro, nunca
 * tarjetas aparte: el mismo perfume aparece en los dos catalogos con nombres
 * de proveedor distintos (Arizona es Sauvage) y mostrarlos separados hace
 * que la clienta vea dos cosas sin relacion.
 *
 * El titulo es el aroma. El nombre del proveedor va en letra chica dentro de
 * la opcion, que es donde sirve.
 */
export default function ProductCard({ producto, onOpen, promos = {}, vtName = 'none' }) {
  const { addItem } = useCart();
  const opciones = presentacionesActivas(producto);
  const [ml, setMl] = useState(() => presentacionPorDefecto(producto)?.ml ?? null);
  const elegida = opciones.find((p) => p.ml === ml) || opciones[0] || null;

  return (
    <article className={s.card}>
      <button
        type="button"
        className={s.media}
        onClick={() => onOpen(producto)}
        aria-label={`Ver ${producto.inspirado_en || producto.nombre}`}
        style={{ viewTransitionName: vtName }}
      >
        <ProductThumb producto={producto} />
      </button>

      <div className={s.body}>
        <button type="button" className={s.titulo} onClick={() => onOpen(producto)}>
          {producto.nombre}
        </button>
        {producto.inspirado_en && (
          <p className={s.inspirado}>inspirado en {producto.inspirado_en}</p>
        )}

        <div className={s.opciones} role="group" aria-label="Elegir presentación">
          {opciones.map((p) => {
            const activa = p.ml === elegida?.ml;
            const promo = p.grupo_promo ? promos[p.grupo_promo] : null;
            return (
              <button
                key={`${p.ml}-${p.codigo}`}
                type="button"
                className={`${s.opcion} ${activa ? s.opcionOn : ''}`}
                aria-pressed={activa}
                onClick={() => setMl(p.ml)}
              >
                <span className={`${s.ml} tnum`}>{p.ml} ml</span>
                <span className={s.precios}>
                  {p.precio_anterior ? (
                    <span className={`${s.antes} tnum`}>{pesos(p.precio_anterior)}</span>
                  ) : null}
                  <span className={`${s.precio} tnum`}>{pesos(p.precio)}</span>
                </span>
                {promo ? <span className={s.sello}>2x1</span> : null}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className={`tbtn ${s.add}`}
          onClick={() => addItem(producto, elegida, 1)}
          disabled={!elegida}
        >
          Agregar
        </button>
      </div>
    </article>
  );
}
