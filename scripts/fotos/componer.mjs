import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { DESTINOS, INDICE } from './comun.mjs';

/**
 * Arma la foto final de cada frasco, toda del mismo tamano y con el mismo
 * tratamiento, a partir de scripts/fotos/fuentes.json.
 *
 *   npm run fotos:componer            rehace solo las que faltan
 *   npm run fotos:componer -- --todo  rehace todas
 *
 * Antes cada foto se mostraba como venia: los recortes de Bagues apoyados en un
 * azulejo de porcelana con aire alrededor, las escenas de Unlock a sangre, y
 * algunas con un fondo beige propio que no coincidia con el azulejo y dejaba un
 * recuadro visible. Tres tratamientos en la misma grilla se leen desprolijos.
 *
 * Ahora todas salen a 900x1200 (3:4, el cuadro de la tarjeta y de la ficha) y
 * ocupan el cuadro entero:
 *
 *  - RECORTE (fondo transparente: todos los de Bagues, algunos de Unlock): se
 *    recorta al contenido, se apoya sobre un piso de estudio oscuro con su
 *    sombra de contacto y un reflejo tenue, y se centra. Siempre al mismo
 *    tamano relativo, asi la grilla tiene ritmo.
 *  - ESCENA (foto con fondo propio): se recorta a 3:4 centrada en el frasco.
 *    El punto de foco se puede ajustar por foto con "foco": { "x": 0.5 }.
 *
 * Una foto chica no se agranda mas de AMPLIACION_MAX veces: antes que borrosa,
 * se ve un poco mas chica dentro del cuadro. Se puede subir por foto con
 * "ampliacionMax" cuando la unica fuente es chica (los minis del PDF).
 */

const RAIZ = path.resolve(import.meta.dirname, '../..');
const ANCHO = 900;
const ALTO = 1200;
const AMPLIACION_MAX = 2.6;
const PISO = 0.865; // donde apoya el frasco, en proporcion del alto
const todo = process.argv.includes('--todo');

const fuentes = JSON.parse(fs.readFileSync(path.join(RAIZ, 'scripts/fotos/fuentes.json'), 'utf8'));
const CACHE = path.join(RAIZ, 'scripts/fotos/datos/fuentes');
fs.mkdirSync(CACHE, { recursive: true });

/** Fondo de estudio: pared espresso con un halo de luz calida y un piso. */
function fondoSvg() {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}">
  <defs>
    <linearGradient id="pared" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2a1f17"/>
      <stop offset="${PISO - 0.08}" stop-color="#1d1510"/>
      <stop offset="${PISO - 0.0801}" stop-color="#241a13"/>
      <stop offset="1" stop-color="#15100c"/>
    </linearGradient>
    <radialGradient id="halo" cx="0.5" cy="0.42" r="0.55">
      <stop offset="0" stop-color="#d6a862" stop-opacity="0.20"/>
      <stop offset="0.55" stop-color="#d6a862" stop-opacity="0.05"/>
      <stop offset="1" stop-color="#d6a862" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="filo" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#f3ece1" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#f3ece1" stop-opacity="0.10"/>
      <stop offset="1" stop-color="#f3ece1" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="vineta" cx="0.5" cy="0.45" r="0.78">
      <stop offset="0.6" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.38"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#pared)"/>
  <rect width="100%" height="100%" fill="url(#halo)"/>
  <rect y="${Math.round(ALTO * (PISO - 0.08))}" width="100%" height="2" fill="url(#filo)"/>
  <rect width="100%" height="100%" fill="url(#vineta)"/>
</svg>`);
}

function sombraSvg(ancho) {
  const rx = Math.round(ancho * 0.56);
  const ry = Math.max(10, Math.round(ancho * 0.07));
  const cy = Math.round(ALTO * PISO);
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}">
  <defs><filter id="b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${Math.round(ry * 0.9)}"/></filter></defs>
  <ellipse cx="${ANCHO / 2}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#000" fill-opacity="0.62" filter="url(#b)"/>
</svg>`);
}

async function bajar(f, slug, linea) {
  if (f.archivo) return fs.readFileSync(path.join(RAIZ, f.archivo));
  const ext = path.extname(new URL(f.url).pathname) || '.img';
  const cache = path.join(CACHE, `${slug}__${linea}${ext}`);
  if (fs.existsSync(cache)) return fs.readFileSync(cache);
  const r = await fetch(f.url);
  if (!r.ok) throw new Error(`${slug}: HTTP ${r.status} ${f.url}`);
  const buf = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(cache, buf);
  return buf;
}

/** Recorte si mas del 6% del cuadro es transparente. */
async function esRecorte(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().extractChannel(3).raw().toBuffer({ resolveWithObject: true });
  let transparentes = 0;
  for (let i = 0; i < data.length; i++) if (data[i] < 12) transparentes++;
  return transparentes / (info.width * info.height) > 0.06;
}

async function componerRecorte(buf, ampliacionMax = AMPLIACION_MAX) {
  // Recorte al contenido visible: el alfa decide, no el color.
  const recortado = await sharp(buf).ensureAlpha().trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 8 }).png().toBuffer();
  const meta = await sharp(recortado).metadata();

  const altoMax = ALTO * 0.70;
  const anchoMax = ANCHO * 0.84;
  let escala = Math.min(altoMax / meta.height, anchoMax / meta.width);
  escala = Math.min(escala, ampliacionMax);
  const w = Math.round(meta.width * escala);
  const h = Math.round(meta.height * escala);

  const frasco = await sharp(recortado).resize(w, h, { kernel: 'lanczos3' }).png().toBuffer();
  const x = Math.round((ANCHO - w) / 2);
  const y = Math.round(ALTO * PISO - h);

  // Reflejo: el frasco espejado, muy tenue y desvanecido hacia abajo.
  const altoReflejo = Math.min(Math.round(h * 0.28), ALTO - Math.round(ALTO * PISO));
  const degrade = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${altoReflejo}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0.16"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`);
  // sharp aplica extract antes que flip sin importar el orden de las llamadas,
  // asi que el espejado se hace en una pasada aparte.
  const espejado = await sharp(frasco).flip().png().toBuffer();
  const reflejo = await sharp(espejado)
    .extract({ left: 0, top: 0, width: w, height: altoReflejo })
    .composite([{ input: degrade, blend: 'dest-in' }])
    .png()
    .toBuffer();

  return sharp(fondoSvg())
    .composite([
      { input: sombraSvg(w), left: 0, top: 0 },
      { input: reflejo, left: x, top: Math.round(ALTO * PISO) },
      { input: frasco, left: x, top: y },
    ])
    .webp({ quality: 84, alphaQuality: 100, effort: 6 })
    .toBuffer();
}

async function componerEscena(buf, foco = {}, zoom = 1) {
  const meta = await sharp(buf).metadata();
  const fx = foco.x ?? 0.5;
  const fy = foco.y ?? 0.5;
  // El recuadro 3:4 mas grande que entra en la foto, centrado en el foco.
  // "zoom" lo achica para acercarse cuando el frasco quedo chico en la escena.
  let cw = meta.width;
  let ch = Math.round(cw * 4 / 3);
  if (ch > meta.height) { ch = meta.height; cw = Math.round(ch * 3 / 4); }
  cw = Math.round(cw / zoom);
  ch = Math.round(ch / zoom);
  const left = Math.min(Math.max(0, Math.round(meta.width * fx - cw / 2)), meta.width - cw);
  const top = Math.min(Math.max(0, Math.round(meta.height * fy - ch / 2)), meta.height - ch);
  return sharp(buf)
    .flatten({ background: '#17110d' })
    .extract({ left, top, width: cw, height: ch })
    .resize(ANCHO, ALTO, { kernel: 'lanczos3' })
    .webp({ quality: 82, effort: 6 })
    .toBuffer();
}

const hechas = { unlock: [], bagues: [] };
const errores = [];
for (const [slug, porLinea] of Object.entries(fuentes)) {
  for (const [linea, f] of Object.entries(porLinea)) {
    const destino = path.join(RAIZ, 'public', DESTINOS[linea].replace(/^public\/?/, ''), `${slug}.webp`);
    hechas[linea].push(slug);
    if (!todo && fs.existsSync(destino) && fs.statSync(destino).mtimeMs > fs.statSync(path.join(RAIZ, 'scripts/fotos/fuentes.json')).mtimeMs) continue;
    try {
      const buf = await bajar(f, slug, linea);
      const tipo = f.tipo || ((await esRecorte(buf)) ? 'recorte' : 'escena');
      const salida = tipo === 'recorte'
        ? await componerRecorte(buf, f.ampliacionMax)
        : await componerEscena(buf, f.foco, f.zoom);
      fs.mkdirSync(path.dirname(destino), { recursive: true });
      fs.writeFileSync(destino, salida);
      // Las variantes (-360w, -560w) NO se borran: quedan con fecha anterior y
      // variantes.mjs las rehace. Ese paso corre solo en cada build, asi que una
      // foto nueva nunca llega a produccion sin sus anchos chicos.
      console.log(linea.padEnd(7), tipo.padEnd(8), slug);
    } catch (e) {
      errores.push(`${slug} (${linea}): ${e.message}`);
    }
  }
}

// Indice que consulta la web: que aroma tiene foto de cada linea.
const lista = (arr) => JSON.stringify([...new Set(arr)].sort(), null, 2);
fs.writeFileSync(path.join(RAIZ, INDICE), `// Generado por scripts/fotos/componer.mjs a partir de scripts/fotos/fuentes.json.
// No editar a mano: se agrega o cambia la fuente ahi y se corre npm run fotos:componer.
//
// Para cambiar una foto suelta no hace falta correr nada: se sube a mano
// desde el panel, en la ficha del producto, y esa gana sobre estas.
export const FOTO_UNLOCK = new Set(${lista(hechas.unlock)});

export const FOTO_BAGUES = new Set(${lista(hechas.bagues)});
`);

console.log(`\nunlock ${hechas.unlock.length} | bagues ${hechas.bagues.length}`);
if (errores.length) {
  console.log('\nNo se pudieron armar:');
  for (const e of errores) console.log('  ', e);
  process.exitCode = 1;
}
