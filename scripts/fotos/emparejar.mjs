import { DATOS, leerJson, guardarJson, letras, sinSufijo, calzaEstricto } from './comun.mjs';

/**
 * Paso 2 de 3. Decide de que producto de la proveedora sale la foto de cada
 * aroma nuestro, y deja la lista para revisar a ojo antes de bajar nada.
 *
 *   npm run fotos:emparejar
 *
 * Nuestros nombres vienen censurados con asteriscos (L* B*MB*), asi que el
 * emparejamiento se hace por las letras visibles, exigiendo que coincidan
 * posicion a posicion. Es a proposito que rechace de mas: una foto equivocada
 * es peor que ninguna, porque la clienta termina pidiendo un perfume que no es.
 */
const unlock = leerJson(`${DATOS}/unlock.json`);
const bagues = leerJson(`${DATOS}/bagues.json`);
const mios = leerJson(`${DATOS}/mios.json`);

const filas = [];
for (const m of mios) {
  const real = m.inspirado_en || m.nombre;

  // Unlock publica el aroma con el mismo nombre que usamos nosotros, o con el
  // real. Primero la coincidencia exacta, despues la estricta.
  let u = unlock.find((x) => letras(x.title) === letras(m.nombre));
  if (!u) {
    u = unlock
      .filter((x) => calzaEstricto(x.title, real))
      .sort((a, b) => letras(b.title).length - letras(a.title).length)[0];
  }

  // Bagues no nombra el aroma: le pone nombre propio al frasco (Granada,
  // Arizona). Ese nombre viene en la presentacion, asi que el emparejamiento es
  // directo y no hay que adivinar nada.
  const pres = (m.presentaciones || []).find(
    (x) => x.linea === 'bagues' && x.nombre_proveedor && !x.nombre_proveedor.includes('*')
  );
  let b = null;
  if (pres) {
    const objetivo = sinSufijo(pres.nombre_proveedor);
    b = bagues.find((x) => sinSufijo(x.title) === objetivo && x.images?.[0]?.src);
  }

  filas.push({
    slug: m.slug,
    real,
    censurado: m.nombre,
    frasco: pres?.nombre_proveedor || null,
    unlock: u?.title || null,
    bagues: b?.title || null,
    imgU: u?.images?.[0]?.src || null,
    imgB: b?.images?.[0]?.src || null,
  });
}

guardarJson(`${DATOS}/emparejamiento.json`, filas);

const conU = filas.filter((f) => f.imgU).length;
const conB = filas.filter((f) => f.imgB).length;
const sinNada = filas.filter((f) => !f.imgU && !f.imgB);

console.log('aromas nuestros :', filas.length);
console.log('foto en Unlock  :', conU);
console.log('frasco en Bagues:', conB);
console.log('sin ninguna     :', sinNada.length);
console.log('');
console.log('=== para revisar a ojo: nuestro aroma <- titulo de la proveedora ===');
filas
  .filter((f) => f.unlock || f.bagues)
  .forEach((f) => {
    console.log('  ', String(f.real).padEnd(30), '<-', f.unlock || f.bagues);
  });
