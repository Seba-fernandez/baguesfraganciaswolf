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

/**
 * Titulo que se muestra. El catalogo de la proveedora censura los nombres
 * ("S*UV*GE HOM"), pero guarda aparte el perfume real en `inspirado_en`. En la
 * web mostramos el nombre completo, que es lo que la clienta busca y escribe.
 */
export function tituloDe(producto) {
  return producto?.inspirado_en || producto?.nombre || '';
}

/**
 * Nombre propio que le pone la proveedora a esa presentacion, cuando aporta
 * algo. Los frascos de 50 ml de Bagues llevan nombre propio (Arizona, Granada)
 * y ese dato sirve: es como figura en el envase. Los de Unlock repiten el
 * nombre censurado del aroma, que ya esta en el titulo, asi que no se muestra.
 */
/**
 * Si vale la pena aclarar con que nombre figura el aroma en el catalogo.
 * Cuando el catalogo no censuro el nombre, el titulo y el nombre de catalogo
 * son el mismo y repetirlo es ruido. La tarjeta y la ficha preguntaban esto
 * con la misma linea escrita dos veces.
 */
export function hayQueAclararNombre(producto) {
  const titulo = tituloDe(producto).toLowerCase();
  return titulo !== (producto?.nombre || '').toLowerCase();
}

export function nombrePropioDe(presentacion, titulo = '') {
  const n = (presentacion?.nombre_proveedor || '').trim();
  if (!n) return null;
  if (n.includes('*')) return null; // es la version censurada, no un nombre propio
  // Si repite el titulo del aroma no aporta nada y solo hace ruido: pasa
  // cuando el nombre del catalogo no es una marca y no vino censurado.
  if (n.toLowerCase() === String(titulo).trim().toLowerCase()) return null;
  return n;
}

/** Etiqueta de la linea: "Bagues" | "Unlock". */
export function lineaLabel(presentacion) {
  return presentacion?.linea === 'unlock' ? 'Unlock' : 'Bagues';
}

/**
 * De que linea es un tamano, en una sola frase, para el carrito y el mensaje
 * de WhatsApp: "Unlock" o "Bagues, caja Arizona". La clienta busca por el
 * nombre del perfume original; el nombre de la caja solo se agrega cuando
 * existe y es distinto, que es lo que figura en el envase que va a recibir.
 */
export function detalleLinea(presentacion, titulo = '') {
  const linea = lineaLabel(presentacion);
  const propio = nombrePropioDe(presentacion, titulo);
  return propio ? `${linea}, caja ${propio}` : linea;
}

// ---------------------------------------------------------------------------
// La ficha, ordenada para decidir (etapa 3A).
// ---------------------------------------------------------------------------

/** Sin tildes y en minuscula, para comparar palabras de la familia. */
const plano = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

/**
 * Cada palabra de `familia_olfativa` (texto libre de la base) en un adjetivo
 * que se entiende sin saber de perfumeria. Solo traduce lo que la base ya
 * dice: si la familia es "Aromatica fougere", la frase dice "Aromatico". No se
 * agrega nada que la base no diga.
 */
const ADJETIVO = {
  floral: ['Floral'], floriental: ['Floral', 'Oriental'], frutal: ['Frutal'],
  oriental: ['Oriental'], ambar: ['Ambarado'], ambarada: ['Ambarado'], ambarado: ['Ambarado'],
  amaderada: ['Amaderado'], amaderado: ['Amaderado'], especiada: ['Especiado'],
  almizcle: ['Almizclado'], almizclada: ['Almizclado'], aromatica: ['Aromático'],
  fougere: ['Aromático'], acuatica: ['Acuático'], citrica: ['Cítrico'], fresca: ['Fresco'],
  gourmand: ['Dulce'], chipre: ['Chipre'],
};

/** El momento del año, dicho como se dice. */
const MOMENTO_FRASE = { verano: 'Para el calor', invierno: 'Para el frío', todo: 'Todo el año' };

/**
 * Frase corta de la ficha, en Cormorant italica: "Aromático. Todo el año."
 * Sale de familia_olfativa (hasta dos adjetivos) y momento. Sin datos, null:
 * la ficha no la muestra.
 */
export function fraseDe(producto) {
  const adjetivos = [];
  for (const palabra of plano(producto?.familia_olfativa).split(/[^a-z]+/)) {
    for (const a of ADJETIVO[palabra] || []) if (!adjetivos.includes(a)) adjetivos.push(a);
  }
  const partes = adjetivos.slice(0, 2);
  const momento = MOMENTO_FRASE[producto?.momento];
  if (momento) partes.push(momento);
  return partes.length ? `${partes.join('. ')}.` : null;
}

/** Las notas de un renglon de la piramide ("Bergamota, limon") como lista. */
export function separarNotas(texto) {
  return String(texto || '')
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean)
    .map((n) => n.charAt(0).toUpperCase() + n.slice(1));
}

/** La piramide en tres filas, solo las que tienen notas. */
export function piramideDe(producto) {
  return [
    ['Salida', producto?.nota_salida],
    ['Corazón', producto?.nota_corazon],
    ['Fondo', producto?.nota_fondo],
  ]
    .map(([etapa, texto]) => ({ etapa, notas: separarNotas(texto) }))
    .filter((f) => f.notas.length);
}

/**
 * Cuanto se ahorra en un tamano contra el precio de lista de la proveedora.
 * Solo si hay precio de lista y es mayor: nunca un numero inventado ni
 * negativo. Las dos cifras salen de la base (precio_anterior y precio).
 */
/**
 * El precio mas bajo del catalogo y su precio de lista, para "Lo que pagas"
 * de la portada: "$ 16.499" contra "$ 29.999". La lista es la del mismo
 * tamano mas barato (si hay varios al mismo precio, el de lista mas alta).
 * Sin datos devuelve { desde: null, lista: null }.
 */
export function desdeYLista(productos = []) {
  let mejor = null;
  for (const p of productos) {
    const pres = presentacionPorDefecto(p);
    const precio = Number(pres?.precio) || 0;
    if (!precio) continue;
    const lista = Number(pres?.precio_anterior) || 0;
    if (!mejor || precio < mejor.desde || (precio === mejor.desde && lista > mejor.lista)) {
      mejor = { desde: precio, lista };
    }
  }
  if (!mejor) return { desde: null, lista: null };
  return { desde: mejor.desde, lista: mejor.lista > mejor.desde ? mejor.lista : null };
}

export function ahorroDe(presentacion) {
  const lista = Number(presentacion?.precio_anterior) || 0;
  const precio = Number(presentacion?.precio) || 0;
  return lista > precio && precio > 0 ? lista - precio : 0;
}

/**
 * Una nota en su forma corta para la tarjeta: "Bergamota de Reggio" queda
 * "bergamota" (el "de" con nombre propio es procedencia, no la nota), pero
 * "Flor de loto" y "Madera de cedro" quedan enteras.
 */
function notaCorta(nota) {
  return nota.replace(/\s+de\s+[A-ZÁÉÍÓÚÑ].*$/u, '').trim().toLowerCase();
}

/**
 * Dos o tres notas para la tarjeta, en minuscula: "bergamota, pimienta y
 * ambroxan". Una de cada capa de la piramide (salida, corazon, fondo) y, si
 * falta alguna, la que sigue. Sin notas cargadas, la familia en minuscula
 * ("floral oriental"): tambien es dato real. Sin nada, ''.
 */
export function notasCortas(producto, maximo = 3) {
  const capas = [producto?.nota_salida, producto?.nota_corazon, producto?.nota_fondo]
    .map((t) => separarNotas(t).map(notaCorta));
  const elegidas = [];
  for (let ronda = 0; elegidas.length < maximo && capas.some((c) => c.length > ronda); ronda++) {
    for (const capa of capas) {
      const n = capa[ronda];
      if (n && !elegidas.includes(n) && elegidas.length < maximo) elegidas.push(n);
    }
  }
  if (!elegidas.length) return (producto?.familia_olfativa || '').trim().toLowerCase();
  if (elegidas.length === 1) return elegidas[0];
  return `${elegidas.slice(0, -1).join(', ')} y ${elegidas[elegidas.length - 1]}`;
}

/**
 * Las ciudades de la portada (rediseño D): para que la clienta aprenda el
 * codigo de las cajas ("Ginebra es Baccarat Rouge 540") antes de comprar.
 * Primero las `elegidas` (ajustes.js, las mas conocidas), en su orden; si
 * faltan, se completa con otras cajas que no esten en destacados, alternando
 * ella, el y unisex. Una caja destacada nunca entra (no se repite la misma
 * caja dos secciones seguidas).
 * Devuelve { producto, ciudad, perfume, ml, precio }.
 */
export function ciudadesDe(productos = [], maximo = 4, elegidas = []) {
  const filas = [];
  for (const p of productos) {
    if (!p?.activo || p.destacado || !esPublicable(p)) continue;
    const caja = presentacionesActivas(p).find((x) => x.linea === 'bagues' && x.nombre_proveedor && Number(x.precio));
    if (!caja) continue;
    filas.push({ producto: p, ciudad: caja.nombre_proveedor.trim(), perfume: tituloDe(p), ml: caja.ml, precio: Number(caja.precio) });
  }
  const porSlug = new Map(filas.map((f) => [f.producto.slug, f]));
  const salida = elegidas.map((sl) => porSlug.get(sl)).filter(Boolean);
  const vistas = new Set(salida.map((f) => f.ciudad));
  const resto = filas
    .filter((f) => !vistas.has(f.ciudad))
    .sort((a, b) => (a.producto.orden ?? 999) - (b.producto.orden ?? 999));
  const grupos = ['femenino', 'masculino', 'unisex'].map((g) => resto.filter((f) => f.producto.genero === g));
  for (let i = 0; salida.length < maximo && i < resto.length; i++) {
    for (const g of grupos) {
      const f = g[i];
      if (f && salida.length < maximo && !vistas.has(f.ciudad)) { salida.push(f); vistas.add(f.ciudad); }
    }
  }
  return salida.slice(0, maximo);
}
