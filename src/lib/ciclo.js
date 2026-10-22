// ============================================================================
// ciclo.js — la tira del ciclo: "Ciclo 10/26 · Pedidos hasta el viernes 31 ·
// Quedan 15 días".
//
// Sale de dos datos que Sebas ya carga en Ajustes: settings.ciclo_nombre y
// settings.ciclo_hasta (una fecha "AAAA-MM-DD", el ultimo dia para pedir).
// Es urgencia real, no un contador inventado: si la fecha falta o ya paso, no
// hay tira (nunca una fecha vencida a la vista).
//
// Los dias se cuentan en la hora de Argentina, no en la del telefono: una
// clienta que mira a las 23:30 en otro huso no tiene que ver "Queda 1 dia"
// cuando en Cordoba ya es el ultimo.
//
// Funcion pura: se prueba con node scripts/qa/ciclo.test.mjs
// ============================================================================

const ZONA = 'America/Argentina/Cordoba';
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const UN_DIA = 86400000;

/** Con 3 dias o menos la cifra pasa al acento. */
export const DIAS_URGENTE = 3;

/** La fecha de hoy en Argentina, como [anio, mes, dia]. */
export function hoyEnArgentina(ahora = new Date()) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(ahora);
  const valor = (tipo) => Number(partes.find((p) => p.type === tipo)?.value);
  return [valor('year'), valor('month'), valor('day')];
}

/** "2026-10-31" -> [2026, 10, 31]; cualquier otra cosa -> null. */
function leerFecha(texto) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(texto || '').trim());
  if (!m) return null;
  const [a, me, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const f = new Date(Date.UTC(a, me - 1, d));
  // 2026-02-31 no existe: Date lo corre a marzo y aca se descarta.
  if (f.getUTCFullYear() !== a || f.getUTCMonth() !== me - 1 || f.getUTCDate() !== d) return null;
  return [a, me, d];
}

/**
 * El estado del ciclo, o null si no hay que mostrar nada.
 *   { nombre, dia: 'viernes 31', dias: 15, urgente: false }
 * `dias` es cuantos dias faltan para el ultimo (0 = hoy es el ultimo dia).
 */
export function estadoCiclo({ nombre, hasta } = {}, ahora = new Date()) {
  const fin = leerFecha(hasta);
  if (!fin) return null;
  const [a, m, d] = hoyEnArgentina(ahora);
  const dias = Math.round((Date.UTC(fin[0], fin[1] - 1, fin[2]) - Date.UTC(a, m - 1, d)) / UN_DIA);
  if (dias < 0) return null;
  const semana = DIAS[new Date(Date.UTC(fin[0], fin[1] - 1, fin[2])).getUTCDay()];
  return {
    nombre: String(nombre || '').trim(),
    dia: `${semana} ${fin[2]}`,
    dias,
    urgente: dias <= DIAS_URGENTE,
  };
}
