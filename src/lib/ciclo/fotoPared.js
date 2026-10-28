// fotoPared.js — la foto de una caja nueva de Bagues sobre la pared vino,
// armada en el navegador del panel.
//
// Hace en un canvas lo mismo que scripts/rediseno/pared_productos.py hace con
// Python para las fotos del catalogo: la pared vacia (public/fondo/
// pared-vacia-900.webp, ya con su luz y su vineta), la caja centrada y apoyada
// en la repisa, la sombra en la pared hacia la derecha, el reflejo en la piedra
// y la sombra de contacto. Sale 900 x 1200 en webp (o jpeg si el navegador no
// sabe hacer webp, como Safari).
//
// La caja llega como Blob desde la funcion "tiendas" de Supabase (las fotos de
// bagues.com.ar tienen fondo transparente). Se usa createImageBitmap sobre el
// Blob: el canvas no queda "contaminado" y se puede exportar.
import { FOTO, lugarDeCaja } from './panel.js';

export const PARED = '/fondo/pared-vacia-900.webp';
const UMBRAL_ALFA = 16; // de 255: lo menos opaco que cuenta como caja

function lienzo(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

async function imagenDe(fuente) {
  if (fuente instanceof Blob) return createImageBitmap(fuente);
  const r = await fetch(fuente);
  if (!r.ok) throw new Error(`No se pudo cargar ${fuente}`);
  return createImageBitmap(await r.blob());
}

/** El rectangulo con algo opaco (las fotos de la tienda traen margen transparente). */
function recorteOpaco(img) {
  const c = lienzo(img.width, img.height);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  let transparentes = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * 4 + 3];
      if (a < UMBRAL_ALFA) { transparentes++; continue; }
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) throw new Error('La imagen está vacía');
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, conFondo: transparentes / (width * height) < 0.02 };
}

/**
 * Arma la foto. Devuelve { blob, tipo, aviso } (aviso: texto si la fuente era
 * chica o tenia fondo, para mostrarlo antes de guardar).
 */
export async function fotoEnPared(cajaBlob) {
  const [pared, caja] = await Promise.all([imagenDe(PARED), imagenDe(cajaBlob)]);
  const r = recorteOpaco(caja);
  const lugar = lugarDeCaja(r.w, r.h);
  const avisos = [];
  if (r.conFondo) avisos.push('La foto trae fondo (no es transparente): se va a ver el rectángulo. Mejor subir una de la caja recortada.');
  const ampliacion = lugar.alto / r.h;
  if (ampliacion > 1.8) avisos.push(`La foto es chica: se agranda ${ampliacion.toFixed(1)} veces y puede verse blanda.`);

  const c = lienzo(FOTO.ancho, FOTO.alto);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(pared, 0, 0, FOTO.ancho, FOTO.alto);

  // La caja sola, a su tamaño final (sirve para la sombra y el reflejo).
  const sola = lienzo(lugar.ancho, lugar.alto);
  const sctx = sola.getContext('2d');
  sctx.imageSmoothingQuality = 'high';
  sctx.drawImage(caja, r.x, r.y, r.w, r.h, 0, 0, sola.width, sola.height);

  // 1) Sombra en la pared: la caja desenfocada, corrida a la derecha y un poco
  //    arriba. Con shadowBlur (anda en todos los navegadores, ctx.filter no):
  //    se dibuja la caja afuera del cuadro y solo cae su sombra adentro.
  const h = lugar.alto;
  ctx.save();
  ctx.shadowColor = 'rgba(8, 2, 3, 0.38)';
  ctx.shadowBlur = 0.05 * h * 2;
  ctx.shadowOffsetX = FOTO.ancho * 2 + 0.06 * h;
  ctx.shadowOffsetY = -0.02 * h;
  ctx.drawImage(sola, lugar.x - FOTO.ancho * 2, lugar.y);
  ctx.restore();

  // 2) Reflejo en la piedra: la caja dada vuelta, 32 % de su alto, que se
  //    apaga hacia abajo.
  const largo = Math.round(0.32 * h);
  const ref = lienzo(lugar.ancho, largo);
  const rctx = ref.getContext('2d');
  rctx.translate(0, sola.height);
  rctx.scale(1, -1);
  rctx.drawImage(sola, 0, 0);
  rctx.setTransform(1, 0, 0, 1, 0, 0);
  const caida = rctx.createLinearGradient(0, 0, 0, largo);
  caida.addColorStop(0, 'rgba(0,0,0,1)');
  caida.addColorStop(1, 'rgba(0,0,0,0)');
  rctx.globalCompositeOperation = 'destination-in';
  rctx.fillStyle = caida;
  rctx.fillRect(0, 0, ref.width, largo);
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.drawImage(ref, lugar.x, FOTO.base);
  ctx.restore();

  // 3) Sombra de contacto: una elipse oscura justo debajo de la base.
  const rx = 0.5 * lugar.ancho;
  const ry = Math.max(6, 0.03 * h);
  ctx.save();
  ctx.translate(FOTO.ancho / 2, FOTO.base - ry * 0.3);
  ctx.scale(1, ry / rx);
  const contacto = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * 1.15);
  contacto.addColorStop(0, 'rgba(6, 1, 2, 0.75)');
  contacto.addColorStop(0.6, 'rgba(6, 1, 2, 0.35)');
  contacto.addColorStop(1, 'rgba(6, 1, 2, 0)');
  ctx.fillStyle = contacto;
  ctx.beginPath();
  ctx.arc(0, 0, rx * 1.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 4) La caja.
  ctx.drawImage(sola, lugar.x, lugar.y);

  caja.close?.();
  pared.close?.();
  let blob = await new Promise((ok) => c.toBlob(ok, 'image/webp', 0.86));
  if (!blob || blob.type !== 'image/webp') blob = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.88));
  if (!blob) throw new Error('El navegador no pudo exportar la foto');
  return { blob, tipo: blob.type, aviso: avisos.join(' ') };
}
