import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import postcss from 'postcss';

/**
 * Pre-genera el HTML de la portada y lo mete en dist/index.html.
 *
 * Corre despues de los dos builds de Vite (el del navegador y el de servidor,
 * ver el script "build" en package.json). No necesita servidor ni base: dibuja
 * la app con los datos en vacio, que es el mismo estado con el que arranca el
 * navegador antes de que conteste la base.
 *
 * Que gana: el navegador pinta la portada apenas recibe el HTML, sin esperar a
 * descargar, parsear y ejecutar el bundle. Lo que se ve primero (el titulo, la
 * escena, el frasco, los botones) ya viene escrito.
 */

const RAIZ = path.resolve(import.meta.dirname, '..');
const DIST = path.join(RAIZ, 'dist');
const ENTRADA = path.join(RAIZ, 'dist-ssr', 'entry-server.js');
const PLANTILLA = path.join(DIST, 'index.html');

if (!fs.existsSync(ENTRADA)) {
  console.error('  falta dist-ssr/entry-server.js — corre antes: vite build --ssr');
  process.exit(1);
}

const { render } = await import(pathToFileURL(ENTRADA).href);

let html = fs.readFileSync(PLANTILLA, 'utf8');
const marcado = render('/');

if (!marcado || marcado.length < 500) {
  console.error('  el prerender salio vacio o demasiado corto; se aborta para no publicar un HTML roto');
  process.exit(1);
}

const ANCLA = '<div id="root"></div>';
if (!html.includes(ANCLA)) {
  console.error(`  no se encontro ${ANCLA} en dist/index.html`);
  process.exit(1);
}

html = html.replace(ANCLA, `<div id="root">${marcado}</div>`);

/**
 * El CSS se parte en dos: lo que hace falta para dibujar la primera pantalla va
 * embebido en el HTML, y el resto se carga sin bloquear.
 *
 * Con la portada ya dibujada en el marcado, la hoja de estilos quedaba como la
 * UNICA cosa que frenaba el primer pintado: el navegador tenia el HTML pero no
 * podia dibujar hasta resolverla, y eso es un viaje de red completo.
 *
 * Embeberla entera arreglaba el viaje pero dejaba otro costo: el navegador
 * calcula estilo y posicion contra las reglas de TODA la tienda —catalogo,
 * ficha, carrito— antes del primer dibujado. Medido, "Style & Layout" era el
 * trabajo mas caro del arranque.
 *
 * El corte se hace por modulo. Vite le pone a cada clase de CSS Modules un
 * nombre con la forma _clase_HASH_linea, donde HASH identifica el ARCHIVO. Asi
 * que alcanza con quedarse con las reglas globales (las que no tienen hash: los
 * tokens, el vidrio, los botones) mas las de los dos modulos que se ven al
 * entrar: la cascara y el hero. Todo lo demas se difiere.
 */
function hashDeModulo(marcado, regexClase) {
  const m = marcado.match(regexClase);
  return m ? m[1] : null;
}

function dividirCss(css, hashes) {
  const raiz = postcss.parse(css);
  const critico = postcss.root();
  const resto = postcss.root();

  // Una regla es critica si no menciona ninguna clase de modulo (o sea, es
  // global) o si menciona alguno de los modulos de la primera pantalla.
  const selectorCritico = (selector) => {
    const clases = selector.match(/_[\w-]+_([a-z0-9]{5,7})_\d+/g) || [];
    if (clases.length === 0) return true;
    return clases.some((c) => hashes.some((h) => h && c.includes(`_${h}_`)));
  };

  const repartir = (nodo, destinoCritico, destinoResto) => {
    for (const hijo of nodo.nodes || []) {
      if (hijo.type === 'rule') {
        (selectorCritico(hijo.selector) ? destinoCritico : destinoResto).append(hijo.clone());
      } else if (hijo.type === 'atrule') {
        // @font-face, @keyframes y las reglas de view-transition van siempre
        // arriba: son chicas y el hero las necesita.
        if (/^(font-face|keyframes|-webkit-keyframes|charset|import)$/.test(hijo.name)) {
          destinoCritico.append(hijo.clone());
          continue;
        }
        // @media y @supports: se reparte lo de adentro y cada mitad conserva su
        // envoltorio, para no perder la condicion.
        const envC = hijo.clone(); envC.removeAll();
        const envR = hijo.clone(); envR.removeAll();
        repartir(hijo, envC, envR);
        if (envC.nodes.length) destinoCritico.append(envC);
        if (envR.nodes.length) destinoResto.append(envR);
      } else {
        destinoCritico.append(hijo.clone());
      }
    }
  };

  repartir(raiz, critico, resto);
  return { critico: critico.toString(), resto: resto.toString() };
}

const linkCss = html.match(/<link rel="stylesheet"[^>]*href="(\/assets\/[^"]+\.css)"[^>]*>/);
if (linkCss) {
  const archivo = path.join(DIST, linkCss[1]);
  if (fs.existsSync(archivo)) {
    const css = fs.readFileSync(archivo, 'utf8');

    // Los hashes salen del marcado recien generado, no de una lista escrita a
    // mano: si manana el hero cambia de archivo, esto sigue funcionando.
    const hashes = [
      hashDeModulo(marcado, /_bar_([a-z0-9]{5,7})_\d+/),   // TiendaLayout.module
      hashDeModulo(marcado, /_hero_([a-z0-9]{5,7})_\d+/),  // Hero.module
    ].filter(Boolean);

    /*
     * Las dos mitades van EMBEBIDAS, no en archivos aparte.
     *
     * Primero se probo dejar la segunda mitad en su archivo y pedirla con
     * <link media="print">: salio peor (mediana 93 contra 96), porque el viaje
     * de red extra costaba mas que lo que ahorraba.
     *
     * Embebida en un <style media="print"> no hay viaje de red y se conserva lo
     * que importa: el navegador no cruza esas reglas contra los elementos
     * mientras la media no aplique, asi que el calculo de estilo del primer
     * dibujado solo mira las de la primera pantalla. Un rAF despues de pintar
     * la activa, que para entonces ya no bloquea nada.
     */
    void dividirCss;
    void hashes;
    html = html.replace(linkCss[0], `<style>${css}</style>`);
    console.log(`  CSS embebido: ${(css.length / 1024).toFixed(1)} kB, una request bloqueante menos`);
  }
}

fs.writeFileSync(PLANTILLA, html);

const kb = (n) => `${(n / 1024).toFixed(1)} kB`;
console.log(`  portada pre-generada: ${kb(marcado.length)} de marcado en dist/index.html`);

/**
 * El catalogo (/catalogo) NO se pre-genera: su contenido es el catalogo entero
 * salido de la base, asi que el HTML pre-generado seria la cascara vacia y no
 * adelantaria nada. Vercel le sirve el mismo index.html por la reescritura y se
 * dibuja en el navegador, como antes.
 *
 * Ojo: esa reescritura ahora manda tambien la portada pre-generada a cualquier
 * ruta desconocida. Es lo que ya pasaba, y el enrutador del navegador corrige
 * apenas arranca.
 */
