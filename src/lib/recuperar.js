// ============================================================================
// recuperar.js: que la tienda no quede en blanco cuando un archivo ya no existe
//
// Despues de cada publicacion, los archivos de /assets cambian de nombre (llevan
// el hash del contenido). Si el telefono tenia guardado un HTML o un modulo
// viejo, pide un archivo que ya no esta y el import dinamico falla. Nada lo
// atrapaba y la pantalla quedaba en blanco (quedo anotado en errores_web:
// "Failed to fetch dynamically imported module" y "Unable to preload CSS").
//
// Que hace:
//  1. Si falla la carga de un archivo de la tienda, recarga la pagina UNA vez:
//     el HTML nuevo (vercel.json lo manda a revalidar) apunta a los archivos
//     que si existen.
//  2. Una guarda en sessionStorage evita el bucle: no recarga si ya recargo
//     hace menos de 10 segundos, ni mas de 2 veces en un minuto.
//  3. Si ya no puede recargar, tapa la pantalla con un cartel con boton
//     "Reintentar". Es DOM puro: anda aunque React nunca haya montado.
//
// Se llama DESPUES de escucharErrores() (lib/errores.js): asi el error queda
// anotado en la base antes de recargar. El aviso sale con keepalive, o sea que
// sobrevive a la recarga.
// ============================================================================
import { registrarError } from './errores.js';

const CLAVE = 'bagues:recargas';
const ENTRE_RECARGAS = 10_000; // no recarga si ya recargo hace menos que esto
const VENTANA = 60_000; // y como mucho 2 recargas en este lapso
const MAXIMO_EN_VENTANA = 2;

// Chrome y Edge, Firefox y Safari dicen lo mismo con palabras distintas.
const ES_CARGA_FALLIDA = /Failed to fetch dynamically imported module|Unable to preload CSS|error loading dynamically imported module|Importing a module script failed/i;

let actuando = false;

function leerMarcas() {
  const crudo = sessionStorage.getItem(CLAVE);
  const lista = crudo ? JSON.parse(crudo) : [];
  const ahora = Date.now();
  return Array.isArray(lista) ? lista.filter((t) => Number.isFinite(t) && ahora - t < VENTANA) : [];
}

/** Anota la recarga y dice si se puede. Sin sessionStorage no hay guarda, asi que no se recarga. */
function reservarRecarga() {
  try {
    const marcas = leerMarcas();
    const ahora = Date.now();
    if (marcas.some((t) => ahora - t < ENTRE_RECARGAS) || marcas.length >= MAXIMO_EN_VENTANA) return false;
    sessionStorage.setItem(CLAVE, JSON.stringify([...marcas, ahora]));
    return true;
  } catch {
    return false;
  }
}

function mostrarCartel() {
  if (document.getElementById('bagues-sin-carga')) return;
  const caja = document.createElement('div');
  caja.id = 'bagues-sin-carga';
  caja.setAttribute('role', 'alert');
  caja.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px;text-align:center;background:#240604;color:#faefea;font-family:system-ui,-apple-system,sans-serif;';

  const titulo = document.createElement('h1');
  titulo.textContent = 'No pudimos terminar de cargar la tienda';
  titulo.style.cssText = "font-family:'Melodrama',Georgia,serif;font-weight:600;font-size:clamp(1.5rem,6vw,2rem);line-height:1.2;max-width:22ch;";

  const texto = document.createElement('p');
  texto.textContent = 'Seguramente es tu conexión o una versión vieja guardada en el teléfono. Probá de nuevo y listo.';
  texto.style.cssText = 'font-size:1rem;line-height:1.5;max-width:34ch;opacity:.85;';

  const boton = document.createElement('button');
  boton.type = 'button';
  boton.textContent = 'Reintentar';
  boton.style.cssText = 'min-height:48px;padding:0 32px;border:0;border-radius:8px;background:#faefea;color:#4b1217;font:600 1rem system-ui,-apple-system,sans-serif;cursor:pointer;';
  boton.addEventListener('click', () => {
    // Es un pedido de la persona: se limpia la guarda para que recargue de verdad.
    try { sessionStorage.removeItem(CLAVE); } catch { /* sin guarda, igual recarga */ }
    location.reload();
  });

  caja.append(titulo, texto, boton);
  document.body.appendChild(caja);
  boton.focus();
}

function alFallarLaCarga(mensaje) {
  if (actuando) return;
  actuando = true;
  // Anotado ANTES de recargar. Si errores.js ya lo anoto, no se repite (mismo tipo y mensaje).
  registrarError('promesa', mensaje, 'carga de modulo');
  if (reservarRecarga()) location.reload();
  else mostrarCartel();
}

const textoDe = (r) => (r && (r.message || String(r))) || '';

/** Engancha los avisos de carga fallida. Llamar despues de escucharErrores(). */
export function recuperarCargaFallida() {
  if (typeof window === 'undefined') return;
  // Vite lo dispara cuando falla un import dinamico o el CSS que precarga.
  addEventListener('vite:preloadError', (e) => alFallarLaCarga(textoDe(e.payload) || 'vite:preloadError'));
  addEventListener('unhandledrejection', (e) => {
    const m = textoDe(e.reason);
    if (ES_CARGA_FALLIDA.test(m)) alFallarLaCarga(m);
  });
  addEventListener('error', (e) => {
    const m = e.message || textoDe(e.error);
    if (ES_CARGA_FALLIDA.test(m)) alFallarLaCarga(m);
  });
}
