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
    const conFoto = (x) => x.images?.[0]?.src;
    // 1) Igualdad exacta (Manhattan Black = "Manhattan Black").
    b = bagues.find((x) => sinSufijo(x.title) === objetivo && conFoto(x));

    // 2) La casa a veces le agrega el genero al titulo ("Miami Masculino").
    //    Se prueba objetivo + genero real del aroma. Solo eso, nada de prefijos
    //    sueltos: "New York" NO puede caer en "New York Sexy".
    if (!b && m.genero) {
      const g = m.genero === 'masculino' ? 'MASCULINO' : m.genero === 'femenino' ? 'FEMENINO' : null;
      if (g) b = bagues.find((x) => sinSufijo(x.title) === `${objetivo} ${g}` && conFoto(x));
    }

    // 3) Un unico candidato cuyo titulo empieza EXACTO con el frasco como
    //    palabra entera. Si hay dos (Hawai Masculino / Femenino) es ambiguo y
    //    se descarta: mejor sin foto que la equivocada.
    if (!b) {
      const cand = bagues.filter((x) => {
        const t = sinSufijo(x.title);
        return conFoto(x) && (t === objetivo || t.startsWith(objetivo + ' '));
      });
      if (cand.length === 1) b = cand[0];
    }
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
