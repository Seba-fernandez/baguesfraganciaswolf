// Helpers sobre el campo jsonb `presentaciones` de products: [{ml, precio, activo}]

export function presentacionesActivas(producto) {
  return (producto?.presentaciones || []).filter((p) => p.activo !== false && p.ml);
}

export function presentacionPorDefecto(producto) {
  const activas = presentacionesActivas(producto);
  if (!activas.length) return null;
  return activas.reduce((min, p) => (p.precio < min.precio ? p : min), activas[0]);
}

export function rangoPrecio(producto) {
  const activas = presentacionesActivas(producto);
  const precios = activas.map((p) => Number(p.precio) || 0).filter(Boolean);
  if (!precios.length) return null;
  return { min: Math.min(...precios), max: Math.max(...precios) };
}

export function tieneNotas(producto) {
  return !!(producto?.nota_salida || producto?.nota_corazon || producto?.nota_fondo);
}

/**
 * Guardia de publicación: un producto con nombre puramente numérico ("456")
 * casi siempre es data de prueba que se coló en la tabla — no se muestra en
 * la tienda pública aunque exista y esté activo. No reemplaza la limpieza
 * real en Supabase, es una red de seguridad para que un dato de prueba
 * nunca vuelva a llegar a producción por accidente.
 */
export function esPublicable(producto) {
  const nombre = (producto?.nombre || '').trim();
  if (!nombre) return false;
  if (/^\d+$/.test(nombre)) return false;
  return true;
}

const ACENTOS = ['cream', 'wine', 'pine'];

/**
 * Acento visual derivado de la familia olfativa (o género si no hay), no de
 * la posición en la grilla — así el color del card es información real
 * ("estos tres huelen parecido"), no solo una alternancia decorativa.
 * Hash simple y estable: mismo texto → siempre el mismo acento.
 */
export function acentoPorFamilia(producto) {
  const texto = (producto?.familia_olfativa || producto?.genero || producto?.nombre || '').toLowerCase();
  let hash = 0;
  for (let i = 0; i < texto.length; i++) hash = (hash * 31 + texto.charCodeAt(i)) >>> 0;
  return ACENTOS[hash % ACENTOS.length];
}
