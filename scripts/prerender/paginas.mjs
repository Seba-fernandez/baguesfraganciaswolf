// Las tres paginas que salen armadas del build: portada, cascara del catalogo
// y la 404. Funciones puras: reciben la plantilla (dist/index.html de Vite), el
// marcado que dibujo React y el CSS, y devuelven el HTML final. Asi se pueden
// probar sin correr el build (scripts/qa/prerender.test.mjs).
//
// Por que existen: el navegador pinta apenas recibe el HTML, sin esperar a
// bajar y ejecutar el codigo. Es la misma idea que usan Next.js o Astro
// ("generacion estatica"), hecha a mano porque la tienda es chica.
import { ErrorDePagina, antesDeCerrarHead, cambiarTitulo, reemplazarUna, sacarPrecargas } from './html.mjs';
import { ponerPrecio } from './precio.mjs';

export const ANCLA = '<div id="root"></div>';
export const SITIO = 'https://baguesfraganciaswolf.vercel.app';
const MARCA = 'Bagues Grupo Wolf';

/** La etiqueta <link> de la hoja de estilos principal de Vite. */
export function linkDeCss(plantilla) {
  const m = plantilla.match(/<link rel="stylesheet"[^>]*href="(\/assets\/[^"]+\.css)"[^>]*>/);
  if (!m) throw new ErrorDePagina('no se encontro la hoja de estilos principal en la plantilla');
  return { etiqueta: m[0], ruta: m[1] };
}

/** Pega el marcado en el #root, con su marca de ruta si no es la portada. */
function conMarcado(plantilla, marcado, ruta) {
  const raiz = ruta ? `<div id="root" data-ruta="${ruta}">` : '<div id="root">';
  return reemplazarUna(plantilla, ANCLA, `${raiz}${marcado}</div>`, 'el <div id="root"> de la plantilla');
}

/**
 * La portada. El CSS va embebido entero (una hoja que frena el primer pintado
 * menos; partirlo en dos salio peor, mediana 93 contra 96), la letra del titulo
 * recortada en el <head> y el precio del hero si llego.
 */
export function armarPortada({ plantilla, marcado, css, estiloLetra, precio }) {
  if (!marcado || marcado.length < 500) throw new ErrorDePagina('la portada salio vacia o demasiado corta');
  const { etiqueta } = linkDeCss(plantilla);
  let html = conMarcado(plantilla, marcado);
  html = ponerPrecio(html, precio);
  html = antesDeCerrarHead(html, estiloLetra, 'la letra del titulo');
  html = reemplazarUna(html, etiqueta, `<style>${css}</style>`, 'la hoja de estilos de la portada');
  return html;
}

/**
 * Los chunks que importa el del catalogo (familias, whatsapp...): se precargan
 * para que no se pidan recien cuando corre el JS. Pura.
 */
export function dependenciasDelChunk(codigo) {
  return [...new Set([...codigo.matchAll(/from\s*"\.\/([\w.-]+\.js)"/g)].map((m) => m[1]))]
    .filter((f) => !/^index-/.test(f));
}

/**
 * La cascara de /catalogo: encabezado, titulo, filtros y tarjetas de espera,
 * dibujados con los datos en vacio. Lleva el CSS de la tienda y el del chunk
 * del catalogo, precarga ese chunk y sus dependencias, saca las precargas del
 * hero (aca no hay hero) y tiene su propia direccion para buscadores.
 */
export function armarCatalogo({ plantilla, marcado, css, chunks }) {
  if (!marcado.includes('aria-busy')) throw new ErrorDePagina('la cascara de /catalogo salio sin las tarjetas de espera');
  const { etiqueta } = linkDeCss(plantilla);
  let html = conMarcado(plantilla, marcado, '/catalogo');
  html = reemplazarUna(html, etiqueta, `<style>${css}</style>`, 'la hoja de estilos del catalogo');
  const precargas = chunks.map((f) => `  <link rel="modulepreload" crossorigin href="/assets/${f}" />`).join('\n');
  html = antesDeCerrarHead(html, precargas, 'las precargas del catalogo');
  html = sacarPrecargas(html, ['/hero/']);
  html = reemplazarUna(html, `<link rel="canonical" href="${SITIO}/" />`, `<link rel="canonical" href="${SITIO}/catalogo" />`, 'el canonical');
  html = reemplazarUna(html, `<meta property="og:url" content="${SITIO}/" />`, `<meta property="og:url" content="${SITIO}/catalogo" />`, 'el og:url');
  return cambiarTitulo(html, `Catálogo · ${MARCA}`);
}

/**
 * La pagina que no existe. Vercel la sirve con estado 404 a toda direccion que
 * no sea un archivo ni una ruta de vercel.json. Sin precargas (ni hero ni
 * letras) y con noindex.
 */
export function armar404({ plantilla, marcado, css }) {
  if (!marcado.includes('no-encontrada-titulo')) throw new ErrorDePagina('la pagina 404 salio sin su titulo');
  const { etiqueta } = linkDeCss(plantilla);
  let html = conMarcado(plantilla, marcado, '404');
  html = reemplazarUna(html, etiqueta, `<style>${css}</style>`, 'la hoja de estilos de la 404');
  html = sacarPrecargas(html, ['/hero/', '/fonts/']);
  html = cambiarTitulo(html, `Página no encontrada · ${MARCA}`);
  return antesDeCerrarHead(html, '  <meta name="robots" content="noindex" />', 'el noindex de la 404');
}
