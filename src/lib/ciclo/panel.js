// panel.js — lo que la pantalla "Cargar ciclo" decide antes de aplicar.
//
// Funciones puras, sin pantalla ni base, para poder probarlas
// (scripts/qa/catalogo.test.mjs):
//   - de que linea es un PDF (por sus codigos, no por el nombre del archivo);
//   - que hacer con cada codigo nuevo (sumarlo a un perfume o crear uno);
//   - armar la lista de codigos nuevos que recibe aplicar_ciclo();
//   - que perfumes activos se quedan sin foto;
//   - donde va la caja en la foto de la pared vino.
import { PREFIJO_UNLOCK } from './leerUnlock.js';
import { PREFIJO_BAGUES } from './leerBagues.js';

export const GENEROS = ['femenino', 'masculino', 'unisex'];

/**
 * La linea de un PDF segun la mayoria de sus codigos de 8 cifras.
 * Devuelve { linea: 'unlock'|'bagues'|null, unlock, bagues } con las cuentas.
 */
export function lineaDePaginas(paginas) {
  let unlock = 0;
  let bagues = 0;
  for (const p of paginas) {
    for (const it of p.items) {
      for (const m of String(it.s).matchAll(/(?<!\d)(\d{8})(?!\d)/g)) {
        if (m[1].startsWith(PREFIJO_UNLOCK)) unlock++;
        else if (m[1].startsWith(PREFIJO_BAGUES)) bagues++;
      }
    }
  }
  const linea = unlock === 0 && bagues === 0 ? null : unlock >= bagues ? 'unlock' : 'bagues';
  return { linea, unlock, bagues };
}

const capital = (t) => String(t || '').trim().replace(/^./, (c) => c.toUpperCase());

/**
 * La decision de arranque para un codigo nuevo de la propuesta.
 *   - Caja de Bagues de un perfume que ya existe: se suma a ese perfume.
 *   - Caja de Bagues con Type: perfume nuevo, con el Type de nombre y la ficha
 *     del lanzamiento si vino en el PDF. Sebas lo revisa.
 *   - Unlock: el PDF tapa letras con estrellas ("GAAD GARL"): el nombre no es
 *     confiable, asi que arranca "sin decidir" y hay que elegir.
 */
export function decisionInicial(nuevo) {
  const p = nuevo.leido || {};
  if (nuevo.sumarA) return { modo: 'sumar', id: nuevo.sumarA.id };
  if (nuevo.linea === 'bagues' && p.type) {
    return {
      modo: 'nuevo',
      nombre: p.type,
      genero: GENEROS.includes(p.genero) ? p.genero : 'unisex',
      familia_olfativa: p.piramide?.familia || capital(p.familia),
      nota_salida: p.piramide?.salida || '',
      nota_corazon: p.piramide?.corazon || '',
      nota_fondo: p.piramide?.fondo || '',
    };
  }
  return { modo: 'pendiente', nombre: capital(String(p.titulo || '').toLowerCase()), genero: 'unisex' };
}

/**
 * De la propuesta y las decisiones de Sebas a lo que recibe aplicar_ciclo().
 *   decisiones: { [codigo]: { modo: 'sumar', id } | { modo: 'nuevo', nombre, genero, ... }
 *                            | { modo: 'omitir' } | { modo: 'pendiente' } }
 * Devuelve { lista, faltan: [{ codigo, motivo }] }. Con algo en `faltan` no se aplica.
 */
export function nuevosParaAplicar(nuevos, decisiones) {
  const lista = [];
  const faltan = [];
  for (const n of nuevos) {
    const d = decisiones[n.codigo] || decisionInicial(n);
    const p = n.leido || {};
    if (d.modo === 'omitir') continue;
    const base = {
      codigo: n.codigo,
      linea: n.linea,
      ml: p.ml || (n.linea === 'bagues' ? 50 : null),
      precio: p.precio,
      precio_anterior: p.precio_anterior ?? null,
      nombre_proveedor: n.linea === 'bagues' ? p.caja || '' : (d.modo === 'nuevo' ? d.nombre : ''),
      type: n.linea === 'bagues' ? p.type || '' : '',
    };
    if (!base.ml) { faltan.push({ codigo: n.codigo, motivo: 'no se leyeron los ml' }); continue; }
    if (d.modo === 'sumar') {
      if (!d.id) { faltan.push({ codigo: n.codigo, motivo: 'elegí a qué perfume se suma' }); continue; }
      lista.push({ ...base, sumar_a: d.id });
    } else if (d.modo === 'nuevo') {
      const nombre = String(d.nombre || '').trim();
      if (nombre.length < 2 || nombre.length > 80) { faltan.push({ codigo: n.codigo, motivo: 'falta el nombre del perfume' }); continue; }
      if (!GENEROS.includes(d.genero)) { faltan.push({ codigo: n.codigo, motivo: 'elegí para quién es' }); continue; }
      lista.push({
        ...base,
        aroma: {
          nombre,
          inspirado_en: nombre,
          genero: d.genero,
          familia_olfativa: String(d.familia_olfativa || '').trim(),
          nota_salida: String(d.nota_salida || '').trim(),
          nota_corazon: String(d.nota_corazon || '').trim(),
          nota_fondo: String(d.nota_fondo || '').trim(),
        },
      });
    } else {
      faltan.push({ codigo: n.codigo, motivo: 'decidí si se suma a un perfume, es uno nuevo o se deja afuera' });
    }
  }
  return { lista, faltan };
}

/**
 * Perfumes activos que la clienta ve sin foto: sin foto subida y sin foto del
 * pipeline. `fotoDe` se pasa para poder probarlo sin el indice de fotos.
 */
export function fotosQueFaltan(productos, fotoDe) {
  return productos
    .filter((p) => p.activo && !p.imagen_url && !fotoDe(p))
    .map((p) => {
      const activas = (p.presentaciones || []).filter((x) => x.activo !== false);
      const bagues = activas.find((x) => x.linea === 'bagues' || String(x.codigo).startsWith(PREFIJO_BAGUES));
      return { producto: p, linea: bagues ? 'bagues' : 'unlock', caja: bagues?.nombre_proveedor || '' };
    });
}

/**
 * Donde va la caja en la foto de 900 x 1200 sobre la pared vino. Las mismas
 * medidas que scripts/rediseno/pared_productos.py (cuadro de 300 x 400 a x3):
 * alto hasta el 62 % del cuadro, ancho hasta el 78 %, centrada, apoyada en
 * y = 318 (la repisa).
 */
export const FOTO = { ancho: 900, alto: 1200, alturaMax: 0.62, anchoMax: 0.78, base: 954 };

export function lugarDeCaja(w, h) {
  if (!(w > 0 && h > 0)) throw new Error('La imagen no tiene medidas');
  const alto = Math.min(FOTO.alto * FOTO.alturaMax, (FOTO.ancho * FOTO.anchoMax * h) / w);
  const ancho = (alto * w) / h;
  return { x: (FOTO.ancho - ancho) / 2, y: FOTO.base - alto, ancho, alto };
}
