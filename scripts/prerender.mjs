import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import postcss from 'postcss';
import subsetFont from 'subset-font';

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

const { render, precioDesde } = await import(pathToFileURL(ENTRADA).href);

let html = fs.readFileSync(PLANTILLA, 'utf8');
// La plantilla limpia, antes de pegarle la portada: de aca sale /catalogo.
const plantillaLimpia = html;
const marcado = await render('/');

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
 * El precio "Desde" del hero, escrito en el build (Sebas, 23/10: "el precio
 * aparece despues").
 *
 * El precio sale de la base, y la base contesta cuando ya termino la entrada
 * del hero: el titulo, la bajada y el boton aparecian de a uno y el precio
 * llegaba solo, un segundo despues. Pedirlo antes no alcanzaba: lo que tarda es
 * el viaje hasta la base, no el momento en que se pide.
 *
 * Aca se pide una vez, en el build, y el precio queda en un atributo
 * (data-precio) del lugar reservado; el CSS lo muestra y entra con el resto de
 * su linea. React no mira ese atributo, asi que hidratar no choca. Cuando la
 * base contesta, React escribe el precio de verdad: si es el mismo no se nota
 * nada, y si Sebas cambio precios desde el ultimo build (un ciclo nuevo cargado
 * por SQL), se cambia por el nuevo. Un deploy lo deja al dia.
 *
 * Sin base (el build de las pruebas en GitHub no tiene las claves) o si tarda,
 * sigue como antes: lugar reservado y el precio aparece al llegar.
 */
{
  const { loadEnv } = await import('vite');
  const env = loadEnv('production', RAIZ, 'VITE_');
  const url = env.VITE_SUPABASE_URL;
  const clave = env.VITE_SUPABASE_ANON_KEY;
  let precio = null;
  if (url && clave) {
    try {
      const r = await fetch(`${url}/rest/v1/products?select=*`, {
        headers: { apikey: clave, Authorization: `Bearer ${clave}` },
        signal: AbortSignal.timeout(10000),
      });
      if (r.ok) precio = precioDesde(await r.json());
    } catch (e) {
      console.warn(`  precio del hero: la base no contesto (${e.message}); sale sin precio`);
    }
  }
  const lugar = 'data-hero="precio"';
  if (precio && html.split(lugar).length === 2) {
    const valor = precio.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/ /g, '&#160;');
    // Con funcion: el "$&" del precio es un patron especial de replace.
    html = html.replace(lugar, () => `${lugar} data-precio="${valor}"`);
    console.log(`  precio del hero en el HTML: ${precio.replace(/ /g, ' ')}`);
  } else if (!precio) {
    console.log('  precio del hero: sin precio en el HTML (llega con la base)');
  }
}

/**
 * La letra del titulo, adentro del HTML (Sebas, 23/10).
 *
 * Cada letra de la tienda es un archivo aparte que el telefono baja, como una
 * foto; hasta que llega, el texto se dibuja con una letra comun y despues
 * cambia. "Cada perfume," usa Boska recta, que llegaba ultima (en
 * fuentes-diferidas.css, despues de cargar la pagina): el titulo cambiaba de
 * letra a la vista.
 *
 * Aca se recorta Boska recta a los caracteres del titulo (salen del marcado
 * recien dibujado: si cambia el titulo, cambia el recorte solo) y viaja dentro
 * del HTML como 'Boska Primera', 1,6 kB. El hero la pone primero en su
 * font-family; un caracter que no este lo pone la Boska completa.
 *
 * Solo esta: las otras letras del primer pantallazo (Melodrama de la marca,
 * Boska itálica) ya llegan a tiempo con las precargas y la espera de
 * index.html. Se probo recortar y embeber las cinco: el titulo y todo lo demas
 * salian perfectos, pero la simulacion de Lighthouse bajaba 3 puntos (cuenta
 * cada letra embebida como un pedido mas). Con una sola, empata con lo
 * publicado (medido intercalado, 5 y 5).
 */
{
  const limpiar = (t) => t.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&[a-z]+;/g, ' ');
  const titulo = [...marcado.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => limpiar(m[1])).join('');
  if (!titulo.trim()) {
    console.error('  no se encontro el titulo en el marcado para recortar su letra; se aborta');
    process.exit(1);
  }
  const fuente = fs.readFileSync(path.join(RAIZ, 'public', 'fonts', 'boska-500.woff2'));
  const recorte = await subsetFont(fuente, titulo, { targetFormat: 'woff2' });
  const cara = `@font-face{font-family:'Boska Primera';font-style:normal;font-weight:451 800;font-display:swap;src:url(data:font/woff2;base64,${recorte.toString('base64')}) format('woff2')}`;
  html = html.replace('</head>', `<style>${cara}</style>\n  </head>`);
  console.log(`  letra del titulo embebida: ${(recorte.length / 1024).toFixed(1)} kB`);
}

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
 * La cascara de /catalogo, en dist/catalogo/index.html.
 *
 * Antes /catalogo recibia el HTML de la portada (la reescritura de Vercel
 * manda index.html a toda ruta): en frio se veia el sello del hero, despues el
 * pie con el aviso legal subido hasta arriba, y recien ahi el catalogo. CLS de
 * 0,9 y el link que se manda por WhatsApp se veia roto.
 *
 * Ahora tiene su propio HTML: encabezado, titulo, filtros y doce tarjetas de
 * espera en 3:4, dibujados por la misma app con los datos en vacio (el mismo
 * estado con el que arranca el navegador). No depende del ciclo: los aromas
 * los trae el navegador, como siempre. vercel.json sirve este archivo en
 * /catalogo y main.jsx monta encima sin vaciarlo.
 */
const marcadoCatalogo = await render('/catalogo');
if (!marcadoCatalogo.includes('aria-busy')) {
  console.error('  la cascara de /catalogo salio sin las tarjetas de espera; se aborta');
  process.exit(1);
}
let catalogo = plantillaLimpia.replace(ANCLA, `<div id="root" data-ruta="/catalogo">${marcadoCatalogo}</div>`);

// El CSS de la tienda y el del chunk del catalogo, embebidos los dos: sin el
// segundo, la grilla y las tarjetas de espera se dibujarian sin estilo.
const assets = fs.readdirSync(path.join(DIST, 'assets'));
const cssCatalogo = assets.find((f) => /^CatalogoScreen-.*\.css$/.test(f));
const jsCatalogo = assets.find((f) => /^CatalogoScreen-.*\.js$/.test(f));
if (!linkCss || !cssCatalogo || !jsCatalogo) {
  console.error('  falta el CSS principal o el chunk del catalogo en dist/assets');
  process.exit(1);
}
const cssTodo =
  fs.readFileSync(path.join(DIST, linkCss[1]), 'utf8') +
  fs.readFileSync(path.join(DIST, 'assets', cssCatalogo), 'utf8');
catalogo = catalogo.replace(linkCss[0], `<style>${cssTodo}</style>`);

// El chunk del catalogo baja en paralelo con el principal (main.jsx lo espera
// antes de montar). Y sin las precargas del hero: aca no hay hero.
// Tambien los chunks que el del catalogo importa (familias, whatsapp...):
// sin esto se pedian recien cuando corria el JS, un viaje de red mas en el
// camino de la primera foto.
const codigoCatalogo = fs.readFileSync(path.join(DIST, 'assets', jsCatalogo), 'utf8');
const depsCatalogo = [...new Set([...codigoCatalogo.matchAll(/from\s*"\.\/([\w.-]+\.js)"/g)].map((m) => m[1]))]
  .filter((f) => !/^index-/.test(f));
const precargas = [jsCatalogo, ...depsCatalogo]
  .map((f) => `  <link rel="modulepreload" crossorigin href="/assets/${f}" />`).join('\n');
catalogo = catalogo
  .replace('</head>', `${precargas}\n  </head>`)
  .replace(/\n\s*<link rel="preload" href="\/hero\/[^>]*>/g, '');

// Direccion propia: canonical, og:url y titulo.
const SITIO = 'https://baguesfraganciaswolf.vercel.app';
const cambios = [
  [`<link rel="canonical" href="${SITIO}/" />`, `<link rel="canonical" href="${SITIO}/catalogo" />`],
  [`<meta property="og:url" content="${SITIO}/" />`, `<meta property="og:url" content="${SITIO}/catalogo" />`],
  [/<title>[^<]*<\/title>/, '<title>Catálogo · Bagues Grupo Wolf</title>'],
];
for (const [de, a] of cambios) {
  const antes = catalogo;
  catalogo = catalogo.replace(de, a);
  if (antes === catalogo) {
    console.error(`  no se encontro ${de} en la plantilla; se aborta para no publicar un canonical equivocado`);
    process.exit(1);
  }
}

fs.mkdirSync(path.join(DIST, 'catalogo'), { recursive: true });
fs.writeFileSync(path.join(DIST, 'catalogo', 'index.html'), catalogo);
console.log(`  cascara de /catalogo: ${kb(marcadoCatalogo.length)} de marcado en dist/catalogo/index.html`);

/**
 * La pagina que no existe, en dist/404.html. Vercel la sirve con estado 404 a
 * toda direccion que no sea un archivo ni una de las rutas de vercel.json
 * (/, /catalogo y /panel). Antes la reescritura mandaba la portada a
 * cualquier ruta: un link roto parecia andar, y una foto que faltaba
 * contestaba 200 con HTML en vez de dar error.
 */
{
  const marcado404 = await render('/esta-pagina-no-existe');
  if (!marcado404.includes('no-encontrada-titulo')) {
    console.error('  la pagina 404 salio sin su titulo; se aborta');
    process.exit(1);
  }
  let html404 = plantillaLimpia
    .replace(ANCLA, `<div id="root" data-ruta="404">${marcado404}</div>`)
    .replace(linkCss[0], `<style>${fs.readFileSync(path.join(DIST, linkCss[1]), 'utf8')}</style>`)
    .replace(/\n\s*<link rel="preload" href="\/(hero|fonts)\/[^>]*>/g, '')
    .replace(/<title>[^<]*<\/title>/, '<title>Página no encontrada · Bagues Grupo Wolf</title>')
    .replace('</head>', '  <meta name="robots" content="noindex" />\n  </head>');
  fs.writeFileSync(path.join(DIST, '404.html'), html404);
  console.log(`  pagina 404: ${kb(marcado404.length)} de marcado en dist/404.html`);
}

/**
 * /panel recibe la portada pre-generada (regla de vercel.json): main.jsx la
 * vacia y monta el panel.
 */

/**
 * La politica de seguridad (Content-Security-Policy en vercel.json) solo deja
 * correr los scripts en linea cuyo hash figura ahi. Si alguien cambia uno de
 * los <script> de index.html (el de las fuentes o el de la vuelta del ingreso
 * con Google), el navegador lo bloquea en silencio y, por ejemplo, el ingreso
 * al panel deja de andar. Por eso el build se frena aca y dice que hash poner.
 */
{
  const { createHash } = await import('node:crypto');
  const csp = (JSON.parse(fs.readFileSync(path.join(RAIZ, 'vercel.json'), 'utf8')).headers || [])
    .flatMap((h) => h.headers).find((h) => h.key === 'Content-Security-Policy')?.value || '';
  const faltan = new Set();
  for (const archivo of ['index.html', path.join('catalogo', 'index.html'), '404.html']) {
    const html = fs.readFileSync(path.join(DIST, archivo), 'utf8');
    for (const [, atributos, cuerpo] of html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (/type="(application\/(ld\+)?json)"/.test(atributos)) continue;
      const hash = `'sha256-${createHash('sha256').update(cuerpo).digest('base64')}'`;
      if (!csp.includes(hash)) faltan.add(hash);
    }
  }
  if (faltan.size) {
    console.error(`  la politica de seguridad de vercel.json no tiene estos scripts en linea: ${[...faltan].join(' ')}`);
    console.error('  sumalos a script-src (o saca el script en linea) y volve a correr el build');
    process.exit(1);
  }
  console.log('  politica de seguridad: los scripts en linea coinciden con vercel.json');
}
