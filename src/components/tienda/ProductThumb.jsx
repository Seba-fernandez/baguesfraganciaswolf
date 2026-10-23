import { useState } from 'react';
import { fotoDe, fotoChica } from '../../lib/fotos';
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
  // El original sale de componer.mjs a 900 x 1200. Decia 800w: el navegador
  // creia que era mas chico de lo que es.
  return `${base}-360w.webp 360w, ${base}-560w.webp 560w, ${ruta} 900w`;
}

/**
 * Ancho al que se muestra la foto en una tarjeta del catalogo: dos por fila
 * en el celular, tres hasta 1100 px y despues una tarjeta de ~305 px.
 * La ficha pasa el suyo: ahi la foto ocupa casi todo el ancho del celular, y
 * con el de la tarjeta bajaba el archivo de 560 px estirado casi al doble.
 */
const SIZES_TARJETA = '(max-width: 767px) 46vw, (max-width: 1100px) 30vw, 310px';

/**
 * `prioridad`: 0 normal (lazy); 1 la baja enseguida (eager), para la primera
 * fila del catalogo; 2 ademas con fetchpriority alto, para la primera foto,
 * que es la que define el LCP de /catalogo. Con lazy, el navegador esperaba a
 * tener la grilla dibujada para recien pedirla (1,2 s de demora medidos).
 */
/**
 * `previa`: la ficha. Debajo de la foto grande va la chica de 360 px, la misma
 * que ya bajo la tarjeta: la ficha nunca se abre con el fondo solo. La grande
 * aparece encima, en el mismo encuadre, apenas se termina de dibujar.
 */
export default function ProductThumb({ producto, src, alt, ratio = PROPORCION.tarjeta, linea, sizes = SIZES_TARJETA, prioridad = 0, previa = false, aparece = false }) {
  const imagen = src ?? (producto?.imagen_url || fotoDe(producto, linea));
  const [lista, setLista] = useState(false);
  const chica = previa && imagen?.startsWith('/perfumes/') ? fotoChica(imagen) : null;
  // `aparece`: la tarjeta del catalogo. La foto sube de opacidad cuando
  // termina de bajar, sobre el vino de la pared, en vez de dibujarse a
  // pedazos. La que ya estaba en cache se ve enseguida (ver el ref). La foto
  // del LCP (prioridad 2) no: una imagen transparente no cuenta como pintada.
  const fundido = Boolean(chica) || (aparece && prioridad < 2);

  if (imagen) {
    // Todas las fotos del pipeline salen a 3:4 y ya traen su fondo (el estudio
    // oscuro para los recortes, la escena para el resto): van a sangre y llenan
    // el cuadro. Ver scripts/fotos/componer.mjs.
    const srcSet = conVariantes(imagen);
    return (
      <div
        className={`${s.wrap} ${chica ? s.conPrevia : ''}`}
        style={chica ? { aspectRatio: ratio, backgroundImage: `url(${chica})` } : { aspectRatio: ratio }}
      >
        <img
          key={imagen}
          src={imagen}
          {...(srcSet ? { srcSet, sizes } : {})}
          alt={alt ?? (producto?.inspirado_en || '')}
          loading={prioridad ? 'eager' : 'lazy'}
          {...(prioridad > 1 ? { fetchpriority: 'high' } : {})}
          decoding="async"
          className={`${s.img} ${aparece ? s.suave : ''} ${fundido && !lista ? s.oculta : ''}`}
          onLoad={fundido ? () => setLista(true) : undefined}
          ref={fundido ? (el) => { if (el?.complete && el.naturalWidth && !lista) setLista(true); } : undefined}
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

