// llamada.js — arma los parametros de aplicar_ciclo() (migracion 0017).
//
// Va aparte de servidor.js porque no toca la base (servidor.js importa
// lib/supabase) y asi se puede probar en node. La funcion recibe SIEMPRE los
// seis parametros: ciclo, promos y grupos entran en la misma llamada, o sea en
// la misma transaccion (todo o nada, con respaldo previo en la base).

/**
 * @param {object} d
 * @param {string|null} d.carga          id de ciclo_cargas
 * @param {object[]} d.operaciones       precio|activar|desactivar|caja|type
 * @param {object[]} d.nuevos            codigos nuevos
 * @param {object|null} d.ciclo          { nombre, hasta }
 * @param {object[]|null} d.promosCiclo  settings.promos_ciclo completo que queda (null = no tocarlo)
 * @param {object[]} d.cambiosGrupo      [{ codigo, a }]: presentaciones cuyo grupo_promo cambia
 */
export function paramsDeAplicar({ carga = null, operaciones = [], nuevos = [], ciclo = null, promosCiclo = null, cambiosGrupo = [] } = {}) {
  if (promosCiclo != null && !Array.isArray(promosCiclo)) throw new Error('Las promos del ciclo tienen que ser una lista.');
  const porCodigo = new Map();
  for (const c of cambiosGrupo || []) {
    const codigo = String(c?.codigo ?? '');
    const grupo = c?.a ?? null;
    if (porCodigo.has(codigo) && porCodigo.get(codigo) !== grupo) {
      throw new Error(`El código ${codigo} quedó en dos grupos de promo distintos. No se guardó nada.`);
    }
    porCodigo.set(codigo, grupo);
  }
  return {
    p_carga: carga,
    p_operaciones: operaciones,
    p_nuevos: nuevos,
    p_ciclo: ciclo,
    p_promos: promosCiclo ?? null,
    p_grupos: [...porCodigo].map(([codigo, grupo_promo]) => ({ codigo, grupo_promo })),
  };
}
