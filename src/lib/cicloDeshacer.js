// cicloDeshacer.js — que cambio una carga de ciclo en el catalogo, para poder deshacerla.
//
// aplicar_ciclo() cambia muchos perfumes de una vez (precios, tamaños, perfumes
// nuevos). Para volver atras alcanza con comparar el catalogo de antes con el
// de despues: las filas que cambiaron se vuelven a poner como estaban y los
// perfumes que el ciclo creo se borran. Funcion pura: se prueba con node.
import { iguales } from './historialPanel.js';

/**
 * antes, despues: listas de perfumes (filas completas de `products`).
 * Devuelve { cambiadosAntes, cambiadosDespues, creados } donde
 *   cambiadosAntes    las filas que cambiaron, como estaban
 *   cambiadosDespues  las mismas, como quedaron
 *   creados           los perfumes que no existian (filas completas, para rehacer)
 */
export function diferenciaCiclo(antes, despues) {
  const previos = new Map((antes || []).map((p) => [p.id, p]));
  const cambiadosAntes = [];
  const cambiadosDespues = [];
  const creados = [];
  for (const d of despues || []) {
    const a = previos.get(d.id);
    if (!a) creados.push(d);
    else if (!iguales(a, d)) { cambiadosAntes.push(a); cambiadosDespues.push(d); }
  }
  return { cambiadosAntes, cambiadosDespues, creados };
}

/** Lo que cambio en los ajustes por el ciclo (la tira de la tienda). */
export function diferenciaAjustes(antes, despues) {
  const claves = ['ciclo_nombre', 'ciclo_hasta'];
  const a = {};
  const d = {};
  for (const k of claves) {
    if (despues && Object.hasOwn(despues, k) && !iguales(antes?.[k] ?? null, despues[k] ?? null)) {
      a[k] = antes?.[k] ?? null;
      d[k] = despues[k] ?? null;
    }
  }
  return { antes: a, despues: d, cambio: Object.keys(d).length > 0 };
}
