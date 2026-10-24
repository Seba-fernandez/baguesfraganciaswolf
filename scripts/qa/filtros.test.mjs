// Pruebas de las familias del filtro (src/lib/filtros.js): varias a la vez,
// links viejos de una sola, y la hoja de la portada que no queda vacia.
//   node scripts/qa/filtros.test.mjs
import assert from 'node:assert/strict';
import { leerFamilias, escribirFamilias, alternarFamilia, leerFiltros, pasaFiltros } from '../../src/lib/filtros.js';

// Leer: link viejo, varias, basura, orden y repetidas.
assert.deepEqual(leerFamilias('amaderados'), ['amaderados']);
assert.deepEqual(leerFamilias('florales,amaderados'), ['florales', 'amaderados']);
assert.deepEqual(leerFamilias('amaderados,florales'), ['florales', 'amaderados'], 'el orden es el de FAMILIAS');
assert.deepEqual(leerFamilias('amaderados,,nada, florales ,amaderados'), ['florales', 'amaderados']);
assert.deepEqual(leerFamilias(null), []);
assert.deepEqual(leerFamilias(''), []);
assert.deepEqual(leerFamilias('otros'), [], 'Otros no es un filtro');

// Escribir.
assert.equal(escribirFamilias(['amaderados', 'frescos']), 'frescos,amaderados');
assert.equal(escribirFamilias([]), null);
assert.equal(escribirFamilias(['nada']), null);

// Sumar y sacar.
assert.deepEqual(alternarFamilia([], 'dulces'), ['dulces']);
assert.deepEqual(alternarFamilia(['dulces'], 'frescos'), ['frescos', 'dulces']);
assert.deepEqual(alternarFamilia(['frescos', 'dulces'], 'frescos'), ['dulces']);
assert.deepEqual(alternarFamilia(['dulces'], 'dulces'), [], 'en el catalogo se puede quedar sin familia');
assert.deepEqual(alternarFamilia(['dulces'], 'dulces', { minimo: 1 }), ['dulces'], 'la hoja no queda vacia');
assert.deepEqual(alternarFamilia(['dulces', 'ambar'], 'dulces', { minimo: 1 }), ['ambar']);

// De la direccion al filtro.
const f = leerFiltros(new URLSearchParams('familia=amaderados%2Cflorales&para=el&minis=1'));
assert.deepEqual(f, { para: 'el', familias: ['florales', 'amaderados'], minis: true });
assert.deepEqual(leerFiltros(new URLSearchParams('')).familias, []);

// pasaFiltros con varias familias.
const pres = [{ ml: 50, precio: 1, activo: true }];
const madera = { genero: 'masculino', familia_olfativa: 'Amaderada', presentaciones: pres };
const flor = { genero: 'femenino', familia_olfativa: 'Floral', presentaciones: pres };
const citrico = { genero: 'unisex', familia_olfativa: 'Citrica', presentaciones: pres };
const elegidas = { familias: ['florales', 'amaderados'] };
assert.equal(pasaFiltros(madera, elegidas), true);
assert.equal(pasaFiltros(flor, elegidas), true);
assert.equal(pasaFiltros(citrico, elegidas), false);
assert.equal(pasaFiltros(citrico, {}), true, 'sin familias pasa todo');
assert.equal(pasaFiltros(flor, { ...elegidas, para: 'el' }), false, 'Para y Familia se suman');

console.log('filtros: todo bien');
