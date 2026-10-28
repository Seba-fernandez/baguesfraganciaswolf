// Pruebas del boton "Actualizar catalogo" (src/lib/ciclo/), con los catalogos
// reales del ciclo 10/2026:
//   - unlock-c10.json: los textos con posicion del PDF de Unlock, sacados con
//     pdf.js (la misma biblioteca que usa el panel).
//   - bagues-c10.txt: el texto real del PDF de Bagues por pagina (el archivo
//     pesa 29 MB; ver la nota en docs/CICLO.md).
//   - base-c10.json: el catalogo cargado en la base con ese ciclo.
// Leer el ciclo 10 tiene que dar exactamente lo que ya esta cargado.
//   node scripts/qa/catalogo.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { leerUnlock } from '../../src/lib/ciclo/leerUnlock.js';
import { leerBagues, cajaAntesDeType } from '../../src/lib/ciclo/leerBagues.js';
import { compararCiclo, cicloDelPdf, parecido, problemaDeLeido } from '../../src/lib/ciclo/comparar.js';
import { precioDeTexto } from '../../src/lib/ciclo/pdf.js';
import { lineaDePaginas, decisionInicial, nuevosParaAplicar, fotosQueFaltan, lugarDeCaja, FOTO } from '../../src/lib/ciclo/panel.js';

const F = path.join(import.meta.dirname, 'fixtures');
const unlockPaginas = JSON.parse(fs.readFileSync(path.join(F, 'unlock-c10.json'), 'utf8'));
const baguesPaginas = fs.readFileSync(path.join(F, 'bagues-c10.txt'), 'utf8')
  .split(/^@@pagina /m).slice(1)
  .map((b) => { const [n, ...l] = b.split('\n'); return { n: Number(n), items: l.filter((x) => x.trim() && !x.startsWith('#')).map((s) => ({ s })) }; });
const base = JSON.parse(fs.readFileSync(path.join(F, 'base-c10.json'), 'utf8'));
const enBase = new Map(base.flatMap((p) => p.presentaciones.map((x) => [x.codigo, { ...x, producto: p }])));
const copia = (x) => JSON.parse(JSON.stringify(x));

let n = 0;
const ok = (nombre, fn) => { fn(); n++; console.log(`  ok  ${nombre}`); };

const unlock = leerUnlock(unlockPaginas);
const bagues = leerBagues(baguesPaginas);

ok('precioDeTexto', () => {
  assert.equal(precioDeTexto('$51.599'), 51599);
  assert.equal(precioDeTexto('$ 53.699'), 53699);
  assert.equal(precioDeTexto('PRECIO SIN IMPUESTOS $19.214'), 19214);
  assert.equal(precioDeTexto('20281050'), null);
});

ok('Unlock: los 66 tamaños del ciclo, con codigo, ml y precios iguales a la base', () => {
  assert.equal(unlock.length, 66);
  for (const p of unlock) {
    const b = enBase.get(p.codigo);
    assert.ok(b, `${p.codigo} no esta en la base`);
    assert.equal(p.ml, b.ml, `${p.codigo} ml`);
    assert.equal(p.precio, b.precio, `${p.codigo} precio`);
    assert.equal(p.precio_anterior ?? null, b.precio_anterior ?? null, `${p.codigo} precio de lista`);
    assert.equal(problemaDeLeido(p, 'unlock'), null, `${p.codigo} valido`);
  }
});
ok('Unlock: los minis toman el precio unico de "FRAGANCIAS MINI"', () => {
  const minis = unlock.filter((p) => p.ml <= 30);
  assert.ok(minis.length >= 20);
  assert.ok(minis.every((p) => p.precio === 23249 && p.precio_anterior === null));
});
ok('Bagues: los 82 perfumes del ciclo, con su precio de bloque igual a la base', () => {
  assert.equal(bagues.length, 82);
  for (const p of bagues) {
    const b = enBase.get(p.codigo);
    assert.ok(b, `${p.codigo} no esta en la base`);
    assert.equal(p.precio, b.precio, `${p.codigo} precio`);
    assert.equal(p.precio_anterior, b.precio_anterior, `${p.codigo} precio de lista`);
  }
});
ok('Bagues: nombre de caja y Type (los mezclados por columnas quedan vacios, con aviso)', () => {
  const por = new Map(bagues.map((p) => [p.codigo, p]));
  assert.deepEqual([por.get('10282038').caja, por.get('10282038').type], ['Arizona', 'Sauvage']);
  assert.deepEqual([por.get('10282068').caja, por.get('10282068').type], ['Manhattan Black Red', '212 Vip Black Red']);
  assert.deepEqual([por.get('10281126').caja, por.get('10281126').type], ['Granada', 'La Bomba'], 'con "Eau de parfum femenino 50 ml" delante');
  assert.deepEqual([por.get('10281135').caja, por.get('10281135').type], ['Niza', 'Irresistible'], 'lanzamiento');
  assert.equal(por.get('10282107').type, 'Erba Pura', 'sin el "100 ml" de la crema que se mete en el medio');
  for (const c of ['10282050', '10282035', '10282065']) {
    assert.equal(por.get(c).caja, '');
    assert.match(por.get(c).avisos.join(), /mezclado/);
  }
  assert.deepEqual(por.get('10281135').piramide, { familia: 'Floral amaderada almizclada', salida: 'Pera, Semillas de Ambreta', corazon: 'Rosa, Iris', fondo: 'Cedro, Almizcles blancos' }, 'el lanzamiento trae su ficha');
  assert.equal(por.get('10282038').piramide, null);
  assert.equal(por.get('10282040').genero, 'unisex');
  assert.equal(por.get('10281126').genero, 'femenino');
  assert.equal(por.get('10282038').familia, 'Fougère');
});
ok('cajaAntesDeType corta en los titulares en mayusculas', () => {
  assert.equal(cajaAntesDeType('EL DETALLE QUE DEFINE TU ESTILO Singapur'), 'Singapur');
  assert.equal(cajaAntesDeType('$18.594 Las Vegas'), 'Las Vegas');
  assert.equal(cajaAntesDeType('DESAFIÁ LAS REGLAS DEL JUEGO York Why not?'), 'York Why not?');
});
ok('El ciclo del PDF de Unlock', () => {
  assert.deepEqual(cicloDelPdf(unlockPaginas), { nombre: 'Ciclo 10/26', hasta: '2026-10-16' });
  assert.deepEqual(cicloDelPdf([{ items: [{ s: 'CICLO 1/27' }, { s: '20 DIC – 15 ENE' }] }]), { nombre: 'Ciclo 1/27', hasta: '2028-01-15' });
});
ok('parecido tolera las abreviaturas de Bagues', () => {
  assert.ok(parecido('KZO Masc', 'Kenzo Homme') >= 0.99);
  assert.ok(parecido('La vida es bella', 'La Vie Est Belle') >= 0.99);
  assert.ok(parecido('Phantom', 'Sauvage') === 0);
});

ok('Ciclo 10 contra la base del ciclo 10: nada que cambiar ni que bloquear', () => {
  const r = compararCiclo(base, { unlock, bagues });
  assert.deepEqual(r.bloqueos, []);
  assert.equal(r.resumen.precios, 0);
  assert.equal(r.resumen.desactivar, 0);
  assert.equal(r.resumen.reactivar, 0);
  assert.equal(r.resumen.nuevos, 0);
  assert.equal(r.resumen.descartados, 0);
  assert.equal(r.resumen.types, 0, 'los Types abreviados (KZO, YSL, La vida es bella) no se marcan');
  assert.deepEqual(r.grupos.cajas.map((c) => c.despues), ['York Why not?']);
  assert.ok(r.operaciones.every((o) => ['type', 'caja'].includes(o.tipo)));
});
ok('Un precio que cambia, un perfume que sale y uno que vuelve', () => {
  const u = copia(unlock);
  u.find((p) => p.codigo === '20282011').precio = 35999;          // Sauvage sube
  const sinKenzo = u.filter((p) => p.codigo !== '20281050');       // Kenzo Amour sale
  sinKenzo.push({ codigo: '20282067', ml: 25, precio: 23249, precio_anterior: null, titulo: 'LE MALE', pagina: 9, avisos: [] }); // Le Male mini (inactivo) vuelve
  const r = compararCiclo(base, { unlock: sinKenzo, bagues: null });
  assert.equal(r.resumen.precios, 2, 'Sauvage y Le Male (vuelve con precio nuevo)');
  assert.deepEqual(r.grupos.desactivar.map((d) => d.codigo), ['20281050']);
  assert.deepEqual(r.grupos.reactivar.map((d) => d.codigo), ['20282067']);
  assert.ok(r.operaciones.some((o) => o.tipo === 'desactivar' && o.codigo === '20281050'));
  assert.ok(r.operaciones.some((o) => o.tipo === 'activar' && o.codigo === '20282067'));
  assert.equal(r.resumen.descartados, 0);
});
ok('Solo se toca la linea del PDF que se subio', () => {
  const r = compararCiclo(base, { unlock: unlock.slice(0, 60), bagues: null });
  assert.ok(r.grupos.desactivar.every((d) => d.linea === 'unlock'));
});
ok('Codigo nuevo: caja de Bagues de un perfume que existe se suma; Unlock pide elegir', () => {
  const b = [...copia(bagues), { codigo: '10282999', caja: 'Lima', type: 'Sauvage', familia: 'Fougère', genero: 'masculino', ml: 50, precio: 22499, precio_anterior: 29999, pagina: 40, avisos: [] }];
  const u = [...copia(unlock), { codigo: '20289999', ml: 100, precio: 31000, precio_anterior: 45000, titulo: 'NAAVO', pagina: 3, avisos: [] }];
  const r = compararCiclo(base, { unlock: u, bagues: b });
  const nb = r.grupos.nuevos.find((x) => x.codigo === '10282999');
  assert.equal(nb.sumarA?.nombre, 'Sauvage');
  const nu = r.grupos.nuevos.find((x) => x.codigo === '20289999');
  assert.equal(nu.sumarA, null);
  assert.ok(r.alertas.some((a) => a.includes('20289999')));
});
ok('Frena si el PDF desactivaria mas de un tercio de la linea', () => {
  const r = compararCiclo(base, { unlock: unlock.slice(0, 20), bagues: null });
  assert.ok(r.bloqueos.some((b) => b.includes('más de un tercio')));
  assert.deepEqual(r.forzables, r.bloqueos, 'ese bloqueo se puede pasar a conciencia');
});
ok('Frena con un PDF vacio o de la otra linea', () => {
  assert.ok(compararCiclo(base, { unlock: [], bagues: null }).bloqueos.some((b) => b.includes('ningún perfume')));
  const otra = compararCiclo(base, { unlock: bagues, bagues: null });
  assert.ok(otra.bloqueos.some((b) => b.includes('otra línea')));
  assert.deepEqual(otra.forzables, [], 'el PDF equivocado no se fuerza nunca');
});
ok('Descarta lo que no tiene sentido (sin precio, lista menor, precio fuera de rango) y lo dice', () => {
  const u = copia(unlock);
  u[0].precio = null;
  u[1].precio_anterior = 1000;
  u[2].precio = 999999;
  const r = compararCiclo(base, { unlock: u, bagues: null });
  assert.equal(r.resumen.descartados, 3);
  assert.ok(!r.operaciones.some((o) => [u[0], u[1], u[2]].some((x) => x.codigo === o.codigo && o.tipo === 'precio')));
  assert.ok(!r.grupos.desactivar.some((d) => [u[0], u[1], u[2]].some((x) => x.codigo === d.codigo)), 'un descartado no se desactiva');
  assert.equal(r.alertas.filter((a) => /no se usa/.test(a)).length, 3);
});
ok('Avisa un salto de precio raro', () => {
  const u = copia(unlock);
  u.find((p) => p.codigo === '20282011').precio = 12000;
  const r = compararCiclo(base, { unlock: u, bagues: null });
  assert.ok(r.grupos.precios.find((p) => p.codigo === '20282011').sospechoso);
});

// --- Lo que decide la pantalla del panel (src/lib/ciclo/panel.js) ---
ok('La linea de cada PDF sale de sus codigos', () => {
  assert.equal(lineaDePaginas(unlockPaginas).linea, 'unlock');
  assert.equal(lineaDePaginas(baguesPaginas).linea, 'bagues');
  assert.equal(lineaDePaginas([{ items: [{ s: 'una factura 12345678' }] }]).linea, null);
});
ok('Codigos nuevos: arranque, validacion y lo que recibe la base', () => {
  const b = [...copia(bagues), { codigo: '10282999', caja: 'Lima', type: 'Sauvage', familia: 'Fougère', genero: 'masculino', ml: 50, precio: 22499, precio_anterior: 29999, pagina: 40, piramide: null, avisos: [] },
    { codigo: '10282998', caja: 'Bruma', type: 'Aura Nueva', familia: 'FLORAL', genero: 'femenino', ml: 50, precio: 22499, precio_anterior: 29999, pagina: 41, piramide: { familia: 'Floral', salida: 'Pera', corazon: 'Rosa', fondo: 'Cedro' }, avisos: [] }];
  const u = [...copia(unlock), { codigo: '20289999', ml: 100, precio: 31000, precio_anterior: 45000, titulo: 'NAAVO', pagina: 3, avisos: [] }];
  const r = compararCiclo(base, { unlock: u, bagues: b });
  const de = (c) => r.grupos.nuevos.find((x) => x.codigo === c);
  assert.equal(decisionInicial(de('10282999')).modo, 'sumar');
  const aura = decisionInicial(de('10282998'));
  assert.deepEqual([aura.modo, aura.nombre, aura.genero, aura.nota_corazon], ['nuevo', 'Aura Nueva', 'femenino', 'Rosa']);
  assert.equal(decisionInicial(de('20289999')).modo, 'pendiente', 'Unlock no se adivina');

  // Sin decidir el de Unlock, no se aplica.
  let x = nuevosParaAplicar(r.grupos.nuevos, {});
  assert.deepEqual(x.faltan.map((f) => f.codigo), ['20289999']);
  // Dejarlo afuera, o sumarlo a un perfume, destraba.
  x = nuevosParaAplicar(r.grupos.nuevos, { 20289999: { modo: 'omitir' } });
  assert.deepEqual(x.faltan, []);
  assert.equal(x.lista.length, 2);
  const lima = x.lista.find((l) => l.codigo === '10282999');
  assert.deepEqual([lima.sumar_a, lima.nombre_proveedor, lima.type, lima.ml, lima.precio], [de('10282999').sumarA.id, 'Lima', 'Sauvage', 50, 22499]);
  assert.equal(x.lista.find((l) => l.codigo === '10282998').aroma.inspirado_en, 'Aura Nueva');
  x = nuevosParaAplicar(r.grupos.nuevos, { 20289999: { modo: 'nuevo', nombre: 'N', genero: 'unisex' } });
  assert.match(x.faltan[0].motivo, /nombre/);
  x = nuevosParaAplicar(r.grupos.nuevos, { 20289999: { modo: 'nuevo', nombre: 'Naxos', genero: 'otro' } });
  assert.match(x.faltan[0].motivo, /para quién/);
  x = nuevosParaAplicar(r.grupos.nuevos, { 20289999: { modo: 'nuevo', nombre: 'Naxos', genero: 'unisex' } });
  assert.equal(x.lista.find((l) => l.codigo === '20289999').nombre_proveedor, 'Naxos');
});
ok('Fotos que faltan: solo activos sin foto subida ni del pipeline', () => {
  const filas = [
    { id: 1, activo: true, imagen_url: null, slug: 'a', presentaciones: [{ codigo: '10281111', linea: 'bagues', nombre_proveedor: 'Manhattan', activo: true }] },
    { id: 2, activo: true, imagen_url: 'https://x/y.webp', slug: 'b', presentaciones: [] },
    { id: 3, activo: false, imagen_url: null, slug: 'c', presentaciones: [] },
    { id: 4, activo: true, imagen_url: null, slug: 'd', presentaciones: [{ codigo: '20281111', linea: 'unlock', activo: true }] },
    { id: 5, activo: true, imagen_url: null, slug: 'e', presentaciones: [] },
  ];
  const r = fotosQueFaltan(filas, (p) => (p.slug === 'e' ? '/perfumes/e.webp' : null));
  assert.deepEqual(r.map((f) => [f.producto.id, f.linea, f.caja]), [[1, 'bagues', 'Manhattan'], [4, 'unlock', '']]);
});
ok('La caja en la pared: mismas medidas que el pipeline de Python', () => {
  const alta = lugarDeCaja(500, 1000);            // caja angosta: manda el alto
  assert.equal(Math.round(alta.alto), 744);
  assert.equal(Math.round(alta.y + alta.alto), FOTO.base);
  assert.equal(Math.round(alta.x * 2 + alta.ancho), 900, 'centrada');
  const ancha = lugarDeCaja(1000, 500);           // caja ancha: manda el ancho
  assert.equal(Math.round(ancha.ancho), 702);
  assert.throws(() => lugarDeCaja(0, 10));
});

console.log(`\n${n} pruebas del catalogo, todas pasan.`);
