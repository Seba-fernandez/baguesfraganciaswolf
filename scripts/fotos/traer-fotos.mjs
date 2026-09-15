import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { DATOS, DESTINOS, INDICE, leerJson } from './comun.mjs';

/**
 * Paso 3 de 3. Baja las fotos emparejadas, las comprime y regenera el indice
 * que lee la web.
 *
 *   npm run fotos:traer              baja y deja las de pases anteriores
 *   npm run fotos:traer -- --limpiar baja y borra las que ya no se emparejan
 *
 * A cada foto se le saca el fondo blanco de estudio: se rellena desde los
 * bordes (magic wand), asi el frasco y la caja quedan flotando sobre el oscuro
 * de la web, sin el rectangulo blanco que se veia fuera de lugar. El relleno va
 * desde el borde a proposito: el blanco interno del frasco NO se toca, solo el
 * del fondo. Las fotos con fondo de color propio (varias de Unlock) se dejan
 * como estan. Despues se recorta el sobrante transparente y se pasa a webp.
 *
 * Sobre --limpiar: una foto que quedo de un pase anterior puede ser un
 * emparejamiento viejo equivocado, o una foto buena de un producto que la
 * proveedora saco de su web. Son casos opuestos y el script no puede
 * distinguirlos, asi que por defecto las deja y las lista al final para que la
 * decision sea de una persona.
 */
const filas = leerJson(`${DATOS}/emparejamiento.json`);
const LADO = 900;
const UMBRAL = 224; // que tan claro para contar un pixel como fondo blanco
const SAT = 26;     // diferencia max entre canales para contar como gris/blanco
const limpiar = process.argv.includes('--limpiar');

const antes = {};
for (const [linea, dir] of Object.entries(DESTINOS)) {
  fs.mkdirSync(dir, { recursive: true });
  antes[linea] = new Set(
    fs.readdirSync(dir).filter((f) => f.endsWith('.webp')).map((f) => f.replace('.webp', ''))
  );
}

/**
 * Saca el fondo blanco de estudio, si lo hay. Devuelve un webp; con fondo
 * transparente cuando se pudo recortar, o la foto tal cual cuando el fondo es
 * de color (no se toca).
 */
async function procesar(buf) {
  const { data, info } = await sharp(buf)
    .resize(LADO, LADO, { fit: 'inside', withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const esFondo = (i) => {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    return r > UMBRAL && g > UMBRAL && b > UMBRAL && Math.max(r, g, b) - Math.min(r, g, b) < SAT;
  };

  // Si las cuatro esquinas no son blancas, el fondo es de color: se deja igual.
  const esquinas = [
    0,
    (width - 1) * channels,
    (height - 1) * width * channels,
    ((height - 1) * width + width - 1) * channels,
  ];
  if (!esquinas.every(esFondo)) {
    return sharp(buf).resize(LADO, LADO, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  }

  // Relleno desde los bordes: solo el blanco conectado al borde se vuelve
  // transparente. El blanco de adentro del frasco queda intacto.
  const vis = new Uint8Array(width * height);
  const pila = [];
  const meter = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const p = y * width + x;
    if (!vis[p]) { vis[p] = 1; pila.push(p); }
  };
  for (let x = 0; x < width; x++) { meter(x, 0); meter(x, height - 1); }
  for (let y = 0; y < height; y++) { meter(0, y); meter(width - 1, y); }
  while (pila.length) {
    const p = pila.pop();
    if (!esFondo(p * channels)) continue;
    data[p * channels + 3] = 0;
    const x = p % width, y = (p / width) | 0;
    meter(x + 1, y); meter(x - 1, y); meter(x, y + 1); meter(x, y - 1);
  }

  return sharp(Buffer.from(data), { raw: { width, height, channels } })
    .trim({ threshold: 8 })
    .webp({ quality: 82, alphaQuality: 92 })
    .toBuffer();
}

async function traer(url, destino) {
  const r = await fetch(url.split('?')[0] + '?width=1100');
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 2000) throw new Error('archivo vacio');
  const out = await procesar(buf);
  fs.writeFileSync(destino, out);
  return out.length;
}

const cuenta = { unlock: 0, bagues: 0 };
const peso = { unlock: 0, bagues: 0 };
const fallas = [];

for (const f of filas) {
  for (const [linea, url] of [
    ['unlock', f.imgU],
    ['bagues', f.imgB],
  ]) {
    if (!url) continue;
    try {
      peso[linea] += await traer(url, path.join(DESTINOS[linea], `${f.slug}.webp`));
      cuenta[linea]++;
    } catch (e) {
      fallas.push(`${linea} ${f.slug}: ${e.message}`);
    }
  }
}

// Las que estaban y este pase no volvio a emparejar. Se listan siempre; se
// borran solo si lo pidio quien corre el script.
const sueltas = [];
for (const [linea, dir] of Object.entries(DESTINOS)) {
  const ahora = new Set(
    filas.filter((f) => (linea === 'unlock' ? f.imgU : f.imgB)).map((f) => f.slug)
  );
  for (const slug of antes[linea]) {
    if (ahora.has(slug)) continue;
    sueltas.push(`${linea} ${slug}`);
    if (limpiar) fs.unlinkSync(path.join(dir, `${slug}.webp`));
  }
}

const slugsDe = (dir) =>
  fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.webp'))
    .map((f) => f.replace('.webp', ''))
    .sort();

const u = slugsDe(DESTINOS.unlock);
const b = slugsDe(DESTINOS.bagues);

fs.writeFileSync(
  INDICE,
  [
    '// Generado por scripts/fotos/traer-fotos.mjs. No editar a mano.',
    '// Que aroma tiene foto de cada linea. La web lo consulta para no pedir',
    '// imagenes que no existen y mostrar la inicial en su lugar.',
    '//',
    '// Para cambiar una foto suelta no hace falta correr nada: se sube a mano',
    '// desde el panel, en la ficha del producto, y esa gana sobre estas.',
    `export const FOTO_UNLOCK = new Set(${JSON.stringify(u, null, 2)});`,
    '',
    `export const FOTO_BAGUES = new Set(${JSON.stringify(b, null, 2)});`,
    '',
  ].join('\n')
);

console.log('Unlock:', cuenta.unlock, 'fotos |', Math.round(peso.unlock / 1024), 'kB');
console.log('Bagues:', cuenta.bagues, 'fotos |', Math.round(peso.bagues / 1024), 'kB');
console.log('fallas:', fallas.length);
fallas.slice(0, 5).forEach((x) => console.log('  ', x));
if (sueltas.length) {
  console.log('');
  console.log(
    limpiar
      ? `borradas por no emparejar mas: ${sueltas.length}`
      : `quedan de un pase anterior: ${sueltas.length} (mirarlas antes de usar --limpiar)`
  );
  sueltas.forEach((x) => console.log('  ', x));
}
console.log('');
console.log('aromas con foto:', new Set([...u, ...b]).size, 'de', filas.length);
console.log('peso total     :', Math.round((peso.unlock + peso.bagues) / 1024), 'kB');
console.log('indice escrito :', INDICE);
