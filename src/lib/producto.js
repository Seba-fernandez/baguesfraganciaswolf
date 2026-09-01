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
