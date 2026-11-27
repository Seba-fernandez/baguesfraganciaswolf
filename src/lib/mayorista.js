// ============================================================================
// mayorista.js — tope por linea del pedido y aviso de "compras por cantidad".
// Sin JSX ni React: lo usan CartContext (el tope) y AvisoMayorista (el aviso).
//
// El tope no es una opinion: crear_pedido_web() en la base convierte en 1 toda
// linea con mas de 20 unidades, sin avisar. Por eso nada de la tienda deja
// pasar una linea de CANTIDAD_MAXIMA.
// ============================================================================

import { CANTIDAD_MAXIMA, MAYORISTA_DESDE } from '../config/ajustes.js';

/** Una cantidad cualquiera, llevada a un entero entre 0 y el maximo. */
export function recortarCantidad(n, max = CANTIDAD_MAXIMA) {
  const v = Math.floor(Number(n));
  if (!Number.isFinite(v) || v < 0) return 0;
  return Math.min(max, v);
}

/** Lo que queda por sumar en una linea que ya tiene `enCarrito` unidades. */
export function disponibleDe(enCarrito, max = CANTIDAD_MAXIMA) {
  return Math.max(0, max - recortarCantidad(enCarrito, max));
}

/**
 * Que aviso toca para una linea con `cantidad` unidades: null (ninguno),
 * 'mayorista' (desde MAYORISTA_DESDE) o 'tope' (al llegar al maximo).
 */
export function nivelAviso(cantidad, desde = MAYORISTA_DESDE, max = CANTIDAD_MAXIMA) {
  const n = Number(cantidad) || 0;
  if (n >= max) return 'tope';
  if (n >= desde) return 'mayorista';
  return null;
}

// Lo que la clienta ya cerro en esta pestana: "clave:nivel". El de tope es un
// nivel aparte, asi que cerrar el primero no esconde el segundo.
const VISTOS = 'bgw-mayorista-cerrados';

function leerVistos() {
  try { return JSON.parse(sessionStorage.getItem(VISTOS) || '[]'); } catch { return []; }
}

export function avisoCerrado(clave, nivel) {
  return leerVistos().includes(`${clave}:${nivel}`);
}

export function cerrarAviso(clave, nivel) {
  const vistos = leerVistos();
  const marca = `${clave}:${nivel}`;
  if (vistos.includes(marca)) return;
  try { sessionStorage.setItem(VISTOS, JSON.stringify([...vistos, marca])); } catch { /* sin almacenamiento: vuelve a salir */ }
}
