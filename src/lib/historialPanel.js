// historialPanel.js — el "deshacer / rehacer" del panel.
//
// Cada cambio que se hace en el panel (editar un precio, pausar un perfume,
// cambiar el estado de un pedido, cargar un ciclo) se anota aca con dos
// funciones: como volver atras y como volver a hacerlo. La flecha de arriba
// recorre esa lista de a un paso, como el Ctrl+Z de Canva o CapCut.
//
// Vive en memoria, nada mas: al recargar la pagina o salir del panel arranca
// de cero (PanelApp llama a `limpiar`). Es una lista unica para todo el panel:
// se deshace en el orden inverso en que se hizo, aunque se haya cambiado de
// pestaña entre medio.
//
// Sin dependencias (ni Supabase ni React): se prueba con node, ver
// scripts/qa/historial.test.mjs. Quien registra pone las funciones que tocan
// la base; ver lib/cambiosPanel.js.

export const MAXIMO = 100;

const pila = { pasados: [], futuros: [] };
const oyentes = new Set();
let ocupado = false;
let mensaje = null;
let instantanea = armar();

function armar() {
  return Object.freeze({
    puedeDeshacer: !ocupado && pila.pasados.length > 0,
    puedeRehacer: !ocupado && pila.futuros.length > 0,
    etiquetaDeshacer: pila.pasados.at(-1)?.etiqueta ?? null,
    etiquetaRehacer: pila.futuros.at(-1)?.etiqueta ?? null,
    cantidad: pila.pasados.length,
    ocupado,
    mensaje,
  });
}

function emitir() {
  instantanea = armar();
  for (const fn of oyentes) fn();
}

/** Para `useSyncExternalStore`. */
export function suscribir(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}
export const estado = () => instantanea;

/**
 * Anota un cambio ya hecho.
 *   etiqueta   texto corto para mostrar ("Pausar Sauvage")
 *   deshacer   async () => void  vuelve atras (tira un Error si no puede)
 *   rehacer    async () => void  lo vuelve a hacer
 * Un cambio nuevo borra lo que se podia rehacer, como en cualquier editor.
 */
export function registrar({ etiqueta, deshacer, rehacer }) {
  if (typeof deshacer !== 'function' || typeof rehacer !== 'function') throw new Error('Un cambio necesita deshacer y rehacer');
  pila.pasados.push({ etiqueta: String(etiqueta || 'Cambio'), deshacer, rehacer });
  if (pila.pasados.length > MAXIMO) pila.pasados.shift();
  pila.futuros = [];
  mensaje = null;
  emitir();
}

async function mover(de, a, accion, verbo) {
  if (ocupado || !pila[de].length) return { ok: false };
  const entrada = pila[de].at(-1);
  ocupado = true;
  emitir();
  try {
    await entrada[accion]();
    pila[de].pop();
    pila[a].push(entrada);
    mensaje = { tipo: 'ok', texto: `${verbo}: ${entrada.etiqueta}` };
    return { ok: true, etiqueta: entrada.etiqueta };
  } catch (e) {
    // Si no se puede (por ejemplo el registro ya no existe) se saca de la lista:
    // dejarlo trabaria los cambios anteriores, que si se pueden deshacer.
    pila[de].pop();
    mensaje = { tipo: 'error', texto: `No se pudo ${accion === 'deshacer' ? 'deshacer' : 'rehacer'} “${entrada.etiqueta}”: ${e?.message || 'error'}. Se saltea.` };
    return { ok: false, error: e };
  } finally {
    ocupado = false;
    emitir();
  }
}

export const deshacer = () => mover('pasados', 'futuros', 'deshacer', 'Deshecho');
export const rehacer = () => mover('futuros', 'pasados', 'rehacer', 'Rehecho');

/** Vuelve a cero (al salir del panel o cerrar sesion). */
export function limpiar() {
  pila.pasados = [];
  pila.futuros = [];
  mensaje = null;
  ocupado = false;
  emitir();
}

export function olvidarMensaje() {
  if (!mensaje) return;
  mensaje = null;
  emitir();
}

// ---- utilidades para quien arma los cambios

/** Igualdad profunda sin importar el orden de las claves (para no anotar "cambios" que no cambian nada). */
export function iguales(a, b) {
  if (a === b) return true;
  if (a == null || b == null || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => Object.hasOwn(b, k) && iguales(a[k], b[k]));
}

/** Solo las claves pedidas de un objeto (lo que valia antes de un cambio). */
export function elegir(objeto, claves) {
  const out = {};
  for (const k of claves) out[k] = objeto?.[k] ?? null;
  return out;
}
