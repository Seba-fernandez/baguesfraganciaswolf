// leerBagues.js — los perfumes de 50 ml del catalogo general de Bagues.
//
// El catalogo de Bagues trae de todo (maquillaje, cremas, aromas para la casa)
// y en el medio los perfumes, cada uno escrito asi:
//
//   Arizona Type Sauvage by Bagués 10282038 FOUGÈRE
//
// "Arizona" es el nombre de la caja, "Sauvage" el perfume en el que se inspira
// (el Type), 10282038 el codigo (empieza con 1028) y al final la familia. El
// precio NO va al lado de cada perfume: hay un precio por bloque ("Eau de
// parfum masculino 50 ml $29.999 $22.499 c/u") que vale para todos los de esa
// pagina o ese bloque. Por eso:
//   1. se buscan los codigos 1028 de cada pagina;
//   2. a cada codigo se le busca hacia atras su "Caja Type Perfume by Bagués";
//   3. el precio es el par "$lista $precio" de la pagina; si hay mas de uno, el
//      mas cercano al codigo (en la hoja, o en el texto si no hay posiciones).
//
// Devuelve [{ codigo, caja, type, familia, genero, ml, precio, precio_anterior, pagina, avisos }].
import { precioDeTexto } from './pdf.js';

export const PREFIJO_BAGUES = '1028';
/** Precios posibles de un perfume de 50 ml: deja afuera la caja de regalo ($499) y las cremas. */
export const PRECIO_MINIMO = 10000;
export const PRECIO_MAXIMO = 200000;

const CODIGO = /(?<![\d])(1028\d{4})(?![\d])/g;
const TYPE = /Type\s+(.{1,70}?)\s+by\s+Bagu[ée]s/gi;
const ENCABEZADO = /Eau de (?:parfum|toilette)(?:\s+(femenino|masculino))?\s+(\d{2,3})\s?ml/gi;
const PAR = /\$\s?(\d{1,3}(?:\.\d{3})+)\s+\$\s?(\d{1,3}(?:\.\d{3})+)/g;

/** Una pagina como texto continuo, con el lugar (x, y) de cada letra. */
function textoConPosiciones(pagina) {
  let texto = '';
  const lugar = [];
  for (const it of pagina.items) {
    const s = `${it.s} `;
    for (let k = 0; k < s.length; k++) lugar.push(it);
    texto += s;
  }
  return { texto: texto.replace(/\s/g, ' '), lugar };
}

/** El nombre de la caja: las palabras justo antes de "Type", sin titulares en mayusculas. */
export function cajaAntesDeType(antes) {
  const limpio = antes
    .replace(/Eau de (?:parfum|toilette)(?:\s+(?:femenino|masculino))?\s+\d{2,3}\s?ml/gi, ' ')
    .replace(/Body Lotion\s+\S+(?:\s+\d+\s?ml)?/gi, ' ')
    .trim();
  const palabras = limpio.split(/\s+/);
  const caja = [];
  for (let k = palabras.length - 1; k >= 0 && caja.length < 5; k--) {
    const p = palabras[k];
    const letras = p.replace(/[^A-Za-zÀ-ÿ]/g, '');
    const titular = letras.length >= 2 && letras === letras.toUpperCase();
    if (!letras || titular || /\d|\$/.test(p) || /^(by|Bagu[ée]s|c\/u|ml)$/i.test(p)) break;
    caja.unshift(p);
  }
  return caja.join(' ');
}

/** La familia: las palabras en mayusculas que siguen al codigo. */
function familiaDespues(despues) {
  const m = despues.match(/^\s*((?:[A-ZÁÉÍÓÚÈÜÑ]{3,}\s*){1,4})/);
  if (!m) return '';
  return m[1].trim().split(/\s+/).filter((w) => !['UNISEX', 'LANZAMIENTO', 'NUEVO', 'NUEVOS', 'HASTA'].includes(w)).join(' ')
    .toLowerCase().replace(/^./, (c) => c.toUpperCase());
}

/**
 * Los lanzamientos traen la ficha completa al lado:
 *   "Familia olfativa FLORAL AMADERADA Salida Pera, Ambreta Corazón Rosa, Iris Fondo Cedro"
 * Devuelve { familia, salida, corazon, fondo } o null.
 */
export function piramideCerca(texto) {
  const m = texto.match(/Familia olfativa\s+([A-ZÁÉÍÓÚÈÜÑ ]{3,60}?)\s+Salida\s+(.{2,120}?)\s+Coraz[oó]n\s+(.{2,120}?)\s+Fondo\s+(.{2,120}?)(?=\s+\$|\s+[A-ZÁÉÍÓÚÑ]{4,}|\s+\d{8}|$)/);
  if (!m) return null;
  const limpio = (t) => t.replace(/\s+/g, ' ').trim();
  return {
    familia: limpio(m[1]).toLowerCase().replace(/^./, (c) => c.toUpperCase()),
    salida: limpio(m[2]),
    corazon: limpio(m[3]),
    fondo: limpio(m[4]),
  };
}

const distancia = (a, b) => (a && b ? Math.hypot(a.x - b.x, a.y - b.y) : Infinity);

export function leerBagues(paginas) {
  const productos = [];
  for (const pagina of paginas) {
    const { texto, lugar } = textoConPosiciones(pagina);
    const codigos = [...texto.matchAll(CODIGO)];
    if (!codigos.length) continue;

    const pares = [...texto.matchAll(PAR)]
      .map((m) => ({ lista: precioDeTexto(`$${m[1]}`), precio: precioDeTexto(`$${m[2]}`), pos: m.index, item: lugar[m.index] }))
      .filter((p) => p.precio >= PRECIO_MINIMO && p.precio <= PRECIO_MAXIMO && p.lista > p.precio);
    const encabezados = [...texto.matchAll(ENCABEZADO)].map((m) => ({ genero: m[1]?.toLowerCase() || null, ml: Number(m[2]), pos: m.index, item: lugar[m.index] }));
    const types = [...texto.matchAll(TYPE)].map((m) => ({ type: m[1].replace(/\b\d{2,3}\s?ml\b/gi, '').replace(/\s+/g, ' ').trim(), pos: m.index, fin: m.index + m[0].length }));

    for (const c of codigos) {
      const avisos = [];
      const item = lugar[c.index];
      // El "Type ... by Bagués" que termina justo antes del codigo (hasta 40
      // letras de distancia: a veces hay un salto o una familia en el medio).
      const t = types.filter((x) => x.fin <= c.index && c.index - x.fin <= 40).pop();
      let caja = '';
      let type = '';
      if (t && /\bType\b/i.test(t.type)) {
        // Varias columnas leidas juntas ("Polo Blue Type Bad Boy Type ..."): no
        // se adivina cual es cual. Si el codigo ya existe, no hace falta.
        avisos.push('el nombre vino mezclado con el de otros perfumes de la página');
      } else if (t) {
        type = t.type;
        caja = cajaAntesDeType(texto.slice(Math.max(0, t.pos - 120), t.pos));
      } else {
        avisos.push('no encontré su nombre de caja y Type');
      }
      // Precio: el unico par de la pagina, o el mas cercano.
      let par = null;
      if (pares.length === 1) par = pares[0];
      else if (pares.length > 1) {
        par = [...pares].sort((a, b) => {
          const d = distancia(a.item, item) - distancia(b.item, item);
          return Number.isFinite(d) && d !== 0 ? d : Math.abs(a.pos - c.index) - Math.abs(b.pos - c.index);
        })[0];
      }
      if (!par) avisos.push('no encontré el precio en su página');
      // Genero y ml: el encabezado "Eau de parfum femenino 50 ml" mas cercano antes.
      const enc = encabezados.filter((e) => e.pos < c.index).pop() || encabezados[0] || null;
      const despues = texto.slice(c.index + c[0].length, c.index + c[0].length + 60);
      const piramide = piramideCerca(texto.slice(Math.max(0, c.index - 500), c.index + 500));
      const unisex = /UNISEX/.test(despues);
      productos.push({
        codigo: c[1],
        caja,
        type,
        familia: familiaDespues(despues),
        genero: unisex ? 'unisex' : enc?.genero || null,
        ml: enc?.ml || 50,
        precio: par?.precio ?? null,
        precio_anterior: par?.lista ?? null,
        pagina: pagina.n,
        piramide,
        avisos,
      });
    }
  }
  // Un codigo puede aparecer dos veces (portada y pagina del perfume): queda el
  // que tiene mas datos.
  const porCodigo = new Map();
  const puntos = (p) => (p.precio ? 2 : 0) + (p.type ? 1 : 0) + (p.caja ? 1 : 0);
  for (const p of productos) {
    const previo = porCodigo.get(p.codigo);
    if (!previo || puntos(p) > puntos(previo)) porCodigo.set(p.codigo, p);
  }
  return [...porCodigo.values()];
}
