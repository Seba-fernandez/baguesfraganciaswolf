// Pruebas del buscador y el abecedario del panel (lib/buscarPanel.js).
// Solo datos inventados: el repo es publico.
//   node scripts/qa/buscarPanel.test.mjs
import assert from 'node:assert/strict';
import { letraDe, filtrarCatalogo, ordenarAZ, LETRAS } from '../../src/lib/buscarPanel.js';

let n = 0;
const ok = (nombre, fn) => { fn(); n++; console.log(`  ok  ${nombre}`); };

const BASE = [
  { id: 1, slug: 'unlock-idole', nombre: 'Idôle', inspirado_en: 'Idôle', activo: true, familia_olfativa: 'Floral',
    nota_fondo: 'Vainilla', presentaciones: [{ ml: 75, linea: 'unlock', codigo: '20280029', nombre_proveedor: 'Idôle', activo: true }] },
  { id: 2, slug: 'bagues-sauvage', nombre: 'Sauvage', inspirado_en: 'Sauvage', activo: true,
    presentaciones: [{ ml: 50, linea: 'bagues', codigo: '10280038', nombre_proveedor: 'Arizona', activo: true },
      { ml: 100, linea: 'unlock', codigo: '20280011', nombre_proveedor: 'Sauvage', activo: true }] },
  { id: 3, slug: 'unlock-212-vip', nombre: '212 VIP Party', inspirado_en: '212 VIP Party', activo: false,
    presentaciones: [{ ml: 80, linea: 'unlock', codigo: '20280031', nombre_proveedor: '212 VIP Party', activo: false }] },
  { id: 4, slug: 'bagues-la-bomba', nombre: 'La Bomba', inspirado_en: 'La Bomba', activo: true,
    presentaciones: [{ ml: 50, linea: 'bagues', codigo: '10280126', nombre_proveedor: 'Granada', activo: false }] },
  { id: 5, slug: 'unlock-angel', nombre: 'Ángel Nova', inspirado_en: 'Angel Nova', activo: true, nota_salida: 'Vainilla',
    presentaciones: [] },
  { id: 6, slug: 'bagues-acqua', nombre: 'Acqua di Giò', inspirado_en: 'Acqua di Giò', activo: true, presentaciones: [] },
];
const nombres = (r) => r.lista.map((p) => p.nombre);

ok('letraDe: sin tildes, mayúscula y # para números', () => {
  assert.equal(letraDe('Ángel Nova'), 'A');
  assert.equal(letraDe('idôle'), 'I');
  assert.equal(letraDe('212 VIP'), '#');
  assert.equal(letraDe(''), '#');
  assert.equal(LETRAS.length, 27);
});

ok('ordenarAZ ignora tildes y mayúsculas, números primero', () => {
  assert.deepEqual(ordenarAZ(BASE).map((p) => p.nombre), ['212 VIP Party', 'Acqua di Giò', 'Ángel Nova', 'Idôle', 'La Bomba', 'Sauvage']);
});

ok('sin texto ni letra: todos, de la A a la Z', () => {
  const r = filtrarCatalogo(BASE);
  assert.equal(r.lista.length, 6);
  assert.deepEqual([...r.letras].sort(), ['#', 'A', 'I', 'L', 'S']);
});

ok('nombre sin tildes ni mayúsculas', () => {
  assert.deepEqual(nombres(filtrarCatalogo(BASE, { texto: 'IDOLE' })), ['Idôle']);
  assert.deepEqual(nombres(filtrarCatalogo(BASE, { texto: 'acqua di gio' })), ['Acqua di Giò']);
  assert.deepEqual(nombres(filtrarCatalogo(BASE, { texto: 'angel' })), ['Ángel Nova']);
});

ok('un error de tipeo en palabras largas', () => {
  assert.deepEqual(nombres(filtrarCatalogo(BASE, { texto: 'savage' })), ['Sauvage']);
});

ok('por nombre de caja, aunque ese tamaño esté pausado', () => {
  assert.deepEqual(nombres(filtrarCatalogo(BASE, { texto: 'arizona' })), ['Sauvage']);
  assert.deepEqual(nombres(filtrarCatalogo(BASE, { texto: 'granada' })), ['La Bomba']);
});

ok('por código, entero o el comienzo', () => {
  assert.deepEqual(nombres(filtrarCatalogo(BASE, { texto: '20280011' })), ['Sauvage']);
  assert.deepEqual(nombres(filtrarCatalogo(BASE, { texto: '212' })), ['212 VIP Party']);
});

ok('no busca en notas ni familia', () => {
  assert.equal(filtrarCatalogo(BASE, { texto: 'vainilla' }).lista.length, 0);
  assert.equal(filtrarCatalogo(BASE, { texto: 'floral' }).lista.length, 0);
});

ok('algo que no está da lista vacía y ninguna letra', () => {
  const r = filtrarCatalogo(BASE, { texto: 'manhattan' });
  assert.equal(r.lista.length, 0);
  assert.equal(r.letras.size, 0);
});

ok('letra sola y letra con texto', () => {
  assert.deepEqual(nombres(filtrarCatalogo(BASE, { letra: 'A' })), ['Acqua di Giò', 'Ángel Nova']);
  assert.deepEqual(nombres(filtrarCatalogo(BASE, { letra: '#' })), ['212 VIP Party']);
  assert.deepEqual(nombres(filtrarCatalogo(BASE, { texto: 'nova', letra: 'A' })), ['Ángel Nova']);
  assert.equal(filtrarCatalogo(BASE, { texto: 'nova', letra: 'S' }).lista.length, 0);
});

ok('las letras disponibles siguen al texto, no a la letra elegida', () => {
  const r = filtrarCatalogo(BASE, { texto: 'sa', letra: 'A' });
  assert.ok(r.letras.has('S'));
  assert.equal(r.lista.length, 0);
});

ok('con una o dos letras filtra por el comienzo de una palabra', () => {
  assert.deepEqual(nombres(filtrarCatalogo(BASE, { texto: 's' })), ['Sauvage']);
  assert.deepEqual(nombres(filtrarCatalogo(BASE, { texto: 'bo' })), ['La Bomba']);
  assert.deepEqual(nombres(filtrarCatalogo(BASE, { texto: 'la b' })), ['La Bomba']);
});

console.log(`\n${n} pruebas del buscador del panel, todas pasan.`);
