/*
  Controles flotantes: el vidrio (.tglass-clear) y todo lo que lleve
  [data-flotante] se inclina hacia el cursor cuando se acerca, sube y abre su
  sombra al pasar por encima, y un brillo le sigue la luz.

  - Solo con mouse (`hover: hover` + `pointer: fine`) y sin reduced-motion. En
    el celular no se descarga nada: la libreria (`motion`) entra por import
    dinamico, despues de comprobar eso. Si el dispositivo cambia (se enchufa un
    mouse, se activa reduced-motion) se monta o se desmonta sola.
  - Un solo oyente de pointermove en la raiz (delegacion) y una pasada por
    cuadro. Con el cursor quieto, el scroll (Lenis o ruedita) tambien dispara la
    pasada, por el oyente unico de la casa (alScroll.js): lo que se fue vuelve a
    reposo y lo que llega bajo el cursor reacciona.
  - La pasada lee todo primero (rects, estilos) y escribe despues: nada de
    lecturas intercaladas con escrituras.
  - El desplazamiento va por la propiedad CSS `translate` (individual) leyendo
    las variables --fx / --fy, asi no pisa el `transform` del :active ni el
    `translate: 0 -50%` de las flechas (ellas lo componen en su JSX). La
    sombra es una capa (::before) que solo cambia de opacity (--el) y el brillo
    otra (::after) que cambia de opacity (--gl) y se mueve con `translate`
    (--gx / --gy, en px): solo transform y opacity, nada se repinta.
*/
import { alScroll } from './alScroll.js';

const ALCANCE = 90;     // px del borde en que empieza a notarse
const MAX = 6;          // px de inclinacion maxima
const ELEVA = 1.5;      // px que sube al pasar por encima
const SELECTOR = '.tglass-clear, [data-flotante]';
const SPRING = { stiffness: 180, damping: 24, mass: 1, restDelta: 0.01, restSpeed: 0.01 };
// Canal -> variable CSS. Los de posicion van en px; el resto, sin unidad.
const NOMBRES = { x: '--fx', y: '--fy', e: '--el', g: '--gl', gx: '--gx', gy: '--gy' };
const EN_PX = { x: true, y: true, gx: true, gy: true };

export function montarFlotantes(raiz = document) {
  if (typeof window === 'undefined' || !raiz) return () => {};
  const mqMouse = window.matchMedia('(hover: hover) and (pointer: fine)');
  const mqQuieto = window.matchMedia('(prefers-reduced-motion: reduce)');

  let limpiar = null;   // desmontaje del sistema, si esta montado
  let pidiendo = false; // hay un import en vuelo
  let destruido = false;

  function evaluar() {
    const permitido = mqMouse.matches && !mqQuieto.matches;
    if (permitido && !limpiar && !pidiendo && !destruido) {
      pidiendo = true;
      import('motion').then(({ spring }) => {
        pidiendo = false;
        // Si mientras bajaba cambio la condicion, no se monta.
        if (destruido || limpiar || !(mqMouse.matches && !mqQuieto.matches)) return;
        limpiar = iniciar(raiz, spring);
      }).catch(() => { pidiendo = false; });
    } else if (!permitido && limpiar) {
      limpiar();
      limpiar = null;
    }
  }

  mqMouse.addEventListener('change', evaluar);
  mqQuieto.addEventListener('change', evaluar);
  evaluar();

  return () => {
    destruido = true;
    mqMouse.removeEventListener('change', evaluar);
    mqQuieto.removeEventListener('change', evaluar);
    if (limpiar) { limpiar(); limpiar = null; }
  };
}

/* El resorte es el generador `spring` de motion (la fisica, sin el motor de
   animacion completo: medido en el build, el chunk que lo trae pesa 1,96 kB
   gzip). Un solo bucle de cuadros mueve todos los valores y, al cambiar de
   destino, el nuevo resorte arranca con la velocidad que llevaba el anterior:
   nada de saltos. */
function iniciar(raiz, spring) {
  const base = raiz.documentElement || raiz;
  const estado = new Map(); // el -> { v: { x, y, e, g, gx, gy }, activo }
  let lista = null;
  let puntero = null;        // { x, y } del ultimo movimiento; null = no hay cursor
  let cuadro = 0;
  let bucle = 0;
  let tPrev = 0;
  let sinScroll = null;      // baja del oyente de scroll, mientras haya cursor

  function pedirPasada() { if (!cuadro) cuadro = requestAnimationFrame(pasada); }

  const mo = new MutationObserver((registros) => {
    lista = null;
    // Un dialogo que se abre pone `inert` al resto: que los controles de atras
    // se enteren sin esperar a que el mouse se mueva.
    if (puntero && registros.some((r) => r.type === 'attributes')) pedirPasada();
  });
  mo.observe(base, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'inert'] });

  function de(el) {
    let st = estado.get(el);
    if (!st) {
      const v = () => ({ pos: 0, vel: 0, meta: 0, gen: null, t0: 0 });
      st = { v: { x: v(), y: v(), e: v(), g: v(), gx: v(), gy: v() }, activo: false };
      estado.set(el, st);
    }
    return st;
  }

  function ir(st, k, valor) {
    const s = st.v[k];
    if (s.meta === valor) return;
    s.meta = valor;
    s.t0 = performance.now();
    s.gen = spring({ keyframes: [s.pos, valor], velocity: s.vel, ...SPRING });
    if (!bucle) { tPrev = performance.now(); bucle = requestAnimationFrame(correr); }
  }

  function correr(ahora) {
    bucle = 0;
    let sigue = false;
    for (const [el, st] of estado) {
      if (!el.isConnected) { estado.delete(el); continue; }
      for (const k in st.v) {
        const s = st.v[k];
        if (!s.gen) continue;
        const r = s.gen.next(Math.max(0, ahora - s.t0));
        const antes = s.pos;
        s.pos = r.value;
        const dt = Math.max(ahora - tPrev, 1) / 1000;
        s.vel = (s.pos - antes) / dt;   // por segundo, para el proximo cambio
        if (r.done) { s.pos = s.meta; s.vel = 0; s.gen = null; } else sigue = true;
        el.style.setProperty(NOMBRES[k], EN_PX[k] ? `${s.pos.toFixed(2)}px` : s.pos.toFixed(3));
      }
    }
    tPrev = ahora;
    if (sigue) bucle = requestAnimationFrame(correr);
  }

  function reposo(st) {
    for (const k in st.v) ir(st, k, 0);
    st.activo = false;
  }

  // Vivo = se ve, se puede tocar y no esta detras de un dialogo.
  function vivo(el, r) {
    if (r.width === 0 || r.height === 0 || el.disabled || el.getAttribute('aria-disabled') === 'true') return false;
    if (el.closest('[inert]')) return false;
    const cs = getComputedStyle(el);
    return cs.pointerEvents !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.05;
  }

  function pasada() {
    cuadro = 0;
    const p = puntero;
    if (!p) return;
    lista = lista || [...raiz.querySelectorAll(SELECTOR)];

    // 1) Leer todo. Nada de escribir en el DOM hasta terminar.
    const lecturas = [];
    for (const el of lista) {
      if (!el.isConnected) { estado.delete(el); continue; }
      const st = estado.get(el);
      const r = el.getBoundingClientRect();
      // El rect ya trae nuestro propio desplazamiento (translate) y el scale
      // del :active: el centro se recupera restando lo primero, y el tamano
      // real sale del layout (offsetWidth no sabe de transformaciones).
      const cx = r.left + r.width / 2 - (st ? st.v.x.pos : 0);
      const cy = r.top + r.height / 2 - (st ? st.v.y.pos : 0);
      const w = el.offsetWidth || r.width;
      const h = el.offsetHeight || r.height;
      const dx = Math.max(cx - w / 2 - p.x, 0, p.x - (cx + w / 2));
      const dy = Math.max(cy - h / 2 - p.y, 0, p.y - (cy + h / 2));
      const d = Math.hypot(dx, dy);
      lecturas.push({ el, st, cx, cy, w, h, d, ok: d < ALCANCE && vivo(el, r) });
    }

    // 2) Escribir.
    for (const L of lecturas) {
      if (!L.ok) {
        if (L.st && L.st.activo) reposo(L.st);
        continue;
      }
      const { el, cx, cy, w, h, d } = L;
      const st = de(el);
      st.activo = true;
      const fuerza = 1 - d / ALCANCE;
      const suave = fuerza * fuerza * (3 - 2 * fuerza);
      // Direccion: el vector al centro, que se desvanece al llegar al medio
      // (adentro del boton no hay un "hacia donde" y no debe temblar).
      const vx = p.x - cx;
      const vy = p.y - cy;
      const medio = Math.max(Math.hypot(w, h) / 2, 1);
      const norm = Math.max(Math.hypot(vx, vy), medio * 0.7);
      const adentro = d === 0;
      ir(st, 'x', (vx / norm) * MAX * suave);
      ir(st, 'y', (vy / norm) * MAX * suave - (adentro ? ELEVA : 0));
      ir(st, 'e', adentro ? 1 : fuerza * 0.25);
      ir(st, 'g', adentro ? 1 : 0);
      // El brillo (un gradiente fijo de radio 0,35 del lado corto) sigue al
      // cursor, pero solo hasta donde su disco entra entero en la forma.
      if (adentro) {
        const m = Math.min(w, h);
        const limX = Math.max(w / 2 - 0.35 * m, 0);
        const limY = Math.max(h / 2 - 0.35 * m, 0);
        ir(st, 'gx', Math.max(-limX, Math.min(limX, vx)));
        ir(st, 'gy', Math.max(-limY, Math.min(limY, vy)));
      }
    }
  }

  // Con el cursor quieto el mundo se mueve: el scroll vuelve a medir.
  function escucharScroll() { if (!sinScroll) sinScroll = alScroll(pedirPasada); }
  function soltarScroll() { if (sinScroll) { sinScroll(); sinScroll = null; } }

  function mover(e) {
    if (e.pointerType === 'touch') return;
    puntero = { x: e.clientX, y: e.clientY };
    escucharScroll();
    pedirPasada();
  }
  function todosAlReposo() {
    puntero = null;
    soltarScroll();
    if (cuadro) { cancelAnimationFrame(cuadro); cuadro = 0; }
    for (const [el, st] of estado) { if (el.isConnected) reposo(st); else estado.delete(el); }
  }
  function salio(e) { if (!e.relatedTarget) todosAlReposo(); }
  function oculta() { if (document.hidden) todosAlReposo(); }

  raiz.addEventListener('pointermove', mover, { passive: true });
  base.addEventListener('pointerleave', todosAlReposo);
  document.addEventListener('mouseout', salio);
  addEventListener('blur', todosAlReposo);
  document.addEventListener('visibilitychange', oculta);

  return () => {
    raiz.removeEventListener('pointermove', mover);
    base.removeEventListener('pointerleave', todosAlReposo);
    document.removeEventListener('mouseout', salio);
    removeEventListener('blur', todosAlReposo);
    document.removeEventListener('visibilitychange', oculta);
    mo.disconnect();
    soltarScroll();
    if (cuadro) cancelAnimationFrame(cuadro);
    if (bucle) cancelAnimationFrame(bucle);
    for (const [el] of estado) {
      for (const v of Object.values(NOMBRES)) el.style.removeProperty(v);
    }
    estado.clear();
  };
}
