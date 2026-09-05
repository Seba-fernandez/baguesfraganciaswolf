// ============================================================================
// producto.js — helpers sobre el modelo real del catalogo (ciclo 09/26).
//
// La unidad del catalogo es EL AROMA, no el SKU del proveedor. Un mismo aroma
// puede tener presentaciones de las dos lineas (Bagues y Unlock) con nombres
// de proveedor distintos: la ficha unifica, las presentaciones son opciones.
//
// Forma real de cada presentacion, verificada contra la base:
//   { ml, codigo, linea, nombre_proveedor, precio, precio_anterior,
//     grupo_promo, activo }
//
// `codigo` es sagrado: es lo que Sebastian carga en el sistema de su
// proveedora. Tiene que sobrevivir de la tarjeta al mensaje de WhatsApp.
// ============================================================================

export function presentacionesActivas(producto) {
  return (producto?.presentaciones || [])
    .filter((p) => p.activo !== false && p.ml)
    .slice()
    .sort((a, b) => Number(a.ml) - Number(b.ml)); // de menor a mayor ml
}

/** La opcion preseleccionada es la MAS BARATA, no la primera del array. */
export function presentacionPorDefecto(producto) {
  const activas = presentacionesActivas(producto);
  if (!activas.length) return null;
  return activas.reduce((min, p) => (Number(p.precio) < Number(min.precio) ? p : min), activas[0]);
}

export function rangoPrecio(producto) {
  const precios = presentacionesActivas(producto)
    .map((p) => Number(p.precio) || 0)
    .filter(Boolean);
  if (!precios.length) return null;
  return { min: Math.min(...precios), max: Math.max(...precios) };
}

export function tieneNotas(producto) {
  return !!(producto?.nota_salida || producto?.nota_corazon || producto?.nota_fondo);
}

/** Lineas presentes en el aroma: ['bagues'] | ['unlock'] | las dos. */
export function lineasDe(producto) {
  return [...new Set(presentacionesActivas(producto).map((p) => p.linea).filter(Boolean))];
}

/** Grupos de promo que toca el aroma, para filtrar el catalogo por promo. */
export function gruposPromoDe(producto) {
  return [...new Set(presentacionesActivas(producto).map((p) => p.grupo_promo).filter(Boolean))];
}

/**
 * Guardia de publicacion: un producto sin nombre, o con nombre puramente
 * numerico, es data de prueba. No se muestra en la tienda publica aunque
 * exista y este activo.
 */
export function esPublicable(producto) {
  const nombre = (producto?.nombre || '').trim();
  if (!nombre) return false;
  if (/^\d+$/.test(nombre)) return false;
  return presentacionesActivas(producto).length > 0;
}
