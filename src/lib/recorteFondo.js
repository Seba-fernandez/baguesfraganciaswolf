// recorteFondo.js: saca el fondo de una foto y la arma en la pared vino, en el
// navegador del panel.
//
// Solo lo carga el panel, con import() y recien cuando se sube una foto: el
// motor (onnxruntime-web, WebAssembly) y el modelo (public/modelos/u2netp.onnx,
// 4,6 MB) no entran nunca en la tienda. La primera vez se bajan y quedan en la
// cache del navegador. Corre en un solo hilo y sin servidor: no cobra nada.
//
// La CSP del panel (vercel.json, /panel) permite compilar WebAssembly
// ('wasm-unsafe-eval'); la de la tienda no.
import * as ort from 'onnxruntime-web/wasm';
import { LADO_MODELO, tamanoTrabajo, yaSinFondo, entradaModelo, normalizarSalida, curvaAlfa, limpiarManchas } from './recorte.js';
import { fotoEnPared } from './ciclo/fotoPared.js';

const MODELO = '/modelos/u2netp.onnx';
let sesion = null;

async function abrirModelo() {
  if (sesion) return sesion;
  ort.env.wasm.numThreads = 1;
  try {
    sesion = await ort.InferenceSession.create(MODELO, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
  } catch (err) {
    const texto = String(err?.message || err);
    if (/wasm|WebAssembly|CompileError|Content Security/i.test(texto)) {
      throw new Error('El navegador no dejó arrancar el recortador. Recargá el panel y probá de nuevo.');
    }
    throw new Error(`No se pudo cargar el recortador: ${texto}`);
  }
  return sesion;
}

function lienzo(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

async function aBlob(canvas, tipo, calidad) {
  const b = await new Promise((ok) => canvas.toBlob(ok, tipo, calidad));
  if (!b) throw new Error('El navegador no pudo exportar la imagen');
  return b;
}

async function imagenDe(fuente) {
  if (fuente instanceof Blob) return createImageBitmap(fuente);
  const r = await fetch(fuente);
  if (!r.ok) throw new Error('No se pudo bajar la foto para arreglarla');
  return createImageBitmap(await r.blob());
}

/**
 * Devuelve un PNG con el fondo transparente. Si la foto ya venia recortada,
 * la deja como esta (achicada si era enorme).
 */
export async function recortarFondo(fuente) {
  const img = await imagenDe(fuente);
  const { w, h } = tamanoTrabajo(img.width, img.height);
  const foto = lienzo(w, h);
  const ctx = foto.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);
  img.close?.();
  const pixeles = ctx.getImageData(0, 0, w, h);
  if (yaSinFondo(pixeles.data, w, h)) return { blob: await aBlob(foto, 'image/png'), recortada: false };

  // Entrada del modelo: la foto entera a 320 x 320 (sin respetar proporcion,
  // como se entreno).
  const chica = lienzo(LADO_MODELO, LADO_MODELO);
  const cctx = chica.getContext('2d', { willReadFrequently: true });
  cctx.imageSmoothingQuality = 'high';
  cctx.drawImage(foto, 0, 0, LADO_MODELO, LADO_MODELO);
  const entrada = entradaModelo(cctx.getImageData(0, 0, LADO_MODELO, LADO_MODELO).data);

  const s = await abrirModelo();
  const tensor = new ort.Tensor('float32', entrada, [1, 3, LADO_MODELO, LADO_MODELO]);
  const salida = await s.run({ [s.inputNames[0]]: tensor });
  const mascara = limpiarManchas(normalizarSalida(salida[s.outputNames[0]].data));

  // La mascara a escala de la foto: se pinta en 320 x 320 y el canvas la
  // agranda con suavizado (el borde queda suave, no en escalones).
  const m = cctx.createImageData(LADO_MODELO, LADO_MODELO);
  for (let i = 0; i < mascara.length; i++) {
    const a = curvaAlfa(mascara[i]);
    m.data[i * 4] = a; m.data[i * 4 + 1] = a; m.data[i * 4 + 2] = a; m.data[i * 4 + 3] = 255;
  }
  cctx.putImageData(m, 0, 0);
  const grande = lienzo(w, h);
  const gctx = grande.getContext('2d', { willReadFrequently: true });
  gctx.imageSmoothingQuality = 'high';
  gctx.drawImage(chica, 0, 0, w, h);
  const alfa = gctx.getImageData(0, 0, w, h).data;
  for (let i = 0; i < w * h; i++) pixeles.data[i * 4 + 3] = alfa[i * 4];
  ctx.putImageData(pixeles, 0, 0);
  return { blob: await aBlob(foto, 'image/png'), recortada: true };
}

/**
 * La foto lista para la tienda: sin fondo y sobre la pared vino, 900 x 1200,
 * con sombra y reflejo (lib/ciclo/fotoPared.js). Devuelve { blob, tipo, aviso, recortada }.
 */
export async function armarFotoProducto(fuente) {
  const { blob, recortada } = await recortarFondo(fuente);
  const armada = await fotoEnPared(blob);
  return { ...armada, recortada };
}
