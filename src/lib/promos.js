// ============================================================================
// promos.js — motor de precios del ciclo. Las reglas son DATO, no codigo:
// vienen de settings.promos_ciclo para que se cambien desde el panel cada mes
// sin tocar el repo.
//
// Regla vigente: 2x1 de a pares, por grupo, y los grupos no se mezclan entre
// si. Para cada grupo:  subtotal = ceil(unidades / 2) * precio_par
// Lo que no tiene grupo_promo se cobra unidad por unidad.
//
// El detalle que mueve plata: con unidades impares, agregar una mas no cuesta
// nada. Llevar 3 sale igual que llevar 4.
// ============================================================================

/** Indexa las reglas por grupo: { disenador: {...}, arabe: {...} } */
export function indexarPromos(promosCiclo) {
  const out = {};
  for (const p of promosCiclo || []) {
    if (p?.grupo) out[p.grupo] = p;
  }
  return out;
}

/**
 * Calcula el total del carrito aplicando las promos por grupo.
 *
 * items: [{ cantidad, precio, grupo_promo }]
 * promosCiclo: settings.promos_ciclo
 *
 * Devuelve:
 *   total          numero final a mostrar
 *   sinPromo       subtotal de los items que no participan
 *   grupos         [{ grupo, titulo, unidades, subtotal, ahorro, faltaUno }]
 *   ahorroTotal    cuanto se ahorra contra el precio unitario de lista
 */
export function calcularCarrito(items, promosCiclo) {
  const reglas = indexarPromos(promosCiclo);
  const porGrupo = new Map();
  let sinPromo = 0;

  for (const it of items || []) {
    const cant = Number(it.cantidad) || 0;
    const precio = Number(it.precio) || 0;
    const grupo = it.grupo_promo;
    if (grupo && reglas[grupo]) {
      const acc = porGrupo.get(grupo) || { unidades: 0, listaSuma: 0 };
      acc.unidades += cant;
      acc.listaSuma += precio * cant;
      porGrupo.set(grupo, acc);
    } else {
      sinPromo += precio * cant;
    }
  }

  const grupos = [];
  let totalPromos = 0;

  for (const [grupo, acc] of porGrupo) {
    const regla = reglas[grupo];
    const precioPar = Number(regla.precio_par) || 0;
    const subtotal = Math.ceil(acc.unidades / 2) * precioPar;
    totalPromos += subtotal;
    grupos.push({
      grupo,
      titulo: regla.titulo || '',
      detalle: regla.detalle || '',
      precioPar,
      unidades: acc.unidades,
      subtotal,
      ahorro: Math.max(0, acc.listaSuma - subtotal),
      // impar = le falta uno para completar el par que ya esta pagando
      faltaUno: acc.unidades % 2 === 1,
    });
  }

  const total = totalPromos + sinPromo;
  const ahorroTotal = grupos.reduce((a, g) => a + g.ahorro, 0);

  return { total, sinPromo, grupos, ahorroTotal };
}

/** Texto del ciclo para el hero: "Ciclo 09/26 · hasta el 18/09". */
export function textoCiclo(settings) {
  const nombre = settings?.ciclo_nombre || '';
  const hasta = settings?.ciclo_hasta;
  if (!hasta) return nombre;
  const d = new Date(`${hasta}T12:00:00`);
  if (Number.isNaN(d.getTime())) return nombre;
  const fecha = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  return nombre ? `${nombre} · hasta el ${fecha}` : `Hasta el ${fecha}`;
}
