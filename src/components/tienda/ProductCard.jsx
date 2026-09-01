import { useCart } from '../../contexts/CartContext';
import { presentacionPorDefecto, rangoPrecio } from '../../lib/producto';
import { pesos } from '../../lib/format';
import { GENEROS, MOMENTOS } from '../../data/constants';
import ProductThumb from './ProductThumb';
import s from './ProductCard.module.css';

export default function ProductCard({ producto, onOpen, accent = 'acid' }) {
  const { addItem } = useCart();
  const rango = rangoPrecio(producto);

  function sumarDirecto(e) {
    e.stopPropagation();
    const pres = presentacionPorDefecto(producto);
    addItem(producto, pres, 1);
  }

  return (
    <article className={`${s.card} ${accent === 'rose' ? s.rose : ''}`}>
      <button type="button" className={s.thumbBtn} onClick={() => onOpen(producto)} aria-label={`Ver ${producto.nombre}`}>
        <ProductThumb src={producto.imagen_url} alt={producto.nombre} accent={accent} />
      </button>
      <span className={s.arr} aria-hidden="true">↗</span>
      <div className={s.body}>
        <div>
          <button type="button" className={s.name} onClick={() => onOpen(producto)}>{producto.nombre}</button>
          <div className={s.meta}>
            {(GENEROS[producto.genero]?.label || '').toUpperCase()} · {(MOMENTOS[producto.momento]?.label || '').toUpperCase()}
          </div>
          <div className={s.price}>
            {rango ? (rango.min === rango.max ? pesos(rango.min) : `desde ${pesos(rango.min)}`) : 'Consultar'}
          </div>
        </div>
        <button
          type="button"
          className={s.add}
          onClick={sumarDirecto}
          aria-label={`Sumar ${producto.nombre} al pedido`}
          disabled={!rango}
        >
          +
        </button>
      </div>
    </article>
  );
}
