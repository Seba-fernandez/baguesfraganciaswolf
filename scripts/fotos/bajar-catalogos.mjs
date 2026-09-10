import fs from 'node:fs';
import { PROVEEDORAS, DATOS, claves, guardarJson } from './comun.mjs';

/**
 * Paso 1 de 3. Baja los catalogos: los dos de las proveedoras y el nuestro.
 *
 *   npm run fotos:catalogos
 *
 * Los tres quedan en scripts/fotos/datos/, que no se versiona. Es lo unico que
 * hay que volver a correr cuando entra un ciclo nuevo con aromas nuevos.
 */
fs.mkdirSync(DATOS, { recursive: true });

/** Shopify pagina de 250 en 250 y contesta una lista vacia cuando se termino. */
async function catalogoDe(nombre, base) {
  const productos = [];
  for (let pagina = 1; pagina <= 8; pagina++) {
    const r = await fetch(`${base}?limit=250&page=${pagina}`);
    if (!r.ok) throw new Error(`${nombre}: HTTP ${r.status}`);
    const tanda = (await r.json()).products || [];
    if (!tanda.length) break;
    productos.push(...tanda);
  }
  guardarJson(`${DATOS}/${nombre}.json`, productos);
  console.log(nombre.padEnd(8), productos.length, 'productos');
}

for (const [nombre, base] of Object.entries(PROVEEDORAS)) {
  await catalogoDe(nombre, base);
}

// El nuestro sale de la base con la clave publica: es el mismo catalogo que ya
// se ve en la web, asi que no hace falta ninguna credencial de administrador.
const { url, key } = claves();
const campos = 'id,slug,nombre,inspirado_en,presentaciones,activo';
const r = await fetch(`${url}/rest/v1/products?select=${campos}&order=nombre`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
if (!r.ok) throw new Error('products: HTTP ' + r.status);
const mios = await r.json();
guardarJson(`${DATOS}/mios.json`, mios);
console.log('nuestros', mios.length, 'aromas');
