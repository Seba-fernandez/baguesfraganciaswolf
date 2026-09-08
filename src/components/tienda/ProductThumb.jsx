import { FOTO_UNLOCK, FOTO_BAGUES } from '../../data/fotos';
import s from './ProductThumb.module.css';

/**
 * Miniatura del aroma. La foto cambia segun la presentacion elegida, porque
 * el frasco de 50 ml de Bagues no se parece al de Unlock: son dos envases
 * distintos del mismo aroma y mostrar uno por otro confunde.
 *
 * Orden de preferencia:
 *   1. La foto que el suba a mano (imagen_url en la base).
 *   2. El frasco de la linea que esta elegida.
 *   3. Cualquiera de las dos que exista.
 *   4. La inicial del aroma, si todavia no hay foto.
 */
const TONOS = ['a', 'b', 'c'];

function tonoDe(texto) {
  const t = String(texto || '');
  let h = 0;
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0;
  return TONOS[h % TONOS.length];
}

function inicialDe(producto) {
  const base = producto?.inspirado_en || producto?.nombre || '';
  const limpio = base.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '');
  return (limpio.slice(0, 1) || 'B').toUpperCase();
}

export function fotoDe(producto, linea) {
  const slug = producto?.slug;
  if (!slug) return null;
  const hayBagues = FOTO_BAGUES.has(slug);
  const hayUnlock = FOTO_UNLOCK.has(slug);
  if (linea === 'bagues' && hayBagues) return `/perfumes/bagues/${slug}.webp`;
  if (linea === 'unlock' && hayUnlock) return `/perfumes/${slug}.webp`;
  if (hayUnlock) return `/perfumes/${slug}.webp`;
  if (hayBagues) return `/perfumes/bagues/${slug}.webp`;
  return null;
}

export default function ProductThumb({ producto, src, alt, ratio = '3 / 4', linea }) {
  const imagen = src ?? (producto?.imagen_url || fotoDe(producto, linea));

  if (imagen) {
    return (
      <div className={s.wrap} style={{ aspectRatio: ratio }}>
        <img
          src={imagen}
          alt={alt || producto?.inspirado_en || ''}
          loading="lazy"
          decoding="async"
          className={s.img}
        />
      </div>
    );
  }

  const tono = tonoDe(producto?.familia_olfativa || producto?.inspirado_en);
  return (
    <div className={`${s.wrap} ${s.ph} ${s[tono]}`} style={{ aspectRatio: ratio }} aria-hidden="true">
      <span className={s.inicial}>{inicialDe(producto)}</span>
      {producto?.familia_olfativa && (
        <span className={s.familia}>{producto.familia_olfativa}</span>
      )}
    </div>
  );
}
