import fs from 'node:fs';
import sharp from 'sharp';

/**
 * Genera public/fondo.jpg: haces diagonales finos, cruzados, con la nitidez de
 * una fibra optica y no el desenfoque de un degradado.
 *
 *   npm run fondo
 *
 * Que se busca: sensacion de spray, de aroma en el aire. Eso no lo da un
 * degradado suave, lo da la diferencia entre miles de trazos finos brillantes y
 * el negro que queda entre ellos.
 *
 * El verde es brillante a proposito. No hay texto apoyado sobre el fondo crudo:
 * en la web el hero va sobre una placa de vidrio y el resto del contenido queda
 * mas abajo, donde el telon ya se desvanecio al oscuro. Por eso los haces
 * pueden encenderse sin romper la lectura. El calculo de contraste que imprime
 * al final es solo informativo: mide contra el peor pixel, que es justo donde
 * nunca cae una letra.
 *
 * El grano NO va en la imagen. Va en CSS, con ruido SVG encima, porque el grano
 * dentro de un JPEG multiplica el peso por cinco y se come la compresion.
 */

const W = 1600;
const H = 1000;
const SALIDA = 'public/fondo.jpg';

// ---------- paleta ----------
// De la sombra al haz mas encendido. Verde teal, saturado, como la referencia
// que paso el: la imagen tiene que leerse VERDE, no verde apagado sobre negro.
// El texto no se apoya sobre estos haces, va sobre vidrio, asi que los haces
// pueden ser brillantes sin romper la lectura.
const PALETA = [
  [7, 20, 17],
  [12, 36, 30],
  [20, 60, 47],
  [32, 92, 68],
  [50, 132, 95],
  [74, 180, 128],
  [104, 216, 158],
];

/** Luminancia relativa de la norma de accesibilidad. */
function luminancia(r, g, b) {
  const c = (v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
}

// ---------- azar repetible ----------
// Semilla fija: dos corridas dan la misma imagen. Si el fondo gusta, queda; si
// hay que retocarlo, se cambia la semilla y sale otro sin tocar el resto.
let semilla = 20260909;
function azar() {
  semilla = (semilla * 1664525 + 1013904223) >>> 0;
  return semilla / 4294967296;
}
const entre = (a, b) => a + azar() * (b - a);

/**
 * Campo de energia: donde el fondo respira y donde se apaga. Suma de ondas
 * largas cruzadas, sin periodo comun, para que no se lea como trama repetida.
 * Eso fue lo que arruino la version anterior del fondo.
 */
function energia(x, y) {
  const u = x / W;
  const v = y / H;
  let e = 0;
  e += Math.sin((u * 2.1 + v * 1.3) * Math.PI * 1.7 + 0.6);
  e += 0.7 * Math.sin((u * 1.1 - v * 2.4) * Math.PI * 1.3 + 2.1);
  e += 0.5 * Math.sin((u * 3.3 + v * 0.7) * Math.PI * 0.9 + 4.2);
  e += 0.4 * Math.sin((u * 0.6 - v * 1.1) * Math.PI * 2.6 + 1.4);
  const base = Math.max(0, Math.min(1, (e / 2.6 + 1) / 2));
  // Se le sube el contraste al campo, pero suave: la luz se junta en bandas
  // anchas y deja zonas mas calmas, sin apagarse a negro. Muy agresivo y la
  // imagen se leia como metal cepillado sobre negro en vez de aire verde.
  return Math.pow(base, 1.5);
}

// ---------- lienzo ----------
const px = new Float32Array(W * H * 3);
for (let i = 0; i < W * H; i++) {
  px[i * 3] = PALETA[0][0];
  px[i * 3 + 1] = PALETA[0][1];
  px[i * 3 + 2] = PALETA[0][2];
}

/** Toma un color de la paleta con posicion continua, interpolando entre dos. */
function color(t) {
  const p = Math.max(0, Math.min(0.999, t)) * (PALETA.length - 1);
  const i = Math.floor(p);
  const f = p - i;
  const a = PALETA[i];
  const b = PALETA[i + 1] || a;
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

/** Suma luz en un pixel, con cobertura fraccionaria para que el borde no dentee. */
function sumar(x, y, rgb, alfa) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] += rgb[0] * alfa;
  px[i + 1] += rgb[1] * alfa;
  px[i + 2] += rgb[2] * alfa;
}

/**
 * Un haz: una linea fina que aparece de la nada, sube de intensidad y se apaga.
 * El perfil a lo largo es lo que le da aire de rastro y no de raya dibujada.
 */
function haz(x0, y0, angulo, largo, grosor, t, alfaMax) {
  const dx = Math.cos(angulo);
  const dy = Math.sin(angulo);
  const nx = -dy;
  const ny = dx;
  const rgb = color(t);
  const pasos = Math.ceil(largo);

  for (let s = 0; s < pasos; s++) {
    const p = s / pasos;
    // Entra y sale suave, con el pico corrido al azar dentro del haz.
    const perfil = Math.sin(Math.PI * Math.pow(p, 0.75));
    const alfa = alfaMax * perfil;
    if (alfa <= 0.002) continue;

    const cx = x0 + dx * s;
    const cy = y0 + dy * s;

    for (let g = -grosor; g <= grosor; g += 0.5) {
      const caida = 1 - Math.abs(g) / (grosor + 0.5);
      if (caida <= 0) continue;
      const fx = cx + nx * g;
      const fy = cy + ny * g;
      const ix = Math.floor(fx);
      const iy = Math.floor(fy);
      const rx = fx - ix;
      const ry = fy - iy;
      const a = alfa * caida * 0.5;
      sumar(ix, iy, rgb, a * (1 - rx) * (1 - ry));
      sumar(ix + 1, iy, rgb, a * rx * (1 - ry));
      sumar(ix, iy + 1, rgb, a * (1 - rx) * ry);
      sumar(ix + 1, iy + 1, rgb, a * rx * ry);
    }
  }
}

// ---------- una sola direccion ----------
// La referencia tiene los trazos en una unica diagonal, no cruzados. Cruzarlos
// fue el error: se leia como reja. Todos van en el mismo sentido, con una leve
// abertura de angulo para que no parezcan copiados.
const GRADOS = -37;
const JITTER = 4.5;
const anguloDe = (spread) => ((GRADOS + entre(-spread, spread)) * Math.PI) / 180;

const HACES = 17000;
for (let n = 0; n < HACES; n++) {
  // Nacen fuera del borde tambien, para que ninguno arranque en seco en el canto.
  const x0 = entre(-300, W + 300);
  const y0 = entre(-300, H + 300);

  const e = energia(x0, y0);
  // Cobertura pareja: hasta la zona mas calma recibe algo, para que no caiga a
  // negro. La diferencia entre banda y calma la marca el brillo, no el vacio.
  if (azar() > 0.4 + e * 0.6) continue;

  // Donde el campo tiene energia, los haces son mas largos y mas claros.
  const largo = entre(60, 180) + e * entre(160, 700);

  // Grosor bien repartido: la mayoria finos, algunos anchos que dan cuerpo.
  const g = azar();
  const grosor = g < 0.58 ? 0.6 : g < 0.88 ? 1.3 : entre(2.2, 4.0);

  const t = Math.min(0.999, Math.pow(azar(), 1.5) * 0.5 + e * 0.78);
  const alfa = entre(0.1, 0.55) * (0.3 + e * 1.05);

  haz(x0, y0, anguloDe(JITTER), largo, grosor, t, alfa);
}

// Destellos cortos y bien definidos: son los que hacen que el ojo lea la imagen
// como nitida y no como una nube. Van sobre todo donde ya hay luz.
for (let n = 0; n < 2600; n++) {
  const x0 = entre(0, W);
  const y0 = entre(0, H);
  const e = energia(x0, y0);
  if (e < 0.35) continue;
  haz(x0, y0, anguloDe(2.5), entre(24, 140), azar() < 0.7 ? 0.6 : 1.1, entre(0.82, 1.0), entre(0.5, 1.05));
}

// ---------- vineta ----------
// Cierra los bordes. Sin esto la imagen se derrama y el contenido flota.
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const u = (x / W - 0.5) * 2;
    const v = (y / H - 0.5) * 2;
    const d = Math.sqrt(u * u + v * v * 0.85);
    const k = Math.max(0.6, 1 - Math.pow(Math.max(0, d - 0.42) / 1.25, 1.7));
    const i = (y * W + x) * 3;
    px[i] *= k;
    px[i + 1] *= k;
    px[i + 2] *= k;
  }
}

// ---------- compresion de altas luces ----------
/**
 * Los haces se suman, y donde se cruzan varios el color se pasa del techo de la
 * paleta. Bajarle brillo a toda la imagen apagaria tambien las sombras y se
 * perderia justo lo que le da nitidez.
 *
 * Asi que se comprime solo la punta: hasta LCODO no se toca nada, y de ahi para
 * arriba la curva se acerca a LTECHO sin alcanzarlo nunca. LTECHO sale del
 * calculo de contraste, no del gusto: es el pixel mas claro que tolera el texto
 * mas tenue de la web.
 */
// El texto ya no se apoya sobre el fondo crudo (va sobre vidrio), asi que el
// techo se relaja: solo frena los cruces mas extremos, que si no quemarian a
// blanco y romperian el verde. La imagen queda clara y verde a proposito.
const LTECHO = 0.24;
const LCODO = 0.11;

for (let i = 0; i < W * H; i++) {
  const r = px[i * 3];
  const g = px[i * 3 + 1];
  const b = px[i * 3 + 2];
  const l = luminancia(Math.min(255, r), Math.min(255, g), Math.min(255, b));
  if (l <= LCODO) continue;
  const exceso = l - LCODO;
  const margen = LTECHO - LCODO;
  const lNueva = LCODO + margen * (1 - Math.exp(-exceso / margen));
  // La luminancia va con la potencia del sRGB, asi que el factor sobre el valor
  // del pixel es la raiz de esa potencia, no la razon directa.
  const k = Math.pow(lNueva / l, 1 / 2.4);
  px[i * 3] = r * k;
  px[i * 3 + 1] = g * k;
  px[i * 3 + 2] = b * k;
}

// ---------- a bytes, midiendo el pico ----------
const bytes = Buffer.allocUnsafe(W * H * 3);
let pico = 0;
let picoRGB = [0, 0, 0];
for (let i = 0; i < W * H; i++) {
  const r = Math.max(0, Math.min(255, px[i * 3]));
  const g = Math.max(0, Math.min(255, px[i * 3 + 1]));
  const b = Math.max(0, Math.min(255, px[i * 3 + 2]));
  bytes[i * 3] = r;
  bytes[i * 3 + 1] = g;
  bytes[i * 3 + 2] = b;
  const l = luminancia(r, g, b);
  if (l > pico) {
    pico = l;
    picoRGB = [Math.round(r), Math.round(g), Math.round(b)];
  }
}

await sharp(bytes, { raw: { width: W, height: H, channels: 3 } })
  .jpeg({ quality: 74, chromaSubsampling: '4:2:0', mozjpeg: true })
  .toFile(SALIDA);

const kb = Math.round(fs.statSync(SALIDA).size / 1024);
console.log('fondo escrito :', SALIDA, `${W}x${H}`, kb, 'kB');
console.log('pixel mas claro:', `rgb(${picoRGB.join(',')})`, 'luminancia', pico.toFixed(4));
console.log('(el contraste no se mide aca: ningun texto se apoya sobre el fondo crudo)');
