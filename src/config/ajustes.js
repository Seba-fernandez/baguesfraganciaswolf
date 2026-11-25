/**
 * Numeros y limites de la tienda: todo lo que alguna vez se va a querer mover
 * un poco, sin tocar logica.
 */

/** Aromas por pantalla en el catalogo. Mas alto, mas scroll. */
export const POR_PAGINA = 12;

/**
 * Cuantos destacados se sugieren cuando una busqueda no encuentra nada
 * (ProductGrid). La fila de la portada NO tiene tope: muestra todos los que se
 * marcan en el panel, porque se desliza.
 */
export const DESTACADOS_SIN_RESULTADOS = 4;

// Cuantos perfumes recuerda la flecha de volver de la ficha ("Si te gusta este"
// y de ahi a otro): se vuelve de a uno, hasta este numero.
export const RASTRO_MAXIMO = 5;

/**
 * Las ciudades de la portada (rediseño D): las cajas que enseñan el codigo
 * "esta ciudad es tal perfume". Van las mas conocidas, en este orden. Si una
 * no esta activa, no tiene caja Bagues o esta marcada como destacada (para no
 * repetir la misma caja dos secciones seguidas), se completa sola con otra.
 */
export const CIUDADES_ELEGIDAS = [
  'bagues-baccarat-rouge',   // Ginebra
  'bagues-la-bomba',         // Granada
  'unlock-one-million',      // Las Vegas
  'unlock-la-vie-est-belle', // Paris
];

/**
 * Desde cuanto el envio es gratis, en pesos. Lo usan el bloque "Antes de
 * pedir" de la portada y la barra del cajon. Debajo de ese monto el envio lo
 * paga quien compra.
 */
export const ENVIO_GRATIS_DESDE = 60000;

// La sección "¿Son truchos?" (Bagués contra un perfume de vidriera) está
// armada pero oculta hasta que Sebas apruebe su título y su texto (23/10).
// Se prende con true; el texto está en DUDA, en contenido.js.
export const MOSTRAR_DUDA = false;

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
  tarjeta: '3 / 4',
  destacado: '3 / 4',
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

/**
 * HERO DE NAVIDAD (campana de diciembre 2026).
 *
 * El interruptor. true: la portada muestra la escena navidena que entra en
 * capas, con el precio del 2x1. false: vuelve al hero de siempre ("Cada
 * perfume, una ciudad."), sin tocar nada mas. Para apagarlo despues de Navidad:
 * cambiar esta linea a false y publicar. Las imagenes y el CSS de Navidad
 * quedan en el repo (no se piden si esta apagado) por si se usan el ano que viene.
 * El paso a paso esta en scripts/rediseno/README.md.
 */
export const HERO_NAVIDAD = true;

/**
 * Los precios de la placa del hero de Navidad, en pesos. Son los de la pieza
 * del dueno (2x1 especial Navidad). NO salen de la base: si cambia el precio
 * del 2x1, se cambia aca tambien. Con HERO_NAVIDAD en false no se usan.
 */
export const NAVIDAD_PRECIOS = {
  lista: 30999,     // el precio de uno, tachado
  cadaUno: 15499,   // lo que sale cada uno llevando dos
};
