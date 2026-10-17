import { useCart } from '../../contexts/CartContext';
import { presentacionesActivas, presentacionPorDefecto, tituloDe, notasCortas } from '../../lib/producto';
import { pesos } from '../../lib/format';
import { TARJETA, conDatos } from '../../config/contenido';
import ProductThumb from './ProductThumb';
import s from './ProductCard.module.css';

/**
 * Una tarjeta por AROMA: foto, nombre, dos o tres notas y un precio.
 *
 * No todas conocen "Kenzo Homme", pero todas entienden "marino, bayas de
 * enebro y abeto": las notas hacen elegir a quien no busca un nombre puntual.
 * "Version inspirada" ya no se repite doce veces por pagina: se dice una vez
 * en la cabecera del catalogo y en la ficha.
 *
 * Los tamanos ya no van como pastillas (en el celular se apretaban y dejaban
 * tarjetas de alturas distintas). Con un solo tamano, el + agrega directo; con
 * mas, abre la hoja de tamanos (onElegir), en el celular y en escritorio.
 */
export default function ProductCard({ producto, onOpen, onElegir, promos = {} }) {
  const { addItem } = useCart();
  const opciones = presentacionesActivas(producto);
  const base = presentacionPorDefecto(producto);
  const titulo = tituloDe(producto);
  const notas = notasCortas(producto);
  const varios = opciones.length > 1;
  const hayPromo = opciones.some((p) => p.grupo_promo && promos[p.grupo_promo]);

  function mas() {
    if (!base) return;
    if (varios && onElegir) onElegir(producto);
    else addItem(producto, base, 1);
  }

  return (
    <article className={`${s.card} tglass-lite`}>
      <button
        type="button"
        className={s.media}
        onClick={() => onOpen(producto)}
        aria-label={`Ver ${titulo}`}
      >
        <ProductThumb producto={producto} linea={base?.linea} />
        {hayPromo && <span className={s.promoTag}>2x1</span>}
      </button>

      <div className={s.body}>
        <button type="button" className={s.titulo} onClick={() => onOpen(producto)}>
          {titulo}
        </button>
        <p className={s.notas} data-qa="notas">{notas}</p>

        <div className={s.pie}>
          <span className={s.precioWrap}>
            <span className={`${s.pieMeta} tnum`}>
              {varios
                ? `${conDatos(TARJETA.tamanos, { n: opciones.length })} · ${TARJETA.desde}`
                : `${base?.ml ?? ''} ml`}
            </span>
            <span className={`${s.precio} tnum`}>{pesos(base?.precio)}</span>
          </span>
          <button
            type="button"
            className={`tbtn ${s.add}`}
            onClick={mas}
            disabled={!base}
            aria-label={conDatos(TARJETA.agregar, { nombre: titulo })}
            aria-haspopup={varios ? 'dialog' : undefined}
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
