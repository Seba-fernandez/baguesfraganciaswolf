// La arena del papel, dibujada una vez (Sebas, 23/10: "en mi celu no se ve el
// granulado y en Safari si").
//
// Antes era un SVG con feTurbulence que cada navegador calculaba al pintar:
// Chrome y Safari daban grano distinto (medido: Safari, la mitad de fuerte) y
// el telefono tenia que calcular el filtro. Aca se calcula en Chromium, el
// dibujo que Sebas aprobo, y queda como una baldosa WebP de 180 px que se
// repite: igual en todos los navegadores y sin calculo al pintar.
//
//   node scripts/fondo/arena.mjs   ->  public/fondo/arena.webp
import { createRequire } from 'node:module';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

// Playwright no es dependencia del repo (el contenedor lo trae global): se pide
// con require, que lo encuentra donde este instalado.
const { chromium } = createRequire(import.meta.url)('playwright');
const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const LADO = 180;
// El mismo ruido que tenia --arena en tienda.css: tinta vino, alfa bajo.
const SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='${LADO}' height='${LADO}'><filter id='a'><feTurbulence type='fractalNoise' baseFrequency='1.6' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.16 0 0 0 0 0.04 0 0 0 0 0.05 0 0 0 0.24 -0.085'/></filter><rect width='100%' height='100%' filter='url(#a)'/></svg>`;

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: LADO, height: LADO }, deviceScaleFactor: 1 });
await pagina.setContent(`<style>html,body{margin:0;background:transparent}</style>${SVG}`);
const png = await pagina.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: LADO, height: LADO } });
await navegador.close();

const salida = path.join(RAIZ, 'public', 'fondo', 'arena.webp');
fs.mkdirSync(path.dirname(salida), { recursive: true });
// Solo importa el alfa: el color es siempre la tinta vino (41, 10, 13). Con el
// color fijo y el alfa en escalones de 3 la baldosa pesa la mitad y a la
// vista no cambia (el alfa va de 0 a 33 sobre 255).
const alfa = await sharp(png).extractChannel(3).raw().toBuffer();
const pixeles = Buffer.alloc(LADO * LADO * 4);
for (let i = 0; i < LADO * LADO; i++) {
  pixeles[i * 4] = 41; pixeles[i * 4 + 1] = 10; pixeles[i * 4 + 2] = 13;
  pixeles[i * 4 + 3] = Math.min(255, Math.round(alfa[i] / 3) * 3);
}
await sharp(pixeles, { raw: { width: LADO, height: LADO, channels: 4 } })
  .webp({ lossless: true, effort: 6 }).toFile(salida);
console.log(`arena: ${salida} (${(fs.statSync(salida).size / 1024).toFixed(1)} kB)`);
