/**
 * Scroll suave con la ruedita del mouse (rediseño D, pedido de Sebas: "que se
 * sienta mas smooth y preciso"). Lenis, 1.3.26, unos 5 kB.
 *
 * Solo donde suma y no estorba:
 *  - en escritorio con mouse (pointer: fine): en el celular el scroll nativo
 *    ya es fluido y tocarlo se siente raro y gasta bateria;
 *  - sin prefers-reduced-motion;
 *  - recien despues del evento load y en un rato libre: no compite con la
 *    primera pantalla ni con el LCP.
 * Dentro de los dialogos (ficha, carrito, hoja de tamanos) no actua: tienen su
 * propio scroll. Mientras un dialogo esta abierto el body queda fijo
 * (useBloqueoScroll) y Lenis se frena. El scroll de teclado, la barra y los
 * saltos por codigo siguen siendo los del navegador.
 */
let lenis = null;

export function frenarScrollSuave(frenar) {
  if (!lenis) return;
  if (frenar) lenis.stop(); else lenis.start();
}

/**
 * Ir a una seccion de la portada (#como, #ciudades) sin que quede tapada.
 * Las secciones de mas arriba tienen content-visibility: auto y un alto
 * estimado (700 px) hasta que se dibujan: el navegador calculaba el destino
 * con esos altos y la seccion quedaba corrida o debajo de la barra. Al saltar
 * se dibujan todas (clase .saltando), se mide bien y se va.
 */
export function irASeccion(id, { suave = true } = {}) {
  const el = document.getElementById(id);
  if (!el) return false;
  const raiz = document.querySelector('.tienda');
  raiz?.classList.add('saltando');
  void el.offsetTop; // fuerza el dibujado con los altos reales
  const barra = () => document.querySelector('.tienda > header')?.offsetHeight || 74;
  const medir = () => el.getBoundingClientRect().top + window.scrollY - barra() - 8;
  const destino = medir();
  // La primera vez que se dibujan las secciones de arriba, sus fotos y su
  // letra terminan de acomodarse durante el viaje: al llegar se vuelve a medir
  // y, si se corrio, se ajusta (una o dos veces, sin que se note).
  const corregir = (veces) => setTimeout(() => {
    const ahora = medir();
    if (Math.abs(ahora - window.scrollY) > 4) {
      if (lenis) lenis.scrollTo(ahora, { duration: 0.5 });
      else window.scrollTo({ top: ahora, behavior: 'smooth' });
    }
    if (veces > 1) corregir(veces - 1);
  }, suave ? 900 : 250);
  corregir(2);
  // La clase queda puesta: si se saca, las secciones que se dibujaron sin
  // content-visibility vuelven al alto estimado y el destino se corre ~100 px.
  // Despues del primer salto ya no hace falta ahorrar ese dibujado: la
  // primera pantalla hace rato que esta.
  if (lenis && suave) lenis.scrollTo(destino);
  else window.scrollTo({ top: destino, behavior: suave && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'instant' });
  return true;
}

export function montarScrollSuave() {
  if (typeof window === 'undefined' || lenis) return () => {};
  const apto = matchMedia('(pointer: fine) and (hover: hover) and (min-width: 900px)').matches
    && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!apto) return () => {};
  let cancelado = false;
  let cuadro = 0;
  const arrancar = async () => {
    const { default: Lenis } = await import('lenis');
    if (cancelado) return;
    lenis = new Lenis({
      duration: 1.05,
      easing: (t) => 1 - Math.pow(1 - t, 3.2),
      smoothWheel: true,
      syncTouch: false,
      prevent: (nodo) => Boolean(nodo.closest?.('[role=dialog], [data-lenis-prevent]')),
    });
    const paso = (t) => { lenis?.raf(t); cuadro = requestAnimationFrame(paso); };
    cuadro = requestAnimationFrame(paso);
  };
  const cuandoLibre = () => {
    if ('requestIdleCallback' in window) requestIdleCallback(arrancar, { timeout: 2500 });
    else setTimeout(arrancar, 300);
  };
  if (document.readyState === 'complete') cuandoLibre(); else addEventListener('load', cuandoLibre, { once: true });
  return () => {
    cancelado = true;
    cancelAnimationFrame(cuadro);
    lenis?.destroy(); lenis = null;
  };
}
