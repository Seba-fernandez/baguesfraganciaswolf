// ============================================================================
// busqueda.js — el buscador del catalogo, tolerante con como escribe la gente.
//
// Funcion pura, sin pantallas ni dependencias: se prueba con
//   node scripts/qa/busqueda.test.mjs
//
// Antes buscaba la frase exacta en titulo, nombre y familia: "amaderado" daba 0
// (la familia dice "amaderada"), "savage" daba 0, "Arizona" (la caja que la
// clienta tiene en la mano) daba 0, y "vainilla" u "hombre" tambien.
//
// Ahora cada aroma se indexa con su titulo, su nombre, la familia, las tres
// notas, el nombre de caja de cada tamano y los sinonimos de su genero. La
// consulta y el indice pasan por la misma normalizacion, y TODAS las palabras
// de la consulta tienen que coincidir con algo (Y, no O).
// ============================================================================

/** Palabras que no ayudan a encontrar nada: se sacan de la consulta. */
const VACIAS = new Set([
  'de', 'del', 'la', 'las', 'los', 'lo', 'el', 'un', 'una', 'y', 'o', 'para', 'con', 'en',
  'por', 'que', 'mi', 'perfume', 'perfumes', 'fragancia', 'fragancias', 'aroma', 'aromas',
  'tipo', 'olor', 'busco',
]);

/** Como se escribe cada genero. Un unisex aparece tambien para hombre y para mujer. */
const GENERO = {
  masculino: ['masculino', 'hombre', 'varon', 'caballero'],
  femenino: ['femenino', 'mujer', 'ella', 'dama'],
  unisex: ['unisex'],
};
GENERO.unisex = [...GENERO.unisex, ...GENERO.masculino, ...GENERO.femenino];

/** Minusculas, sin tildes y solo letras y numeros. */
export function normalizar(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * La raiz de una palabra: singular simple y sin la vocal final de genero en
 * las de 5 letras o mas. "amaderado" y "amaderada" quedan "amaderad",
 * "flores" queda "flor", "notas" queda "nota".
 */
export function raiz(palabra) {
  let p = palabra;
  if (p.length > 3 && p.endsWith('s') && !/\d/.test(p)) p = p.slice(0, -1);
  if (p.length >= 5 && /[aeo]$/.test(p)) p = p.slice(0, -1);
  return p;
}

/**
 * Distancia de edicion con transposicion de letras vecinas ("gril" y "girl"
 * estan a 1). Corta apenas pasa de 1, que es lo unico que interesa.
 */
function aUnError(a, b) {
  if (a === b) return true;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  if (la === lb) {
    const dif = [];
    for (let i = 0; i < la; i++) if (a[i] !== b[i]) dif.push(i);
    if (dif.length === 1) return true; // una letra cambiada
    return dif.length === 2 && dif[1] === dif[0] + 1 && a[dif[0]] === b[dif[1]] && a[dif[1]] === b[dif[0]];
  }
  // una letra de mas o de menos
  const [corta, larga] = la < lb ? [a, b] : [b, a];
  let i = 0;
  while (i < corta.length && corta[i] === larga[i]) i++;
  return corta.slice(i) === larga.slice(i + 1);
}

/** Solo una transposicion: el error tipico de tipear rapido una palabra corta. */
function transpuesta(a, b) {
  if (a.length !== b.length || a === b) return false;
  const dif = [];
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) dif.push(i);
  return dif.length === 2 && dif[1] === dif[0] + 1 && a[dif[0]] === b[dif[1]] && a[dif[1]] === b[dif[0]];
}

function palabras(texto) {
  return normalizar(texto).split(' ').filter(Boolean);
}

/**
 * Lo que se busca de un aroma, ya normalizado. Se arma una vez por aroma
 * (useMemo en el catalogo), no en cada tecla.
 */
export function indexar(producto) {
  const p = producto || {};
  const cajas = (p.presentaciones || [])
    .filter((x) => x && x.activo !== false)
    .map((x) => x.nombre_proveedor);
  const textos = [
    p.inspirado_en, p.nombre, p.familia_olfativa,
    p.nota_salida, p.nota_corazon, p.nota_fondo,
    ...cajas,
    ...(GENERO[p.genero] || []),
  ];
  const raices = new Set(textos.flatMap(palabras).map(raiz));
  return { raices: [...raices], frase: ` ${textos.map(normalizar).join(' ')} ` };
}

/**
 * La consulta lista para comparar: cada palabra con su raiz y su largo
 * original (la tolerancia a errores depende del largo de lo que se escribio).
 * "él" con tilde es un genero; sin tilde, "el" es un articulo y se descarta.
 */
export function prepararConsulta(texto) {
  const crudas = String(texto || '').toLowerCase().split(/\s+/).filter(Boolean);
  return crudas
    .flatMap((w) => (w === 'él' ? ['hombre'] : palabras(w)))
    .filter((w) => !VACIAS.has(w))
    .map((w) => ({ palabra: w, raiz: raiz(w) }));
}

function coincidePalabra(indice, { palabra, raiz: r }) {
  for (const t of indice.raices) {
    if (t === r) return true;
    // Mientras se escribe: "amad" ya encuentra "amaderada".
    if (r.length >= 3 && t.startsWith(r)) return true;
    // Un error en palabras de 5 letras o mas; en las de 4, solo dos letras
    // vecinas al reves ("gril" por "girl").
    if (palabra.length >= 5 && aUnError(t, r)) return true;
    if (palabra.length === 4 && transpuesta(t, r)) return true;
  }
  // Codigos y numeros dentro de un nombre ("212" en "212 VIP Rosé").
  return /\d/.test(palabra) && indice.frase.includes(` ${palabra}`);
}

/** Si un aroma indexado coincide con la consulta preparada (todas las palabras). */
export function coincide(indice, consulta) {
  if (!consulta.length) return true;
  return consulta.every((q) => coincidePalabra(indice, q));
}

/** Atajo para las pruebas: filtra una lista de aromas con un texto. */
export function buscarAromas(productos, texto) {
  const consulta = prepararConsulta(texto);
  return (productos || []).filter((p) => coincide(indexar(p), consulta));
}
