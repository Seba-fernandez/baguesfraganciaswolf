import fs from 'node:fs';

/**
 * Genera los fondos de la tienda, en SVG (nitidos a cualquier tamano y
 * livianos):
 *
 *   public/hero/duna.svg        la escena del hero: dunas de arena al atardecer
 *   public/hero/duna-movil.svg  la misma escena, cuadrada y centrada, para el celular
 *   public/fondo/surcos.svg     la textura de toda la pagina: surcos sinoidales finos
 *
 * Si se cambia el piso (base de la ultima capa) o el foco, hay que tocar las
 * cuentas de posicion del frasco en Hero.module.css.
 *
 *   npm run fondo:duna
 *
 * Que se busca: el grano "crispy" de la arena, no un degradado blando. Eso lo
 * dan los filos: la cresta de cada duna tiene una linea de luz nitida, la cara
 * de sombra es un plano mas oscuro con borde definido, y encima van decenas de
 * ondulas finas (los surcos que deja el viento). El grano de pelicula va en CSS.
 *
 * Todo es determinista (semilla fija): correrlo dos veces da el mismo archivo.
 */

// ---------- azar con semilla ----------
function azar(semilla) {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f1 = (n) => Math.round(n * 10) / 10;

/** Suma de senos: la forma de una cresta. */
function onda(componentes) {
  return (x) => componentes.reduce((acc, [amp, largo, fase]) => acc + amp * Math.sin((x / largo) * Math.PI * 2 + fase), 0);
}

/** Curva y(x) muestreada en una polilinea suave (curvas cuadraticas por puntos medios). */
function trazo(ys, W, paso) {
  const pts = [];
  for (let x = -paso; x <= W + paso; x += paso) pts.push([x, ys(x)]);
  let d = `M${f1(pts[0][0])},${f1(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    const [nx, ny] = pts[i + 1];
    d += ` Q${f1(x)},${f1(y)} ${f1((x + nx) / 2)},${f1((y + ny) / 2)}`;
  }
  const u = pts[pts.length - 1];
  d += ` L${f1(u[0])},${f1(u[1])}`;
  return d;
}

// =============================================================================
// 1) ESCENA DEL HERO
// =============================================================================
/**
 * W×H: tamano del dibujo. foco: x (0..1) donde va el frasco; el sol va detras,
 * apenas corrido. Escritorio: apaisado con el frasco a la derecha. Celular:
 * cuadrado con el frasco al centro.
 */
function escena({ W, H, foco }) {
  const sol = foco + (W > H ? 0.02 : 0);
  const radioSol = W > H ? 118 : 150;
  const r = azar(1407);

  // Capas de atras hacia adelante. base = altura media de la cresta (0..1 de H).
  // luz / sombra: la cara iluminada y la cara del viento, en la paleta ambar noir.
  const capas = [
    { base: 0.50, ondas: [[34, 1400, 0.4], [16, 520, 2.1], [6, 210, 1.2]], luz: ['#b8683f', '#7d3b25'], sombra: '#5a2618', surcos: 10, alfa: 1 },
    { base: 0.60, ondas: [[46, 1700, 2.6], [20, 610, 0.3], [7, 260, 4.0]], luz: ['#cf8450', '#8f4a2c'], sombra: '#6a2a24', surcos: 14, alfa: 1 },
    { base: 0.71, ondas: [[40, 1900, 5.0], [18, 700, 1.7], [6, 300, 0.8]], luz: ['#dc9b62', '#a45a36'], sombra: '#7a3432', surcos: 18, alfa: 1 },
    // El piso: casi plano alrededor del foco, donde se para el frasco.
    { base: 0.84, ondas: [[26, 2600, 3.3], [9, 880, 0.9], [3, 330, 2.2]], luz: ['#e7b27a', '#b76c3f'], sombra: '#8a4436', surcos: 26, alfa: 1 },
  ];

  let defs = `
    <linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1b110c"/>
      <stop offset="0.38" stop-color="#3b2117"/>
      <stop offset="0.62" stop-color="#7a3d26"/>
      <stop offset="1" stop-color="#b0613a"/>
    </linearGradient>
    <radialGradient id="sol" cx="${sol}" cy="0.36" r="0.46">
      <stop offset="0" stop-color="#ffd9a0" stop-opacity="0.55"/>
      <stop offset="0.22" stop-color="#f2b068" stop-opacity="0.34"/>
      <stop offset="0.55" stop-color="#d27c4a" stop-opacity="0.14"/>
      <stop offset="1" stop-color="#d27c4a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vino" cx="0.12" cy="0.62" r="0.5">
      <stop offset="0" stop-color="#e0708a" stop-opacity="0.34"/>
      <stop offset="1" stop-color="#e0708a" stop-opacity="0"/>
    </radialGradient>`;

  // El sol: un disco bajo y nitido detras de donde va el frasco (contraluz), con
  // su halo. Un disco definido se lee afiche; una mancha difusa, plantilla.
  defs += `
    <clipPath id="disco"><circle cx="${sol * W}" cy="${0.44 * H}" r="${radioSol}"/></clipPath>
    <linearGradient id="discoG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffe3b3"/>
      <stop offset="1" stop-color="#f29a5c"/>
    </linearGradient>`;
  let cuerpo = `<rect width="${W}" height="${H}" fill="url(#cielo)"/><rect width="${W}" height="${H}" fill="url(#sol)"/>`
    + `<g clip-path="url(#disco)"><rect x="${sol * W - radioSol}" y="${0.44 * H - radioSol}" width="${radioSol * 2}" height="${radioSol * 2}" fill="url(#discoG)" fill-opacity="0.92"/></g>`;

  capas.forEach((c, i) => {
    const y0 = c.base * H;
    const forma = onda(c.ondas);
    // El piso se aplana alrededor del frasco.
    const aplanar = i === capas.length - 1
      ? (x) => { const t = Math.exp(-(((x / W) - foco) ** 2) / 0.02); return 1 - 0.85 * t; }
      : () => 1;
    const cresta = (x) => y0 + forma(x) * aplanar(x);

    // Relleno: degradado vertical de la cara iluminada.
    defs += `
    <linearGradient id="c${i}" x1="0" y1="${f1(y0 - 60)}" x2="0" y2="${H}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${c.luz[0]}"/>
      <stop offset="1" stop-color="${c.luz[1]}"/>
    </linearGradient>`;
    cuerpo += `<path d="${trazo(cresta, W, 20)} L${W + 20},${H} L-20,${H} Z" fill="url(#c${i})"/>`;

    // Cara de sombra: donde la cresta baja hacia la derecha (pendiente positiva),
    // el viento deja un plano oscuro de borde nitido que muere hacia abajo.
    // La pendiente se suaviza con una gaussiana ancha: sin eso la sombra cae en
    // "colmillos" verticales. Suavizada, baja en diagonal como una cara real.
    const prof = 60 + i * 26;
    const PASO = 10;
    const xs = [];
    for (let x = -300; x <= W + 300; x += PASO) xs.push(x);
    const pend = xs.map((x) => (cresta(x + 6) - cresta(x - 6)) / 12);
    const sigma = 9; // en pasos: ~90px
    const suave = pend.map((_, j) => {
      let acc = 0; let peso = 0;
      for (let d = -3 * sigma; d <= 3 * sigma; d++) {
        const v = pend[j + d];
        if (v === undefined) continue;
        const w = Math.exp(-(d * d) / (2 * sigma * sigma));
        acc += v * w; peso += w;
      }
      return acc / peso;
    });
    const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
    const sombraBajo = (x) => {
      const j = Math.round((x + 300) / PASO);
      return cresta(x) + prof * smooth(0.02, 0.16, suave[j] ?? 0);
    };
    defs += `
    <linearGradient id="s${i}" x1="0" y1="${f1(y0 - 40)}" x2="0" y2="${f1(y0 + prof + 40)}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${c.sombra}" stop-opacity="0.78"/>
      <stop offset="1" stop-color="${c.sombra}" stop-opacity="0"/>
    </linearGradient>`;
    const ida = [];
    for (let x = -20; x <= W + 20; x += 10) ida.push(`${f1(x)},${f1(cresta(x))}`);
    const vuelta = [];
    for (let x = W + 20; x >= -20; x -= 10) vuelta.push(`${f1(x)},${f1(sombraBajo(x))}`);
    cuerpo += `<path d="M${ida.join(' L')} L${vuelta.join(' L')} Z" fill="url(#s${i})"/>`;

    // Surcos: ondulas finas que siguen la cresta hacia abajo, cada una con su
    // fase. Alternan oscuro y claro: eso es lo que se lee como arena nitida.
    for (let k = 1; k <= c.surcos; k++) {
      const sep = 7 + k * (2.4 + i * 0.9);
      const fase = r() * Math.PI * 2;
      const largo = 90 + r() * 70 + i * 20;
      const amp = 1.6 + r() * 2.2 + i * 0.6;
      const ys = (x) => cresta(x) + sep + amp * Math.sin((x / largo) * Math.PI * 2 + fase) + 3 * Math.sin(x / 400 + k);
      const oscuro = k % 2 === 0;
      // Las de adelante mas marcadas: estan mas cerca y es donde flota el vidrio
      // de las promos, que necesita detalle nitido para mostrar su lente.
      const cerca = i === capas.length - 1 ? 1.7 : 1;
      const op = (oscuro ? 0.2 : 0.16) * cerca * (1 - k / (c.surcos + 6));
      cuerpo += `<path d="${trazo(ys, W, 14)}" fill="none" stroke="${oscuro ? '#3a160c' : '#ffe2b8'}" stroke-opacity="${op.toFixed(3)}" stroke-width="${((oscuro ? 1.1 : 0.9) * (cerca > 1 ? 1.25 : 1)).toFixed(2)}"/>`;
    }

    // El filo de luz de la cresta: nitido, lo que separa "foto" de "degradado".
    cuerpo += `<path d="${trazo(cresta, W, 12)}" fill="none" stroke="#ffe7c2" stroke-opacity="${(0.34 + i * 0.08).toFixed(2)}" stroke-width="1.4"/>`;
  });

  cuerpo += `<rect width="${W}" height="${H}" fill="url(#vino)"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMax slice"><defs>${defs}</defs>${cuerpo}</svg>`;
}

// =============================================================================
// 2) SURCOS DE PAGINA
// =============================================================================
// Lineas sinoidales finas, muy tenues, en oro de arena, que bajan por toda la
// pagina. Son lo que le da al vidrio algo con detalle que refractar: una linea
// que se quiebra al cruzar el canto es lo que hace leer "lente".
function surcos() {
  const W = 1600;
  const H = 3200;
  const r = azar(88);
  let cuerpo = '';
  // Bandas: grupos de lineas paralelas con separacion creciente, como una duna
  // vista desde arriba.
  const bandas = 11;
  for (let b = 0; b < bandas; b++) {
    const y0 = (b + 0.3 + r() * 0.4) * (H / bandas);
    const comps = [[40 + r() * 50, 900 + r() * 900, r() * 6], [14 + r() * 16, 280 + r() * 260, r() * 6]];
    const forma = onda(comps);
    const n = 5 + Math.floor(r() * 6);
    for (let k = 0; k < n; k++) {
      const sep = k * (9 + k * 2.2);
      const deriva = (r() - 0.5) * 1.2;
      const ys = (x) => y0 + forma(x) + sep + deriva * Math.sin(x / 170 + k);
      const op = 0.13 * (1 - k / (n + 1));
      const color = b % 3 === 1 ? '#e0708a' : '#d6a862';
      cuerpo += `<path d="${trazo(ys, W, 24)}" fill="none" stroke="${color}" stroke-opacity="${op.toFixed(3)}" stroke-width="1"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="none">${cuerpo}</svg>`;
}

fs.mkdirSync('public/hero', { recursive: true });
fs.mkdirSync('public/fondo', { recursive: true });
const a = escena({ W: 1600, H: 1000, foco: 0.74 });
const m = escena({ W: 1000, H: 1000, foco: 0.5 });
const b = surcos();
fs.writeFileSync('public/hero/duna.svg', a);
fs.writeFileSync('public/hero/duna-movil.svg', m);
fs.writeFileSync('public/fondo/surcos.svg', b);
console.log(`duna.svg ${(a.length / 1024).toFixed(1)} kB · surcos.svg ${(b.length / 1024).toFixed(1)} kB`);
