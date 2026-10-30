// Pruebas del deshacer / rehacer del panel (src/lib/historialPanel.js y
// src/lib/cicloDeshacer.js). Sin framework, sin base de datos:
//   node scripts/qa/historial.test.mjs
// Los datos son inventados.
import assert from 'node:assert/strict';
import {
  MAXIMO, registrar, deshacer, rehacer, limpiar, estado, suscribir, olvidarMensaje, iguales, elegir,
} from '../../src/lib/historialPanel.js';
import { diferenciaCiclo, diferenciaAjustes } from '../../src/lib/cicloDeshacer.js';

let n = 0;
const prueba = async (nombre, fn) => { limpiar(); await fn(); n += 1; console.log(`  ok  ${nombre}`); };

// Un "cambio" de juguete: un numero que se puede sumar y restar, con registro de cada llamada.
function cambio(registro, etiqueta, { falla = null } = {}) {
  return {
    etiqueta,
    deshacer: async () => { if (falla === 'deshacer') throw new Error('ya no existe'); registro.push(`-${etiqueta}`); },
    rehacer: async () => { if (falla === 'rehacer') throw new Error('ya no existe'); registro.push(`+${etiqueta}`); },
  };
}

await prueba('arranca vacio: nada para deshacer ni rehacer', async () => {
  const e = estado();
  assert.equal(e.puedeDeshacer, false);
  assert.equal(e.puedeRehacer, false);
  assert.equal(e.cantidad, 0);
  assert.deepEqual(await deshacer(), { ok: false });
  assert.deepEqual(await rehacer(), { ok: false });
});

await prueba('deshace en orden inverso, de a un paso', async () => {
  const r = [];
  registrar(cambio(r, 'A'));
  registrar(cambio(r, 'B'));
  registrar(cambio(r, 'C'));
  assert.equal(estado().cantidad, 3);
  assert.equal(estado().etiquetaDeshacer, 'C');
  await deshacer();
  await deshacer();
  assert.deepEqual(r, ['-C', '-B']);
  assert.equal(estado().etiquetaDeshacer, 'A');
  assert.equal(estado().etiquetaRehacer, 'B');
});

await prueba('rehacer vuelve a aplicar en el orden en que se hizo', async () => {
  const r = [];
  registrar(cambio(r, 'A'));
  registrar(cambio(r, 'B'));
  await deshacer();
  await deshacer();
  await rehacer();
  await rehacer();
  assert.deepEqual(r, ['-B', '-A', '+A', '+B']);
  assert.equal(estado().puedeRehacer, false);
  assert.equal(estado().cantidad, 2);
});

await prueba('un cambio nuevo despues de deshacer borra lo que se podia rehacer', async () => {
  const r = [];
  registrar(cambio(r, 'A'));
  registrar(cambio(r, 'B'));
  await deshacer();
  assert.equal(estado().puedeRehacer, true);
  registrar(cambio(r, 'C'));
  assert.equal(estado().puedeRehacer, false);
  assert.equal(estado().etiquetaDeshacer, 'C');
});

await prueba('guarda como maximo MAXIMO cambios: se olvida el mas viejo', async () => {
  const r = [];
  for (let i = 0; i < MAXIMO + 5; i += 1) registrar(cambio(r, `c${i}`));
  assert.equal(estado().cantidad, MAXIMO);
  for (let i = 0; i < MAXIMO; i += 1) await deshacer();
  assert.equal(estado().puedeDeshacer, false);
  assert.equal(r.at(-1), '-c5');
});

await prueba('si un deshacer falla, se saltea ese paso y avisa; los anteriores siguen andando', async () => {
  const r = [];
  registrar(cambio(r, 'A'));
  registrar(cambio(r, 'B', { falla: 'deshacer' }));
  const res = await deshacer();
  assert.equal(res.ok, false);
  assert.equal(estado().mensaje.tipo, 'error');
  assert.match(estado().mensaje.texto, /No se pudo deshacer .B./);
  assert.match(estado().mensaje.texto, /ya no existe/);
  assert.equal(estado().cantidad, 1);
  assert.equal(estado().puedeRehacer, false);
  await deshacer();
  assert.deepEqual(r, ['-A']);
});

await prueba('si un rehacer falla, ese paso se descarta', async () => {
  const r = [];
  registrar(cambio(r, 'A', { falla: 'rehacer' }));
  await deshacer();
  const res = await rehacer();
  assert.equal(res.ok, false);
  assert.match(estado().mensaje.texto, /No se pudo rehacer/);
  assert.equal(estado().puedeRehacer, false);
});

await prueba('mientras uno corre no se puede lanzar otro (doble clic)', async () => {
  const r = [];
  let soltar;
  const espera = new Promise((ok) => { soltar = ok; });
  registrar(cambio(r, 'rapido'));
  registrar({ etiqueta: 'lento', deshacer: async () => { await espera; r.push('-lento'); }, rehacer: async () => {} });
  const primero = deshacer();
  assert.equal(estado().ocupado, true);
  assert.equal(estado().puedeDeshacer, false);
  assert.deepEqual(await deshacer(), { ok: false });
  assert.deepEqual(r, []);
  soltar();
  await primero;
  assert.deepEqual(r, ['-lento']);
  assert.equal(estado().ocupado, false);
  assert.equal(estado().puedeDeshacer, true);
});

await prueba('limpiar vuelve todo a cero (salir del panel)', async () => {
  const r = [];
  registrar(cambio(r, 'A'));
  registrar(cambio(r, 'B'));
  await deshacer();
  limpiar();
  const e = estado();
  assert.equal(e.cantidad, 0);
  assert.equal(e.puedeDeshacer, false);
  assert.equal(e.puedeRehacer, false);
  assert.equal(e.mensaje, null);
});

await prueba('avisa a quien escucha en cada cambio, y deja de avisar al desuscribirse', async () => {
  let avisos = 0;
  const baja = suscribir(() => { avisos += 1; });
  registrar(cambio([], 'A'));
  assert.equal(avisos, 1);
  await deshacer();
  assert.ok(avisos >= 2);
  const antes = avisos;
  baja();
  registrar(cambio([], 'B'));
  assert.equal(avisos, antes);
});

await prueba('el mensaje se puede borrar y el estado cambia de objeto solo si algo cambio', async () => {
  registrar(cambio([], 'A'));
  await deshacer();
  assert.match(estado().mensaje.texto, /^Deshecho: A$/);
  const antes = estado();
  assert.equal(estado(), antes);
  olvidarMensaje();
  assert.equal(estado().mensaje, null);
  assert.notEqual(estado(), antes);
  const despues = estado();
  olvidarMensaje();
  assert.equal(estado(), despues);
});

await prueba('registrar pide las dos funciones', async () => {
  assert.throws(() => registrar({ etiqueta: 'x', deshacer: () => {} }), /deshacer y rehacer/);
});

await prueba('iguales compara en profundidad sin importar el orden de las claves', async () => {
  assert.equal(iguales({ a: 1, b: [1, { c: 2 }] }, { b: [1, { c: 2 }], a: 1 }), true);
  assert.equal(iguales({ a: 1 }, { a: 1, b: undefined }), false);
  assert.equal(iguales([1, 2], [2, 1]), false);
  assert.equal(iguales(null, {}), false);
  assert.equal(iguales(1, 1), true);
  assert.equal(iguales([], {}), false);
});

await prueba('elegir toma solo las claves pedidas y pone null en las que faltan', async () => {
  assert.deepEqual(elegir({ a: 1, b: 2, c: 3 }, ['a', 'c', 'z']), { a: 1, c: 3, z: null });
  assert.deepEqual(elegir(undefined, ['a']), { a: null });
});

// ---- carga de ciclo

const fila = (id, extra = {}) => ({ id, nombre: `Perfume ${id}`, presentaciones: [{ ml: 100, precio: 10000, activo: true }], ...extra });

await prueba('diferenciaCiclo separa cambiados y creados; lo que no cambio no entra', async () => {
  const antes = [fila('a'), fila('b'), fila('c')];
  const despues = [
    fila('a'),
    fila('b', { presentaciones: [{ ml: 100, precio: 12000, activo: true }] }),
    fila('c', { activo: false }),
    fila('d'),
  ];
  const d = diferenciaCiclo(antes, despues);
  assert.deepEqual(d.cambiadosAntes.map((p) => p.id), ['b', 'c']);
  assert.deepEqual(d.cambiadosDespues.map((p) => p.id), ['b', 'c']);
  assert.deepEqual(d.creados.map((p) => p.id), ['d']);
  assert.equal(d.cambiadosAntes[0].presentaciones[0].precio, 10000);
  assert.equal(d.cambiadosDespues[0].presentaciones[0].precio, 12000);
});

await prueba('diferenciaCiclo: igual al reordenar claves y con listas vacias o ausentes', async () => {
  const a = { id: 'x', nombre: 'N', precio: 1 };
  const b = { precio: 1, nombre: 'N', id: 'x' };
  assert.deepEqual(diferenciaCiclo([a], [b]), { cambiadosAntes: [], cambiadosDespues: [], creados: [] });
  assert.deepEqual(diferenciaCiclo(undefined, undefined), { cambiadosAntes: [], cambiadosDespues: [], creados: [] });
  assert.equal(diferenciaCiclo([], [a]).creados.length, 1);
});

await prueba('diferenciaCiclo no cuenta como borrado un perfume que falta en "despues"', async () => {
  // El ciclo apaga perfumes, nunca los borra: si falta alguno es un error de lectura, no algo para tocar.
  const d = diferenciaCiclo([fila('a'), fila('b')], [fila('a')]);
  assert.deepEqual(d, { cambiadosAntes: [], cambiadosDespues: [], creados: [] });
});

await prueba('diferenciaAjustes guarda solo lo que cambio', async () => {
  const a = diferenciaAjustes({ ciclo_nombre: 'Ciclo 10/26', ciclo_hasta: '2026-10-30' }, { ciclo_nombre: 'Ciclo 11/26', ciclo_hasta: '2026-10-30' });
  assert.deepEqual(a, { antes: { ciclo_nombre: 'Ciclo 10/26' }, despues: { ciclo_nombre: 'Ciclo 11/26' }, cambio: true });
  const b = diferenciaAjustes({ ciclo_nombre: 'X' }, { ciclo_nombre: 'X' });
  assert.equal(b.cambio, false);
  assert.deepEqual(diferenciaAjustes({ ciclo_nombre: 'X' }, null), { antes: {}, despues: {}, cambio: false });
  const c = diferenciaAjustes({}, { ciclo_hasta: '2026-11-13' });
  assert.deepEqual(c, { antes: { ciclo_hasta: null }, despues: { ciclo_hasta: '2026-11-13' }, cambio: true });
});

console.log(`\n${n} pruebas del historial, todas ok`);
