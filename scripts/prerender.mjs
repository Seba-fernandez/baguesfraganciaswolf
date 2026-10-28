// Arma las paginas del build: la portada (dist/index.html), la cascara del
// catalogo (dist/catalogo/index.html) y la 404 (dist/404.html).
//
// Corre despues de los dos builds de Vite (el del navegador y el de servidor,
// ver "build" en package.json). Dibuja la app con React en el build, pega ese
// marcado en la plantilla y deja todo listo para que el navegador pinte apenas
// recibe el HTML. Cada trabajo vive en su archivo de scripts/prerender/:
//
//   paginas.mjs  arma cada pagina (puro, con pruebas)
//   html.mjs     reemplazos que tienen que encontrar exactamente lo que buscan
//   precio.mjs   el precio "Desde" del hero, pedido a la base en el build
//   letra.mjs    la letra del titulo recortada y embebida
//   csp.mjs      frena el build si un script en linea no esta en la CSP
//
// Las pruebas: scripts/qa/prerender.test.mjs (las piezas, sin build) y
// scripts/qa/paginas.test.mjs (las paginas ya armadas en dist/).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadEnv } from 'vite';
import { ErrorDePagina, kb } from './prerender/html.mjs';
import { armar404, armarCatalogo, armarPortada, dependenciasDelChunk, linkDeCss } from './prerender/paginas.mjs';
import { traerFilas } from './prerender/precio.mjs';
import { estiloDeLetra } from './prerender/letra.mjs';
import { cspDe, scriptsSinPermiso } from './prerender/csp.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const DIST = path.join(RAIZ, 'dist');
const ENTRADA = path.join(RAIZ, 'dist-ssr', 'entry-server.js');
const leer = (...p) => fs.readFileSync(path.join(...p), 'utf8');
const escribir = (archivo, html) => {
  fs.mkdirSync(path.dirname(archivo), { recursive: true });
  fs.writeFileSync(archivo, html);
};

async function principal() {
  if (!fs.existsSync(ENTRADA)) throw new ErrorDePagina('falta dist-ssr/entry-server.js: corre antes vite build --ssr');
  const { render, precioDesde } = await import(pathToFileURL(ENTRADA).href);

  const plantilla = leer(DIST, 'index.html');
  const cssTienda = leer(DIST, linkDeCss(plantilla).ruta);
  const assets = fs.readdirSync(path.join(DIST, 'assets'));

  // Portada.
  const marcado = await render('/');
  const env = loadEnv('production', RAIZ, 'VITE_');
  const filas = await traerFilas({ url: env.VITE_SUPABASE_URL, clave: env.VITE_SUPABASE_ANON_KEY });
  const precio = filas ? precioDesde(filas) : null;
  const letra = await estiloDeLetra(marcado, path.join(RAIZ, 'public', 'fonts', 'boska-500.woff2'));
  escribir(path.join(DIST, 'index.html'), armarPortada({ plantilla, marcado, css: cssTienda, estiloLetra: letra.estilo, precio }));
  console.log(`  portada: ${kb(marcado.length)} de marcado, CSS embebido (${kb(cssTienda.length)}), letra del titulo ${kb(letra.peso)}`);
  console.log(precio ? `  precio del hero en el HTML: ${precio.replace(/\u00a0/g, ' ')}` : '  precio del hero: sin precio en el HTML (llega con la base)');

  // Cascara del catalogo.
  const cssCatalogo = assets.find((f) => /^CatalogoScreen-.*\.css$/.test(f));
  const jsCatalogo = assets.find((f) => /^CatalogoScreen-.*\.js$/.test(f));
  if (!cssCatalogo || !jsCatalogo) throw new ErrorDePagina('falta el CSS o el JS del chunk del catalogo en dist/assets');
  const marcadoCatalogo = await render('/catalogo');
  const chunks = [jsCatalogo, ...dependenciasDelChunk(leer(DIST, 'assets', jsCatalogo))];
  escribir(path.join(DIST, 'catalogo', 'index.html'), armarCatalogo({
    plantilla, marcado: marcadoCatalogo, css: cssTienda + leer(DIST, 'assets', cssCatalogo), chunks,
  }));
  console.log(`  catalogo: ${kb(marcadoCatalogo.length)} de marcado, ${chunks.length} chunks precargados`);

  // 404.
  const marcado404 = await render('/esta-pagina-no-existe');
  escribir(path.join(DIST, '404.html'), armar404({ plantilla, marcado: marcado404, css: cssTienda }));
  console.log(`  404: ${kb(marcado404.length)} de marcado`);

  // /panel recibe la portada (regla de vercel.json): main.jsx la vacia y monta el panel.

  // La politica de seguridad, al final, contra las paginas ya escritas.
  const csp = cspDe(JSON.parse(leer(RAIZ, 'vercel.json')));
  const faltan = new Set(['index.html', 'catalogo/index.html', '404.html'].flatMap((f) => scriptsSinPermiso(leer(DIST, f), csp)));
  if (faltan.size) {
    throw new ErrorDePagina(`la politica de seguridad de vercel.json no tiene estos scripts en linea: ${[...faltan].join(' ')}. Sumalos a script-src (o saca el script en linea)`);
  }
  console.log('  politica de seguridad: los scripts en linea coinciden con vercel.json');
}

principal().catch((e) => {
  console.error(`  prerender frenado: ${e.message}`);
  if (!(e instanceof ErrorDePagina)) console.error(e);
  process.exit(1);
});
