// ============================================================================
// compartir.js — el link directo a la ficha de un aroma.
//
// Sebastian manda perfumes puntuales por WhatsApp e Instagram. El link apunta
// siempre a /catalogo?aroma=<slug>: esa ruta tiene su propia cascara
// pre-generada (carga rapido y no muestra la portada) y abre la ficha directo.
// ============================================================================

const SITIO = 'https://baguesfraganciaswolf.vercel.app';

/** Link publico a la ficha. En desarrollo usa el origen local. */
export function linkDeAroma(slug, origen = typeof window !== 'undefined' ? window.location.origin : SITIO) {
  return `${origen}/catalogo?aroma=${encodeURIComponent(slug)}`;
}

/**
 * Copia un texto al portapapeles. Devuelve true si se pudo.
 * navigator.clipboard pide contexto seguro y que el toque sea reciente; el
 * navegador de Instagram a veces lo niega. En ese caso quien llama muestra el
 * link a la vista para copiarlo a mano.
 */
export async function copiarTexto(texto) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch { /* sin permiso: se cae al respaldo */ }
  try {
    const campo = document.createElement('textarea');
    campo.value = texto;
    campo.setAttribute('readonly', '');
    campo.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
    document.body.appendChild(campo);
    campo.select();
    const ok = document.execCommand('copy');
    campo.remove();
    return ok;
  } catch {
    return false;
  }
}
