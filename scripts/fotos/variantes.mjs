import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

/**
 * Genera dos anchos mas chicos de cada foto de producto.
 *
 * Las fotos vienen de los catalogos de las proveedoras a 800-900 px de lado, y
 * en la web se ven a ~190 px en el celular (dos por fila) y ~250 en escritorio.
 * Servir la grande a todos era mandar cuatro veces los bytes necesarios: en el
 * catalogo, con doce tarjetas por pagina, eso son mas de 800 kB de mas.
 *
 * Se generan 360w y 560w y se deja la original como el ancho grande. Con esos
 * tres escalones el navegador elige bien en las combinaciones reales de ancho y
 * densidad de pantalla: un telefono comun termina bajando la de 560 (unos 35 kB)
 * en vez de la de 800 (unos 73 kB).
 *
 *   npm run fotos:variantes
 *
 * Es idempotente: si la variante ya existe y es mas nueva que el original, no
 * la vuelve a hacer. Corre al final del pipeline de fotos.
 */

const RAIZ = path.resolve(import.meta.dirname, '../..');
const CARPETAS = ['public/perfumes', 'public/perfumes/bagues'];
const ANCHOS = [360, 560];
// Sufijo que identifica una variante, para no generar variantes de variantes.
const ES_VARIANTE = /-(\d+)w\.webp$/;

let hechas = 0;
let salteadas = 0;
let ahorro = 0;

for (const carpeta of CARPETAS) {
  const dir = path.join(RAIZ, carpeta);
  if (!fs.existsSync(dir)) continue;

  for (const archivo of fs.readdirSync(dir)) {
    if (!archivo.endsWith('.webp') || ES_VARIANTE.test(archivo)) continue;

    const origen = path.join(dir, archivo);
    const info = fs.statSync(origen);
    if (!info.isFile()) continue;

    for (const ancho of ANCHOS) {
      const destino = path.join(dir, archivo.replace(/\.webp$/, `-${ancho}w.webp`));

      if (fs.existsSync(destino) && fs.statSync(destino).mtimeMs >= info.mtimeMs) {
        salteadas++;
        continue;
      }

      await sharp(origen)
        .resize(ancho, null, { withoutEnlargement: true })
        .webp({ quality: 78, alphaQuality: 90, effort: 6 })
        .toFile(destino);

      hechas++;
      if (ancho === 560) ahorro += info.size - fs.statSync(destino).size;
    }
  }
}

console.log(
  `  variantes: ${hechas} generadas, ${salteadas} ya estaban al dia` +
  (hechas ? ` — ${(ahorro / 1024 / 1024).toFixed(1)} MB menos por pagina de catalogo en 560w` : '')
);
