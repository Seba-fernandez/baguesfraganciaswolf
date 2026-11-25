// Pruebas de lo que el panel le manda a aplicar_ciclo() (src/lib/ciclo/llamada.js)
// y de las reglas de la migracion 0017. Sin framework:
//   node scripts/qa/llamada.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { paramsDeAplicar } from '../../src/lib/ciclo/llamada.js';

let n = 0;
const prueba = (nombre, fn) => { fn(); n += 1; console.log(`  ok  ${nombre}`); };
const leer = (ruta) => fs.readFileSync(new URL(`../../${ruta}`, import.meta.url), 'utf8');

prueba('las promos y los grupos viajan en la misma llamada que el ciclo (seis parametros)', () => {
  const promos = [{ grupo: 'disenador', titulo: '2x1', precio_par: 24399 }];
  const p = paramsDeAplicar({
    carga: 'c1', operaciones: [{ tipo: 'precio', codigo: '10281063', precio: 20000 }], nuevos: [], ciclo: { nombre: 'Ciclo 12/26', hasta: '2026-12-11' },
    promosCiclo: promos, cambiosGrupo: [{ codigo: '10281063', a: 'disenador', productoId: 'x', de: null }],
  });
  assert.deepEqual(Object.keys(p).sort(), ['p_carga', 'p_ciclo', 'p_grupos', 'p_nuevos', 'p_operaciones', 'p_promos']);
  assert.deepEqual(p.p_promos, promos);
  assert.deepEqual(p.p_grupos, [{ codigo: '10281063', grupo_promo: 'disenador' }]);
  assert.equal(p.p_carga, 'c1');
});

prueba('un ciclo sin promos manda p_promos en null (la base no toca settings.promos_ciclo) y grupos vacios', () => {
  const p = paramsDeAplicar({ operaciones: [{ tipo: 'desactivar', codigo: '20281050' }] });
  assert.equal(p.p_promos, null);
  assert.deepEqual(p.p_grupos, []);
  assert.deepEqual(p.p_nuevos, []);
  assert.equal(p.p_ciclo, null);
});

prueba('solo promos, sin cambios de precio: igual arma la llamada de siempre', () => {
  const p = paramsDeAplicar({ promosCiclo: [], cambiosGrupo: [{ codigo: '10281063', a: 'arabe' }] });
  assert.deepEqual(p.p_operaciones, []);
  assert.deepEqual(p.p_promos, []);
  assert.equal(p.p_grupos.length, 1);
});

prueba('un codigo repetido con el mismo grupo se junta; con dos grupos distintos frena antes de llamar', () => {
  const dos = paramsDeAplicar({ cambiosGrupo: [{ codigo: '10281063', a: 'arabe' }, { codigo: '10281063', a: 'arabe' }] });
  assert.equal(dos.p_grupos.length, 1);
  assert.throws(() => paramsDeAplicar({ cambiosGrupo: [{ codigo: '10281063', a: 'arabe' }, { codigo: '10281063', a: 'disenador' }] }), /dos grupos/);
});

prueba('promos que no son una lista frenan antes de llamar', () => {
  assert.throws(() => paramsDeAplicar({ promosCiclo: { grupo: 'x' } }), /lista/);
});

prueba('el panel ya no tiene el camino de dos pasos (aplicarPromos) ni escribe settings suelto', () => {
  const servidor = leer('src/lib/ciclo/servidor.js');
  const pantalla = leer('src/components/panel/ciclo/CicloScreen.jsx');
  assert.ok(!/aplicarPromos/.test(servidor + pantalla), 'quedo aplicarPromos');
  assert.ok(!/from\('settings'\)/.test(servidor), 'servidor.js escribe settings directo');
  assert.equal((servidor.match(/rpc\('aplicar_ciclo'/g) || []).length, 2, 'aplicar_ciclo se llama desde aplicarCiclo y aplicarPreciosMinis, nada mas');
  assert.ok(/promosCiclo,\s*\n\s*cambiosGrupo/.test(pantalla), 'la pantalla no pasa las promos a aplicarCiclo');
});

prueba('la migracion 0017 no tiene drop ni delete (el conector no pide confirmacion) y respalda settings', () => {
  const sql = leer('supabase/migrations/20261125_0017_promos_en_el_ciclo.sql');
  const sinComentarios = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
  assert.ok(!/\b(drop|delete|truncate)\b/i.test(sinComentarios), 'hay un drop/delete/truncate');
  assert.ok(/settings \(antes de cargar un ciclo\)/.test(sql));
  assert.ok(/p_promos jsonb,\s*\n\s*p_grupos jsonb\n\)/.test(sql));
});

console.log(`\n${n} pruebas, todas pasan.`);
