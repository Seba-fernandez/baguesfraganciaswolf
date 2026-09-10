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
 * Las fotos van enteras, con su caja, como vienen de la casa: recortarlas para
 * dejar el frasco solo cortaba mal en varias. Lo unico que se toca es el tamano
 * y el peso, porque Shopify sirve PNG de mas de un mega y no los convierte.
 *
 * Sobre --limpiar: una foto que quedo de un pase anterior puede ser un
 * emparejamiento viejo equivocado, o una foto buena de un producto que la
 * proveedora saco de su web. Son casos opuestos y el script no puede
 * distinguirlos, asi que por defecto las deja y las lista al final para que la
 * decision sea de una persona.
 */
const filas = leerJson(`${DATOS}/emparejamiento.json`);
const LADO = 800;
const limpiar = process.argv.includes('--limpiar');

const antes = {};
for (const [linea, dir] of Object.entries(DESTINOS)) {
  fs.mkdirSync(dir, { recursive: true });
  antes[linea] = new Set(
    fs.readdirSync(dir).filter((f) => f.endsWith('.webp')).map((f) => f.replace('.webp', ''))
  );
}

/** Shopify redimensiona del lado del servidor con ?width=, pero no pasa a webp. */
async function traer(url, destino) {
  const r = await fetch(url.split('?')[0] + '?width=1000');
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 2000) throw new Error('archivo vacio');
  await sharp(buf)
    .resize(LADO, LADO, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(destino);
  return fs.statSync(destino).size;
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
