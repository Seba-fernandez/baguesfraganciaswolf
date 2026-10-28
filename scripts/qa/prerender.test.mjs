// Pruebas de las piezas del prerender (scripts/prerender/), sin correr el build.
//   node scripts/qa/prerender.test.mjs
import assert from 'node:assert/strict';
import { ErrorDePagina, reemplazarUna, sacarPrecargas, cambiarTitulo, paraAtributo } from '../prerender/html.mjs';
import { ponerPrecio, LUGAR_PRECIO } from '../prerender/precio.mjs';
import { textoDelTitulo } from '../prerender/letra.mjs';
import { scriptsSinPermiso, cspDe } from '../prerender/csp.mjs';
import { armarPortada, armarCatalogo, armar404, dependenciasDelChunk, ANCLA, SITIO } from '../prerender/paginas.mjs';
import { createHash } from 'node:crypto';

let n = 0;
const ok = (nombre, fn) => { fn(); n++; console.log(`  ok  ${nombre}`); };

ok('reemplazarUna cambia una sola vez', () => {
  assert.equal(reemplazarUna('a-b-c', '-b-', '+', 'x'), 'a+c');
});
ok('reemplazarUna frena si no encuentra o si hay dos', () => {
  assert.throws(() => reemplazarUna('abc', 'z', '', 'la z'), ErrorDePagina);
  assert.throws(() => reemplazarUna('aa', 'a', '', 'la a'), /aparece 2/);
  assert.throws(() => reemplazarUna('<title>a</title><title>b</title>', /<title>[^<]*<\/title>/, '', 't'), /aparece 2/);
});
ok('reemplazarUna no interpreta "$&" (el error del precio del 23/10)', () => {
  assert.equal(reemplazarUna('x LUGAR y', 'LUGAR', '$&#160;1', 'p'), 'x $&#160;1 y');
});
ok('ponerPrecio escapa el espacio duro y las comillas', () => {
  const html = `<span ${LUGAR_PRECIO}></span>`;
  assert.equal(ponerPrecio(html, '$\u00a016.499'), `<span ${LUGAR_PRECIO} data-precio="$&#160;16.499"></span>`);
  assert.equal(ponerPrecio(html, null), html, 'sin precio no toca nada');
  assert.equal(paraAtributo('a"b<c&'), 'a&quot;b&lt;c&amp;');
});
ok('ponerPrecio frena si el lugar del precio no esta', () => {
  assert.throws(() => ponerPrecio('<p></p>', '$ 1'), ErrorDePagina);
});
ok('sacarPrecargas saca solo las del prefijo pedido', () => {
  const h = '<head>\n  <link rel="preload" href="/hero/a.avif" as="image" />\n  <link rel="preload" href="/fonts/b.woff2" as="font" />\n</head>';
  const sin = sacarPrecargas(h, ['/hero/']);
  assert.ok(!sin.includes('/hero/') && sin.includes('/fonts/'));
  assert.ok(!sacarPrecargas(h, ['/hero/', '/fonts/']).includes('preload'));
});
ok('cambiarTitulo', () => {
  assert.equal(cambiarTitulo('<title>Viejo</title>', 'Nuevo'), '<title>Nuevo</title>');
});
ok('textoDelTitulo junta los h1 sin etiquetas', () => {
  assert.equal(textoDelTitulo('<h1 class="t">Cada <em>perfume</em>,</h1><p>x</p>'), 'Cada perfume,');
  assert.equal(textoDelTitulo('<p>sin titulo</p>'), '');
});
ok('scriptsSinPermiso: pasa con el hash en la CSP, avisa sin el', () => {
  const cuerpo = 'console.log(1)';
  const hash = `'sha256-${createHash('sha256').update(cuerpo).digest('base64')}'`;
  const html = `<script>${cuerpo}</script><script src="/a.js"></script><script type="application/ld+json">{}</script>`;
  assert.deepEqual(scriptsSinPermiso(html, `script-src 'self' ${hash}`), []);
  assert.deepEqual(scriptsSinPermiso(html, "script-src 'self'"), [hash]);
  assert.equal(cspDe({ headers: [{ headers: [{ key: 'Content-Security-Policy', value: 'x' }] }] }), 'x');
});
ok('dependenciasDelChunk: los imports relativos, sin el principal', () => {
  assert.deepEqual(dependenciasDelChunk('import a from"./familias-AB12.js";import b from "./index-ZZ.js";import c from"./familias-AB12.js"'), ['familias-AB12.js']);
});

// Una plantilla minima como la de Vite.
const PLANTILLA = `<!doctype html><html><head><title>Bagues</title>
  <link rel="canonical" href="${SITIO}/" />
  <meta property="og:url" content="${SITIO}/" />
  <link rel="preload" href="/hero/c.avif" as="image" />
  <link rel="preload" href="/fonts/m.woff2" as="font" />
  <link rel="stylesheet" crossorigin href="/assets/index-AB.css">
</head><body>${ANCLA}</body></html>`;
const MARCADO_PORTADA = `<h1>Cada perfume</h1><span ${LUGAR_PRECIO}></span>${'x'.repeat(600)}`;

ok('armarPortada: marcado, precio, letra y CSS embebido', () => {
  const h = armarPortada({ plantilla: PLANTILLA, marcado: MARCADO_PORTADA, css: '.a{}', estiloLetra: '<style>@font-face{}</style>', precio: '$\u00a01' });
  assert.ok(h.includes('<div id="root"><h1>Cada perfume</h1>'));
  assert.ok(h.includes('data-precio="$&#160;1"'));
  assert.ok(h.includes('<style>.a{}</style>') && !h.includes('rel="stylesheet"'));
  assert.ok(h.indexOf('@font-face') < h.indexOf('</head>'));
  assert.ok(h.includes('/hero/c.avif'), 'la portada conserva la precarga del hero');
});
ok('armarPortada frena con marcado vacio', () => {
  assert.throws(() => armarPortada({ plantilla: PLANTILLA, marcado: '<p></p>', css: '', estiloLetra: '', precio: null }), /vacia/);
});
ok('armarCatalogo: su ruta, su canonical, sin precarga del hero y con sus chunks', () => {
  const h = armarCatalogo({ plantilla: PLANTILLA, marcado: '<div aria-busy="true"></div>', css: '.c{}', chunks: ['CatalogoScreen-X.js'] });
  assert.ok(h.includes('data-ruta="/catalogo"'));
  assert.ok(h.includes(`href="${SITIO}/catalogo"`) && h.includes(`content="${SITIO}/catalogo"`));
  assert.ok(!h.includes('/hero/') && h.includes('/fonts/m.woff2'));
  assert.ok(h.includes('rel="modulepreload" crossorigin href="/assets/CatalogoScreen-X.js"'));
  assert.ok(h.includes('<title>Catálogo · Bagues Grupo Wolf</title>'));
});
ok('armarCatalogo frena sin tarjetas de espera', () => {
  assert.throws(() => armarCatalogo({ plantilla: PLANTILLA, marcado: '<div></div>', css: '', chunks: [] }), /espera/);
});
ok('armar404: noindex, sin precargas y con su titulo', () => {
  const h = armar404({ plantilla: PLANTILLA, marcado: '<h1 id="no-encontrada-titulo">No</h1>', css: '' });
  assert.ok(h.includes('noindex') && !h.includes('rel="preload"') && h.includes('data-ruta="404"'));
  assert.ok(h.includes('<title>Página no encontrada · Bagues Grupo Wolf</title>'));
});

console.log(`\n${n} pruebas del prerender, todas pasan.`);
