// Pruebas del tope por linea y del aviso por cantidad (src/lib/mayorista.js).
//   node scripts/qa/tope.test.mjs
import assert from 'node:assert/strict';
import { recortarCantidad, disponibleDe, nivelAviso, avisoCerrado, cerrarAviso } from '../../src/lib/mayorista.js';
import { CANTIDAD_MAXIMA, MAYORISTA_DESDE } from '../../src/config/ajustes.js';

let n = 0;
const ok = (nombre, fn) => { fn(); n++; console.log(`  ok  ${nombre}`); };

ok('el tope es 20: lo que la base acepta sin convertirlo en 1', () => {
  assert.equal(CANTIDAD_MAXIMA, 20);
  assert.equal(MAYORISTA_DESDE, 6);
});
ok('recortarCantidad: nunca pasa de 20, nunca baja de 0, ignora basura', () => {
  assert.equal(recortarCantidad(5), 5);
  assert.equal(recortarCantidad(20), 20);
  assert.equal(recortarCantidad(21), 20);
  assert.equal(recortarCantidad(999), 20);
  assert.equal(recortarCantidad(-3), 0);
  assert.equal(recortarCantidad('x'), 0);
  assert.equal(recortarCantidad(7.9), 7);
});
ok('sumar al carrito recorta: 18 + 5 queda en 20', () => {
  assert.equal(recortarCantidad(18 + 5), 20);
});
ok('disponibleDe: lo que falta para el tope', () => {
  assert.equal(disponibleDe(0), 20);
  assert.equal(disponibleDe(18), 2);
  assert.equal(disponibleDe(20), 0);
  assert.equal(disponibleDe(35), 0);
});
ok('nivelAviso: nada hasta 5, mayorista de 6 a 19, tope en 20', () => {
  assert.equal(nivelAviso(1), null);
  assert.equal(nivelAviso(5), null);
  assert.equal(nivelAviso(6), 'mayorista');
  assert.equal(nivelAviso(19), 'mayorista');
  assert.equal(nivelAviso(20), 'tope');
});
ok('cerrar el aviso de mayorista no esconde el de tope (sin sessionStorage tampoco rompe)', () => {
  assert.equal(avisoCerrado('a::50', 'mayorista'), false);
  cerrarAviso('a::50', 'mayorista'); // en node no hay sessionStorage: no tira
  const mem = new Map();
  globalThis.sessionStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  cerrarAviso('a::50', 'mayorista');
  assert.equal(avisoCerrado('a::50', 'mayorista'), true);
  assert.equal(avisoCerrado('a::50', 'tope'), false);
  assert.equal(avisoCerrado('b::50', 'mayorista'), false);
});

console.log(`\n${n} pruebas, todas pasan.`);
