// Revisa las paginas que dejo el build en dist/ (correr despues de npm run build).
//   node scripts/qa/paginas.test.mjs
// Lo que no puede faltar en cada una para que la tienda ande y los buscadores
// la lean bien. Si algo falta, sale con codigo 1 (frena las pruebas de GitHub).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve(import.meta.dirname, '../../dist');
const leer = (f) => fs.readFileSync(path.join(DIST, f), 'utf8');
const SITIO = 'https://baguesfraganciaswolf.vercel.app';
let n = 0;
const ok = (nombre, fn) => { fn(); n++; console.log(`  ok  ${nombre}`); };

const portada = leer('index.html');
const catalogo = leer('catalogo/index.html');
const p404 = leer('404.html');

for (const [nombre, html] of [['portada', portada], ['catalogo', catalogo], ['404', p404]]) {
  ok(`${nombre}: marcado dibujado, CSS embebido y el codigo de la app`, () => {
    assert.match(html, /<div id="root"[^>]*>\s*<[a-z]/, 'el #root trae marcado');
    assert.ok(!/<link rel="stylesheet"[^>]*\/assets\//.test(html), 'la hoja principal va embebida, no pedida');
    assert.match(html, /<script type="module" crossorigin src="\/assets\/index-[\w-]+\.js"/);
    assert.ok(html.length < 160 * 1024, `pesa ${Math.round(html.length / 1024)} kB, mas de 160 sin comprimir`);
    // Los archivos que nombra existen.
    for (const [, f] of html.matchAll(/(?:src|href)="\/assets\/([\w.-]+)"/g)) {
      assert.ok(fs.existsSync(path.join(DIST, 'assets', f)), `falta /assets/${f}`);
    }
  });
}
ok('portada: canonical a la raiz, precarga del hero y letra del titulo', () => {
  assert.ok(portada.includes(`<link rel="canonical" href="${SITIO}/" />`));
  assert.match(portada, /<link rel="preload" href="\/hero\//);
  assert.ok(portada.includes("font-family:'Boska Primera'"));
});
ok('portada: si trae precio, es un precio con forma de precio', () => {
  const m = portada.match(/data-precio="([^"]*)"/);
  if (m) assert.match(m[1], /^\$(&#160;| )\d{1,3}(\.\d{3})+$/, `precio raro: ${m[1]}`);
});
ok('catalogo: su ruta, canonical y titulo propios, sin hero y con su chunk precargado', () => {
  assert.ok(catalogo.includes('data-ruta="/catalogo"'));
  assert.ok(catalogo.includes(`<link rel="canonical" href="${SITIO}/catalogo" />`));
  assert.ok(catalogo.includes('<title>Catálogo'));
  assert.ok(!/href="\/hero\//.test(catalogo));
  assert.match(catalogo, /<link rel="modulepreload" crossorigin href="\/assets\/CatalogoScreen-[\w-]+\.js"/);
  assert.ok(catalogo.includes('aria-busy'), 'trae las tarjetas de espera');
});
ok('404: noindex y sin precargas', () => {
  assert.ok(p404.includes('<meta name="robots" content="noindex" />'));
  assert.ok(!p404.includes('rel="preload"'));
});

console.log(`\n${n} revisiones de las paginas armadas, todas pasan.`);
