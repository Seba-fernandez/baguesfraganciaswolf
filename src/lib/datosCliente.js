// ============================================================================
// datosCliente.js: reglas para el nombre y el WhatsApp que escribe una clienta
//
// Tolerante con la forma, estricto con el contenido. La gente escribe el mismo
// número de muchas maneras ("+54 9 351 555-1234", "0351 15 555 1234",
// "351 5551234") y todas tienen que entrar; lo que no puede entrar es un número
// incompleto o un nombre con caracteres que no son de un nombre.
//
// La base aplica las mismas reglas en crear_pedido_web() (migración 0012):
// esto es para avisar a tiempo y con un texto claro, no la única defensa.
// Pruebas: node scripts/qa/datos.test.mjs
// ============================================================================

/** Cifras de un número nacional argentino: característica + número. */
const NACIONAL = 10;

/**
 * Lleva un teléfono a la forma que usa WhatsApp para un celular argentino:
 * 549 + característica + número (13 cifras). Un número de otro país, escrito
 * con "+" o "00" adelante, se acepta tal cual si tiene de 8 a 15 cifras.
 *
 * Devuelve { ok: true, valor } o { ok: false, motivo }, con motivo:
 *   'vacio'     no escribió nada
 *   'letras'    hay letras o símbolos que no van en un teléfono
 *   'sin_area'  parece un número local sin la característica (7 u 8 cifras)
 *   'invalido'  le faltan o le sobran cifras
 */
export function telefonoArgentino(entrada) {
  const texto = String(entrada ?? '').trim();
  if (!texto) return { ok: false, motivo: 'vacio' };
  // Solo cifras y lo que la gente usa para separarlas.
  if (/[^\d\s+\-().\/]/.test(texto)) return { ok: false, motivo: 'letras' };

  let d = texto.replace(/\D/g, '');
  if (!d) return { ok: false, motivo: 'vacio' };

  const internacional = texto.startsWith('+') || d.startsWith('00');
  if (d.startsWith('00')) d = d.slice(2);

  // Otro país: no se adivina nada, solo se controla el largo.
  if (internacional && !d.startsWith('54')) {
    return d.length >= 8 && d.length <= 15 ? { ok: true, valor: d } : { ok: false, motivo: 'invalido' };
  }

  // Ninguna característica argentina empieza con 54 ni con 9: si están
  // adelante, son el código de país y el 9 de los celulares.
  if (d.startsWith('54') && d.length >= 12) d = d.slice(2);
  if (d.startsWith('9') && d.length >= 11) d = d.slice(1);
  // El 0 de las llamadas de larga distancia (0351).
  if (d.startsWith('0')) d = d.slice(1);

  // El 15 de los celulares va después de la característica (351 15 555 1234).
  // La característica tiene 2 cifras (11), 3 (351) o 4 (3543).
  if (d.length === NACIONAL + 2) {
    const largos = d.startsWith('11') ? [2] : [3, 4, 2];
    const largo = largos.find((n) => d.slice(n, n + 2) === '15');
    if (largo) d = d.slice(0, largo) + d.slice(largo + 2);
  }

  // Sin característica: 555 1234 o 15 555 1234.
  if (d.length < 9 || (d.length === 9 && d.startsWith('15'))) {
    return { ok: false, motivo: 'sin_area' };
  }
  // Las características argentinas empiezan con 1, 2 o 3.
  if (d.length !== NACIONAL || !/^[123]/.test(d)) return { ok: false, motivo: 'invalido' };

  return { ok: true, valor: `549${d}` };
}

/** Largo del nombre, contado después de limpiar espacios. */
export const NOMBRE_MIN = 2;
export const NOMBRE_MAX = 60;

/**
 * Limpia y controla un nombre: saca espacios de más y acepta letras de
 * cualquier idioma (tildes, ñ, ü), espacios, apóstrofo, guion y punto
 * ("María José", "D'Angelo", "Ana-Laura", "J. Pérez").
 *
 * Devuelve { ok: true, valor } o { ok: false, motivo }, con motivo:
 *   'vacio'  no escribió nada
 *   'corto'  menos de dos letras
 *   'largo'  más de NOMBRE_MAX caracteres
 *   'raro'   números o símbolos que no van en un nombre
 */
export function nombreCliente(entrada) {
  const valor = String(entrada ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
  if (!valor) return { ok: false, motivo: 'vacio' };
  if (valor.length > NOMBRE_MAX) return { ok: false, motivo: 'largo' };
  if (!/^[\p{L}\p{M}][\p{L}\p{M} '’.\-]*$/u.test(valor)) return { ok: false, motivo: 'raro' };
  if ((valor.match(/\p{L}/gu) || []).length < NOMBRE_MIN) return { ok: false, motivo: 'corto' };
  return { ok: true, valor };
}
