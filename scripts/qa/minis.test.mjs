// Pruebas del cambio de precio de las minis (lib/minis.js).
// Solo datos inventados: el repo es publico.
//   node scripts/qa/minis.test.mjs
import assert from 'node:assert/strict';
import { aEntero, minisDe, resumenPrecios, armarCambio } from '../../src/lib/minis.js';

let n = 0;
const ok = (nombre, fn) => { fn(); n++; console.log(`  ok  ${nombre}`); };

const BASE = [
  { id: 'a', nombre: 'Alfa', activo: true, presentaciones: [
    { ml: 100, linea: 'unlock', codigo: '20280001', precio: 40000, precio_anterior: 50000, activo: true },
    { ml: 25, linea: 'unlock', codigo: '20280002', precio: 20000, precio_anterior: 22000, activo: true },
  ] },
  { id: 'b', nombre: 'Beta', activo: true, presentaciones: [
    { ml: 30, linea: 'unlock', codigo: '20280003', precio: 20000, precio_anterior: 22000, activo: true },
    { ml: 20, linea: 'unlock', codigo: '20280004', precio: 18000, precio_anterior: 21000, activo: false },
  ] },
  { id: 'c', nombre: 'Caja', activo: true, presentaciones: [
    { ml: 50, linea: 'bagues', codigo: '10280001', precio: 24000, precio_anterior: 30000, activo: true },
  ] },
  { id: 'd', nombre: 'Delta', activo: false, presentaciones: [
    { ml: 25, linea: 'unlock', codigo: '20280005', precio: 20500, precio_anterior: null, activo: true },
  ] },
  { id: 'e', nombre: 'Sin codigo', activo: true, presentaciones: [{ ml: 25, precio: 9000, activo: true }] },
];

ok('aEntero entiende $, puntos y espacios', () => {
  assert.equal(aEntero('$ 21.299'), 21299);
  assert.equal(aEntero('21299'), 21299);
  assert.equal(aEntero(''), null);
  assert.equal(aEntero('abc'), null);
  assert.equal(aEntero(19999), 19999);
});

ok('minisDe: menos de 50 ml, con codigo, solo activas por defecto', () => {
  const m = minisDe(BASE);
  assert.deepEqual(m.map((x) => x.codigo), ['20280002', '20280003']);
  assert.ok(m.every((x) => x.ml < 50));
});

ok('minisDe con pausadas suma el tamaño pausado y el perfume pausado', () => {
  const m = minisDe(BASE, { conPausadas: true });
  assert.deepEqual(m.map((x) => x.codigo).sort(), ['20280002', '20280003', '20280004', '20280005']);
  assert.equal(m.find((x) => x.codigo === '20280005').activa, false);
});

ok('las cajas de 50 ml y lo que no tiene codigo nunca entran', () => {
  const m = minisDe(BASE, { conPausadas: true });
  assert.ok(!m.some((x) => x.codigo === '10280001'));
  assert.ok(!m.some((x) => x.nombre === 'Sin codigo'));
});

ok('resumenPrecios: el mas repetido primero', () => {
  assert.deepEqual(resumenPrecios(minisDe(BASE, { conPausadas: true })), [
    { precio: 20000, cantidad: 2 }, { precio: 20500, cantidad: 1 }, { precio: 18000, cantidad: 1 },
  ]);
});

const MINIS = minisDe(BASE);
const TODOS = new Set(MINIS.map((x) => x.codigo));

ok('mantener el tachado de cada una: manda el que ya tenia, nunca null', () => {
  const r = armarCambio(MINIS, TODOS, '21.000', { modo: 'mantener' });
  assert.deepEqual(r.errores, []);
  assert.deepEqual(r.operaciones, [
    { tipo: 'precio', codigo: '20280002', precio: 21000, precio_anterior: 22000 },
    { tipo: 'precio', codigo: '20280003', precio: 21000, precio_anterior: 22000 },
  ]);
});

ok('un tachado igual para todas', () => {
  const r = armarCambio(MINIS, TODOS, 21000, { modo: 'igual', valor: '$ 24.000' });
  assert.ok(r.operaciones.every((o) => o.precio_anterior === 24000));
});

ok('sacar el tachado manda null a proposito', () => {
  const r = armarCambio(MINIS, TODOS, 21000, { modo: 'sacar' });
  assert.ok(r.operaciones.every((o) => o.precio_anterior === null));
});

ok('una mini destildada no se toca', () => {
  const r = armarCambio(MINIS, new Set(['20280002']), 21000);
  assert.deepEqual(r.operaciones.map((o) => o.codigo), ['20280002']);
  assert.equal(r.filas.find((f) => f.codigo === '20280003').cambia, false);
});

ok('frena: tachado que quedaria menor o igual al precio', () => {
  const r = armarCambio(MINIS, TODOS, 23000, { modo: 'mantener' });
  assert.equal(r.errores.length, 1);
  assert.match(r.errores[0], /tachado/);
  const r2 = armarCambio(MINIS, TODOS, 21000, { modo: 'igual', valor: 21000 });
  assert.match(r2.errores[0], /mayor que el precio nuevo/);
});

ok('frena: precio vacio o fuera de rango', () => {
  assert.match(armarCambio(MINIS, TODOS, '').errores[0], /Escribí el precio/);
  assert.match(armarCambio(MINIS, TODOS, 500).errores[0], /entre/);
  assert.equal(armarCambio(MINIS, TODOS, 500).operaciones.length, 0);
});

ok('frena: valores que no cambian nada', () => {
  const r = armarCambio(MINIS, TODOS, 20000, { modo: 'mantener' });
  assert.equal(r.operaciones.length, 0);
  assert.match(r.errores[0], /no cambia nada/);
});

ok('un cambio de mas de la mitad pide confirmar', () => {
  const r = armarCambio(MINIS, TODOS, 9000, { modo: 'sacar' });
  assert.equal(r.saltos.length, 2);
  assert.equal(armarCambio(MINIS, TODOS, 21000).saltos.length, 0);
});

ok('las operaciones tienen la forma que valida aplicar_ciclo()', () => {
  const r = armarCambio(MINIS, TODOS, 21000);
  for (const o of r.operaciones) {
    assert.equal(o.tipo, 'precio');
    assert.match(o.codigo, /^(1028|2028)\d{4}$/);
    assert.ok(Number.isInteger(o.precio) && o.precio >= 1000 && o.precio <= 500000);
    assert.ok(o.precio_anterior === null || o.precio_anterior > o.precio);
  }
});

console.log(`\n${n} pruebas de minis, todas pasan.`);
