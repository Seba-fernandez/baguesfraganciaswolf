// El precio "Desde" del hero, escrito en el build (Sebas, 23/10: "el precio
// aparece despues").
//
// El precio sale de la base, y la base contesta cuando ya termino la entrada
// del hero. Pedirlo antes no alcanzaba: lo que tarda es el viaje hasta la base.
// Aca se pide una vez, en el build, y queda en un atributo (data-precio) del
// lugar reservado; el CSS lo muestra y entra con su linea. React no mira ese
// atributo, asi que hidratar no choca. Cuando la base contesta, React escribe el
// precio de verdad: si cambio desde el ultimo build, se ve el nuevo.
//
// Sin base (el build de las pruebas en GitHub no tiene las claves) o si tarda,
// la pagina sale sin precio y aparece al llegar, como antes.
import { paraAtributo, reemplazarUna } from './html.mjs';

export const LUGAR_PRECIO = 'data-hero="precio"';

/** Pone el precio en el lugar reservado del hero. Funcion pura (se prueba). */
export function ponerPrecio(html, precio) {
  if (!precio) return html;
  return reemplazarUna(html, LUGAR_PRECIO, `${LUGAR_PRECIO} data-precio="${paraAtributo(precio)}"`, 'el lugar del precio del hero');
}

/**
 * Trae los perfumes de la base para calcular el precio. Devuelve las filas o
 * null (sin claves, sin red o si tarda mas de 10 s).
 */
export async function traerFilas({ url, clave }) {
  if (!url || !clave) return null;
  try {
    const r = await fetch(`${url}/rest/v1/products?select=*`, {
      headers: { apikey: clave, Authorization: `Bearer ${clave}` },
      signal: AbortSignal.timeout(10000),
    });
    return r.ok ? await r.json() : null;
  } catch (e) {
    console.warn(`  precio del hero: la base no contesto (${e.message}); sale sin precio`);
    return null;
  }
}
