// Pruebas del ciclo SIN PDF (tabla .csv) y del sugeridor de nombres.
// Solo datos inventados: el repo es publico y esto no lleva datos del proveedor.
//   node scripts/qa/lector.test.mjs
import assert from 'node:assert/strict';
import { leerTabla, entero } from '../../src/lib/ciclo/leerTabla.js';
import { sugerirPerfume, limpiarTitulo, distanciaConEstrellas } from '../../src/lib/ciclo/resolverNombre.js';
import { compararCiclo } from '../../src/lib/ciclo/comparar.js';
import { decisionInicial, nuevosParaAplicar } from '../../src/lib/ciclo/panel.js';

let n = 0;
const ok = (nombre, fn) => { fn(); n++; console.log(`  ok  ${nombre}`); };

// ---- leerTabla

const TABLA = [
  '# ciclo=Ciclo 99/26',
  '# hasta=2026-12-31',
  'linea,codigo,nombre_visor,ml,precio_ciclo,precio_lista,estado,type_bagues,pagina',
  'unlock,20280001,UNLOCK ALFA 100 ML,100,"30.000","40.000",leido,,2',
  'unlock,20280002,UNLOCK B*TA 25 ML,25,10000,12000,inferido,,5',
  'unlock,20280003,UNLOCK GAMMA 50 ML,50,20000,,sin_dato,,6',
  'bagues,10280001,CAJA UNO 50ML,,25000,31000,leido,Cualquier Cosa,9',
  'unlock,2028,ROTO,100,1,2,leido,,1',
  'unlock,20280001,REPETIDO,100,30000,40000,leido,,2',
  'bagues,20280009,AJENO,100,30000,40000,leido,,2',
  'unlock,20280004,ESTADO RARO,100,30000,40000,quizas,,2',
].join('\n');

ok('entero entiende $ y puntos de miles', () => {
  assert.equal(entero('$ 24.399'), 24399);
  assert.equal(entero('24399'), 24399);
  assert.equal(entero('24.399,00'), 24399);
  assert.equal(entero(''), null);
  assert.equal(entero('abc'), null);
});

const t = leerTabla(TABLA);

ok('separa por linea y lee el ciclo', () => {
  assert.equal(t.unlock.length, 3);
  assert.equal(t.bagues.length, 1);
  assert.deepEqual(t.ciclo, { nombre: 'Ciclo 99/26', hasta: '2026-12-31' });
});

ok('las filas rotas, repetidas, ajenas o con estado raro van aparte, con el motivo', () => {
  assert.equal(t.ignoradas.length, 4);
  const motivos = t.ignoradas.map((x) => x.motivo).join(' | ');
  assert.match(motivos, /8 cifras/);
  assert.match(motivos, /repetido/);
  assert.match(motivos, /pero el código es de unlock/);
  assert.match(motivos, /estado desconocido/);
});

ok('Bagués: 50 ml por defecto y el Type NO se lee (un Type mal leído podría crear un perfume equivocado)', () => {
  assert.equal(t.bagues[0].ml, 50);
  assert.equal(t.bagues[0].type, undefined);
  assert.equal(t.bagues[0].caja, undefined);
});

ok('inferido pide revisar; sin_dato conserva el anterior', () => {
  const inferido = t.unlock.find((x) => x.codigo === '20280002');
  const sinDato = t.unlock.find((x) => x.codigo === '20280003');
  assert.ok(inferido.revisar);
  assert.equal(inferido.precio_anterior, 12000);
  assert.equal(sinDato.conservarAnterior, true);
  assert.equal(sinDato.precio_anterior, null);
  assert.equal(t.unlock[0].revisar, undefined);
});

ok('sin columna estado: con lista es leído, sin lista es sin_dato', () => {
  const r = leerTabla('codigo;precio\n20280001;1000\n'.replace('1000', '15000'));
  assert.equal(r.unlock[0].conservarAnterior, true);
  const r2 = leerTabla('codigo,precio,lista\n20280001,15000,20000\n');
  assert.equal(r2.unlock[0].precio_anterior, 20000);
  assert.equal(r2.unlock[0].conservarAnterior, undefined);
});

ok('falla claro si no es una tabla del ciclo', () => {
  assert.throws(() => leerTabla(''), /vacía/);
  assert.throws(() => leerTabla('nombre,color\nrojo,azul\n'), /faltan columnas/);
});

// ---- resolverNombre

const filas = [
  { id: 1, nombre: 'Polo Red', inspirado_en: 'Polo Red' },
  { id: 2, nombre: 'Carolina Herrera for Women', inspirado_en: 'Carolina Herrera for Women' },
  { id: 3, nombre: 'Carolina Herrera for Men', inspirado_en: 'Carolina Herrera for Men' },
  { id: 4, nombre: 'Sauvage', inspirado_en: 'Sauvage' },
  { id: 5, nombre: 'Acqua di Giò', inspirado_en: 'Acqua di Giò' },
  { id: 6, nombre: 'Good Girl', inspirado_en: 'Good Girl' },
  { id: 7, nombre: 'Very Good Girl', inspirado_en: 'Very Good Girl' },
];

ok('limpiarTitulo saca "UNLOCK" y los ml', () => {
  assert.equal(limpiarTitulo('UNLOCK P*L* R*D 100 ML'), 'p*l* r*d');
  assert.equal(limpiarTitulo('Acqua di Giò 25ml'), 'acqua di gio');
});

ok('nivel 1: la estrella vale una letra', () => {
  assert.deepEqual(sugerirPerfume('UNLOCK P*L* R*D 100 ML', filas), [{ id: 1, nombre: 'Polo Red', nivel: 1 }]);
  assert.deepEqual(sugerirPerfume('S*UV*G*', filas), [{ id: 4, nombre: 'Sauvage', nivel: 1 }]);
});

ok('nivel 2: mismas palabras en otro orden', () => {
  assert.equal(sugerirPerfume('RED P*L*', filas)[0].id, 1);
  assert.equal(sugerirPerfume('GIRL V*RY G**D', filas)[0].id, 7);
});

ok('nivel 3: palabras del catálogo dentro de un nombre oficial más largo, solo si es único', () => {
  const r = sugerirPerfume('UNLOCK H*RR*RA F*R WOMEN 25 ML', filas);
  assert.deepEqual(r, [{ id: 2, nombre: 'Carolina Herrera for Women', nivel: 3 }]);
  // "for" y "men" no alcanzan para elegir entre dos: no se sugiere nada
  assert.deepEqual(sugerirPerfume('F*R', filas), []);
});

ok('nivel 4: error de tipeo (distancia 2 en nombres largos, 1 en cortos)', () => {
  assert.equal(sugerirPerfume('AQUA DI GIO', filas)[0].id, 5);
  assert.equal(sugerirPerfume('AQUA DI GIO', filas)[0].nivel, 4);
  assert.equal(sugerirPerfume('Polo Rad', filas)[0].id, 1);
});

ok('si no se parece a nada, no inventa', () => {
  assert.deepEqual(sugerirPerfume('Z*Z*Z*', filas), []);
  assert.deepEqual(sugerirPerfume('', filas), []);
  assert.equal(distanciaConEstrellas('a*c', 'abc'), 0);
});

// ---- compararCiclo con la tabla

const base = [
  { id: 10, nombre: 'Alfa', inspirado_en: 'Alfa', activo: true, presentaciones: [{ codigo: '20280001', linea: 'unlock', ml: 100, precio: 25000, precio_anterior: 35000, activo: true }] },
  { id: 11, nombre: 'Beta', inspirado_en: 'Beta', activo: true, presentaciones: [{ codigo: '20280002', linea: 'unlock', ml: 25, precio: 9000, precio_anterior: 11000, activo: true }] },
  { id: 12, nombre: 'Gamma', inspirado_en: 'Gamma', activo: true, presentaciones: [{ codigo: '20280003', linea: 'unlock', ml: 50, precio: 18000, precio_anterior: 26000, activo: true }] },
  { id: 13, nombre: 'Polo Red', inspirado_en: 'Polo Red', activo: true, presentaciones: [{ codigo: '20280050', linea: 'unlock', ml: 25, precio: 9000, precio_anterior: 11000, activo: true }] },
];

ok('sin_dato NO le saca el tachado a un código que lo tenía', () => {
  const r = compararCiclo(base, { unlock: t.unlock, bagues: null });
  const gamma = r.operaciones.find((o) => o.codigo === '20280003');
  assert.deepEqual(gamma, { tipo: 'precio', codigo: '20280003', precio: 20000, precio_anterior: 26000 });
});

ok('inferido que cambia el tachado queda en "para confirmar" y avisa', () => {
  const r = compararCiclo(base, { unlock: t.unlock, bagues: null });
  assert.equal(r.grupos.revisar.length, 1);
  assert.equal(r.grupos.revisar[0].codigo, '20280002');
  assert.equal(r.resumen.revisar, 1);
  assert.ok(r.alertas.some((a) => /no se pudo leer|no se pudieron leer/.test(a)));
});

ok('lo leído que cambia el precio entra normal', () => {
  const r = compararCiclo(base, { unlock: t.unlock, bagues: null });
  const alfa = r.operaciones.find((o) => o.codigo === '20280001');
  assert.deepEqual(alfa, { tipo: 'precio', codigo: '20280001', precio: 30000, precio_anterior: 40000 });
});

ok('un código nuevo de Unlock trae sugerencias pero arranca "pendiente" (nunca aplica solo)', () => {
  const nuevo = leerTabla('codigo,titulo,ml,precio,lista\n20280099,UNLOCK P*L* R*D 100 ML,100,25000,38000\n');
  const r = compararCiclo(base, { unlock: nuevo.unlock, bagues: null });
  assert.equal(r.grupos.nuevos.length, 1);
  assert.deepEqual(r.grupos.nuevos[0].sugeridos.map((x) => x.id), [13]);
  const d = decisionInicial(r.grupos.nuevos[0]);
  assert.equal(d.modo, 'pendiente');
  const { lista, faltan } = nuevosParaAplicar(r.grupos.nuevos, {});
  assert.equal(lista.length, 0);
  assert.equal(faltan.length, 1);
  // con un toque en la sugerencia, sí
  const con = nuevosParaAplicar(r.grupos.nuevos, { 20280099: { modo: 'sumar', id: 13 } });
  assert.equal(con.lista.length, 1);
  assert.equal(con.lista[0].sumar_a, 13);
});

ok('lo que falta en la tabla se desactiva, no se borra (el catálogo rota)', () => {
  const r = compararCiclo(base, { unlock: t.unlock, bagues: null });
  const sale = r.grupos.desactivar.map((x) => x.codigo);
  assert.deepEqual(sale, ['20280050']);
  assert.ok(r.operaciones.every((o) => o.tipo !== 'borrar'));
});

console.log(`\n${n} pruebas, todas pasan.`);
