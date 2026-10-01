import { fotoDe } from '../../lib/fotos';
import { PROPORCION } from '../../config/ajustes';
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

/**
 * Las fotos del pipeline tienen dos anchos mas chicos al lado, generados por
 * scripts/fotos/variantes.mjs: foto-360w.webp y foto-560w.webp.
 *
 * Solo las del pipeline: una foto subida a mano desde el panel (imagen_url) no
 * tiene variantes, asi que en ese caso se sirve sola y sin srcset.
 */
function conVariantes(ruta) {
  if (!ruta || !ruta.startsWith('/perfumes/')) return null;
  const base = ruta.replace(/\.webp$/, '');
  return `${base}-360w.webp 360w, ${base}-560w.webp 560w, ${ruta} 800w`;
}

export default function ProductThumb({ producto, src, alt, ratio = PROPORCION.tarjeta, linea }) {
  const imagen = src ?? (producto?.imagen_url || fotoDe(producto, linea));

  if (imagen) {
    // Todas las fotos del pipeline salen a 3:4 y ya traen su fondo (el estudio
    // oscuro para los recortes, la escena para el resto): van a sangre y llenan
    // el cuadro. Ver scripts/fotos/componer.mjs.
    const srcSet = conVariantes(imagen);
    return (
      <div className={s.wrap} style={{ aspectRatio: ratio }}>
        <img
          src={imagen}
          {...(srcSet ? {
            srcSet,
            // Dos por fila en el celular, tarjeta de ~250 px en escritorio.
            sizes: '(max-width: 767px) 46vw, 250px',
          } : {})}
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

