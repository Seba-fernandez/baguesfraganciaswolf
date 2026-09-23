import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

/**
 * Separa las fotos en dos grupos, para que la tarjeta sepa como mostrarlas:
 *
 *   - "porcelana": frasco o caja sobre el blanco de estudio que traer-fotos
 *     normalizo a la porcelana calida (--tile). Van con object-fit: contain,
 *     apoyadas sobre el azulejo con aire alrededor.
 *   - "propio": fotos de producto con fondo propio (marmol, luces, escena).
 *     Van a sangre, object-fit: cover, ocupando el cuadro entero: achicadas
 *     adentro del azulejo parecian una foto pegada encima de otra.
 *
 * Mira las cuatro esquinas y el centro de los bordes: si casi todos son
 * porcelana, la foto es de porcelana.
 *
 *   npm run fotos:fondos       (lo corre tambien `npm run fotos`)
 */

const CARPETAS = ['public/perfumes', 'public/perfumes/bagues'];
const SALIDA = 'src/data/fotosFondo.js';
const CREMA = [237, 226, 210];
const TOLERANCIA = 26;

async function esPorcelana(archivo) {
  const { data, info } = await sharp(archivo).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  const m = 3;
  const puntos = [
    [m, m], [w - 1 - m, m], [m, h - 1 - m], [w - 1 - m, h - 1 - m],
    [w >> 1, m], [w >> 1, h - 1 - m], [m, h >> 1], [w - 1 - m, h >> 1],
  ];
  let iguales = 0;
  for (const [x, y] of puntos) {
    const i = (y * w + x) * c;
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    // Recorte transparente (caja o frasco sin fondo), blanco de estudio o la
    // porcelana ya normalizada: todo eso va sobre el azulejo.
    const transparente = a < 24;
    const blanco = Math.min(r, g, b) >= 232 && Math.max(r, g, b) - Math.min(r, g, b) < 14;
    const crema = Math.hypot(r - CREMA[0], g - CREMA[1], b - CREMA[2]) <= TOLERANCIA;
    if (transparente || blanco || crema) iguales++;
  }
  // Un recorte de caja toca el borde en uno o dos lados: alcanza con la mitad.
  return iguales >= 4;
}

const propio = [];
for (const dir of CARPETAS) {
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.webp')) continue;
    const ruta = path.join(dir, f);
    if (!(await esPorcelana(ruta))) propio.push(`/${ruta.replace(/\\/g, '/').replace(/^public\//, '')}`);
  }
}
propio.sort();

const js = `// Generado por scripts/fotos/clasificar-fondos.mjs. No editar a mano.
// Fotos con fondo propio (no porcelana): la tarjeta las muestra a sangre.
export const FOTO_FONDO_PROPIO = new Set(${JSON.stringify(propio, null, 2)});
`;
fs.writeFileSync(SALIDA, js);
console.log(`${propio.length} fotos con fondo propio -> ${SALIDA}`);
