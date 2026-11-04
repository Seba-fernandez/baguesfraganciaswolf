// Pruebas de las cuentas del recorte de fondo (lib/recorte.js).
//   node scripts/qa/recorte.test.mjs
import assert from 'node:assert/strict';
import { tamanoTrabajo, yaSinFondo, entradaModelo, normalizarSalida, curvaAlfa, limpiarManchas, LADO_MODELO } from '../../src/lib/recorte.js';

let n = 0;
const ok = (nombre, fn) => { fn(); n++; console.log(`  ok  ${nombre}`); };

ok('tamanoTrabajo achica el lado largo a 1600 y nunca agranda', () => {
  assert.deepEqual(tamanoTrabajo(4000, 3000), { w: 1600, h: 1200 });
  assert.deepEqual(tamanoTrabajo(696, 663), { w: 696, h: 663 });
  assert.deepEqual(tamanoTrabajo(1000, 3000, 1500), { w: 500, h: 1500 });
  assert.throws(() => tamanoTrabajo(0, 10));
});

const imagen = (w, h, alfa) => {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) d[(y * w + x) * 4 + 3] = alfa(x, y);
  return d;
};

ok('yaSinFondo: un PNG recortado (borde transparente) sí', () => {
  const d = imagen(20, 30, (x, y) => (x > 4 && x < 15 && y > 4 && y < 25 ? 255 : 0));
  assert.equal(yaSinFondo(d, 20, 30), true);
});

ok('yaSinFondo: una foto común (todo opaco) no', () => {
  assert.equal(yaSinFondo(imagen(20, 30, () => 255), 20, 30), false);
});

ok('yaSinFondo: un frasco que toca el borde abajo sigue contando como recortado', () => {
  const d = imagen(20, 30, (x, y) => (x > 4 && x < 15 && y > 4 ? 255 : 0));
  assert.equal(yaSinFondo(d, 20, 30), true);
});

ok('entradaModelo: 3 canales separados y normalizados', () => {
  const lado = 2;
  const rgba = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255]);
  const e = entradaModelo(rgba, lado);
  assert.equal(e.length, 3 * lado * lado);
  assert.ok(Math.abs(e[0] - (1 - 0.485) / 0.229) < 1e-6); // rojo del primer pixel
  assert.ok(Math.abs(e[4 + 1] - (1 - 0.456) / 0.224) < 1e-6); // verde del segundo
  assert.ok(Math.abs(e[8 + 2] - (1 - 0.406) / 0.225) < 1e-6); // azul del tercero
  assert.equal(entradaModelo(new Uint8ClampedArray(LADO_MODELO * LADO_MODELO * 4)).length, 3 * LADO_MODELO * LADO_MODELO);
});

ok('normalizarSalida lleva el mínimo a 0 y el máximo a 1', () => {
  assert.deepEqual([...normalizarSalida([2, 4, 6])], [0, 0.5, 1]);
  assert.deepEqual([...normalizarSalida([3, 3])], [0, 0]);
});

ok('curvaAlfa: lo dudoso transparente, lo claro opaco, borde suave en el medio', () => {
  assert.equal(curvaAlfa(0.1), 0);
  assert.equal(curvaAlfa(0.35), 0);
  assert.equal(curvaAlfa(0.9), 255);
  const medio = curvaAlfa(0.575);
  assert.ok(medio > 100 && medio < 155);
  assert.ok(curvaAlfa(0.3) < curvaAlfa(0.5));
});

ok('limpiarManchas saca una mancha chica y deja dos objetos grandes', () => {
  const lado = 10;
  const m = new Float32Array(lado * lado);
  const pintar = (x0, y0, x1, y1, v = 1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) m[y * lado + x] = v; };
  pintar(1, 1, 4, 8);        // frasco: 32 pixeles
  pintar(6, 2, 8, 8);        // caja: 21 pixeles (mas del 15 %)
  pintar(9, 0, 9, 0);        // mancha: 1 pixel
  pintar(5, 9, 5, 9, 0.3);   // borde suave suelto: no cuenta como zona
  const r = limpiarManchas(m, lado);
  assert.equal(r[0 * lado + 9], 0);
  assert.equal(r[5 * lado + 2], 1);
  assert.equal(r[5 * lado + 7], 1);
  assert.ok(Math.abs(r[9 * lado + 5] - 0.3) < 1e-6);
  assert.equal(m[0 * lado + 9], 1); // no toca la original
});

console.log(`\n${n} pruebas del recorte, todas pasan.`);
