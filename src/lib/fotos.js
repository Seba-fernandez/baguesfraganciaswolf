import { FOTO_UNLOCK, FOTO_BAGUES } from '../data/fotos';
import { CARPETA_FOTOS } from '../config/ajustes';

/**
 * Ruta de la foto de un aroma, segun la linea. La comparten la tienda
 * (ProductThumb) y el panel (lista del catalogo), asi las dos muestran el mismo
 * frasco.
 *
 * Orden: el frasco de la linea pedida, despues cualquiera de las dos. La foto
 * subida a mano (imagen_url) la resuelve quien llama, porque le gana a todas.
 */
export function fotoDe(producto, linea) {
  const slug = producto?.slug;
  if (!slug) return null;
  const hayBagues = FOTO_BAGUES.has(slug);
  const hayUnlock = FOTO_UNLOCK.has(slug);
  const enUnlock = `${CARPETA_FOTOS.unlock}/${slug}.webp`;
  const enBagues = `${CARPETA_FOTOS.bagues}/${slug}.webp`;
  if (linea === 'bagues' && hayBagues) return enBagues;
  if (linea === 'unlock' && hayUnlock) return enUnlock;
  if (hayUnlock) return enUnlock;
  if (hayBagues) return enBagues;
  return null;
}

/** El ancho chico (360 px) de una foto del pipeline, para miniaturas. */
export function fotoChica(ruta) {
  return ruta && ruta.startsWith('/perfumes/') ? ruta.replace(/\.webp$/, '-360w.webp') : ruta;
}
