// minis.js — cambiar de una vez el precio de todos los tamaños chicos.
//
// Las minis (menos de 50 ml) suelen tener un precio unico por ciclo, y
// ponerlo a mano en cada una es lento. Esto arma la lista, valida y devuelve
// las operaciones que recibe aplicar_ciclo() (todo o nada, con respaldo).
// Sin JSX ni base: se prueba con node (scripts/qa/minis.test.mjs).
//
// Solo se tocan precio y precio de lista. El codigo de proveedora no cambia.

export const ML_MINI = 50;
export const PRECIO_MIN = 1000;
export const PRECIO_MAX = 500000;
/** Un cambio de mas de la mitad (para arriba o para abajo) pide confirmar. */
export const SALTO = 0.5;
const CODIGO = /^(1028|2028)\d{4}$/;

/** "$ 21.299" -> 21299. Vacio o sin cifras -> null. */
export function aEntero(texto) {
  if (typeof texto === 'number') return Number.isFinite(texto) ? Math.round(texto) : null;
  const cifras = String(texto ?? '').replace(/[^\d]/g, '');
  return cifras ? Number(cifras) : null;
}

/**
 * Los tamaños de menos de 50 ml con codigo de proveedora.
 * Sin `conPausadas`, solo los activos de perfumes activos.
 */
export function minisDe(productos, { conPausadas = false } = {}) {
  const out = [];
  for (const p of productos || []) {
    for (const pres of p.presentaciones || []) {
      const ml = Number(pres?.ml);
      if (!(ml > 0 && ml < ML_MINI)) continue;
      const codigo = String(pres.codigo ?? '');
      if (!CODIGO.test(codigo)) continue;
      const activa = p.activo !== false && pres.activo !== false;
      if (!activa && !conPausadas) continue;
      out.push({
        productoId: p.id,
        nombre: p.nombre,
        codigo,
        linea: pres.linea || null,
        ml,
        precio: Number(pres.precio) || 0,
        precio_anterior: pres.precio_anterior == null ? null : Number(pres.precio_anterior),
        activa,
      });
    }
  }
  return out.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es') || a.ml - b.ml);
}

/** [{ precio, cantidad }] del precio mas repetido al menos. */
export function resumenPrecios(minis) {
  const cuenta = new Map();
  for (const m of minis) cuenta.set(m.precio, (cuenta.get(m.precio) || 0) + 1);
  return [...cuenta].map(([precio, cantidad]) => ({ precio, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad || b.precio - a.precio);
}

/**
 * Arma el cambio.
 *   minis      la lista de minisDe()
 *   elegidos   Set de codigos tildados
 *   precio     el precio nuevo (numero o texto)
 *   lista      { modo: 'mantener' | 'igual' | 'sacar', valor }
 * Devuelve { filas, operaciones, errores, saltos }:
 *   filas        cada mini con su antes y su despues (las no elegidas, sin cambio)
 *   operaciones  [{ tipo: 'precio', codigo, precio, precio_anterior }] solo de lo que cambia
 *   errores      lo que impide aplicar
 *   saltos       nombres con un cambio de mas de la mitad (piden confirmar)
 */
export function armarCambio(minis, elegidos, precio, lista = { modo: 'mantener' }) {
  const errores = [];
  const saltos = [];
  const nuevo = aEntero(precio);
  const precioOk = nuevo != null && nuevo >= PRECIO_MIN && nuevo <= PRECIO_MAX;
  if (nuevo == null) errores.push('Escribí el precio nuevo.');
  else if (!precioOk) errores.push(`El precio tiene que estar entre $ ${PRECIO_MIN.toLocaleString('es-AR')} y $ ${PRECIO_MAX.toLocaleString('es-AR')}.`);

  const listaIgual = lista.modo === 'igual' ? aEntero(lista.valor) : null;
  if (lista.modo === 'igual') {
    if (listaIgual == null) errores.push('Escribí el precio de lista o elegí otra opción.');
    else if (precioOk && listaIgual <= nuevo) errores.push('El precio de lista (tachado) tiene que ser mayor que el precio nuevo.');
  }

  const filas = [];
  const operaciones = [];
  const tachadoChico = [];
  for (const m of minis) {
    const elegida = elegidos.has(m.codigo);
    if (!elegida || !precioOk) { filas.push({ ...m, elegida, nuevoPrecio: m.precio, nuevaLista: m.precio_anterior, cambia: false }); continue; }
    let nuevaLista = m.precio_anterior;
    if (lista.modo === 'igual') nuevaLista = listaIgual;
    else if (lista.modo === 'sacar') nuevaLista = null;
    if (nuevaLista != null && nuevaLista <= nuevo) tachadoChico.push(`${m.nombre} ${m.ml} ml`);
    const cambia = nuevo !== m.precio || nuevaLista !== m.precio_anterior;
    if (cambia && m.precio > 0 && Math.abs(nuevo / m.precio - 1) > SALTO) saltos.push(`${m.nombre} ${m.ml} ml`);
    filas.push({ ...m, elegida, nuevoPrecio: nuevo, nuevaLista, cambia });
    if (cambia) operaciones.push({ tipo: 'precio', codigo: m.codigo, precio: nuevo, precio_anterior: nuevaLista });
  }
  if (tachadoChico.length) {
    errores.push(`El tachado quedaría menor o igual que el precio en ${tachadoChico.length === 1 ? tachadoChico[0] : `${tachadoChico.length} minis`}: poné un precio de lista para todas o sacalo.`);
  }
  if (precioOk && !errores.length && elegidos.size && !operaciones.length) errores.push('Con esos valores no cambia nada.');
  return { filas, operaciones, errores, saltos };
}
