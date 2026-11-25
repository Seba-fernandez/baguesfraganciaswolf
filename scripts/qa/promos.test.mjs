// Pruebas del lector de promos del ciclo (src/lib/ciclo/leerPromos.js), con el
// catalogo real de Bagues ciclo 12/2026:
//   - bagues-c12-promos.json: los textos con posicion (pdf.js) de los pliegos
//     del PDF que tienen promos o estan justo al lado del rango (el PDF pesa
//     35 MB y no se versiona).
//   - Si el PDF esta en tu maquina (BAGUES_C12_PDF, o /mnt/user-data/uploads),
//     tambien se prueba contra el archivo entero.
// Solo lee: nunca escribe settings.promos_ciclo (eso lo decide una persona).
//   node scripts/qa/promos.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { leerPromos, codigosDeRegla, paginasImpresas, proponerPromosCiclo } from '../../src/lib/ciclo/leerPromos.js';
import { calcularCarrito } from '../../src/lib/promos.js';

const F = path.join(import.meta.dirname, 'fixtures');
const paginas = JSON.parse(fs.readFileSync(path.join(F, 'bagues-c12-promos.json'), 'utf8'));

let n = 0;
const ok = (nombre, fn) => { fn(); n++; console.log(`  ok  ${nombre}`); };
const pliego = (k) => paginas.find((p) => p.n === k);

function verificar(paginas, etiqueta) {
  const r = leerPromos(paginas);
  const navidad = r.reglas.find((x) => x.desde === 2);

  ok(`${etiqueta}: el 2x1 de Navidad, con precio del par = la lista de UNO ($30.999) y c/u $15.499`, () => {
    assert.ok(navidad);
    assert.equal(navidad.tipo, '2x1');
    assert.equal(navidad.titulo, '2x1 ESPECIAL NAVIDAD');
    assert.equal(navidad.precio_par, 30999);
    assert.equal(navidad.precio_unidad, 15499);
    assert.equal(navidad.hasta, 29);
    assert.equal(navidad.alcance, 'rango');
    assert.deepEqual(navidad.paginas_pdf, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    assert.match(navidad.detalle, /desde la página 2 hasta la página 29/);
  });

  ok(`${etiqueta}: el segundo 2x1 (págs. 79 a 85, $18.799 el par) se detecta aparte`, () => {
    const aire = r.reglas.find((x) => x.desde === 79);
    assert.equal(aire.precio_par, 18799);
    assert.equal(aire.precio_unidad, 9399);
    assert.equal(aire.hasta, 85);
  });

  ok(`${etiqueta}: "LLEVÁ 1 X / LLEVÁ 2 a solo" NO se confunde con 2x1 (promos.js no lo sabe cobrar)`, () => {
    assert.equal(r.reglas.length, 2);
    assert.deepEqual(r.otras.map((o) => [o.precio_1, o.precio_c_u_llevando_2, o.desde, o.hasta]), [[13799, 9499, 60, 61], [5199, 3999, 79, 85]]);
  });

  ok(`${etiqueta}: un 2x1 sin precio legible avisa en vez de inventar`, () => {
    // págs. 44-45 y 74-75: el precio c/u del sello rojo no viene como texto en el PDF
    const sinPrecio = r.avisos.filter((a) => /44-45|74-75/.test(a));
    assert.equal(sinPrecio.length, 2, r.avisos.join(' | '));
  });
  return { r, navidad };
}

ok('paginasImpresas lee el pie del pliego (no asume cuenta)', () => {
  assert.deepEqual(paginasImpresas(pliego(2)), [2, 3]);
  assert.deepEqual(paginasImpresas(pliego(15)), [28, 29]);
  assert.deepEqual(paginasImpresas(pliego(16)), [30, 31]);
  assert.deepEqual(paginasImpresas(pliego(40)), [78, 79]);
  assert.deepEqual(paginasImpresas({ items: [{ x: 5, y: 5, s: '7' }] }), [null, null], 'sin tamaño de hoja no hay pie');
});

const { r, navidad } = verificar(paginas, 'fixture');

ok('códigos 1028 dentro del rango de Navidad: 78, todos de las págs. 2 a 29', () => {
  const { codigos, aproximado } = codigosDeRegla(paginas, navidad);
  assert.equal(codigos.length, 78);
  assert.equal(aproximado, false);
  assert.ok(codigos.every((c) => /^1028\d{4}$/.test(c)));
  // los 3 que no estaban cargados en la tienda el 24/11 y los del borde del rango
  for (const c of ['10281068', '10281112', '10281120', '10282046', '10281128']) assert.ok(codigos.includes(c), c);
});

ok('los perfumes de las págs. 30-33 ($25.199 c/u) quedan AFUERA del 2x1', () => {
  const { codigos } = codigosDeRegla(paginas, navidad);
  for (const c of ['10282107', '10282076', '10282115', '10281129', '10282080']) assert.ok(!codigos.includes(c), c);
});

ok('el segundo 2x1 no tiene ningún código 1028 (son aromatizantes 1113xxxx)', () => {
  const aire = r.reglas.find((x) => x.desde === 79);
  assert.deepEqual(codigosDeRegla(paginas, aire).codigos, []);
});

ok('sin posiciones (texto plano) el pliego entra entero y se marca aproximado', () => {
  const plano = paginas.map((p) => ({ n: p.n, ancho: p.ancho, alto: p.alto, items: p.items.map((i) => ({ s: i.s, y: i.y, ...(/^\d{1,3}$/.test(i.s) ? { x: i.x } : {}) })) }));
  const { aproximado } = codigosDeRegla(plano, { desde: 29, hasta: 29 });
  assert.equal(aproximado, true);
});

ok('la propuesta para el panel tiene la forma de settings.promos_ciclo y funciona con promos.js', () => {
  const propuesta = proponerPromosCiclo([navidad]);
  assert.deepEqual(Object.keys(propuesta[0]), ['grupo', 'titulo', 'detalle', 'precio_par']);
  assert.equal(propuesta[0].grupo, '2x1_especial_navidad');
  const items = [{ cantidad: 2, precio: 30999, grupo_promo: propuesta[0].grupo }];
  assert.equal(calcularCarrito(items, propuesta).total, 30999, 'dos del grupo = un par = $30.999');
  assert.equal(calcularCarrito([{ ...items[0], cantidad: 3 }], propuesta).total, 61998, 'el tercero abre otro par');
});

ok('tolerante: sin banner no hay reglas; con 2x1 sin "c/u" avisa', () => {
  assert.deepEqual(leerPromos([{ n: 1, items: [{ s: 'Sauvage 10282038 $24.399' }] }]), { reglas: [], otras: [], avisos: [] });
  const solo = leerPromos([{ n: 9, items: [{ s: '2x1 ESPECIAL' }, { s: '$30.999' }] }]);
  assert.equal(solo.reglas.length, 0);
  assert.equal(solo.avisos.length, 1);
});

ok('el precio del par se valida contra c/u: dos precios que no son mitad uno del otro no arman regla', () => {
  const x = leerPromos([{ n: 1, items: [{ s: '2x1' }, { s: '$30.999' }, { s: '$20.000' }, { s: 'c/u' }] }]);
  assert.equal(x.reglas.length, 0);
});

// ---- contra el PDF entero, si esta a mano
const RUTA = process.env.BAGUES_C12_PDF || '/mnt/user-data/uploads/Catálogo_Bagues_C1226.pdf';
if (fs.existsSync(RUTA)) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const { leerPdf } = await import('../../src/lib/ciclo/pdf.js');
  const completo = await leerPdf(pdfjs, fs.readFileSync(RUTA));
  verificar(completo, 'PDF entero');
  ok('PDF entero: 51 hojas y 78 códigos en el rango de Navidad', () => {
    assert.equal(completo.length, 51);
    const regla = leerPromos(completo).reglas.find((x) => x.desde === 2);
    assert.equal(codigosDeRegla(completo, regla).codigos.length, 78);
  });
} else {
  console.log('  --  PDF entero: no está en esta máquina, se prueba solo con el fixture');
}

console.log(`\n${n} pruebas, todas pasan.`);
