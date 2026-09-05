import s from './ProductThumb.module.css';

/**
 * Miniatura del aroma. Con foto real, la foto manda. Sin foto (hoy son 104
 * de 104) va un placeholder TIPOGRAFICO: la inicial del aroma en display
 * sobre el verde de la paleta. Nada de simular un frasco con divs.
 *
 * El tono varia por familia olfativa, asi la grilla respira sin salirse del
 * unico acento del sistema.
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

export default function ProductThumb({ producto, src, alt, ratio = '3 / 4' }) {
  const imagen = src ?? producto?.imagen_url;

  if (imagen) {
    return (
      <div className={s.wrap} style={{ aspectRatio: ratio }}>
        <img src={imagen} alt={alt || producto?.inspirado_en || ''} loading="lazy" decoding="async" className={s.img} />
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
