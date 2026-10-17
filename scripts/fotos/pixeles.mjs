/**
 * Operaciones sobre pixeles crudos (RGBA, 8 bits) que sharp no trae hechas.
 * Las usa componer.mjs. Sin dependencias: JavaScript plano sobre Uint8Array,
 * asi el pipeline corre igual en cualquier maquina con Node.
 *
 * Una imagen es { data, width, height } con 4 canales.
 */

/**
 * Distancia (en pasos, contando diagonales) de cada pixel al pixel "origen" mas
 * cercano, hasta un tope. Lo que queda mas lejos que el tope vale tope + 1.
 * Devuelve tambien de que origen viene cada pixel, para copiar su color.
 */
function propagar(esOrigen, width, height, tope) {
  const n = width * height;
  const dist = new Uint8Array(n).fill(tope + 1);
  const desde = new Int32Array(n).fill(-1);
  const cola = new Int32Array(n);
  let fin = 0;
  for (let i = 0; i < n; i++) if (esOrigen[i]) { dist[i] = 0; desde[i] = i; cola[fin++] = i; }
  for (let ini = 0; ini < fin; ini++) {
    const i = cola[ini];
    const d = dist[i] + 1;
    if (d > tope) continue;
    const x = i % width;
    const y = (i - x) / width;
    for (let dy = -1; dy <= 1; dy++) {
      const yy = y + dy;
      if (yy < 0 || yy >= height) continue;
      for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx;
        if ((dx === 0 && dy === 0) || xx < 0 || xx >= width) continue;
        const j = yy * width + xx;
        if (dist[j] <= d) continue;
        dist[j] = d;
        desde[j] = desde[i];
        cola[fin++] = j;
      }
    }
  }
  return { dist, desde };
}

/** Minimo en un cuadrado de (2r+1) de lado, separable. Sirve para comer bordes. */
export function erosionar(canal, width, height, r) {
  if (r <= 0) return canal;
  const tmp = new Float32Array(canal.length);
  const out = new Float32Array(canal.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let m = Infinity;
      for (let k = Math.max(0, x - r); k <= Math.min(width - 1, x + r); k++) m = Math.min(m, canal[y * width + k]);
      tmp[y * width + x] = m;
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let m = Infinity;
      for (let k = Math.max(0, y - r); k <= Math.min(height - 1, y + r); k++) m = Math.min(m, tmp[k * width + x]);
      out[y * width + x] = m;
    }
  }
  return out;
}

/** Desenfoque gaussiano separable de un canal. */
export function desenfocar(canal, width, height, sigma) {
  if (sigma <= 0) return canal;
  const r = Math.max(1, Math.ceil(sigma * 3));
  const nucleo = [];
  let suma = 0;
  for (let k = -r; k <= r; k++) { const v = Math.exp(-(k * k) / (2 * sigma * sigma)); nucleo.push(v); suma += v; }
  for (let k = 0; k < nucleo.length; k++) nucleo[k] /= suma;
  const tmp = new Float32Array(canal.length);
  const out = new Float32Array(canal.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let v = 0;
      for (let k = -r; k <= r; k++) v += canal[y * width + Math.min(width - 1, Math.max(0, x + k))] * nucleo[k + r];
      tmp[y * width + x] = v;
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let v = 0;
      for (let k = -r; k <= r; k++) v += tmp[Math.min(height - 1, Math.max(0, y + k)) * width + x] * nucleo[k + r];
      out[y * width + x] = v;
    }
  }
  return out;
}

/**
 * FOTO-2. Limpia el contorno de un recorte:
 *  1. el color de los `banda` px del borde se reemplaza por el de unos px mas
 *     adentro (el filo trae el blanco del fondo original de la proveedora);
 *  2. se come `erosion` px del alfa;
 *  3. el alfa se suaviza (sigma en px), asi un alfa binario deja de escalonar.
 * Los pixeles transparentes que el suavizado vuelve visibles tambien reciben
 * el color de adentro, para que no aparezca un halo negro ni blanco.
 */
export function limpiarFilo(img, { banda = 2, erosion = 1, sigma = 0.7 } = {}) {
  const { data, width, height } = img;
  const n = width * height;
  const transparente = new Uint8Array(n);
  for (let i = 0; i < n; i++) transparente[i] = data[i * 4 + 3] < 8 ? 1 : 0;
  const { dist } = propagar(transparente, width, height, banda + 1);
  // Origen del color: lo visible que esta a mas de `banda` px del borde.
  const origen = new Uint8Array(n);
  for (let i = 0; i < n; i++) origen[i] = !transparente[i] && dist[i] > banda ? 1 : 0;
  const { desde } = propagar(origen, width, height, banda + 4);
  const out = Buffer.from(data);
  for (let i = 0; i < n; i++) {
    if (origen[i] || desde[i] < 0) continue;
    const j = desde[i] * 4;
    out[i * 4] = data[j];
    out[i * 4 + 1] = data[j + 1];
    out[i * 4 + 2] = data[j + 2];
  }
  let alfa = new Float32Array(n);
  for (let i = 0; i < n; i++) alfa[i] = data[i * 4 + 3];
  alfa = desenfocar(erosionar(alfa, width, height, erosion), width, height, sigma);
  for (let i = 0; i < n; i++) out[i * 4 + 3] = Math.max(0, Math.min(255, Math.round(alfa[i])));
  return { data: out, width, height };
}

/**
 * FOTO-3. Saca el podio o la elipse de piso que algunas fotos de Unlock traen
 * horneada: en la franja de abajo del objeto (por defecto el 16 %), todo lo que
 * no es opaco del todo se vuelve transparente. El frasco es opaco; el podio es
 * una sombra semitransparente.
 */
export function sacarPodio(img, { franja = 0.16, umbral = 235 } = {}) {
  const { data, width, height } = img;
  let y0 = height;
  let y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) { if (y < y0) y0 = y; y1 = y; break; }
    }
  }
  if (y1 < 0) return img;
  const corte = Math.round(y1 - (y1 - y0) * franja);
  const out = Buffer.from(data);
  for (let y = corte; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4 + 3;
      if (out[i] < umbral) out[i] = 0;
    }
  }
  return { data: out, width, height };
}
