// leerTabla.js — el ciclo cuando NO hay PDF: una tabla con un perfume por fila.
//
// Sirve para los ciclos cuyo catalogo es solo el visor online (el 11/26). La
// tabla sale de leer el visor (codigos, precios del ciclo) y las imagenes de
// las paginas (precio de lista, el tachado). Devuelve lo mismo que los lectores
// de PDF, asi `compararCiclo` y la pantalla no cambian.
//
// Formato (CSV con coma, punto y coma o tab; la primera fila son los titulos):
//   linea,codigo,titulo,ml,precio,precio_anterior,estado,pagina
//   # ciclo=Ciclo 11/26        (opcional, antes de la fila de titulos)
//   # hasta=2026-11-13         (opcional)
// Nombres que tambien se aceptan: nombre_visor/nombre (titulo), precio_ciclo
// (precio), precio_lista/lista (precio_anterior). Se ignora todo lo demas.
//
// `estado` dice cuanto se confia en el precio de lista:
//   leido     salio de la imagen                           -> se usa
//   inferido  no se vio en la imagen; se dedujo del grupo  -> se usa, pero se pide confirmar
//   sin_dato  el catalogo no lo muestra                    -> no toca el que ya tenia
// Sin columna `estado`: con precio de lista es "leido", sin el es "sin_dato".
// El Type y la caja de Bagues no se leen de la tabla: en una imagen salen con
// ruido y un Type mal leido podria crear un perfume equivocado.
import { PREFIJO_UNLOCK } from './leerUnlock.js';
import { PREFIJO_BAGUES } from './leerBagues.js';

export const TAMANO_MAXIMO_TABLA = 1024 * 1024;
const ESTADOS = ['leido', 'inferido', 'sin_dato'];

const ALIAS = {
  linea: ['linea'],
  codigo: ['codigo'],
  titulo: ['titulo', 'nombre_visor', 'nombre'],
  ml: ['ml'],
  precio: ['precio', 'precio_ciclo'],
  anterior: ['precio_anterior', 'precio_lista', 'lista'],
  estado: ['estado'],
  pagina: ['pagina'],
};

/** Parte una linea de CSV respetando comillas. */
function partir(linea, sep) {
  const out = [];
  let cur = '';
  let comillas = false;
  for (let i = 0; i < linea.length; i++) {
    const ch = linea[i];
    if (comillas) {
      if (ch === '"' && linea[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') comillas = false; else cur += ch;
    } else if (ch === '"') comillas = true;
    else if (ch === sep) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim());
}

/** "24.399", "$ 24.399" o "24399" -> 24399. Vacio o raro -> null. */
export function entero(valor) {
  const s = String(valor ?? '').trim();
  if (!s) return null;
  const argentino = s.match(/^\$?\s?(\d{1,3}(?:\.\d{3})+),(\d{1,2})$/);
  if (argentino) return Math.round(Number(`${argentino[1].replace(/\./g, '')}.${argentino[2]}`));
  const decimales = s.match(/^\$?\s?(\d+)[.,](\d{1,2})$/);
  if (decimales) return Math.round(Number(`${decimales[1]}.${decimales[2]}`));
  const digitos = s.replace(/[^\d]/g, '');
  return digitos ? Number(digitos) : null;
}

const lineaDeCodigo = (codigo) => (codigo.startsWith(PREFIJO_UNLOCK) ? 'unlock' : codigo.startsWith(PREFIJO_BAGUES) ? 'bagues' : null);

/**
 * Lee la tabla. Devuelve { unlock, bagues, ciclo, ignoradas }.
 * Falla (Error) si no es una tabla del ciclo: sin columnas de codigo y precio.
 * Las filas que no se pueden usar van a `ignoradas` con el motivo, para mostrarlas.
 */
export function leerTabla(texto) {
  const lineas = String(texto).replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  const meta = {};
  const datos = [];
  for (const l of lineas) {
    const m = l.match(/^#\s*(\w+)\s*=\s*(.+)$/);
    if (m) meta[m[1].toLowerCase()] = m[2].trim();
    else if (!l.startsWith('#')) datos.push(l);
  }
  if (datos.length < 2) throw new Error('La tabla está vacía: tiene que traer los títulos y al menos una fila.');

  const sep = [',', ';', '\t'].map((s) => [s, datos[0].split(s).length]).sort((a, b) => b[1] - a[1])[0][0];
  const titulos = partir(datos[0], sep).map((t) => t.toLowerCase().replace(/\s+/g, '_'));
  const col = {};
  for (const [campo, nombres] of Object.entries(ALIAS)) col[campo] = titulos.findIndex((t) => nombres.includes(t));
  if (col.codigo < 0 || col.precio < 0) {
    throw new Error('A la tabla le faltan columnas: necesita al menos "codigo" y "precio" (o "precio_ciclo").');
  }

  const salida = { unlock: [], bagues: [] };
  const ignoradas = [];
  const vistos = new Set();
  const dato = (f, campo) => (col[campo] >= 0 ? f[col[campo]] ?? '' : '');

  datos.slice(1).forEach((fila, k) => {
    const f = partir(fila, sep);
    const codigo = String(dato(f, 'codigo')).replace(/\s/g, '');
    const donde = `fila ${k + 2}${codigo ? ` (${codigo})` : ''}`;
    if (!/^\d{8}$/.test(codigo)) { ignoradas.push({ donde, motivo: 'el código no tiene 8 cifras' }); return; }
    if (vistos.has(codigo)) { ignoradas.push({ donde, motivo: 'el código está repetido' }); return; }
    vistos.add(codigo);

    const declarada = String(dato(f, 'linea')).toLowerCase();
    const linea = lineaDeCodigo(codigo);
    if (!linea) { ignoradas.push({ donde, motivo: 'el código no es de Unlock (2028) ni de Bagués (1028)' }); return; }
    if (declarada && declarada !== linea) { ignoradas.push({ donde, motivo: `dice "${declarada}" pero el código es de ${linea}` }); return; }

    const precio = entero(dato(f, 'precio'));
    const anterior = entero(dato(f, 'anterior'));
    let estado = String(dato(f, 'estado')).toLowerCase().replace(/\s+/g, '_');
    if (!estado) estado = anterior ? 'leido' : 'sin_dato';
    if (!ESTADOS.includes(estado)) { ignoradas.push({ donde, motivo: `estado desconocido "${estado}"` }); return; }

    const item = {
      codigo,
      ml: entero(dato(f, 'ml')) || (linea === 'bagues' ? 50 : null),
      precio,
      precio_anterior: anterior,
      titulo: String(dato(f, 'titulo')).replace(/^unlock\s+/i, '').trim(),
      pagina: entero(dato(f, 'pagina')) || undefined,
      avisos: [],
      origen: 'tabla',
    };
    if (estado === 'inferido') {
      item.revisar = 'el precio de lista no se vio en la imagen: se dedujo del grupo. Confirmalo antes de aplicar.';
      item.avisos.push('lista inferida');
    }
    if (estado === 'sin_dato') {
      item.precio_anterior = null;
      item.conservarAnterior = true;
      item.avisos.push('sin precio de lista en el catálogo');
    }
    salida[linea].push(item);
  });

  const ciclo = meta.ciclo ? { nombre: meta.ciclo, hasta: /^\d{4}-\d{2}-\d{2}$/.test(meta.hasta || '') ? meta.hasta : null } : null;
  return { ...salida, ciclo, ignoradas };
}
