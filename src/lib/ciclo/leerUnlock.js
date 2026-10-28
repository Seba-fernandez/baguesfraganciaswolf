// leerUnlock.js — los productos del catalogo de Unlock, por codigo.
//
// El PDF de Unlock censura letras del nombre con una estrella que el texto lee
// como "A" ("GAAD GARL VARY" es Very Good Girl), asi que el nombre no sirve
// para emparejar. Lo que es confiable es el codigo de 8 cifras que empieza con
// 2028: cada uno es un tamaño. Al lado del codigo estan los ml ("75ml") y los
// dos precios: el de lista arriba a la derecha y el del ciclo debajo. Se arman
// por cercania en la pagina (ver pdf.js).
//
// Devuelve [{ codigo, ml, precio, precio_anterior, titulo, pagina, avisos }].
// `titulo` es el nombre como lo lee el PDF (censurado), solo para mostrarlo.
import { precioDeTexto } from './pdf.js';

export const PREFIJO_UNLOCK = '2028';
const CODIGO = /\b(2028\d{4})\b/g;
const ML = /^(\d{2,3})\s?ml$/i;
/** Hasta cuantos ml un tamaño es mini (mismo criterio que lib/filtros.js). */
const MINI_HASTA_ML = 30;

/** Distancia con mas peso en lo vertical: los productos van en columnas. */
const distancia = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) * 1.4);

/** El nombre del producto: el renglon en mayusculas de letras sueltas mas cercano arriba del codigo. */
function tituloCercano(items, c) {
  const arriba = items.filter((i) => i.y < c.y - 40 && i.y > c.y - 260 && Math.abs(i.x - c.x) < 140 && /^[A-ZÁÉÍÓÚÑ0-9' .&-]{1,20}$/.test(i.s.trim()) && !/ML$|OFF$|^(FAMILIA OLFATIVA|SALIDA|CORAZ[OÓ]N|FONDO|FRAGANCIAS MINI)$/.test(i.s.trim()));
  if (!arriba.length) return '';
  // El renglon del titulo: el de mas letras sueltas juntas (mismo y).
  const porRenglon = new Map();
  for (const i of arriba) {
    const k = Math.round(i.y / 4);
    porRenglon.set(k, [...(porRenglon.get(k) || []), i]);
  }
  const [mejor] = [...porRenglon.values()].sort((a, b) => b.length - a.length || b[0].y - a[0].y);
  return mejor.sort((a, b) => a.x - b.x).map((i) => i.s).join('').replace(/\s+/g, ' ').trim();
}

export function leerUnlock(paginas) {
  const productos = [];
  for (const pagina of paginas) {
    const { items } = pagina;
    const codigos = [];
    for (const it of items) {
      for (const m of it.s.matchAll(CODIGO)) codigos.push({ codigo: m[1], x: it.x, y: it.y });
    }
    if (!codigos.length) continue;
    const mls = items.filter((i) => ML.test(i.s.trim())).map((i) => ({ ...i, ml: Number(i.s.trim().match(ML)[1]) }));
    const precios = items
      .filter((i) => !/SIN IMPUESTOS/i.test(i.s))
      .map((i) => ({ ...i, valor: precioDeTexto(i.s) }))
      .filter((i) => i.valor);

    // El precio unico de los minis: el que esta pegado a cada rotulo "FRAGANCIAS MINI".
    const preciosMini = items
      .filter((i) => /FRAGANCIAS MINI/i.test(i.s))
      .map((r) => precios.filter((p) => p.y - r.y >= -10 && p.y - r.y <= 40 && Math.abs(p.x - r.x) < 260)
        .sort((a, b) => distancia(a, r) - distancia(b, r))[0])
      .filter(Boolean);

    for (const c of codigos) {
      const avisos = [];
      const ml = mls
        .filter((m) => Math.abs(m.x - c.x) <= 60 && m.y - c.y >= -25 && m.y - c.y <= 20)
        .sort((a, b) => distancia(a, c) - distancia(b, c))[0];
      if (!ml) avisos.push('no encontré los ml');
      const cerca = precios
        .filter((p) => p.x - c.x >= -25 && p.x - c.x <= 120 && p.y - c.y >= -25 && p.y - c.y <= 50)
        .sort((a, b) => distancia(a, c) - distancia(b, c))
        .slice(0, 2)
        .map((p) => p.valor);
      let precio = null;
      let anterior = null;
      if (cerca.length === 2 && cerca[0] !== cerca[1]) {
        precio = Math.min(...cerca);
        anterior = Math.max(...cerca);
      } else if (cerca.length >= 1) {
        precio = cerca[0];
        if (!(ml && ml.ml <= MINI_HASTA_ML)) avisos.push('un solo precio (sin precio de lista)');
      } else if (ml && ml.ml <= MINI_HASTA_ML && preciosMini.length) {
        // Los minis no traen precio al lado: van en una grilla con un solo
        // precio para todos, junto al rotulo "FRAGANCIAS MINI".
        precio = preciosMini.sort((a, b) => distancia(a, c) - distancia(b, c))[0].valor;
      } else {
        avisos.push('no encontré el precio');
      }
      productos.push({
        codigo: c.codigo,
        ml: ml ? ml.ml : null,
        precio,
        precio_anterior: anterior,
        titulo: tituloCercano(items, c),
        pagina: pagina.n,
        avisos,
      });
    }
  }
  // Un codigo repetido (aparece en dos paginas): queda el primero, con aviso si difieren.
  const vistos = new Map();
  for (const p of productos) {
    const previo = vistos.get(p.codigo);
    if (!previo) { vistos.set(p.codigo, p); continue; }
    if (previo.precio !== p.precio || previo.ml !== p.ml) previo.avisos.push(`aparece también en la página ${p.pagina} con otros datos`);
  }
  return [...vistos.values()];
}
