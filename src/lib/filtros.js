// ============================================================================
// filtros.js — los filtros del catalogo, sin pantallas.
//
// Viven en la direccion (?para=el&familia=amaderados,florales&minis=1) para que un
// filtro se pueda compartir y sobreviva a abrir una ficha y volver "atras".
// ============================================================================

import { familiaDe, FAMILIAS } from './familias.js';
import { presentacionesActivas, ahorroDe } from './producto.js';

/** "Para": a quien. Un unisex aparece para el y para ella. */
export const PARA = {
  el: ['masculino', 'unisex'],
  ella: ['femenino', 'unisex'],
};

/** Hasta cuantos ml un tamano es "mini": la puerta barata para probar. */
export const MINI_HASTA_ML = 30;

/** Rebajados deja de ser filtro si cubre mas que esta parte del catalogo. */
export const REBAJADOS_TOPE = 0.8;

/**
 * Familia admite varias a la vez (Sebas, 23/10: "que puedas elegir otros
 * filtros de familia tambien"): ?familia=amaderados,florales. Los links
 * viejos, con una sola, se leen igual. Lo que no es una familia se ignora y
 * el orden es siempre el de FAMILIAS, asi dos links con las mismas familias
 * quedan iguales.
 */
export function leerFamilias(valor) {
  const pedidas = String(valor || '').split(',').map((t) => t.trim());
  return FAMILIAS.map((f) => f.id).filter((id) => pedidas.includes(id));
}

/** La lista de familias como va en la direccion ('a,b'), o null si esta vacia. */
export function escribirFamilias(lista) {
  const limpias = leerFamilias((lista || []).join(','));
  return limpias.length ? limpias.join(',') : null;
}

/**
 * Suma la familia si no estaba y la saca si estaba. Con `minimo`, no deja
 * sacar la ultima (la hoja de la portada siempre muestra al menos una).
 */
export function alternarFamilia(lista, id, { minimo = 0 } = {}) {
  const actual = leerFamilias((lista || []).join(','));
  if (actual.includes(id)) {
    return actual.length > minimo ? actual.filter((f) => f !== id) : actual;
  }
  return leerFamilias([...actual, id].join(','));
}

/** Lee los filtros de la direccion. Lo que no se reconoce se ignora. */
export function leerFiltros(params) {
  const para = params.get('para');
  return {
    para: PARA[para] ? para : null,
    familias: leerFamilias(params.get('familia')),
    minis: params.get('minis') === '1',
  };
}

/** Escribe un filtro en la direccion (null o false lo saca). */
export function conFiltro(params, clave, valor) {
  const n = new URLSearchParams(params);
  if (valor === null || valor === false || valor === undefined) n.delete(clave);
  else n.set(clave, valor === true ? '1' : String(valor));
  return n;
}

export function tieneMinis(producto) {
  return presentacionesActivas(producto).some((p) => Number(p.ml) <= MINI_HASTA_ML);
}

export function esRebajado(producto) {
  return presentacionesActivas(producto).some((p) => ahorroDe(p) > 0);
}

/**
 * Si "Rebajados" sirve como filtro: en el ciclo 10/26 hay 97 rebajados de
 * 101, asi que no filtraba nada y encima ocupaba el acento.
 */
export function rebajadosAporta(productos) {
  if (!productos.length) return false;
  const n = productos.filter(esRebajado).length;
  return n > 0 && n / productos.length <= REBAJADOS_TOPE;
}

/** Si el aroma pasa los filtros de la direccion. */
export function pasaFiltros(producto, { para, familias = [], minis }) {
  if (para && !PARA[para].includes(producto.genero)) return false;
  if (familias.length && !familias.includes(familiaDe(producto))) return false;
  if (minis && !tieneMinis(producto)) return false;
  return true;
}
