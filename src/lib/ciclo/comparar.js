// comparar.js — de lo que se leyo en los PDF a la propuesta de cambios.
//
// Compara por CODIGO contra lo cargado en la base (el codigo es sagrado: es
// con lo que Sebas pide a la proveedora). Nunca borra: lo que no esta en el
// ciclo se desactiva. Arma una lista de operaciones que la funcion
// aplicar_ciclo() de la base vuelve a validar antes de aplicar (ver la
// migracion 0015). Funcion pura: se prueba sin navegador ni base.
//
// Entrada:
//   filas   los perfumes de la base (products, con presentaciones)
//   leidos  { unlock: [...] | null, bagues: [...] | null }  (null = no se subio ese PDF)
// Salida: { operaciones, grupos, alertas, bloqueos, resumen }
import { PREFIJO_UNLOCK } from './leerUnlock.js';
import { PREFIJO_BAGUES, PRECIO_MINIMO, PRECIO_MAXIMO } from './leerBagues.js';
import { sugerirPerfume } from './resolverNombre.js';

/** Si el ciclo desactiva mas que esta parte de una linea, se frena: puede ser el PDF equivocado. */
export const TOPE_DESACTIVAR = 1 / 3;
/** Un precio que cambia mas que esto contra el anterior se marca para mirar. */
export const SALTO_SOSPECHOSO = { baja: 0.5, sube: 1.8 };

const pesos = (n) => `$ ${Number(n).toLocaleString('es-AR')}`;
const plano = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, ' ').trim();

// Como escribe Bagues algunos nombres en el Type (abreviados o traducidos).
const EQUIVALENTES = [
  [/\bkzo\b/g, 'kenzo'], [/\bysl\b/g, 'yves saint laurent'], [/\bla vida es bella\b/g, 'la vie est belle'],
  [/\bmasc\b/g, 'homme'], [/\bfem\b/g, 'femme'], [/\bgio\b/g, 'gio'],
];
const comparable = (t) => EQUIVALENTES.reduce((acc, [de, a]) => acc.replace(de, a), plano(t));

/** Parecido entre dos nombres (0 a 1): palabras en comun sobre las del mas corto. */
export function parecido(a, b) {
  const pa = new Set(comparable(a).split(' ').filter((w) => w.length > 1));
  const pb = new Set(comparable(b).split(' ').filter((w) => w.length > 1));
  if (!pa.size || !pb.size) return 0;
  let comunes = 0;
  for (const w of pa) if (pb.has(w)) comunes++;
  return comunes / Math.min(pa.size, pb.size);
}

const lineaDeCodigo = (codigo) => (String(codigo).startsWith(PREFIJO_UNLOCK) ? 'unlock' : String(codigo).startsWith(PREFIJO_BAGUES) ? 'bagues' : null);

/** Validacion de un producto leido. Devuelve el motivo si no se puede usar, o null. */
export function problemaDeLeido(p, linea) {
  if (!/^\d{8}$/.test(String(p.codigo))) return 'código con forma rara';
  if (lineaDeCodigo(p.codigo) !== linea) return `el codigo no es de ${linea === 'unlock' ? 'Unlock' : 'Bagues'}`;
  if (!p.precio) return 'sin precio';
  if (p.precio < PRECIO_MINIMO || p.precio > PRECIO_MAXIMO) return `precio fuera de rango ($ ${p.precio})`;
  if (p.precio_anterior != null && p.precio_anterior < p.precio) return 'el precio de lista es menor que el del ciclo';
  if (linea === 'unlock' && !p.ml) return 'sin ml';
  return null;
}

export function compararCiclo(filas, leidos) {
  const operaciones = [];
  const alertas = [];
  const bloqueos = [];
  // Los bloqueos que Sebas puede pasar por alto a conciencia (un ciclo que de
  // verdad saca muchos perfumes). Un PDF vacio o de la otra linea, nunca.
  const forzables = [];
  const grupos = { precios: [], reactivar: [], desactivar: [], nuevos: [], cajas: [], types: [], descartados: [], revisar: [] };

  // Indice de la base por codigo.
  const enBase = new Map();
  for (const f of filas) {
    for (const pres of f.presentaciones || []) {
      if (pres?.codigo) enBase.set(String(pres.codigo), { producto: f, pres });
    }
  }

  for (const linea of ['unlock', 'bagues']) {
    const lista = leidos[linea];
    if (!lista) continue;
    const nombreLinea = linea === 'unlock' ? 'Unlock' : 'Bagués';
    if (!lista.length) {
      bloqueos.push(`En el PDF de ${nombreLinea} no encontré ningún perfume. ¿Es el catálogo correcto?`);
      continue;
    }
    // Un PDF de la otra linea subido en el lugar equivocado.
    const ajenos = lista.filter((p) => lineaDeCodigo(p.codigo) !== linea).length;
    if (ajenos > lista.length / 2) {
      bloqueos.push(`El PDF que subiste como ${nombreLinea} parece ser de la otra línea.`);
      continue;
    }

    const leidosValidos = new Map();
    for (const p of lista) {
      const motivo = problemaDeLeido(p, linea);
      if (motivo) { grupos.descartados.push({ linea, codigo: p.codigo, motivo, titulo: p.caja || p.titulo || '', pagina: p.pagina }); continue; }
      leidosValidos.set(String(p.codigo), p);
    }

    for (const [codigo, p] of leidosValidos) {
      const actual = enBase.get(codigo);
      if (!actual) {
        // Codigo nuevo: si es una caja de Bagues de un perfume que ya existe
        // (por el Type), se suma a ese aroma; si no, es un aroma nuevo.
        let destino = null;
        if (linea === 'bagues' && p.type) {
          const candidatos = filas
            .map((f) => ({ f, puntos: Math.max(parecido(p.type, f.inspirado_en), parecido(p.type, f.nombre)) }))
            .filter((x) => x.puntos >= 0.99)
            .sort((a, b) => b.puntos - a.puntos);
          destino = candidatos[0]?.f || null;
        }
        // Unlock tapa letras con estrellas: el nombre no se usa, solo se sugiere a que perfume se parece.
        const sugeridos = linea === 'unlock' ? sugerirPerfume(p.titulo, filas) : [];
        const nuevo = { linea, codigo, leido: p, sumarA: destino ? { id: destino.id, nombre: destino.nombre } : null, sugeridos };
        grupos.nuevos.push(nuevo);
        if (p.revisar) grupos.revisar.push({ linea, codigo, nombre: p.titulo || codigo, ml: p.ml, motivo: p.revisar, lista: p.precio_anterior ?? null });
        if (linea === 'unlock' || !p.type) {
          alertas.push(`Código nuevo ${codigo} (${p.titulo || p.caja || 'sin nombre legible'}): elegí a qué perfume corresponde antes de aplicar.`);
        }
        continue;
      }
      const { producto, pres } = actual;
      if (pres.linea && pres.linea !== linea) {
        grupos.descartados.push({ linea, codigo, motivo: `en la base figura como ${pres.linea}`, titulo: producto.nombre, pagina: p.pagina });
        continue;
      }
      const base = { productoId: producto.id, nombre: producto.nombre, codigo, linea, ml: pres.ml };
      // Si el catalogo no muestra el precio de lista (`conservarAnterior`), se deja el que ya tenia:
      // mandar null le sacaria el tachado a un codigo que lo tenia.
      const anterior = p.conservarAnterior ? (pres.precio_anterior ?? null) : (p.precio_anterior ?? null);
      if (pres.activo === false) {
        grupos.reactivar.push({ ...base, precio: p.precio, precio_anterior: anterior });
        operaciones.push({ tipo: 'activar', codigo });
      }
      const cambiaAnterior = (pres.precio_anterior ?? null) !== anterior;
      const cambiaPrecio = Number(pres.precio) !== p.precio || cambiaAnterior;
      if (p.revisar && (cambiaAnterior || pres.activo === false)) {
        grupos.revisar.push({ ...base, motivo: p.revisar, lista: anterior });
      }
      if (cambiaPrecio) {
        const relacion = pres.precio ? p.precio / Number(pres.precio) : 1;
        const sospechoso = relacion < SALTO_SOSPECHOSO.baja || relacion > SALTO_SOSPECHOSO.sube;
        grupos.precios.push({
          ...base,
          antes: { precio: Number(pres.precio), precio_anterior: pres.precio_anterior ?? null },
          despues: { precio: p.precio, precio_anterior: anterior },
          sospechoso,
        });
        operaciones.push({ tipo: 'precio', codigo, precio: p.precio, precio_anterior: anterior });
        if (sospechoso) alertas.push(`${producto.nombre} (${codigo}): el precio pasa de ${pesos(pres.precio)} a ${pesos(p.precio)}. Revisalo.`);
      }
      if (linea === 'unlock' && p.ml && pres.ml && p.ml !== pres.ml) {
        alertas.push(`${producto.nombre} (${codigo}): en el PDF dice ${p.ml} ml y en la base ${pres.ml} ml. No se cambia solo: revisalo.`);
      }
      if (linea === 'bagues') {
        if (p.caja && plano(p.caja) !== plano(pres.nombre_proveedor)) {
          grupos.cajas.push({ ...base, antes: pres.nombre_proveedor || '', despues: p.caja });
          operaciones.push({ tipo: 'caja', codigo, nombre_proveedor: p.caja });
        }
        if (p.type) {
          // El Type guardado del ciclo anterior es la referencia exacta; la
          // primera vez se compara con el perfume cargado, con tolerancia.
          const cambio = pres.type ? plano(pres.type) !== plano(p.type) : Math.max(parecido(p.type, producto.inspirado_en), parecido(p.type, producto.nombre)) < 0.34;
          if (cambio) {
            grupos.types.push({ ...base, inspirado: producto.inspirado_en, antes: pres.type || null, despues: p.type });
            alertas.push(`${pres.nombre_proveedor || codigo}: el catálogo dice "Type ${p.type}" y en la tienda figura como ${producto.inspirado_en}. Si cambió el perfume, corregilo en el panel.`);
          }
          if (plano(pres.type) !== plano(p.type)) operaciones.push({ tipo: 'type', codigo, type: p.type });
        }
      }
    }

    // Lo activo de esta linea que no vino en el PDF: se desactiva.
    const activosLinea = [...enBase.entries()].filter(([, { pres }]) => (pres.linea || lineaDeCodigo(pres.codigo)) === linea && pres.activo !== false);
    const salen = activosLinea.filter(([codigo]) => !leidosValidos.has(codigo) && !lista.some((p) => String(p.codigo) === codigo));
    for (const [codigo, { producto, pres }] of salen) {
      grupos.desactivar.push({ productoId: producto.id, nombre: producto.nombre, codigo, linea, ml: pres.ml, caja: pres.nombre_proveedor || '' });
      operaciones.push({ tipo: 'desactivar', codigo });
    }
    if (activosLinea.length && salen.length / activosLinea.length > TOPE_DESACTIVAR) {
      const aviso = `El ciclo desactivaría ${salen.length} de ${activosLinea.length} tamaños de ${nombreLinea} (más de un tercio). Revisá que el PDF sea el del ciclo nuevo y completo.`;
      bloqueos.push(aviso);
      forzables.push(aviso);
    }
  }

  for (const d of grupos.descartados) {
    alertas.push(`${d.linea === 'unlock' ? 'Unlock' : 'Bagués'} ${d.codigo}${d.titulo ? ` (${d.titulo})` : ''}: no se usa, ${d.motivo}${d.pagina ? ` (página ${d.pagina})` : ''}.`);
  }

  if (grupos.revisar.length) {
    alertas.push(`${grupos.revisar.length} ${grupos.revisar.length === 1 ? 'precio de lista no se pudo leer' : 'precios de lista no se pudieron leer'} de la imagen: confirmalos en "Precios de lista para confirmar".`);
  }

  const resumen = {
    revisar: grupos.revisar.length,
    precios: grupos.precios.length,
    reactivar: grupos.reactivar.length,
    desactivar: grupos.desactivar.length,
    nuevos: grupos.nuevos.length,
    cajas: grupos.cajas.length,
    types: grupos.types.length,
    descartados: grupos.descartados.length,
  };
  return { operaciones, grupos, alertas, bloqueos, forzables, resumen };
}

/**
 * El ciclo que dice el PDF de Unlock ("CICLO 10/26" y "21 SEP – 16 OCT").
 * Devuelve { nombre: 'Ciclo 10/26', hasta: '2026-10-16' } o null.
 */
export function cicloDelPdf(paginas) {
  const texto = paginas.map((p) => p.items.map((i) => i.s).join(' ')).join(' ');
  const c = texto.match(/CICLO\s+(\d{1,2})\s*\/\s*(\d{2})/i);
  if (!c) return null;
  const MESES = { ENE: 1, FEB: 2, MAR: 3, ABR: 4, MAY: 5, JUN: 6, JUL: 7, AGO: 8, SEP: 9, SET: 9, OCT: 10, NOV: 11, DIC: 12 };
  const r = texto.match(/(\d{1,2})\s+([A-Z]{3})\s*[–-]\s*(\d{1,2})\s+([A-Z]{3})/i);
  let hasta = null;
  if (r && MESES[r[4].toUpperCase()]) {
    const anio = 2000 + Number(c[2]);
    const mesFin = MESES[r[4].toUpperCase()];
    const mesInicio = MESES[r[2].toUpperCase()] || mesFin;
    // Un ciclo que arranca en diciembre y termina en enero cierra al año siguiente.
    const anioFin = mesFin < mesInicio ? anio + 1 : anio;
    hasta = `${anioFin}-${String(mesFin).padStart(2, '0')}-${String(Number(r[3])).padStart(2, '0')}`;
  }
  return { nombre: `Ciclo ${Number(c[1])}/${c[2]}`, hasta };
}
