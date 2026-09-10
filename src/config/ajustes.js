/**
 * Numeros y limites de la tienda: todo lo que alguna vez se va a querer mover
 * un poco, sin tocar logica.
 */

/** Aromas por pantalla en el catalogo. Mas alto, mas scroll. */
export const POR_PAGINA = 12;

/** Cuantos destacados entran en la fila de arriba (se marcan en el panel). */
export const DESTACADOS_MAXIMO = 6;

/** Unidades maximas de un mismo aroma en un pedido. */
export const CANTIDAD_MAXIMA = 9;

/** A cuantos pixeles de scroll aparece el boton de volver arriba. */
export const VOLVER_ARRIBA_DESDE = 900;

/**
 * Proporcion del recuadro de las fotos. Las imagenes se muestran completas
 * (object-fit: contain), asi que cambiar esto cambia el alto del recuadro, no
 * recorta el frasco.
 */
export const PROPORCION = {
  tarjeta: '1 / 1',
  destacado: '4 / 5',
};

/**
 * Donde viven las fotos de los frascos, dentro de public/. Las usa la
 * miniatura para armar la ruta y el script scripts/fotos/ para guardarlas:
 * si se mueve la carpeta, se cambia aca y en el script, en ningun otro lado.
 */
export const CARPETA_FOTOS = {
  unlock: '/perfumes',
  bagues: '/perfumes/bagues',
};

/** Cuantos aromas anuncia el inicio mientras la base todavia no contesto. */
export const AROMAS_APROX = 104;
