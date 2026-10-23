// El chunk del catálogo, con su precarga. Vive aparte para que lo puedan
// pedir App (la ruta), main.jsx (al entrar directo a /catalogo) y la tienda
// (para tenerlo listo antes de que la clienta toque "Catálogo").
//
// Por qué precargar (Sebas, 23/10): al tocar "Catálogo", la portada se iba y
// el catálogo todavía no había llegado. En ese hueco la página medía solo lo
// que mide el pie, el navegador quedaba parado sobre el aviso legal y recién
// después saltaba al catálogo. Con red lenta, segundos en negro.

let modulo = null;
let pedido = null;

export function precargarCatalogo() {
  if (!pedido) pedido = import('./CatalogoScreen').then((m) => (modulo = m));
  return pedido;
}

export function moduloCatalogo() {
  return modulo;
}

/**
 * Lo pide en un momento libre después de cargar la página, y además apenas
 * el dedo (o el mouse) apoya en cualquier link al catálogo: cuando se suelta,
 * ya está.
 */
export function precargarCatalogoCuandoConvenga() {
  if (typeof window === 'undefined') return () => {};
  const alApoyar = (e) => {
    if (e.target?.closest?.('a[href^="/catalogo"]')) precargarCatalogo();
  };
  document.addEventListener('pointerdown', alApoyar, { passive: true, capture: true });
  document.addEventListener('mouseover', alApoyar, { passive: true, capture: true });
  let id = 0;
  const enCalma = () => {
    id = 'requestIdleCallback' in window
      ? requestIdleCallback(() => precargarCatalogo(), { timeout: 5000 })
      : setTimeout(() => precargarCatalogo(), 2500);
  };
  if (document.readyState === 'complete') enCalma(); else addEventListener('load', enCalma, { once: true });
  return () => {
    document.removeEventListener('pointerdown', alApoyar, { capture: true });
    document.removeEventListener('mouseover', alApoyar, { capture: true });
    removeEventListener('load', enCalma);
    if ('cancelIdleCallback' in window) cancelIdleCallback(id); else clearTimeout(id);
  };
}
