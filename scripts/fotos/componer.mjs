import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
import { DESTINOS, INDICE } from './comun.mjs';
import { limpiarFilo, sacarPodio, limpiarMascara, cajaDe, llevarAEspresso } from './pixeles.mjs';

/**
 * Arma la foto final de cada frasco, toda del mismo tamano y en el mismo
 * estudio espresso, a partir de scripts/fotos/fuentes.json.
 *
 *   npm run fotos:componer            rehace solo las que faltan o cambiaron
 *   npm run fotos:componer -- --todo  rehace todas
 *
 * Todas salen a 900x1200 (3:4, el cuadro de la tarjeta y de la ficha), llenan
 * el cuadro y viven en el mismo cuarto: pared espresso, halo calido, piso con
 * su filo de luz. Cada fuente entra por uno de cuatro tratamientos (campo
 * "tratamiento" de fuentes.json; si falta, se detecta recorte o escena):
 *
 *  - RECORTE (fondo transparente: las cajas de Bagues, algunos frascos de
 *    Unlock): se limpia el filo, se saca el podio si lo trae ("podio": true) y
 *    se apoya en el estudio con sombra de contacto y reflejo.
 *  - ESTUDIO (escena con fondo propio, frasco opaco o de color): la mascara del
 *    frasco (scripts/fotos/datos/mascaras/) lo recorta y despues sigue igual
 *    que un recorte.
 *  - ESPRESSO (vidrio transparente sobre fondo claro, donde recortar arrastra
 *    el fondo viejo): el frasco queda intacto y solo el fondo se lleva a la
 *    rampa espresso. Se encuadra con la misma altura y el mismo piso.
 *  - ESCENA (la foto tal cual, recortada a 3:4): queda para casos puntuales.
 *
 * Una foto que hubo que agrandar mas de AVISO_AMPLIACION veces se publica igual
 * (blanda es mejor que la inicial suelta) pero avisa en la consola y queda
 * anotada en scripts/fotos/datos/avisos.json.
 */

const RAIZ = path.resolve(import.meta.dirname, '../..');
const ANCHO = 900;
const ALTO = 1200;
const AMPLIACION_MAX = 2.6;
const AVISO_AMPLIACION = 1.8;
const PISO = 0.865; // donde apoya el frasco, en proporcion del alto
const ALTURA = 0.70; // cuanto del alto ocupa el frasco o la caja
const todo = process.argv.includes('--todo');
// Modo recortes (rediseño, pared vino): en vez de componer en el estudio,
// guarda el recorte limpio (filo, podio, corte y mascara ya aplicados) en
// <dir>/<linea>/<slug>.png para que lo apoye scripts/rediseno/pared_productos.py.
// --solo slug1,slug2 limita a esos aromas. No toca public/ ni los avisos.
const argRecortes = process.argv.indexOf('--recortes');
const RECORTES = argRecortes > -1 ? path.resolve(process.argv[argRecortes + 1]) : null;
const argSolo = process.argv.indexOf('--solo');
const SOLO = argSolo > -1 ? new Set(process.argv[argSolo + 1].split(',')) : null;

const FUENTES = path.join(RAIZ, 'scripts/fotos/fuentes.json');
const fuentes = JSON.parse(fs.readFileSync(FUENTES, 'utf8'));
const CACHE = path.join(RAIZ, 'scripts/fotos/datos/fuentes');
const MASCARAS = path.join(RAIZ, 'scripts/fotos/datos/mascaras');
const AVISOS = path.join(RAIZ, 'scripts/fotos/datos/avisos.json');
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

/** La misma viñeta del estudio, para ponerla encima de una escena espresso. */
function vinetaSvg() {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}">
  <defs><radialGradient id="v" cx="0.5" cy="0.45" r="0.78">
    <stop offset="0.6" stop-color="#000" stop-opacity="0"/>
    <stop offset="1" stop-color="#000" stop-opacity="0.38"/>
  </radialGradient></defs>
  <rect width="100%" height="100%" fill="url(#v)"/>
</svg>`);
}

/**
 * FOTO-3. Sombra en dos capas: un contacto fino y oscuro justo donde apoya, y
 * una penumbra ancha y floja. La de antes era una sola mancha que se leia como
 * un disco debajo del frasco.
 */
function sombraSvg(ancho) {
  const cy = Math.round(ALTO * PISO);
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}"><defs>
  <filter id="a" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
  <filter id="b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${Math.round(ancho * 0.06)}"/></filter></defs>
  <ellipse cx="${ANCHO / 2}" cy="${cy + 4}" rx="${Math.round(ancho * 0.66)}" ry="${Math.round(ancho * 0.09)}" fill="#000" fill-opacity="0.45" filter="url(#b)"/>
  <ellipse cx="${ANCHO / 2}" cy="${cy}" rx="${Math.round(ancho * 0.49)}" ry="5" fill="#000" fill-opacity="0.85" filter="url(#a)"/>
</svg>`);
}

function rutaFuente(f, slug, linea) {
  if (f.archivo) return path.join(RAIZ, f.archivo);
  const ext = path.extname(new URL(f.url).pathname) || '.img';
  return path.join(CACHE, `${slug}__${linea}${ext}`);
}

async function bajar(f, slug, linea) {
  const ruta = rutaFuente(f, slug, linea);
  if (fs.existsSync(ruta)) return fs.readFileSync(ruta);
  const r = await fetch(f.url);
  if (!r.ok) throw new Error(`${slug}: HTTP ${r.status} ${f.url}`);
  const buf = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(ruta, buf);
  return buf;
}

/** Recorte si mas del 6% del cuadro es transparente. */
async function esRecorte(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().extractChannel(3).raw().toBuffer({ resolveWithObject: true });
  let transparentes = 0;
  for (let i = 0; i < data.length; i++) if (data[i] < 12) transparentes++;
  return transparentes / (info.width * info.height) > 0.06;
}

async function rgba(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

const aPng = (img) => sharp(img.data, { raw: { width: img.width, height: img.height, channels: 4 } }).png().toBuffer();

/**
 * La mascara del frasco, guardada en datos/mascaras/ (se versiona). Si falta o
 * la fuente cambio, se calcula una vez con mascaras.py (rembg, en Python).
 */
async function mascaraDe(buf, slug, linea, width, height) {
  const clave = `${slug}__${linea}`;
  const png = path.join(MASCARAS, `${clave}.png`);
  const indicePath = path.join(MASCARAS, 'indice.json');
  const sha = crypto.createHash('sha1').update(buf).digest('hex');
  const leerIndice = () => (fs.existsSync(indicePath) ? JSON.parse(fs.readFileSync(indicePath, 'utf8')) : {});
  if (!fs.existsSync(png) || leerIndice()[clave]?.sha1 !== sha) {
    console.log(`  calculando la mascara de ${clave} (una sola vez)...`);
    const r = spawnSync('python3', [path.join(RAIZ, 'scripts/fotos/mascaras.py'), clave], { stdio: 'inherit' });
    if (r.status !== 0 || !fs.existsSync(png) || leerIndice()[clave]?.sha1 !== sha) {
      throw new Error('no se pudo calcular la mascara. Hace falta rembg: pip install --break-system-packages rembg onnxruntime (ver scripts/fotos/README.md)');
    }
  }
  const { data } = await sharp(png).resize(width, height, { fit: 'fill', kernel: 'lanczos3' })
    .extractChannel(0).raw().toBuffer({ resolveWithObject: true });
  return new Uint8Array(data);
}

async function componerRecorte(buf, ampliacionMax = AMPLIACION_MAX) {
  // Recorte al contenido visible: el alfa decide, no el color.
  const recortado = await sharp(buf).ensureAlpha().trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 8 }).png().toBuffer();
  const meta = await sharp(recortado).metadata();
  if (RECORTES) return { salida: recortado, ampliacion: 1, medida: `recorte de ${meta.width}x${meta.height} px`, recorte: true };

  const altoMax = ALTO * ALTURA;
  const anchoMax = ANCHO * 0.84;
  const justa = Math.min(altoMax / meta.height, anchoMax / meta.width);
  const escala = Math.min(justa, ampliacionMax);
  const w = Math.round(meta.width * escala);
  const h = Math.round(meta.height * escala);

  const frasco = await sharp(recortado).resize(w, h, { kernel: 'lanczos3' }).png().toBuffer();
  const x = Math.round((ANCHO - w) / 2);
  const y = Math.round(ALTO * PISO - h);

  // Reflejo: el frasco espejado, muy tenue (FOTO-3: 0,09; antes 0,16).
  const altoReflejo = Math.min(Math.round(h * 0.28), ALTO - Math.round(ALTO * PISO));
  const degrade = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${altoReflejo}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0.09"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`);
  // sharp aplica extract antes que flip sin importar el orden de las llamadas,
  // asi que el espejado se hace en una pasada aparte.
  const espejado = await sharp(frasco).flip().png().toBuffer();
  const reflejo = await sharp(espejado)
    .extract({ left: 0, top: 0, width: w, height: altoReflejo })
    .composite([{ input: degrade, blend: 'dest-in' }])
    .png()
    .toBuffer();

  const salida = await sharp(fondoSvg())
    .composite([
      { input: sombraSvg(w), left: 0, top: 0 },
      { input: reflejo, left: x, top: Math.round(ALTO * PISO) },
      { input: frasco, left: x, top: y },
    ])
    .webp({ quality: 84, effort: 6 })
    .toBuffer();
  return { salida, ampliacion: escala, medida: `frasco de ${meta.width}x${meta.height} px en la fuente` };
}

/** Un recorte de verdad: limpieza de filo (FOTO-2) y podio (FOTO-3). */
async function tratarRecorte(buf, f) {
  let img = await rgba(buf);
  if (f.podio) img = sacarPodio(img, typeof f.podio === 'object' ? f.podio : {});
  img = limpiarFilo(img);
  return componerRecorte(await aPng(img), f.ampliacionMax);
}

/** Tratamiento estudio: la mascara recorta el frasco y sigue como recorte. */
async function tratarEstudio(buf, f, slug, linea) {
  const img = await rgba(buf);
  const crudo = await mascaraDe(buf, slug, linea, img.width, img.height);
  const mascara = limpiarMascara(crudo, img.width, img.height, { corte: f.corte });
  for (let i = 0; i < mascara.length; i++) img.data[i * 4 + 3] = mascara[i];
  return componerRecorte(await aPng(limpiarFilo(img)), f.ampliacionMax);
}

/**
 * Tratamiento espresso: el fondo pasa a la rampa y se encuadra para que el
 * frasco quede de la misma altura y apoyado en el mismo piso que en el estudio.
 */
async function tratarEspresso(buf, f, slug, linea) {
  const img = await rgba(buf);
  const crudo = await mascaraDe(buf, slug, linea, img.width, img.height);
  const mascara = limpiarMascara(crudo, img.width, img.height, { corte: f.corte });
  const caja = cajaDe(mascara, img.width, img.height);
  if (RECORTES) {
    // Vidrio transparente: se guarda con su mascara y el color del fondo que
    // se ve a traves, asi la pared vino puede reemplazarlo adentro del vidrio.
    const fondo = [[], [], []];
    for (let i = 0; i < mascara.length; i += 7) {
      if (mascara[i] < 10) for (let c = 0; c < 3; c++) fondo[c].push(img.data[i * 4 + c]);
    }
    const mediana = (a) => { a.sort((x, y) => x - y); return a[a.length >> 1] ?? 255; };
    const conAlfa = Buffer.from(img.data);
    for (let i = 0; i < mascara.length; i++) conAlfa[i * 4 + 3] = mascara[i];
    // La foto entera (no se recorta): el frasco queda en su escena y solo el
    // fondo pasa a la pared. La caja del frasco va en el .json para encuadrar.
    const salida = await sharp(conAlfa, { raw: { width: img.width, height: img.height, channels: 4 } }).png().toBuffer();
    return { salida, ampliacion: 1, medida: 'escena de vidrio', recorte: false, fondo: fondo.map(mediana), caja };
  }
  const tratada = llevarAEspresso(img, mascara);

  // Escala que deja el frasco al ALTURA del cuadro (o al 84 % del ancho).
  let escala = Math.min(ALTO * ALTURA / caja.h, ANCHO * 0.84 / caja.w, f.ampliacionMax ?? AMPLIACION_MAX);
  // Si el cuadro que hace falta no entra en la foto, se aleja lo justo.
  escala = Math.max(escala, ANCHO / img.width, ALTO / img.height);
  const cw = Math.round(ANCHO / escala);
  const ch = Math.round(ALTO / escala);
  const cx = (caja.x0 + caja.x1) / 2;
  const left = Math.min(Math.max(0, Math.round(cx - cw / 2)), img.width - cw);
  const top = Math.min(Math.max(0, Math.round(caja.y1 - PISO * ch)), img.height - ch);

  const salida = await sharp(tratada.data, { raw: { width: img.width, height: img.height, channels: 4 } })
    .extract({ left, top, width: cw, height: ch })
    .resize(ANCHO, ALTO, { kernel: 'lanczos3' })
    .composite([{ input: vinetaSvg(), left: 0, top: 0 }])
    .removeAlpha()
    .webp({ quality: 84, effort: 6 })
    .toBuffer();
  return { salida, ampliacion: escala, medida: `foto de ${img.width}x${img.height} px` };
}

/** Tratamiento escena: la foto tal cual, recortada a 3:4 en el foco. */
async function tratarEscena(buf, f) {
  const foco = f.foco || {};
  const zoom = f.zoom || 1;
  const meta = await sharp(buf).metadata();
  const fx = foco.x ?? 0.5;
  const fy = foco.y ?? 0.5;
  let cw = meta.width;
  let ch = Math.round(cw * 4 / 3);
  if (ch > meta.height) { ch = meta.height; cw = Math.round(ch * 3 / 4); }
  cw = Math.round(cw / zoom);
  ch = Math.round(ch / zoom);
  const left = Math.min(Math.max(0, Math.round(meta.width * fx - cw / 2)), meta.width - cw);
  const top = Math.min(Math.max(0, Math.round(meta.height * fy - ch / 2)), meta.height - ch);
  const salida = await sharp(buf)
    .flatten({ background: '#17110d' })
    .extract({ left, top, width: cw, height: ch })
    .resize(ANCHO, ALTO, { kernel: 'lanczos3' })
    .webp({ quality: 82, effort: 6 })
    .toBuffer();
  return { salida, ampliacion: ANCHO / cw, medida: `foto de ${meta.width}x${meta.height} px` };
}

const avisos = fs.existsSync(AVISOS) ? JSON.parse(fs.readFileSync(AVISOS, 'utf8')) : {};
const hechas = { unlock: [], bagues: [] };
const errores = [];
const nuevosAvisos = [];
for (const [slug, porLinea] of Object.entries(fuentes)) {
  for (const [linea, f] of Object.entries(porLinea)) {
    if (SOLO && !SOLO.has(slug)) continue;
    const destino = RECORTES
      ? path.join(RECORTES, linea, `${slug}.png`)
      : path.join(RAIZ, 'public', DESTINOS[linea].replace(/^public\/?/, ''), `${slug}.webp`);
    const clave = `${linea}/${slug}`;
    hechas[linea].push(slug);
    const mascara = path.join(MASCARAS, `${slug}__${linea}.png`);
    const alDia = fs.existsSync(destino)
      && fs.statSync(destino).mtimeMs > fs.statSync(FUENTES).mtimeMs
      && (!fs.existsSync(mascara) || fs.statSync(destino).mtimeMs > fs.statSync(mascara).mtimeMs);
    if (!todo && alDia) continue;
    try {
      const buf = await bajar(f, slug, linea);
      const tratamiento = f.tratamiento || f.tipo || ((await esRecorte(buf)) ? 'recorte' : 'escena');
      const hacer = { recorte: tratarRecorte, estudio: tratarEstudio, espresso: tratarEspresso, escena: tratarEscena }[tratamiento];
      if (!hacer) throw new Error(`tratamiento desconocido: ${tratamiento}`);
      const { salida, ampliacion, medida, recorte, fondo, caja } = await hacer(buf, f, slug, linea);
      fs.mkdirSync(path.dirname(destino), { recursive: true });
      fs.writeFileSync(destino, salida);
      if (RECORTES) {
        fs.writeFileSync(destino.replace(/\.png$/, '.json'), JSON.stringify({ tratamiento, recorte: !!recorte, fondo: fondo || null, caja: caja || null, ampliacionMax: f.ampliacionMax ?? null }) + '\n');
        console.log(linea.padEnd(7), tratamiento.padEnd(9), medida.padEnd(28), slug);
        continue;
      }
      // Las variantes (-360w, -560w) NO se borran: quedan con fecha anterior y
      // variantes.mjs las rehace. Ese paso corre solo en cada build, asi que una
      // foto nueva nunca llega a produccion sin sus anchos chicos.
      const amp = Math.round(ampliacion * 100) / 100;
      delete avisos[clave];
      if (amp > AVISO_AMPLIACION) {
        avisos[clave] = { ampliacion: amp, medida, tratamiento, origen: f.origen || '' };
        nuevosAvisos.push(`${clave}: ampliada ${amp}x (${medida})`);
      }
      console.log(linea.padEnd(7), tratamiento.padEnd(9), `${amp}x`.padEnd(6), slug);
    } catch (e) {
      errores.push(`${slug} (${linea}): ${e.message}`);
    }
  }
}

// En modo recortes no se toca nada de la web (ni avisos ni el indice).
if (RECORTES) {
  if (errores.length) { console.error('Errores:\n  ' + errores.join('\n  ')); process.exit(1); }
  process.exit(0);
}

// Avisos de resolucion: se guardan siempre, asi el de una foto que no se
// rehizo en esta corrida no se pierde.
for (const clave of Object.keys(avisos)) {
  const [linea, slug] = clave.split('/');
  if (!fuentes[slug]?.[linea]) delete avisos[clave];
}
fs.mkdirSync(path.dirname(AVISOS), { recursive: true });
fs.writeFileSync(AVISOS, JSON.stringify(Object.fromEntries(Object.entries(avisos).sort()), null, 1) + '\n');

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
if (nuevosAvisos.length) {
  console.log(`\n*** AVISO DE RESOLUCION: ${nuevosAvisos.length} foto(s) agrandadas mas de ${AVISO_AMPLIACION}x.`);
  console.log('*** Se publican igual, pero se ven blandas. Conviene buscarles una fuente mas grande:');
  for (const a of nuevosAvisos) console.log('***  ', a);
  console.log(`*** Lista completa en scripts/fotos/datos/avisos.json (${Object.keys(avisos).length} en total).`);
}
if (errores.length) {
  console.log('\nNo se pudieron armar:');
  for (const e of errores) console.log('  ', e);
  process.exitCode = 1;
}
