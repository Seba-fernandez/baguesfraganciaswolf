// Pruebas de la tira del ciclo (src/lib/ciclo.js). Sin framework:
//   node scripts/qa/ciclo.test.mjs
// Las horas van en UTC a proposito: Argentina es UTC-3 todo el ano, asi que
// las 02:00 UTC del 17 todavia son las 23:00 del 16 en Cordoba.
import assert from 'node:assert/strict';
import { estadoCiclo, hoyEnArgentina, DIAS_URGENTE } from '../../src/lib/ciclo.js';

const en = (iso) => new Date(iso);
let n = 0;
const prueba = (nombre, fn) => { fn(); n += 1; console.log(`  ok  ${nombre}`); };

prueba('hoy se cuenta en la hora de Argentina, no en UTC', () => {
  assert.deepEqual(hoyEnArgentina(en('2026-10-17T02:00:00Z')), [2026, 10, 16]);
  assert.deepEqual(hoyEnArgentina(en('2026-10-17T03:00:00Z')), [2026, 10, 17]);
});

// El informe decia "viernes 31", pero el 31/10/2026 es sabado: el dia de la
// semana no se escribe a mano, sale de la fecha.
prueba('hasta el viernes 30, desde el 16: quedan 14 dias', () => {
  const e = estadoCiclo({ nombre: 'Ciclo 10/26', hasta: '2026-10-30' }, en('2026-10-16T15:00:00Z'));
  assert.deepEqual(e, { nombre: 'Ciclo 10/26', dia: 'viernes 30', dias: 14, urgente: false });
});

prueba('el dia de la semana sale de la fecha (sabado 17)', () => {
  assert.equal(estadoCiclo({ hasta: '2026-10-17' }, en('2026-10-10T12:00:00Z')).dia, 'sábado 17');
});

prueba(`con ${DIAS_URGENTE} dias o menos es urgente; con uno mas, no`, () => {
  assert.equal(estadoCiclo({ hasta: '2026-10-20' }, en('2026-10-17T12:00:00Z')).urgente, true);
  assert.equal(estadoCiclo({ hasta: '2026-10-21' }, en('2026-10-17T12:00:00Z')).urgente, false);
});

prueba('el ultimo dia todavia se muestra (dias = 0)', () => {
  const e = estadoCiclo({ hasta: '2026-10-16' }, en('2026-10-17T02:30:00Z')); // 23:30 del 16 en Cordoba
  assert.equal(e.dias, 0);
  assert.equal(e.urgente, true);
});

prueba('vencido: no hay tira (nunca una fecha pasada)', () => {
  assert.equal(estadoCiclo({ nombre: 'Ciclo 10/26', hasta: '2026-10-16' }, en('2026-10-17T12:00:00Z')), null);
});

prueba('vacio, nulo o mal escrito: no hay tira', () => {
  for (const hasta of [null, undefined, '', '31/10/2026', '2026-02-31', 'mañana']) {
    assert.equal(estadoCiclo({ nombre: 'Ciclo', hasta }, en('2026-10-17T12:00:00Z')), null, String(hasta));
  }
});

prueba('acepta la fecha con hora (timestamp de la base)', () => {
  assert.equal(estadoCiclo({ hasta: '2026-10-31T00:00:00+00:00' }, en('2026-10-30T12:00:00Z')).dias, 1);
});

prueba('sin nombre, la tira igual sale (el nombre va vacio)', () => {
  assert.equal(estadoCiclo({ hasta: '2026-10-31' }, en('2026-10-30T12:00:00Z')).nombre, '');
});

console.log(`\n${n} pruebas, todas pasan.`);
