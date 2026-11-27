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
import { leerPromos, codigosDeRegla, paginasImpresas, proponerPromosCiclo, promosDelPdf, propuestaDePromos, promosCicloResultantes } from '../../src/lib/ciclo/leerPromos.js';
import { leerBagues } from '../../src/lib/ciclo/leerBagues.js';
import { compararCiclo } from '../../src/lib/ciclo/comparar.js';
import { calcularCarrito, precioCadaUno } from '../../src/lib/promos.js';

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


// ---- leerBagues en las paginas con 2x1 (bug del 24/11: devolvia precio null para ~80 perfumes
// y comparar.js dejaba el precio de noviembre sin avisar)
function verificarLector(paginas, etiqueta) {
  const leidos = leerBagues(paginas);
  const regla = leerPromos(paginas).reglas.find((x) => x.desde === 2);
  const enRango = new Set(codigosDeRegla(paginas, regla).codigos);
  const delRango = leidos.filter((p) => enRango.has(p.codigo));

  ok(`${etiqueta}: los ${enRango.size} perfumes del 2x1 salen con precio $30.999 (antes: null)`, () => {
    assert.equal(enRango.size, 78);
    assert.equal(delRango.length, 78);
    assert.deepEqual(delRango.filter((p) => !p.precio).map((p) => p.codigo), []);
    assert.ok(delRango.every((p) => p.precio === 30999 && p.precio_anterior === null && p.promo === '2x1' && p.precio_c_u_promo === 15499));
    assert.ok(delRango.every((p) => !p.avisos.some((a) => /precio/.test(a))));
  });
  ok(`${etiqueta}: las págs. 30 a 33 (sin promo) siguen igual: lista $33.599, $25.199 c/u`, () => {
    const resto = leidos.filter((p) => !enRango.has(p.codigo) && p.precio);
    assert.equal(resto.length, 9);
    assert.ok(resto.every((p) => p.precio === 25199 && p.precio_anterior === 33599 && !p.promo));
  });
  ok(`${etiqueta}: lo que de verdad no se lee (la contratapa "precio especial" es imagen) sigue en null CON aviso`, () => {
    const sin = leidos.filter((p) => !p.precio);
    assert.deepEqual(sin.map((p) => p.codigo).sort(), ['10281136', '10282087']);
    assert.ok(sin.every((p) => p.avisos.some((a) => /no encontré el precio/.test(a))));
  });
  return leidos;
}

ok('cada mitad del pliego usa los precios de su lado (2x1 a la izquierda, otro precio a la derecha)', () => {
  const mixto = [{ n: 1, ancho: 964, alto: 590, items: [
    { x: 29, y: 300, s: 'Arizona' }, { x: 29, y: 310, s: 'Type Sauvage' }, { x: 29, y: 320, s: 'by Bagués' }, { x: 29, y: 330, s: '10282038' },
    { x: 28, y: 518, s: '$30.999' }, { x: 28, y: 543, s: '$15.499' }, { x: 114, y: 543, s: 'c/u' },
    { x: 533, y: 300, s: 'Bellagio' }, { x: 533, y: 310, s: 'Type Code' }, { x: 533, y: 320, s: 'by Bagués' }, { x: 533, y: 330, s: '10282109' },
    { x: 853, y: 118, s: '$33.599' }, { x: 853, y: 142, s: '$25.199' }, { x: 921, y: 142, s: 'c/u' },
  ] }];
  const r = leerBagues(mixto);
  assert.deepEqual(r.map((p) => [p.codigo, p.precio, p.precio_anterior]), [['10282038', 30999, null], ['10282109', 25199, 33599]]);
});

ok('un precio que NO es el doble de un c/u no se toma por precio de 2x1 (no se inventa)', () => {
  const raro = [{ n: 1, ancho: 964, alto: 590, items: [
    { x: 29, y: 300, s: 'Arizona Type Sauvage by Bagués 10282038' },
    { x: 28, y: 518, s: '$30.999' }, { x: 28, y: 530, s: 'Llevalos todos' }, { x: 28, y: 543, s: '$20.000' }, { x: 114, y: 543, s: 'c/u' },
  ] }];
  const [p] = leerBagues(raro);
  assert.equal(p.precio, null);
  assert.ok(p.avisos.some((a) => /no encontré el precio/.test(a)));
});

const leidosC12 = verificarLector(paginas, 'fixture');

// ---- un precio ilegible bloquea en vez de conservar el viejo
const baseNoviembre = () => {
  const filas = leidosC12.map((p, i) => ({
    id: `p${i}`, nombre: `Perfume ${p.codigo}`, inspirado_en: p.type, activo: true,
    presentaciones: [{ codigo: p.codigo, linea: 'bagues', ml: 50, precio: 24399, precio_anterior: null, nombre_proveedor: p.caja, type: p.type, activo: true, grupo_promo: p.promo ? 'disenador' : 'arabe' }],
  }));
  return filas;
};
ok('comparar: con el lector roto (precio null) NO conserva el de noviembre: bloquea y nombra el código', () => {
  const roto = leidosC12.map((p) => ({ ...p, precio: null, precio_anterior: null, promo: undefined }));
  const r = compararCiclo(baseNoviembre(), { unlock: null, bagues: roto });
  assert.equal(r.resumen.sinPrecio, roto.length);
  assert.ok(r.bloqueos.length >= 1 && r.forzables.length === 0, 'bloquea y no se puede forzar');
  assert.match(r.bloqueos[0], /No pude leer el precio de 89 perfumes/);
  assert.ok(r.bloqueos[0].includes('10282038'));
  assert.deepEqual(r.operaciones, [], 'no queda ninguna operación de precio ni de desactivar');
});
ok('comparar: con el lector arreglado, los 78 precios cambian de $24.399 a $30.999 y solo quedan 2 por decidir', () => {
  const r = compararCiclo(baseNoviembre(), { unlock: null, bagues: leidosC12 });
  assert.equal(r.grupos.precios.filter((x) => x.despues.precio === 30999).length, 78);
  assert.equal(r.grupos.sinPrecio.length, 2);
  assert.ok(r.bloqueos.some((b) => b.includes('10282087') && b.includes('10281136')));
  const r2 = compararCiclo(baseNoviembre(), { unlock: null, bagues: leidosC12 }, { decisionesPrecio: { 10282087: { modo: 'mantener' }, 10281136: { modo: 'precio', precio: 22000 } } });
  assert.deepEqual(r2.bloqueos, []);
});

// ---- las promos conectadas al flujo: propuesta atada a los códigos del rango
ok('propuesta: la regla 2x1 se ata a los 78 códigos del rango, no al grupo; el árabe (30 a 33) queda afuera', () => {
  const promos = promosDelPdf(paginas);
  const prop = propuestaDePromos(promos, baseNoviembre(), [{ grupo: 'disenador', precio_par: 24399 }, { grupo: 'arabe', precio_par: 25000, titulo: '25% off' }], leidosC12);
  const nav = prop.reglas.find((r) => r.regla.desde === 2);
  assert.equal(nav.codigos.length, 78);
  assert.equal(nav.promo.grupo, 'disenador');
  assert.equal(nav.promo.precio_par, 30999);
  assert.deepEqual(nav.bloqueos, []);
  assert.deepEqual(nav.cambiosGrupo, [], 'ya están en disenador: no se toca ninguna presentación');
  assert.equal(nav.fuera.length, 0);
  assert.equal(nav.sinCambios, false);
  const arabes = leidosC12.filter((p) => !p.promo && p.precio).map((p) => p.codigo);
  assert.ok(arabes.every((c) => !nav.codigos.includes(c)));
  // lo que se escribe: reemplaza SOLO disenador; el árabe queda tal cual
  const final = promosCicloResultantes([{ grupo: 'disenador', precio_par: 24399 }, { grupo: 'arabe', precio_par: 25000, titulo: '25% off' }], [nav]);
  assert.equal(final.length, 2);
  assert.equal(final.find((x) => x.grupo === 'disenador').precio_par, 30999);
  assert.deepEqual(final.find((x) => x.grupo === 'arabe'), { grupo: 'arabe', precio_par: 25000, titulo: '25% off' });
});

ok('propuesta: si un código del rango está en el grupo árabe, la regla BLOQUEA (no se regala producto)', () => {
  const filas = baseNoviembre();
  filas[0].presentaciones[0].grupo_promo = 'arabe';
  const nav = propuestaDePromos(promosDelPdf(paginas), filas, [], leidosC12).reglas.find((r) => r.regla.desde === 2);
  assert.equal(nav.bloqueos.length, 1);
  assert.match(nav.bloqueos[0], /descuento simple/);
  assert.ok(nav.bloqueos[0].includes(filas[0].presentaciones[0].codigo));
  assert.ok(!nav.cambiosGrupo.some((c) => c.codigo === filas[0].presentaciones[0].codigo), 'no se le cambia el grupo al árabe');
});

ok('propuesta: códigos sin grupo pasan a "disenador" y los de otro lado con ese grupo se avisan', () => {
  const filas = baseNoviembre();
  delete filas[3].presentaciones[0].grupo_promo;
  filas.push({ id: 'x', nombre: 'Suelto', activo: true, presentaciones: [{ codigo: '10289999', linea: 'bagues', ml: 50, precio: 20000, activo: true, grupo_promo: 'disenador' }] });
  const nav = propuestaDePromos(promosDelPdf(paginas), filas, [], leidosC12).reglas.find((r) => r.regla.desde === 2);
  assert.equal(nav.cambiosGrupo.length, 1);
  assert.equal(nav.cambiosGrupo[0].a, 'disenador');
  assert.deepEqual(nav.fuera.map((f) => f.codigo), ['10289999']);
  assert.ok(nav.avisos.some((a) => /también se cobrarían como 2x1/.test(a)));
});

ok('propuesta: la misma promo ya cargada se marca "sin cambios"', () => {
  const filas = baseNoviembre();
  const primera = propuestaDePromos(promosDelPdf(paginas), filas, [], leidosC12).reglas.find((r) => r.regla.desde === 2);
  const otra = propuestaDePromos(promosDelPdf(paginas), filas, [primera.promo], leidosC12).reglas.find((r) => r.regla.desde === 2);
  assert.equal(otra.sinCambios, true);
});

// ---- contra el PDF entero, si esta a mano
const RUTA = process.env.BAGUES_C12_PDF || '/mnt/user-data/uploads/Catálogo_Bagues_C1226.pdf';
if (fs.existsSync(RUTA)) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const { leerPdf } = await import('../../src/lib/ciclo/pdf.js');
  const completo = await leerPdf(pdfjs, fs.readFileSync(RUTA));
  verificar(completo, 'PDF entero');
  const todos = verificarLector(completo, 'PDF entero');
  ok('PDF entero: de 89 perfumes leídos, 80 salían con precio null; ahora 2 (la contratapa)', () => {
    assert.equal(todos.length, 89);
    assert.equal(todos.filter((p) => !p.precio).length, 2);
  });
  ok('PDF entero: 51 hojas y 78 códigos en el rango de Navidad', () => {
    assert.equal(completo.length, 51);
    const regla = leerPromos(completo).reglas.find((x) => x.desde === 2);
    assert.equal(codigosDeRegla(completo, regla).codigos.length, 78);
  });
} else {
  console.log('  --  PDF entero: no está en esta máquina, se prueba solo con el fixture');
}

ok('precioCadaUno: la mitad del par hacia abajo, como el catálogo ($30.999 -> $15.499)', () => {
  assert.equal(precioCadaUno(30999), 15499);
  assert.equal(precioCadaUno(30000), 15000);
  assert.equal(precioCadaUno(0), 0);
  assert.equal(precioCadaUno(undefined), 0);
});

console.log(`\n${n} pruebas, todas pasan.`);
