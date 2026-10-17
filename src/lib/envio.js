// ============================================================================
// envio.js — cuanto le falta a un pedido para el envio gratis.
// Sin pantallas: el cajon solo dibuja lo que devuelve esto.
// ============================================================================

/**
 * @param {number} total   total del pedido, ya con promos
 * @param {number} umbral  desde cuanto el envio es gratis (ajustes.js)
 * @returns {{ gratis: boolean, falta: number, progreso: number }}
 *   progreso va de 0 a 1, para la barra.
 */
export function envioGratis(total, umbral) {
  const t = Math.max(0, Number(total) || 0);
  const u = Math.max(0, Number(umbral) || 0);
  if (!u) return { gratis: true, falta: 0, progreso: 1 };
  const falta = Math.max(0, u - t);
  return { gratis: falta === 0, falta, progreso: Math.min(1, t / u) };
}
