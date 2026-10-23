// Pruebas del nombre y el teléfono del pedido (src/lib/datosCliente.js).
//   node scripts/qa/datos.test.mjs
// Los mismos casos se prueban contra la base en la migración 0012.
import assert from 'node:assert/strict';
import { telefonoArgentino, nombreCliente } from '../../src/lib/datosCliente.js';

const CORDOBA = '5493515551234';
const tel = (t) => telefonoArgentino(t);

// Todas las formas de escribir el mismo celular de Córdoba.
for (const forma of [
  '3515551234', '351 555 1234', '351-555-1234', '(351) 555-1234', '351 5551234',
  '0351 555 1234', '0351 15 555 1234', '351 15 555 1234', '351155551234',
  '+54 9 351 555 1234', '+549 351 5551234', '+54 351 555 1234', '+54 351 15 555 1234',
  '549 351 555 1234', '54 351 555 1234', '0054 9 351 555 1234', '+54 (351) 15-555-1234',
  '  351.555.1234  ',
]) {
  assert.deepEqual(tel(forma), { ok: true, valor: CORDOBA }, `debería entrar: "${forma}"`);
}

// Otras características: AMBA (2 cifras) y del interior (4 cifras).
assert.deepEqual(tel('11 15 5555 4444'), { ok: true, valor: '5491155554444' });
assert.deepEqual(tel('+54 9 11 5555-4444'), { ok: true, valor: '5491155554444' });
assert.deepEqual(tel('3543 15 41 2345'), { ok: true, valor: '5493543412345' });
assert.deepEqual(tel('03543 412345'), { ok: true, valor: '5493543412345' });

// Otro país, con + adelante: se respeta.
assert.deepEqual(tel('+598 99 123 456'), { ok: true, valor: '59899123456' });
assert.deepEqual(tel('+1 305 555 0100'), { ok: true, valor: '13055550100' });

// Lo que no tiene que entrar, con el motivo justo para el aviso.
const motivo = (t) => tel(t).motivo;
assert.equal(motivo(''), 'vacio');
assert.equal(motivo('   '), 'vacio');
assert.equal(motivo('---'), 'vacio');
assert.equal(motivo('555 1234'), 'sin_area');
assert.equal(motivo('15 555 1234'), 'sin_area');
assert.equal(motivo('351 555 123'), 'invalido');
assert.equal(motivo('351 555 12345'), 'invalido');
assert.equal(motivo('951 555 1234'), 'invalido');
assert.equal(motivo('+54 9 351 555 123'), 'invalido');
assert.equal(motivo('351abc5551234'), 'letras');
assert.equal(motivo("351'; drop table customers;--"), 'letras');
assert.equal(motivo('<script>'), 'letras');
assert.equal(motivo('+598 12'), 'invalido');

// Nombres.
const nom = (n) => nombreCliente(n);
for (const [entra, sale] of [
  ['Lucía', 'Lucía'], ['  María   José  ', 'María José'], ["D'Angelo", "D'Angelo"],
  ['Ana-Laura Pérez', 'Ana-Laura Pérez'], ['J. Muñoz', 'J. Muñoz'], ['Jürgen', 'Jürgen'],
  ['Flor', 'Flor'], ['Bo', 'Bo'], ['Ma’ Ti', 'Ma’ Ti'],
]) {
  assert.deepEqual(nom(entra), { ok: true, valor: sale }, `debería entrar: "${entra}"`);
}
assert.equal(nom('').motivo, 'vacio');
assert.equal(nom('   ').motivo, 'vacio');
assert.equal(nom('A').motivo, 'corto');
assert.equal(nom('A.').motivo, 'corto');
assert.equal(nom('x'.repeat(61)).motivo, 'largo');
assert.equal(nom('Lucía 2').motivo, 'raro');
assert.equal(nom('<b>Lu</b>').motivo, 'raro');
assert.equal(nom("Lu'; drop table orders;--").motivo, 'raro');
assert.equal(nom('-Lu').motivo, 'raro');
assert.equal(nom('Lu 😀').motivo, 'raro');

console.log('datos.test: todo bien');
