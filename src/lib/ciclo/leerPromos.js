// leerPromos.js — las promos 2x1 que trae el catalogo de Bagues del ciclo.
//
// Hasta ahora el lector del ciclo solo miraba precios y nunca las promos
// (settings.promos_ciclo). Este modulo las detecta en el texto del PDF, SIN
// escribir nada: devuelve reglas para que alguien las mire y decida.
//
// Como esta armado el catalogo (verificado con el ciclo 12/26):
//   - Cada pagina del PDF es un PLIEGO de dos paginas impresas, y el numero
//     impreso esta en el pie (izquierda y derecha). El rango de la promo se
//     dice en paginas IMPRESAS ("desde la pagina 2 hasta la 29"), asi que se
//     lee del pie de cada pliego; no se asume ninguna cuenta.
//   - El banner dice "2x1 ESPECIAL NAVIDAD", el precio de lista de UNO
//     tachado ($30.999) y "$15.499 c/u". Se paga el de lista y te llevas dos:
//     precio_par = lista (lo que promos.js cobra por cada par).
//   - Bagues censura letras de los nombres con estrellas: aca no se usa ningun
//     nombre, solo numeros, codigos y las frases fijas del banner.
//
// Devuelve { reglas, otras, avisos }:
//   reglas  2x1 con precio legible: { tipo, titulo, detalle, precio_par,
//           precio_unidad, desde, hasta, alcance, paginas_pdf }
//   otras   mecanicas que NO son 2x1 de pares ("LLEVA 1 X $a O LLEVA 2 a
//           solo $b c/u"): se informan pero promos.js no las sabe cobrar.
//   avisos  texto para la persona: un 2x1 sin precio legible, pie ilegible...
import { PREFIJO_BAGUES } from './leerBagues.js';

const PRECIO = /\$\s?(\d{1,3}(?:\.\d{3})+)/g;
const A_NUMERO = (s) => Number(String(s).replace(/\./g, ''));
const RANGO = /(?:DESDE LA P[ÁA]GINA|ENTRE LAS P[ÁA]GINAS)\s+(\d{1,3})\s+(?:HASTA LA P[ÁA]GINA|Y)\s+(\d{1,3})/i;
const BANNER = /(?<![\dA-Za-z])2\s?x\s?1(?![\dA-Za-z])/i;
const LLEVA = /LLEV[ÁA]\s?1\s?X\s+\$\s?(\d{1,3}(?:\.\d{3})+).{0,120}?LLEV[ÁA]\s?2\s+A\s+SOLO\s+\$\s?(\d{1,3}(?:\.\d{3})+)\s?c\/u/i;

const unirTexto = (pagina) => pagina.items.map((i) => i.s).join(' ').replace(/\s+/g, ' ');

/**
 * Los numeros impresos de un pliego: [izquierda, derecha] leidos del pie.
 * Cada uno es null si no se pudo leer (tapa y contratapa son hojas sueltas).
 * Los numeros chicos de las tablas de tamaños tambien son solo digitos, por
 * eso se mira solo la franja de abajo del todo y los bordes.
 */
export function paginasImpresas(pagina) {
  const { ancho, alto } = pagina;
  if (!ancho || !alto) return [null, null];
  const pie = pagina.items.filter((i) => /^\d{1,3}$/.test(i.s.trim()) && i.y >= alto * 0.95);
  const izq = pie.filter((i) => i.x < ancho * 0.1).map((i) => Number(i.s))[0];
  const der = pie.filter((i) => i.x > ancho * 0.9).map((i) => Number(i.s))[0];
  return [izq ?? null, der ?? null];
}

const oracion = (t) => t.toLowerCase().replace(/(^|[.!?]\s+)(\S)/g, (_, a, b) => a + b.toUpperCase());

/** El par (lista tachada, precio c/u) del banner: lista = 2 x c/u, con 1 peso de diferencia (el catalogo
// redondea para abajo: $30.999 / 2 = $15.499,50 y muestra $15.499). */
function parDelBanner(texto) {
  const listas = [...texto.matchAll(PRECIO)]
    // "Precio sin impuestos nacionales: $12.809" no es un precio al publico
    .filter((m) => !/:\s*$/.test(texto.slice(Math.max(0, m.index - 3), m.index)))
    .map((m) => A_NUMERO(m[1]));
  const cus = [...texto.matchAll(/\$\s?(\d{1,3}(?:\.\d{3})+)\s?c\/u/gi)].map((m) => A_NUMERO(m[1]));
  const pares = [];
  for (const cu of cus) {
    for (const lista of new Set(listas)) {
      if (lista !== cu && Math.abs(lista - 2 * cu) <= 1) pares.push({ lista, cu });
    }
  }
  return pares;
}

export function leerPromos(paginas) {
  const porClave = new Map();
  const otras = [];
  const avisos = [];

  for (const pagina of paginas) {
    const texto = unirTexto(pagina);
    const [izq, der] = paginasImpresas(pagina);
    const impresas = [izq, der].filter((x) => x != null);
    const rango = texto.match(RANGO);
    const lleva = texto.match(LLEVA);
    const hay2x1 = BANNER.test(texto);

    if (lleva) {
      const clave = `lleva|${lleva[1]}|${lleva[2]}`;
      if (!otras.some((o) => o.clave === clave)) {
        otras.push({
          clave,
          tipo: 'llevar_1_o_2',
          precio_1: A_NUMERO(lleva[1]),
          precio_c_u_llevando_2: A_NUMERO(lleva[2]),
          desde: rango ? Number(rango[1]) : impresas[0] ?? null,
          hasta: rango ? Number(rango[2]) : impresas.at(-1) ?? null,
          paginas_pdf: [pagina.n],
        });
      } else otras.find((o) => o.clave === clave).paginas_pdf.push(pagina.n);
    }
    if (!hay2x1) continue;

    const pares = parDelBanner(texto);
    const unicos = [...new Map(pares.map((p) => [`${p.lista}|${p.cu}`, p])).values()];
    if (unicos.length === 0) {
      avisos.push(`Pliego PDF ${pagina.n}${impresas.length ? ` (págs. ${impresas.join('-')})` : ''}: dice 2x1 pero no pude leer el precio por unidad. Revisalo a mano.`);
      continue;
    }
    for (const { lista, cu } of unicos) {
      const desde = rango ? Number(rango[1]) : impresas[0] ?? null;
      const hasta = rango ? Number(rango[2]) : impresas.at(-1) ?? null;
      const clave = `2x1|${lista}|${desde}|${hasta}`;
      let r = porClave.get(clave);
      if (!r) {
        const titulo = [...texto.matchAll(/2\s?x\s?1\s+((?:[A-ZÁÉÍÓÚÑ]{3,}\s?){1,3})/g)]
          .map((m) => m[1].trim()).find((t) => !/^(HASTA|COMBINAL|PRECIO)/.test(t));
        const frase = texto.match(/COMBINAL[OA]S COMO QUIERAS DESDE LA P[ÁA]GINA \d+ HASTA LA P[ÁA]GINA \d+\.?(?:\s*HASTA AGOTAR STOCK\.?)?/i);
        r = {
          tipo: '2x1',
          titulo: titulo ? `2x1 ${titulo}` : '2x1',
          detalle: frase ? oracion(frase[0].trim()) : '',
          precio_par: lista,
          precio_unidad: cu,
          desde,
          hasta,
          // con rango escrito, vale en todo el rango; sin rango, solo en el pliego donde aparece
          alcance: rango ? 'rango' : 'pliego',
          paginas_pdf: [],
        };
        porClave.set(clave, r);
      }
      if (!r.paginas_pdf.includes(pagina.n)) r.paginas_pdf.push(pagina.n);
    }
  }
  return { reglas: [...porClave.values()], otras: otras.map(({ clave: _c, ...o }) => o), avisos };
}

/**
 * Codigos de proveedor (por defecto los de Bagues, 1028xxxx) que caen dentro
 * del rango de PAGINAS IMPRESAS de una regla. Con la posicion x de cada texto
 * separa la pagina izquierda de la derecha del pliego; sin posiciones (texto
 * plano) incluye el pliego entero y lo marca `aproximado`.
 */
export function codigosDeRegla(paginas, regla, prefijo = PREFIJO_BAGUES) {
  const re = new RegExp(`(?<!\\d)(${prefijo}\\d{${8 - prefijo.length}})(?!\\d)`, 'g');
  const codigos = new Set();
  let aproximado = false;
  for (const pagina of paginas) {
    const [izq, der] = paginasImpresas(pagina);
    if (izq == null && der == null) continue;
    const entra = (n) => n != null && n >= regla.desde && n <= regla.hasta;
    if (!entra(izq) && !entra(der)) continue;
    for (const it of pagina.items) {
      const lado = it.x == null || !pagina.ancho ? null : it.x < pagina.ancho / 2 ? izq : der;
      if (lado == null && !(entra(izq) && entra(der))) aproximado = true;
      if (lado != null && !entra(lado)) continue;
      for (const m of it.s.matchAll(re)) codigos.add(m[1]);
    }
  }
  return { codigos: [...codigos].sort(), aproximado };
}

/**
 * La forma que habria que proponer en el panel para settings.promos_ciclo
 * (NO se escribe en ningun lado: solo prepara el objeto). `grupo` es el nombre
 * que despues llevaria grupo_promo en cada presentacion.
 */
export function proponerPromosCiclo(reglas) {
  return reglas.map((r) => {
    const resto = r.titulo.replace(/^2x1\s*/i, '');
    const slug = (resto || `p${r.desde}_${r.hasta}`).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    return { grupo: slug ? `2x1_${slug}` : '2x1', titulo: r.titulo, detalle: r.detalle, precio_par: r.precio_par };
  });
}

// ---------------------------------------------------------------------------
// De lo que dice el PDF a una propuesta que el panel muestra y Sebas confirma.
// Nada de esto escribe: devuelve datos. Escribir (settings.promos_ciclo y, si
// hace falta, grupo_promo de las presentaciones) lo hace servidor.js SOLO con
// las reglas que Sebas marco.
// ---------------------------------------------------------------------------

/**
 * Grupos que NO son un 2x1: el arabe de las paginas 30 a 33 tiene un descuento
 * simple del 25 %. Cargarle una regla 2x1 regala producto, asi que una regla
 * 2x1 nunca se ata a un codigo de estos grupos.
 */
export const GRUPOS_SIN_2X1 = ['arabe'];

/** Lo que se guarda de las promos del PDF al leerlo: las reglas con sus codigos (el PDF entero no se conserva). */
export function promosDelPdf(paginas) {
  const { reglas, otras, avisos } = leerPromos(paginas);
  return {
    reglas: reglas.map((r) => ({ ...r, ...codigosDeRegla(paginas, r) })),
    otras,
    avisos,
  };
}

/** Clave estable de una regla (para la casilla de "cargar esta promo"). */
export const claveDeRegla = (r) => `${r.tipo}|${r.desde}|${r.hasta}|${r.precio_par}`;

/**
 * Arma la propuesta de promos del ciclo.
 *   promos          lo de promosDelPdf(): { reglas (con codigos), otras, avisos } | null
 *   filas           los perfumes de la base (products con presentaciones)
 *   promosActuales  settings.promos_ciclo
 *   leidos          los perfumes leidos del PDF de Bagues (para chequear precios)
 * Cada regla sale atada a LOS CODIGOS de su rango de paginas, nunca al grupo entero.
 * Devuelve { reglas, otras, avisos }; cada regla trae `bloqueos` (no se puede
 * cargar), `avisos` (para mirar) y `cambiosGrupo` (presentaciones cuyo
 * grupo_promo habria que cambiar).
 */
export function propuestaDePromos(promos, filas, promosActuales = [], leidos = null) {
  if (!promos) return { reglas: [], otras: [], avisos: [] };
  const enBase = new Map();
  for (const f of filas || []) for (const pres of f.presentaciones || []) if (pres?.codigo) enBase.set(String(pres.codigo), { producto: f, pres });
  const leidoDe = new Map((leidos || []).map((p) => [String(p.codigo), p]));
  const base = proponerPromosCiclo(promos.reglas);

  const reglas = promos.reglas.map((r, i) => {
    const bloqueos = [];
    const avisos = [];
    const codigos = r.codigos || [];
    const nombreDe = (c) => enBase.get(c)?.producto.nombre || leidoDe.get(c)?.caja || c;

    if (!codigos.length) bloqueos.push('No encontré ningún código de perfume dentro de esas páginas: no hay a quién atarle la promo.');
    if (r.aproximado) bloqueos.push('No pude separar la página izquierda de la derecha del pliego: la lista de perfumes sería aproximada y no se propone.');

    // El grupo: el que ya tienen los perfumes del rango (lo normal es "disenador").
    const cuenta = new Map();
    for (const c of codigos) {
      const g = enBase.get(c)?.pres.grupo_promo;
      if (g) cuenta.set(g, (cuenta.get(g) || 0) + 1);
    }
    const enGrupoSin2x1 = codigos.filter((c) => GRUPOS_SIN_2X1.includes(enBase.get(c)?.pres.grupo_promo));
    const candidatos = [...cuenta.entries()].filter(([g]) => !GRUPOS_SIN_2X1.includes(g)).sort((a, b) => b[1] - a[1]);
    const grupo = candidatos[0]?.[0] || (cuenta.size ? base[i].grupo : 'disenador');
    if (enGrupoSin2x1.length) {
      bloqueos.push(`${enGrupoSin2x1.length} ${enGrupoSin2x1.length === 1 ? 'perfume del rango está' : 'perfumes del rango están'} en un grupo con descuento simple (${GRUPOS_SIN_2X1.join(', ')}), no 2x1: ${enGrupoSin2x1.slice(0, 4).map((c) => `${nombreDe(c)} (${c})`).join(', ')}. Cargarles un 2x1 regala producto: revisalo a mano.`);
    }

    const cambiosGrupo = codigos
      .filter((c) => enBase.has(c) && enBase.get(c).pres.grupo_promo !== grupo && !GRUPOS_SIN_2X1.includes(enBase.get(c).pres.grupo_promo))
      .map((c) => ({ codigo: c, productoId: enBase.get(c).producto.id, nombre: nombreDe(c), de: enBase.get(c).pres.grupo_promo || null, a: grupo }));
    const nuevosEnRango = codigos.filter((c) => !enBase.has(c));
    if (nuevosEnRango.length && grupo !== 'disenador') {
      avisos.push(`${nuevosEnRango.length} códigos del rango todavía no están en la tienda y entran como "disenador", no como "${grupo}".`);
    }

    // Perfumes que ya tienen el grupo pero NO estan en el rango: la regla es por grupo y los cobraria igual.
    const fuera = [...enBase.entries()]
      .filter(([c, { pres }]) => pres.grupo_promo === grupo && pres.activo !== false && !codigos.includes(c))
      .map(([c]) => ({ codigo: c, nombre: nombreDe(c) }));
    if (fuera.length) {
      avisos.push(`${fuera.length} ${fuera.length === 1 ? 'tamaño activo tiene' : 'tamaños activos tienen'} el grupo "${grupo}" pero no ${fuera.length === 1 ? 'está' : 'están'} en las páginas ${r.desde} a ${r.hasta}: con esta regla también se cobrarían como 2x1 (${fuera.slice(0, 4).map((x) => `${x.nombre} ${x.codigo}`).join(', ')}${fuera.length > 4 ? '…' : ''}).`);
    }

    // El precio leido de cada codigo del rango tiene que ser el del par (la lista de uno).
    const distintos = codigos.filter((c) => leidoDe.has(c) && leidoDe.get(c).precio && leidoDe.get(c).precio !== r.precio_par);
    if (distintos.length) avisos.push(`${distintos.length} códigos del rango se leyeron con un precio distinto de $${r.precio_par.toLocaleString('es-AR')}: ${distintos.slice(0, 4).join(', ')}.`);

    const actual = (promosActuales || []).find((p) => p?.grupo === grupo) || null;
    const promo = { grupo, titulo: base[i].titulo, detalle: base[i].detalle, precio_par: r.precio_par };
    const sinCambios = !cambiosGrupo.length && actual && Number(actual.precio_par) === promo.precio_par && (actual.titulo || '') === promo.titulo && (actual.detalle || '') === promo.detalle;
    return {
      clave: claveDeRegla(r),
      regla: r,
      promo,
      actual,
      codigos,
      cambiosGrupo,
      fuera,
      bloqueos,
      avisos,
      sinCambios: Boolean(sinCambios),
    };
  });
  return { reglas, otras: promos.otras || [], avisos: promos.avisos || [] };
}

/**
 * settings.promos_ciclo resultante: las reglas actuales, y las confirmadas
 * reemplazan a la de su mismo grupo (o se suman). Las demas (por ejemplo el
 * descuento del arabe) quedan EXACTAMENTE como estaban.
 */
export function promosCicloResultantes(promosActuales, confirmadas) {
  const salida = (promosActuales || []).map((p) => ({ ...p }));
  for (const c of confirmadas) {
    const i = salida.findIndex((p) => p?.grupo === c.promo.grupo);
    if (i >= 0) salida[i] = { ...salida[i], ...c.promo };
    else salida.push({ ...c.promo });
  }
  return salida;
}
