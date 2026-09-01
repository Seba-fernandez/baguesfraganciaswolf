import { GENEROS, MOMENTOS } from '../../data/constants';
import { rangoPrecio } from '../../lib/producto';
import { pesos } from '../../lib/format';
import ProductThumb from './ProductThumb';
import useReveal from '../../hooks/useReveal';
import s from './FeaturedRows.module.css';

export default function FeaturedRows({ products, onOpen }) {
  const destacados = products.filter((p) => p.activo && p.destacado);
  const ref = useReveal();
  if (!destacados.length) return null;

  return (
    <section className={`tw ${s.section}`} ref={ref}>
      <div className={s.head}>
        <h2>Los que no fallan</h2>
        <span className="tmono">{destacados.length} destacados</span>
      </div>
      <div className={s.rows}>
        {destacados.map((p, i) => {
          const rango = rangoPrecio(p);
          const destacadaEspecial = i === 1 % destacados.length;
          return (
            <button
              key={p.id}
              type="button"
              className={`${s.row} treveal ${destacadaEspecial ? s.wine : ''}`}
              onClick={() => onOpen(p)}
            >
              <h3>{p.nombre}</h3>
              <div className={s.shot}>
                <ProductThumb src={p.imagen_url} alt={p.nombre} accent={destacadaEspecial ? 'cream' : (i % 2 ? 'pine' : 'wine')} />
              </div>
              <p className={s.desc}>
                {p.descripcion_corta}
                <span className={`${s.meta} tmono`}>
                  {(GENEROS[p.genero]?.label || '').toUpperCase()} · {(MOMENTOS[p.momento]?.label || '').toUpperCase()}
                </span>
              </p>
              <span className={s.price}>{rango ? pesos(rango.min) : 'Consultar'}</span>
              <span className={s.arr} aria-hidden="true">↗</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
