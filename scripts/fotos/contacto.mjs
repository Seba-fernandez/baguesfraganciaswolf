import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { DESTINOS, claves } from './comun.mjs';

/**
 * Hoja de contacto: todas las fotos de producto juntas, cada una con su nombre
 * de archivo y lo que dice la base (nombre del perfume y caja o linea). Es el
 * control obligatorio antes de publicar: una foto EQUIVOCADA es el peor error
 * posible, y asi se ve de un vistazo.
 *
 *   npm run fotos:contacto                     deja las hojas en scripts/fotos/datos/contacto/
 *   npm run fotos:contacto -- --salida otra/   en otra carpeta
 *
 * Las fotos con aviso de resolucion (datos/avisos.json) salen con marco rojo.
 */

const RAIZ = path.resolve(import.meta.dirname, '../..');
const i = process.argv.indexOf('--salida');
const SALIDA = i > 0 ? path.resolve(process.argv[i + 1]) : path.join(RAIZ, 'scripts/fotos/datos/contacto');
const fuentes = JSON.parse(fs.readFileSync(path.join(RAIZ, 'scripts/fotos/fuentes.json'), 'utf8'));
const avisosPath = path.join(RAIZ, 'scripts/fotos/datos/avisos.json');
const avisos = fs.existsSync(avisosPath) ? JSON.parse(fs.readFileSync(avisosPath, 'utf8')) : {};

process.chdir(RAIZ);
const { url, key } = claves();
const r = await fetch(`${url}/rest/v1/products?select=slug,nombre,presentaciones&order=slug`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
if (!r.ok) throw new Error('products: HTTP ' + r.status);
const base = Object.fromEntries((await r.json()).map((p) => [p.slug, p]));

const TW = 240, TH = 320, ROT = 58, COLS = 8, GAP = 10, POR_HOJA = 48;
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function rotulo(slug, linea, f) {
  const p = base[slug];
  const nombre = p ? p.nombre : 'NO ESTA EN LA BASE (o inactivo)';
  const tamanos = (p?.presentaciones || []).filter((x) => x.linea === linea && x.activo !== false);
  const cajas = [...new Set(tamanos.map((x) => x.nombre_proveedor).filter(Boolean))];
  const detalle = linea === 'bagues' ? `caja ${cajas.join(' / ') || '?'}` : `Unlock ${tamanos.map((x) => x.ml + 'ml').join(' ') || '?'}`;
  const aviso = avisos[`${linea}/${slug}`];
  const trat = f.tratamiento || 'recorte';
  return { nombre, detalle, linea2: `${trat}${aviso ? `  AMPLIADA ${aviso.ampliacion}x` : ''}`, aviso: !!aviso, falta: !p };
}

async function hoja(titulo, items, archivo) {
  const filas = Math.ceil(items.length / COLS);
  const W = COLS * TW + (COLS + 1) * GAP;
  const H = 44 + filas * (TH + ROT + GAP) + GAP;
  const capas = [];
  let textos = `<text x="${GAP}" y="28" font-family="DejaVu Sans" font-size="18" font-weight="bold" fill="#f3ece1">${esc(titulo)}</text>`;
  for (const [k, it] of items.entries()) {
    const x = GAP + (k % COLS) * (TW + GAP);
    const y = 44 + Math.floor(k / COLS) * (TH + ROT + GAP);
    const foto = await sharp(it.ruta).resize(TW, TH).png().toBuffer();
    capas.push({ input: foto, left: x, top: y });
    const rojo = it.r.aviso || it.r.falta;
    if (rojo) textos += `<rect x="${x - 3}" y="${y - 3}" width="${TW + 6}" height="${TH + 6}" fill="none" stroke="#ff3b3b" stroke-width="4"/>`;
    textos += `<text x="${x}" y="${y + TH + 16}" font-family="DejaVu Sans" font-size="12.5" font-weight="bold" fill="#f3ece1">${esc(it.slug.slice(0, 34))}</text>`;
    textos += `<text x="${x}" y="${y + TH + 32}" font-family="DejaVu Sans" font-size="12.5" fill="#e8c9a0">${esc((it.r.nombre + ' · ' + it.r.detalle).slice(0, 38))}</text>`;
    textos += `<text x="${x}" y="${y + TH + 48}" font-family="DejaVu Sans" font-size="11.5" fill="${rojo ? '#ff6b6b' : '#a8998a'}">${esc(it.r.linea2)}</text>`;
  }
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${textos}</svg>`);
  await sharp({ create: { width: W, height: H, channels: 3, background: '#0d0a08' } })
    .composite([...capas, { input: svg, left: 0, top: 0 }])
    .png({ compressionLevel: 9 })
    .toFile(archivo);
  console.log('  ', path.relative(RAIZ, archivo));
}

fs.mkdirSync(SALIDA, { recursive: true });
for (const linea of ['bagues', 'unlock']) {
  const items = Object.entries(fuentes)
    .filter(([, por]) => por[linea])
    .map(([slug, por]) => ({
      slug,
      ruta: path.join(RAIZ, DESTINOS[linea], `${slug}.webp`),
      r: rotulo(slug, linea, por[linea]),
    }))
    .filter((it) => fs.existsSync(it.ruta))
    .sort((a, b) => a.slug.localeCompare(b.slug));
  for (let k = 0; k < items.length; k += POR_HOJA) {
    const n = k / POR_HOJA + 1;
    const total = Math.ceil(items.length / POR_HOJA);
    await hoja(`${linea === 'bagues' ? 'Bagues (cajas)' : 'Unlock (frascos)'}  ${n}/${total}  ·  ${items.length} fotos  ·  nombre de archivo / nombre en la base · caja o tamaños / tratamiento`,
      items.slice(k, k + POR_HOJA), path.join(SALIDA, `contacto-${linea}-${n}.png`));
  }
}
const sinBase = Object.keys(fuentes).filter((s) => !base[s]);
if (sinBase.length) console.log('\nCon foto pero sin fila activa en la base:', sinBase.join(', '));
