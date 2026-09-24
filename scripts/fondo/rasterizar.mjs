import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

/**
 * Convierte a WebP los dibujos que van al fondo de la tienda.
 *
 * Por que: los SVG que genera generar-duna.mjs son nitidos a cualquier tamano,
 * pero son miles de nodos que el navegador tiene que parsear y rasterizar en el
 * hilo principal, justo en el elemento mas grande de la primera pantalla. La
 * escena del hero son 210 kB de marcado y el LCP la esperaba.
 *
 * Una escena de degradados sin fotos comprime muy bien en WebP y el navegador
 * la decodifica fuera del hilo principal. El SVG se conserva como fuente: esto
 * es un paso de build, no un reemplazo.
 *
 *   npm run fondo        genera los SVG y despues corre esto
 *   npm run fondo:webp   solo esto
 */

const RAIZ = path.resolve(import.meta.dirname, '../..');
const p = (...t) => path.join(RAIZ, ...t);

/**
 * Cada salida declara el tamano al que se rasteriza y la calidad.
 *
 * La escena se dibuja a 1600×1000, que es su tamano de diseno: mas grande no
 * agrega detalle (no hay ninguno: son degradados y lineas suaves) y en pantalla
 * ancha el `cover` la estira sin que se note, porque no hay bordes duros que
 * delaten el escalado salvo el disco del sol, que a 1600 ya entra limpio.
 *
 * Los surcos NO se rasterizan, y vale anotar por que: son lineas finisimas
 * sobre transparente, y el alfa de WebP no las comprime — medido, el mismo
 * dibujo pasaba de 122 kB en SVG a 323 kB en WebP. Siguen en SVG, y el CSS los
 * pide solo en escritorio (ver tienda.css): existen para que el canto del
 * vidrio los quiebre, y la lente no corre en el celular.
 */
const TRABAJOS = [
  { de: 'public/hero/duna.svg', a: 'public/hero/duna.webp', w: 1600, h: 1000, calidad: 82, grano: 0.18 },
  { de: 'public/hero/duna-movil.svg', a: 'public/hero/duna-movil.webp', w: 900, h: 900, calidad: 80, grano: 0.18 },
];

const kb = (n) => `${(n / 1024).toFixed(1)} kB`;

/**
 * Grano de pelicula, horneado en el pixel.
 *
 * Antes lo ponia el CSS: una capa a pantalla completa con un feTurbulence
 * dentro de un data-URI, mezclada en `overlay`. Se veia bien y costaba carisimo
 * — medido con Lighthouse, las dos capas de grano (la de la escena y la de la
 * pagina) sumaban ~900 ms al LCP en un telefono de gama media: el blend obliga
 * a componer la capa aparte y el filtro hay que rasterizarlo antes de poder
 * dibujar nada de lo que tiene debajo.
 *
 * Horneado cuesta cero en el navegador. El costo se paga en bytes, y en una
 * escena de degradados es poco: el ruido monocromo sube el archivo un ~15%.
 * (En un JPEG de foto lo multiplicaria por cinco, que es la razon por la que
 * en su momento se habia decidido ponerlo en CSS — ver docs/DISENO.md.)
 */
async function conGrano(buffer, w, h, fuerza) {
  const ruido = Buffer.alloc(w * h * 4);
  // Semilla fija: el mismo dibujo dos veces da el mismo archivo.
  let s = 20260924;
  const azar = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = 0; i < w * h; i++) {
    // Ruido gris centrado en 128: en `overlay` eso es "no tocar", y cada
    // desvio aclara u oscurece el pixel de abajo.
    const v = Math.max(0, Math.min(255, 128 + (azar() - 0.5) * 255));
    ruido[i * 4] = v; ruido[i * 4 + 1] = v; ruido[i * 4 + 2] = v;
    ruido[i * 4 + 3] = Math.round(fuerza * 255);
  }
  return sharp(buffer)
    .composite([{ input: ruido, raw: { width: w, height: h, channels: 4 }, blend: 'overlay' }])
    .toBuffer();
}

for (const t of TRABAJOS) {
  const origen = p(t.de);
  if (!fs.existsSync(origen)) {
    console.warn(`  falta ${t.de} — se saltea (corre antes: npm run fondo:duna)`);
    continue;
  }

  // density alto: sharp rasteriza el SVG a partir de su tamano nominal, y sin
  // esto una escena de 1600 de ancho sale borrosa al pedirle 1600 px.
  const plano = await sharp(origen, { density: 200 })
    .resize(t.w, t.h, { fit: 'fill' })
    .flatten({ background: '#17110d' })
    .png()
    .toBuffer();

  const granulado = await conGrano(plano, t.w, t.h, t.grano);

  await sharp(granulado).webp({ quality: t.calidad, effort: 6 }).toFile(p(t.a));

  const antes = fs.statSync(origen).size;
  const despues = fs.statSync(p(t.a)).size;
  const baja = Math.round((1 - despues / antes) * 100);
  console.log(`  ${path.basename(t.a).padEnd(20)} ${kb(antes)} → ${kb(despues)}  (−${baja}%)`);
}

/**
 * El frasco del hero. Viene con fondo transparente a 613×736 y se muestra, como
 * mucho, a 480 px de alto en escritorio y 300 en el celular. Se sirven dos
 * anchos para que el telefono no baje el grande.
 */
const FRASCO = p('public/hero/frasco.webp');
if (fs.existsSync(FRASCO)) {
  const original = fs.readFileSync(FRASCO);
  const antes = original.length;

  // Los nombres dicen el ancho REAL del archivo. El intento anterior pedia 760
  // px con withoutEnlargement sobre un original de 613: sharp no agranda, asi
  // que el archivo salia de 613 px con un nombre que decia 960 y un descriptor
  // srcset que decia 760w. El navegador elegia por un dato falso.
  // 380 px de ancho y calidad 74. En produccion el frasco resulta ser el
  // elemento del LCP en pantalla chica (se ve a ~196 px, o sea casi el doble de
  // densidad), asi que cada kB suyo entra directo en la metrica: de 420w q80 a
  // 380w q74 son 47 -> 34 kB sin que se note en pantalla.
  await sharp(original).resize(380, null, { withoutEnlargement: true })
    .webp({ quality: 74, alphaQuality: 88, effort: 6 })
    .toFile(p('public/hero/frasco-380.webp'));

  await sharp(original).resize(613, null, { withoutEnlargement: true })
    .webp({ quality: 80, alphaQuality: 90, effort: 6 })
    .toFile(p('public/hero/frasco-613.webp'));

  console.log(`  frasco-380.webp      ${kb(antes)} → ${kb(fs.statSync(p('public/hero/frasco-380.webp')).size)}`);
  console.log(`  frasco-613.webp      ${kb(antes)} → ${kb(fs.statSync(p('public/hero/frasco-613.webp')).size)}`);
}
