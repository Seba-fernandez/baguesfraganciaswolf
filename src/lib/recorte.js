// recorte.js: las cuentas del recorte de fondo, sin navegador.
//
// El recorte lo hace un modelo chico (U2-Net "p", 4,6 MB, licencia Apache 2.0,
// public/modelos/) que corre en el navegador del panel con onnxruntime-web
// (lib/recorteFondo.js). Aca vive lo que se puede probar con node: el tamaño
// de trabajo, si una foto ya viene sin fondo, la entrada del modelo y como la
// salida pasa a ser la transparencia de la foto.
//   node scripts/qa/recorte.test.mjs

/** El modelo trabaja en 320 x 320. */
export const LADO_MODELO = 320;
const MEDIA = [0.485, 0.456, 0.406];
const DESVIO = [0.229, 0.224, 0.225];

/**
 * Tamaño al que se achica la foto antes de recortar: el lado largo hasta
 * `max` (la foto final mide 900 x 1200 y el frasco ocupa menos). Nunca agranda.
 */
export function tamanoTrabajo(w, h, max = 1600) {
  if (!(w > 0 && h > 0)) throw new Error('La imagen no tiene medidas');
  const k = Math.min(1, max / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
}

/**
 * Si la foto ya viene recortada (un PNG con fondo transparente): mas de un
 * tercio del borde es transparente. Recibe los pixeles RGBA de getImageData.
 */
export function yaSinFondo(rgba, w, h) {
  let borde = 0;
  let transparentes = 0;
  const mirar = (x, y) => { borde++; if (rgba[(y * w + x) * 4 + 3] < 200) transparentes++; };
  for (let x = 0; x < w; x++) { mirar(x, 0); mirar(x, h - 1); }
  for (let y = 1; y < h - 1; y++) { mirar(0, y); mirar(w - 1, y); }
  return borde > 0 && transparentes / borde > 1 / 3;
}

/** De los pixeles RGBA (320 x 320) a la entrada del modelo: 1 x 3 x 320 x 320, normalizada. */
export function entradaModelo(rgba, lado = LADO_MODELO) {
  const n = lado * lado;
  const out = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < 3; c++) out[c * n + i] = (rgba[i * 4 + c] / 255 - MEDIA[c]) / DESVIO[c];
  }
  return out;
}

/** La salida del modelo llevada a 0..1 (minimo a 0, maximo a 1). */
export function normalizarSalida(valores) {
  let min = Infinity;
  let max = -Infinity;
  for (const v of valores) { if (v < min) min = v; if (v > max) max = v; }
  const rango = max - min || 1;
  return Float32Array.from(valores, (v) => (v - min) / rango);
}

/**
 * De la mascara (0..1) a la transparencia (0..255). Lo que el modelo ve
 * apenas (restos de la sombra del piso, reflejos lejanos) queda transparente;
 * lo que ve claro, opaco; en el medio, el borde suave.
 */
export function curvaAlfa(v, bajo = 0.35, alto = 0.8) {
  if (v <= bajo) return 0;
  if (v >= alto) return 255;
  const t = (v - bajo) / (alto - bajo);
  return Math.round(255 * t * t * (3 - 2 * t));
}

/**
 * Saca las manchas sueltas de la mascara (un reflejo en el piso, un brillo en
 * la pared): se queda con las zonas de mas del 15 % de la mas grande. Dos
 * objetos separados (caja y frasco) quedan los dos. Devuelve una copia.
 */
export function limpiarManchas(mascara, lado = LADO_MODELO, umbral = 0.5, minimo = 0.15) {
  const n = lado * lado;
  const zona = new Int32Array(n).fill(-1);
  const tamanos = [];
  const pila = [];
  for (let i = 0; i < n; i++) {
    if (zona[i] !== -1 || mascara[i] < umbral) continue;
    const id = tamanos.length;
    let cuenta = 0;
    zona[i] = id;
    pila.push(i);
    while (pila.length) {
      const k = pila.pop();
      cuenta++;
      const x = k % lado;
      const vecinos = [k - lado, k + lado, x > 0 ? k - 1 : -1, x < lado - 1 ? k + 1 : -1];
      for (const v of vecinos) {
        if (v >= 0 && v < n && zona[v] === -1 && mascara[v] >= umbral) { zona[v] = id; pila.push(v); }
      }
    }
    tamanos.push(cuenta);
  }
  const out = Float32Array.from(mascara);
  if (!tamanos.length) return out;
  const mayor = Math.max(...tamanos);
  const vale = tamanos.map((t) => t >= mayor * minimo);
  // Lo que no llega al umbral (el borde suave) no se toca: la curva de alfa lo resuelve.
  for (let i = 0; i < n; i++) {
    if (zona[i] >= 0 && !vale[zona[i]]) out[i] = 0;
  }
  return out;
}
