// buscarPanel.js: buscar y ordenar el catalogo en el panel.
//
// Sebas busca para confirmar si un perfume esta cargado. Lo puede tener en la
// cabeza por el nombre oficial (Sauvage), por la caja de Bagues (Arizona) o por
// el codigo de la proveedora. Usa la misma tolerancia que el buscador de la
// tienda (lib/busqueda.js: sin tildes, sin mayusculas, un error de una letra,
// todas las palabras tienen que coincidir), pero solo mira NOMBRES y codigos:
// las notas y la familia darian decenas de resultados para "vainilla".
// Incluye los tamaños pausados, que en la tienda no se ven.
//
// Sin JSX ni base: se prueba con node (scripts/qa/buscarPanel.test.mjs).
import { normalizar, raiz, prepararConsulta, coincide } from './busqueda.js';

/** La letra con la que se agrupa un perfume: A a Z, o "#" si empieza con numero. */
export function letraDe(nombre) {
  const c = normalizar(nombre).charAt(0);
  if (/[a-z]/.test(c)) return c.toUpperCase();
  return '#';
}

export const LETRAS = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];

/** Lo que se busca de un perfume en el panel: nombres, cajas y codigos. */
export function indexarPanel(producto) {
  const p = producto || {};
  const pres = p.presentaciones || [];
  const textos = [p.nombre, p.inspirado_en, ...pres.map((x) => x?.nombre_proveedor)];
  const codigos = pres.map((x) => String(x?.codigo ?? '')).filter(Boolean);
  const raices = new Set(
    [...textos, ...codigos].flatMap((t) => normalizar(t).split(' ').filter(Boolean)).map(raiz),
  );
  return { raices: [...raices], frase: ` ${[...textos, ...codigos].map(normalizar).join(' ')} ` };
}

/**
 * Todas las palabras tienen que coincidir. Las que son solo numeros (un codigo,
 * "212") tienen que ser el comienzo exacto de un numero: un codigo con un
 * digito distinto es otro perfume, no un error de tipeo. Con una o dos letras
 * ("sa") ya filtra por el comienzo de una palabra, mientras se escribe.
 */
function coincidePanel(indice, consulta) {
  return consulta.every((q) => (/^\d+$/.test(q.palabra) || q.palabra.length < 3
    ? indice.frase.includes(` ${q.palabra}`)
    : coincide(indice, [q])));
}

const comparar = new Intl.Collator('es', { sensitivity: 'base', numeric: true }).compare;

/** De la A a la Z por nombre, sin importar tildes ni mayusculas ("212" va antes que la A). */
export function ordenarAZ(productos) {
  return [...(productos || [])].sort((a, b) => comparar(String(a.nombre || ''), String(b.nombre || '')));
}

/**
 * Filtra y ordena.
 *   texto  lo que se escribio en el buscador (vacio: todos)
 *   letra  'A'..'Z', '#' o null
 * Devuelve { lista, letras }: la lista ordenada A a Z y el Set de letras que
 * tienen algun perfume con ese texto (para apagar las letras vacias).
 */
export function filtrarCatalogo(productos, { texto = '', letra = null } = {}) {
  const consulta = prepararConsulta(texto);
  const conTexto = consulta.length
    ? (productos || []).filter((p) => coincidePanel(indexarPanel(p), consulta))
    : [...(productos || [])];
  const letras = new Set(conTexto.map((p) => letraDe(p.nombre)));
  const lista = letra ? conTexto.filter((p) => letraDe(p.nombre) === letra) : conTexto;
  return { lista: ordenarAZ(lista), letras };
}
