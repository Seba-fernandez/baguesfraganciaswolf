/**
 * Memoria compartida del panel: lo que ya se trajo de la base queda guardado
 * mientras la pestaña esté abierta.
 *
 * Antes cada pantalla arrancaba vacía y en "Cargando..." cada vez que se
 * entraba, aunque se acabara de ver: pasar de Pedidos a Catálogo y volver era
 * esperar dos viajes a la base. Ahora la pantalla se dibuja al instante con lo
 * que hay en memoria y se actualiza sola de fondo, sin bloquear nada.
 *
 * Además, apenas se confirma la sesión, PanelApp precarga todo (precargarPanel)
 * así la primera visita a cada pestaña también es inmediata.
 */

const datos = new Map();
const enCurso = new Map();

export function leerCache(clave) {
  return datos.get(clave);
}

export function guardarCache(clave, valor) {
  datos.set(clave, valor);
}

/**
 * Trae con `buscar` y guarda. Si ya hay un pedido en vuelo para la misma clave,
 * devuelve ese mismo: la precarga y la pantalla no piden dos veces lo mismo.
 */
export function traerConCache(clave, buscar) {
  if (enCurso.has(clave)) return enCurso.get(clave);
  const p = buscar()
    .then((res) => {
      if (!res.error) datos.set(clave, res.data);
      return res;
    })
    .finally(() => enCurso.delete(clave));
  enCurso.set(clave, p);
  return p;
}

/** Al cerrar sesión no queda nada de la cuenta anterior en memoria. */
export function vaciarCache() {
  datos.clear();
  enCurso.clear();
}
