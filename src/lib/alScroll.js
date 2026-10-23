// ============================================================================
// alScroll.js: un solo oyente de scroll para toda la tienda.
//
// Antes cada pieza escuchaba el scroll por su cuenta (la luz de la barra, el
// boton de volver arriba) y algunas recalculaban en cada evento, que en el
// celular llegan varios por cuadro. Ahora hay un oyente pasivo y una sola
// pasada por cuadro (requestAnimationFrame) que avisa a quien se suscribio.
// ============================================================================

const suscriptos = new Set();
let cuadro = 0;
let montado = false;

function correr() {
  cuadro = 0;
  const y = window.scrollY;
  suscriptos.forEach((fn) => fn(y));
}

function pedir() {
  if (!cuadro) cuadro = requestAnimationFrame(correr);
}

/** Suscribe `fn(scrollY)`: corre una vez enseguida y despues una por cuadro. */
export function alScroll(fn) {
  if (typeof window === 'undefined') return () => {};
  suscriptos.add(fn);
  if (!montado) {
    montado = true;
    addEventListener('scroll', pedir, { passive: true });
    addEventListener('resize', pedir);
  }
  pedir();
  return () => {
    suscriptos.delete(fn);
    if (!suscriptos.size && montado) {
      montado = false;
      removeEventListener('scroll', pedir);
      removeEventListener('resize', pedir);
      cancelAnimationFrame(cuadro); cuadro = 0;
    }
  };
}

/** Pide una pasada sin que haya habido scroll (cuando cambia el contenido). */
export function medirDeNuevo() {
  if (typeof window !== 'undefined' && suscriptos.size) pedir();
}
