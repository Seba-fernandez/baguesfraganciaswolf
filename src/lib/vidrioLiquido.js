/**
 * Vidrio liquido: lente real en el canto de cada superficie de vidrio.
 *
 * El vidrio de verdad no es un panel translucido: es una lente. En el canto la
 * superficie se curva y desvia la luz, asi que el fondo que se ve a traves se
 * estira y se quiebra justo ahi, mientras el centro queda plano y limpio. Eso
 * es lo que hace leer "cristal" y no "plastico esmerilado".
 *
 * Como se hace:
 *  1. Por cada tamano de elemento (ancho, alto, radio) se dibuja en un canvas un
 *     mapa de desplazamiento: la distancia firmada al contorno redondeado da,
 *     en cada pixel, la normal del canto y cuanto se curva la lente ahi.
 *  2. Ese mapa entra a un filtro SVG (feImage + feDisplacementMap) que desplaza
 *     el fondo. Una sola pasada: probada con aberracion cromatica (tres pasadas,
 *     una por canal) se veia lindo pero triplicaba el costo del scroll.
 *  3. El elemento lo usa con backdrop-filter: url(#filtro) via la variable
 *     --lente, que tienda.css antepone al desenfoque.
 *
 * Solo en Chromium de escritorio: es el unico motor que acepta url() dentro de
 * backdrop-filter, y en el celular desplazar el fondo en cada cuadro traba. En
 * el resto queda el vidrio de CSS (canto especular, brillo, sombra), que se ve
 * bien por su cuenta. Los elementos del mismo tamano comparten filtro.
 */

// Solo controles: botones, flechas, paginas, promos. Las placas grandes y las
// tarjetas NO: el filtro desplaza TODA la superficie en cada cuadro del scroll,
// y medido, en una placa de 1280×500 o en doce tarjetas eso tiraba el scroll a
// 15-25 cuadros por segundo. Ahi el vidrio de CSS ya alcanza (y en las tarjetas
// la foto tapa casi todo el canto).
const SELECTOR = '.tglass-clear, .tbtn';
const AREA_MAXIMA = 90000; // px²: una barra de promo (~630×66) entra; una placa no.
const NS = 'http://www.w3.org/2000/svg';

export function lenteDisponible() {
  if (typeof window === 'undefined' || !window.CSS?.supports) return false;
  const ua = navigator.userAgent;
  const esChromium = /Chrome\/|Edg\//.test(ua) && !/Firefox|FxiOS|CriOS/.test(ua);
  if (!esChromium) return false;
  if (!CSS.supports('backdrop-filter', 'url(#a)')) return false;
  if (!matchMedia('(min-width: 768px) and (pointer: fine)').matches) return false;
  if (matchMedia('(prefers-reduced-transparency: reduce)').matches) return false;
  return true;
}

/**
 * Mapa de desplazamiento de un rectangulo redondeado.
 * R = desplazamiento en x, G = en y (128 = nada). El canto "tira" del fondo
 * hacia adentro con un perfil convexo: fuerte en el filo, nulo al entrar.
 */
function dibujarMapa(w, h, radio, bisel) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const hx = w / 2; const hy = h / 2;
  const r = Math.min(radio, hx, hy);
  const bx = hx - r; const by = hy - r;

  for (let y = 0; y < h; y++) {
    const py = y + 0.5 - hy;
    const ay = Math.abs(py);
    for (let x = 0; x < w; x++) {
      const px = x + 0.5 - hx;
      const ax = Math.abs(px);
      // Distancia firmada al contorno (negativa adentro) y normal hacia afuera.
      const qx = ax - bx; const qy = ay - by;
      let dist; let nx; let ny;
      if (qx > 0 && qy > 0) {
        const l = Math.hypot(qx, qy) || 1;
        dist = l - r; nx = qx / l; ny = qy / l;
      } else if (qx > qy) {
        dist = qx - r; nx = 1; ny = 0;
      } else {
        dist = qy - r; nx = 0; ny = 1;
      }
      nx *= Math.sign(px) || 1;
      ny *= Math.sign(py) || 1;

      const prof = -dist; // cuanto adentro del contorno
      let m = 0;
      if (prof > 0 && prof < bisel) {
        // Perfil de superficie tipo squircle: la pendiente es maxima en el filo
        // y se apaga suave. La desviacion de la luz es proporcional a esa pendiente.
        const t = 1 - prof / bisel;
        m = t * t * (1.6 - 0.6 * t);
      }
      const i = (y * w + x) * 4;
      // Muestrear hacia ADENTRO: el fondo del centro se estira hacia el canto.
      d[i] = 128 - nx * m * 127;
      d[i + 1] = 128 - ny * m * 127;
      d[i + 2] = 128;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL('image/png');
}

function crearFiltro(defs, id, w, h, radio) {
  // Bisel proporcional al lado corto: un boton chico tiene canto fino, una
  // placa grande, canto ancho. Con tope, si no las placas enormes quedan blandas.
  const corto = Math.min(w, h);
  const bisel = Math.max(8, Math.min(corto * 0.4, 32));
  // En los controles chicos la lente va suave: fuerte, un circulo de 44px se
  // vuelve una lupa de ojo de pez sobre lo que tenga atras.
  const escala = corto < 60 ? bisel * 1.1 : Math.max(12, Math.min(bisel * 1.9, 60));
  const mapa = dibujarMapa(w, h, radio, bisel);

  const f = document.createElementNS(NS, 'filter');
  f.setAttribute('id', id);
  f.setAttribute('x', '0'); f.setAttribute('y', '0');
  f.setAttribute('width', String(w)); f.setAttribute('height', String(h));
  f.setAttribute('filterUnits', 'userSpaceOnUse');
  f.setAttribute('color-interpolation-filters', 'sRGB');
  f.innerHTML = `
    <feImage href="${mapa}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="mapa"/>
    <feDisplacementMap in="SourceGraphic" in2="mapa" scale="${escala}" xChannelSelector="R" yChannelSelector="G"/>`;
  defs.appendChild(f);
}

/**
 * Engancha el vidrio liquido a todo lo que tenga clase de vidrio adentro de
 * `raiz`, incluido lo que aparezca despues (paginas, cajon del pedido, ficha).
 * Devuelve la funcion de limpieza.
 */
export function montarVidrioLiquido(raiz) {
  if (!raiz || !lenteDisponible()) return () => {};

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
  const defs = document.createElementNS(NS, 'defs');
  svg.appendChild(defs);
  raiz.appendChild(svg);

  const filtros = new Map(); // "w×h×r" -> id
  const vistos = new WeakSet();

  const aplicar = (el) => {
    const w = Math.round(el.offsetWidth);
    const h = Math.round(el.offsetHeight);
    if (w < 8 || h < 8 || w * h > AREA_MAXIMA) { el.style.removeProperty('--lente'); return; }
    const cs = getComputedStyle(el);
    const radio = Math.min(parseFloat(cs.borderTopLeftRadius) || 0, h / 2, w / 2);
    const clave = `${w}x${h}x${Math.round(radio)}`;
    let id = filtros.get(clave);
    if (!id) {
      id = `vl-${filtros.size}`;
      crearFiltro(defs, id, w, h, radio);
      filtros.set(clave, id);
    }
    el.style.setProperty('--lente', `url(#${id})`);
  };

  const ro = new ResizeObserver((entradas) => {
    for (const e of entradas) aplicar(e.target);
  });

  const registrar = (nodo) => {
    if (!(nodo instanceof Element)) return;
    const lista = nodo.matches(SELECTOR) ? [nodo] : [];
    lista.push(...nodo.querySelectorAll(SELECTOR));
    for (const el of lista) {
      if (vistos.has(el)) continue;
      vistos.add(el);
      ro.observe(el);
    }
  };

  registrar(raiz);
  const mo = new MutationObserver((muts) => {
    for (const m of muts) m.addedNodes.forEach(registrar);
  });
  mo.observe(raiz, { childList: true, subtree: true });
  raiz.classList.add('tlente');

  return () => {
    mo.disconnect();
    ro.disconnect();
    svg.remove();
    raiz.classList.remove('tlente');
  };
}
