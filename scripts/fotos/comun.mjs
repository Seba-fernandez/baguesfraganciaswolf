import fs from 'node:fs';
import path from 'node:path';

/**
 * Lo que comparten los tres pasos del pipeline de fotos: de donde salen los
 * catalogos, donde van las fotos y como se normaliza un nombre.
 *
 * Si cambia el sitio de una proveedora, o la carpeta de las fotos, se cambia
 * aca y los tres pasos quedan al dia.
 */

/** Las dos proveedoras corren en Shopify y publican su catalogo entero. */
export const PROVEEDORAS = {
  unlock: 'https://unlock.com.ar/products.json',
  bagues: 'https://bagues.com.ar/products.json',
};

/** Adonde van las fotos. Igual a CARPETA_FOTOS en src/config/ajustes.js. */
export const DESTINOS = {
  unlock: 'public/perfumes',
  bagues: 'public/perfumes/bagues',
};

/** Los descargados crudos. No se versionan: se vuelven a bajar en un minuto. */
export const DATOS = 'scripts/fotos/datos';

/** El indice que lee la web para saber que aroma tiene foto. */
export const INDICE = 'src/data/fotos.js';

export function leerJson(archivo) {
  return JSON.parse(fs.readFileSync(archivo, 'utf8'));
}

export function guardarJson(archivo, dato) {
  fs.mkdirSync(path.dirname(archivo), { recursive: true });
  fs.writeFileSync(archivo, JSON.stringify(dato, null, 1));
}

/**
 * Deja solo letras, numeros y los asteriscos de la censura. Se usa para
 * comparar un nombre censurado (L* B*MB*) contra el real (LA BOMBA), asi que
 * los espacios y los mililitros molestan y se van.
 */
export function letras(texto) {
  return String(texto || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\b(MINI|EDP|EDT|\d+\s?ML)\b/g, '')
    .replace(/[^A-Z0-9*]/g, '');
}

/**
 * Saca los agregados genericos que la proveedora le pone al titulo, para poder
 * exigir despues igualdad exacta. Sin esto, "New York" se llevaba la foto de
 * "New York Sexy" por parecerse el principio.
 */
export function sinSufijo(texto) {
  return String(texto || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\b(EAU DE PARFUM|EAU DE TOILETTE|EDP|EDT|PERFUME|FRAGANCIA|X ?\d+ ?ML|\d+ ?ML)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Un emparejamiento vale si las letras visibles del nombre censurado coinciden
 * POSICION A POSICION con el nombre real, no si aparecen sueltas en cualquier
 * lado. La primera version aceptaba subsecuencias y mezclaba perfumes de la
 * misma familia: Le Male se llevaba la foto de Le Beau.
 */
export function calzaEstricto(censurado, real) {
  const c = letras(censurado);
  const r = letras(real);
  if (c.length !== r.length) return false;
  let visibles = 0;
  for (let i = 0; i < c.length; i++) {
    if (c[i] === '*') continue;
    if (c[i] !== r[i]) return false;
    visibles++;
  }
  return visibles >= Math.max(3, Math.ceil(r.length * 0.5));
}

/** Lee las claves de Supabase de .env sin traerse ninguna libreria. */
export function claves() {
  const texto = fs.readFileSync('.env', 'utf8');
  const sacar = (clave) => (texto.match(new RegExp(clave + '=(.+)')) || [])[1]?.trim();
  const url = sacar('VITE_SUPABASE_URL');
  const key = sacar('VITE_SUPABASE_ANON_KEY');
  if (!url || !key) throw new Error('faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env');
  return { url, key };
}
