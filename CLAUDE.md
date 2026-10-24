# CLAUDE.md

Contexto de trabajo para Claude Code en este repo. Se lee entero antes de tocar
nada. El porqué del proyecto está en [`docs/CONTEXTO.md`](docs/CONTEXTO.md); acá
está lo que hace falta para trabajar bien desde el primer cambio.

*Última actualización: 22 de octubre de 2026, después de la etapa 3B de la
auditoría (tira del ciclo, chat de WhatsApp, ficha del celular, datos de la
base; registro en [`docs/QA.md`](docs/QA.md)).*

---

## 1. Quién y para qué

Sebastián (Sebas) vende perfumes por WhatsApp en Córdoba. Revende las
fragancias de la casa **Bagués**, que vienen en dos líneas: **Bagués** (cajas de
50 ml con nombre de ciudad: Arizona, Granada) y **Unlock** (frascos de 100 ml y
minis de 20 a 30 ml, con envase inspirado en el original). Son versiones
inspiradas de perfumes de diseñador.

Esta app es la tienda pública más el panel privado con el que él gestiona los
pedidos. La venta se cierra por WhatsApp: **no hay pasarela de pago y no la va a
haber.**

El criterio que manda sobre todo: **sacar trabajo, no agregarlo.** Si una
función obliga a mantenerla todos los días, no va. Cargar un ciclo nuevo tiene
que llevar menos de media hora.

## 2. Cómo trabajar con él

- **Castellano rioplatense con voseo**, directo, con títulos y párrafos cortos.
- **Antes de tocar código, devolvé el plan.** Él lo usa como control de calidad.
- **No le pases código para pegar.** Hacé el cambio, verificalo y publicalo.
- **No dejes problemas a medias** ni entregues "una primera versión" sin probar.
- **No actúes sobre su computadora** (archivos, apps) salvo que lo pida él.
- Trabaja mucho desde el **celular**: todo se revisa primero a 390 px de ancho.
- Si la salida suena genérica, la va a rechazar: aplicá el sistema de diseño de
  este repo, no un estilo por defecto.
- Cuando algo no se pudo hacer, decilo claro y explicá qué falta para hacerlo.

## 3. Dónde vive cada cosa

| Qué | Dónde |
| --- | --- |
| Tienda en producción | https://baguesfraganciaswolf.vercel.app |
| Panel | https://baguesfraganciaswolf.vercel.app/panel |
| Repo | `github.com/Seba-fernandez/baguesfraganciaswolf` (antes `CRM-de-Alquileres-de-vajilla`; GitHub redirige el nombre viejo) |
| Vercel | proyecto `baguesfraganciaswolf`, publica solo desde `main`. Sin dominio viejo: se borró el 2/10/2026 |
| Supabase | proyecto `wynownataftnompltsok` (us-west-2) |
| Catálogos del ciclo | Google Drive de Sebas: `Catálogo_Unlock_C10.pdf` y `Catálogo_Bagues_C10.pdf` |
| Tiendas de las proveedoras | `unlock.com.ar` y `bagues.com.ar`, las dos Shopify con `/products.json` público |

Variables de entorno (`.env`, no se versiona): `VITE_SUPABASE_URL` y
`VITE_SUPABASE_ANON_KEY`. Son las claves públicas. **El repo es público: nunca
una clave secreta en un archivo.**

## 4. Stack y mapa del código

React 18, Vite 5, React Router 7. CSS Modules y variables CSS, sin Tailwind ni
biblioteca de componentes. PostgreSQL en Supabase con RLS en todas las tablas.
Portada pre-generada como HTML en el build. Movimiento en CSS nativo, salvo
Lenis (5,7 kB) para la ruedita en escritorio (`lib/scrollSuave.js`).

```
src/
  config/         contenido.js (todo texto visible) y ajustes.js (números)
  components/
    tienda/       la web pública
    panel/        el panel; PanelApp.jsx es la puerta y monta todo lo suyo
    layout/       estructura del panel (barra de abajo, lateral, encabezado)
    auth/         ingreso al panel: solo Google, sin registro ni contraseña
    ui/           piezas sueltas del panel
  hooks/          datos (useProducts, useOrders...) y comportamiento (useReveal,
                  useDialogo, useBloqueoScroll, useMedia)
  lib/            reglas de negocio sin JSX
    apiTienda.js    lectura de la tienda con fetch, SIN supabase-js
    busqueda.js     el buscador del catálogo (tolerante; pruebas en scripts/qa)
    cachePanel.js   memoria compartida del panel
    compartir.js    el link de cada ficha (/catalogo?aroma=) y copiarlo
    datosCliente.js nombre y WhatsApp del pedido: tolerante con la forma
                    (+54 9, 0351, 15), estricto con el contenido; la base
                    aplica lo mismo (telefono_ar, migración 0012)
    familias.js     de familia_olfativa (texto libre) a las 5 familias del filtro
    filtros.js      Para, Familia, Minis y Rebajados, leídos de la dirección
    fotos.js        qué foto le toca a cada aroma (tienda y panel)
    parecidos.js    "Si te gusta este, mirá también"
    producto.js     presentaciones, título, línea de cada tamaño, frase de la
                    ficha, pirámide, notas cortas de la tarjeta, ahorro
    promos.js       el 2x1 por grupos
    scrollSuave.js  Lenis en escritorio y irASeccion (saltos a #seccion medidos)
    alScroll.js     un solo oyente de scroll, una pasada por cuadro (barra, volver arriba)
    whatsapp.js     el mensaje del pedido
    errores.js      anota en la base los errores de una clienta (panel > Ajustes)
    metricas.js     Vercel Analytics y Speed Insights, despues de cargar
    vidrioLiquido.js  la lente del vidrio de la tienda
  data/           constantes y fotos.js (índice generado)
  styles/         tienda.css (tienda) y global.css (panel)
scripts/
  fotos/          componer.mjs + fuentes.json: el pipeline de fotos
  fondo/          dibuja la escena del hero y la textura
  rediseno/       hero horneado, previa del hero, pared de productos, og.jpg
  video/          graba la tienda cuadro por cuadro y arma el antes/después
  prerender.mjs   pega la portada en dist/index.html y la cáscara de /catalogo
                  en dist/catalogo/index.html
supabase/migrations/  esquema, RLS, la función de pedido, errores_web (0013) y
                      la copia semanal (0014)
supabase/manual/      SQL para que Sebas corra a mano (borrar respaldos viejos)
.github/              pruebas automáticas en cada push y Dependabot
```

**Dos fronteras que no se cruzan:**

1. **La tienda no importa `lib/supabase`.** Lee con `fetch` contra PostgREST.
   El cliente completo vive solo dentro del chunk del panel. Si un componente de
   `tienda/` lo importa, se pierden ~80 kB en silencio.
2. **`lib/` no sabe de pantallas y `components/` no calcula reglas.** Si una
   cuenta da mal, el error está en `lib/`.

## 5. El modelo de datos

**La unidad del catálogo es el aroma, no el código de proveedora.** Muchos
perfumes están en las dos líneas con nombres distintos (Arizona en Bagués es
Sauvage en Unlock): una fila por aroma y los tamaños de las dos líneas adentro.

Tabla `products`, una fila por aroma:

| Columna | Qué guarda |
| --- | --- |
| `slug` | Identificador. También es el nombre del archivo de la foto |
| `nombre` | **El nombre oficial del perfume** (Sauvage, La Bomba). Sin asteriscos |
| `inspirado_en` | El mismo nombre oficial. Es lo que muestra la web (`tituloDe`) |
| `genero`, `familia_olfativa`, `momento`, `nota_*`, `descripcion_*` | Ficha |
| `imagen_url` | Foto subida a mano desde el panel. Le gana a todas |
| `destacado`, `orden`, `activo` | Selección del inicio y visibilidad |
| `presentaciones` | JSON con los tamaños (abajo) |

Cada presentación:

```json
{ "ml": 50, "linea": "bagues", "codigo": "10282038",
  "precio": 22499, "precio_anterior": 29999,
  "nombre_proveedor": "Arizona", "grupo_promo": "disenador", "activo": true }
```

- **`codigo` es sagrado.** Es con lo que Sebas carga la orden en el sistema de la
  proveedora. Viaja del producto al pedido, a la base y al WhatsApp (desde el
  23/10/2026 ya no se muestra en la ficha ni en el chat de ejemplo: a la
  clienta no le sirve). Ningún
  cambio puede borrarlo; si algo lo pone en riesgo, se frena.
- `linea`: `bagues` o `unlock`. Códigos Bagués empiezan con `1028`, Unlock con `2028`.
- `nombre_proveedor`: en Bagués es el nombre de la caja (Arizona). En Unlock es
  el nombre oficial.
- `precio_anterior`: el precio de lista, que la web muestra tachado.
- Un tamaño que salió del ciclo se pone `activo: false`, no se borra.

`settings` (una sola fila, `id = 1`): WhatsApp, Instagram, textos del pedido,
`link_catalogo`, `promos_ciclo` (vacío en C10: este ciclo no hay 2x1),
`ciclo_nombre` y `ciclo_hasta`.

`customers`, `orders`, `order_items`: privadas. `order_items` guarda
`nombre_snapshot` y el precio del momento.

**Escritura desde la tienda:** una sola puerta, `crear_pedido_web()`, que busca
los precios del lado del servidor. **Admin:** `es_admin()` compara el email del
token con `sebixtar@gmail.com` (también en `src/data/constants.js`).

**Respaldo:** antes de cargar C10 se copió el catálogo a
`respaldo.products_20261001_pre_c10` (esquema no expuesto por la API). Se puede
borrar cuando el ciclo esté confirmado.

## 6. Lo que no se toca sin autorización explícita

- La estructura de `products`, `orders`, `order_items`, `customers`, `settings`.
- `es_admin()`, las políticas RLS y las validaciones de `crear_pedido_web()`.
- Los códigos de proveedor.
- El aviso legal (`LEGAL` en `contenido.js`).
- Borrar filas de la base: el conector pide confirmación; preferí desactivar.

## 7. Cargar un ciclo nuevo (así se cargó el 10/26)

1. **Respaldo** de `products` en el esquema `respaldo` con la fecha.
2. **Unlock:** bajar el PDF del Drive (pesa ~5 MB, el conector baja hasta 10 MB)
   y extraer texto con `pdfplumber`. Ojo: el PDF censura letras con una estrella
   que el texto lee como "A" (`GAAD GARL VARY` = Very Good Girl). **El dato
   confiable es el código**, no el nombre.
3. **Bagués:** el catálogo general pesa ~29 MB y no se puede bajar por el
   conector; se lee su texto con `read_file_content`. Cada perfume figura como
   `Ciudad Type Perfume by Bagués 1028XXXX` con su precio de bloque.
4. **Comparar por código** contra la base: precios, `precio_anterior`,
   `nombre_proveedor`, tamaños que entran y que salen. En C10 los precios de
   Unlock ya coincidían; los de Bagués cambiaron todos.
5. **Aplicar con SQL por conjunto** (un `VALUES` con código, precio, anterior y
   caja, y un `jsonb_agg` que reescribe las presentaciones). No reescribir el
   JSON entero a mano. Los aromas nuevos van con `insert` y su pirámide.
6. **Revisar el `Type`** de cada caja contra `inspirado_en`: en C10, Doha pasó de
   "Sublime" a Eden Juicy Apple.
7. **Fotos** de lo nuevo (sección 8): las de Unlock con su `"tratamiento"`, y
   la hoja de contacto antes de publicar.
8. Ajustar `settings.ciclo_nombre`, `ciclo_hasta` y `promos_ciclo`.

## 8. Fotos

Todas salen a **900 × 1200 (3:4), llenan el cuadro y viven en la misma pared
vino del hero** (rediseño D, 23/10/2026; antes, el estudio espresso), en la
tarjeta y en la ficha. Paso extra después de componer: `docs/EDITAR.md`, "Las
fotos en la pared vino". Lo arma `scripts/fotos/componer.mjs` a
partir de `scripts/fotos/fuentes.json` (detalle en [`scripts/fotos/README.md`](scripts/fotos/README.md)).
Cada entrada tiene un `"tratamiento"`:

- **`recorte`** (fondo transparente, se detecta solo): todas las cajas de Bagués
  y algunos frascos de Unlock. Se le limpia el filo, se saca el podio si
  `"podio": true`, y se apoya en el estudio con sombra en dos capas y reflejo.
- **`estudio`** (escena de Unlock con frasco opaco o de color): la máscara del
  frasco lo recorta y entra al estudio como un recorte.
- **`espresso`** (vidrio transparente sobre fondo claro): el frasco intacto y
  solo el fondo llevado a la rampa espresso.
- `corte` borra el reflejo de piso que trae la foto; `ampliacionMax` achica un
  frasco ancho.
- **Aviso de resolución:** una fuente agrandada más de 1,8× se publica igual
  (blanda es mejor que la inicial), pero la consola lo grita, queda en
  `scripts/fotos/datos/avisos.json` y la hoja de contacto la marca en rojo.
- **Las máscaras se calculan una vez** con rembg (Python) y quedan versionadas en
  `scripts/fotos/datos/mascaras/`. `componer.mjs` llama solo a `mascaras.py` si
  falta alguna. **El build de Vercel no usa Python**: solo corre `variantes.mjs`
  y las fotos compuestas van commiteadas.
- **Foto nueva de Unlock en un ciclo nuevo:** entrada con `url` y
  `"tratamiento": "estudio"` (o `espresso` si es vidrio claro sobre fondo claro),
  `npm run fotos:componer`, `npm run fotos:contacto`, mirarla, ajustar `corte`
  si quedó un reflejo. Unos minutos por foto; las cajas de Bagués entran solas.
- Fuentes: `bagues.com.ar` (PNG transparentes), `unlock.com.ar`, y los recortes
  del PDF del ciclo guardados en `scripts/fotos/fuentes/` cuando no hay otra.
- **Las cajas de Bagués se emparejan por el nombre de la caja.** Cuidado con New
  York, Amsterdam y Hawai: tienen versión femenina y masculina con el mismo
  nombre y la tienda los distingue en el título.
- `npm run build` corre `variantes.mjs` primero: genera los anchos `-360w` y
  `-560w` que piden las tarjetas. **No borrar variantes a mano.**
- **Antes de publicar, `npm run fotos:contacto`** y mirar la hoja entera: cada
  foto con su archivo, el nombre de la base y su caja o tamaños. Una foto
  equivocada es peor que ninguna.
- Estado C10 (17/10/2026): 100 de 101 aromas con foto, cada línea con su
  propio frasco, las 133 en el mismo estudio (90 recortes, 39 `estudio`, 4
  `espresso`). Falta **Manhattan (Bagués, tipo 212 VIP)**: no está en la web de
  Bagués.
- **No tocar** con este pipeline el grupo de frascos del hero
  (`scripts/fondo/fuentes/frascos-grupo.png`), la escena ni `og.jpg`: esperan
  fotos propias de Sebas.

## 9. Diseño

**Tienda:** sistema completo en [`docs/DISENO.md`](docs/DISENO.md). Lo mínimo:
paleta Ámbar Noir (en la rama del rediseño, la noche pasó a vino hondo y la
letra a Melodrama y Boska: ver Rediseño D abajo), Figtree para texto, vidrio con
lente en los controles (desde el 23/10, claro como el de iOS y toma la luz
de abajo: `.tglass-clear` en `tienda.css`), radio cero en fotos y píldora en botones, un eyebrow cada
tres secciones como máximo, **cero guiones largos en textos visibles**, voseo
("el perfume que ya conocés").

**Tienda desde la etapa 3A:** la ficha se abre con `?aroma=<slug>` (link para
compartir, "atrás" la cierra). La tarjeta es foto, nombre, notas y un precio,
sin pastillas: el `+` agrega directo o abre la hoja de tamaños. El cajón se
abre solo en el primer agregado; después sube una barra con "Ver pedido".
Filtros "Para" y "Familia" en la dirección. En el celular, "Ver 12 más" en vez
del paginador. Detalle en `docs/DISENO.md`.

**Rediseño D, "Cada perfume, una ciudad"** (rama `rediseno-visual`, a `main`
solo con OK de Sebas; plan, decisiones y porqués en
[`docs/PLAN-PORTADA-D.md`](docs/PLAN-PORTADA-D.md)). Reemplaza en lo visual al
C y conserva su hero horneado. Una película en dos luces: noche (vino hondo
`#240604`, pared `#4b1217`) y día (papel `#f6ece8`), un solo acento rubí
`#9e2335` sobre papel. Letras: Melodrama 600 para palabras grandes, Boska para
nombres, cifras e itálicas (el cero de Melodrama viene cruzado: nunca en
números), IBM Plex Mono para datos y La Belle Aurore para un rótulo a mano.
Una sección de papel lleva la clase `.dia`, que redefine colores y apaga el
vidrio. Portada: hero, cinta, Las ciudades, familias, destacados en banda vino,
(lo que me escriben, oculto), cómo funciona, antes de pedir, pie de noche con
la marca a todo el ancho. **Regla de formas:** lo que se toca es redondo
(botones, chips, stepper); lo que se mira es recto (fotos, tarjetas, ficha,
cajón, filas de tamaño). Botón principal plano: crema de noche, rubí de día.
La barra queda fija y toma la luz de la sección de abajo (`data-luz`). La ficha
de escritorio tiene alto fijo y la foto llena la columna (alto × 3/4).

**Rediseño C, "A través del vidrio"** (antecedente; detalle en
[`docs/PORTADA-C.md`](docs/PORTADA-C.md)): el hero es una
sola imagen horneada (pared vino `#4a161f`, cajas Bagués reales detrás de vidrio
acanalado, una ventana en arco nítida) en `public/hero/c/`, que se rehace con
`scripts/rediseno/hornear_hero.py`. Portada: hero, "Lo que pagás", "¿Qué te
gusta oler?", destacados, opiniones, cómo funciona, "Antes de pedir" en banda
vino. Formas: arco (`border-radius: 999px 999px 0 0`) en ventanas y placas.
El mapa de calor por sección se mide con `scripts/qa/atencion/heatmap.py`.

**Nombres:** la web muestra el **nombre oficial** del perfume (la gente lo busca
así; el pie aclara que son versiones inspiradas). La línea se aclara en cada
tamaño de la ficha, el carrito y el WhatsApp: "Unlock" o "Bagues, caja Arizona"
(`detalleLinea` en `lib/producto.js`).

**Panel:** es una herramienta de trabajo, no una vidriera.
- Esquinas: `--r-xs` 4, `--r-sm` 6 (botones, inputs), `--r-md` 8 (tarjetas),
  `--r-lg` 10 (hojas). Sin píldoras. Círculos solo en puntos de estado.
- Superficies sólidas (`.glass` y `.glass-strong` se llaman así por herencia,
  pero **no desenfocan**). Fondo quieto en CSS. Figtree propia.
- Barra de abajo fija y centrada, sobre `env(safe-area-inset-bottom)`.

## 10. Trampas ya pagadas

Cada una costó un error real. Antes de "arreglar" algo parecido, leer esto.

- **Especificidad que pisa posiciones.** En la tienda, `.tienda a` le gana a
  `.tbtn` (texto claro sobre el acento, 2:1) y la posición del vidrio va con
  `:where()`. En el panel, `.glass` traía `position: relative` y le ganaba al
  `position: fixed` de la barra de abajo: se iba al final de la página. Las
  superficies del panel **no llevan `position`**.
- **El panel entra solo con Google.** No hay registro ni email y contraseña:
  la cuenta de Sebas no tiene contraseña, y así no hay ninguna que se filtre.
  En Supabase conviene tener apagados el registro de usuarios nuevos y el
  proveedor Email.
- **El ingreso con Google vuelve con `#access_token`**, no solo con `?code=`. El
  script de `index.html` manda a `/panel` las tres formas de vuelta (incluido el
  error). `redirectTo` pide `/panel`. Si Supabase no lo tiene en su lista,
  vuelve a la Site URL y el script igual lo resuelve.
- **La portada pre-generada se sirve en `/` y en `/panel`** (reglas de
  `vercel.json`); `/catalogo` tiene su propia cáscara (`dist/catalogo/`) y
  cualquier otra dirección recibe `dist/404.html` con estado 404 (desde el
  23/10; antes la portada iba a toda ruta). Una ruta nueva de la app tiene
  que sumarse a `rewrites` o va a dar 404. `main.jsx` solo hidrata
  en `/`; en `/catalogo` monta encima de la cáscara sin vaciarla (espera el
  chunk del catálogo, ver `components/tienda/precargaCatalogo.js`); en otra ruta vacía
  el `#root` y monta. `vite preview` no lee `vercel.json` y contesta
  `/catalogo` con la portada: para probar en local, `node scripts/qa/servir.mjs`.
- **Fotos sin variantes = tarjetas vacías.** Hasta el 23/10 Vercel contestaba
  un archivo que no existe con el HTML (200, `text/html`). Desde la 404 real
  da 404, pero igual: para verificar, mirar `naturalWidth`.
- **El panel trabado era el fondo:** orbes de 400 a 600 px con `blur(80px)`
  animados sin parar, más `backdrop-filter` con refracción SVG en cada caja.
- **Cambiar de pestaña era esperar:** cada pantalla del panel era `lazy` y
  arrancaba vacía. Ahora van juntas y `lib/cachePanel.js` guarda lo traído; al
  confirmar la sesión se precargan pedidos, catálogo, clientes y ajustes.
- **`100vh` en el celular incluye la barra del navegador.** El panel usa `dvh`.
- **sharp aplica `extract` antes que `flip`** aunque se encadene al revés: el
  espejado va en una pasada aparte.
- **El conector de Drive baja hasta 10 MB**; para más, leer el texto.
- **Una corrida de Lighthouse varía 4 o 5 puntos:** mirar la mediana de cinco.
- **El pie se pintaba encima de la ficha.** `.tienda > main` y el pie tienen
  `z-index: 1` y cada uno arma su contexto de apilamiento: lo que va adentro de
  `<main>` nunca le gana al pie, aunque tenga z-index 101. Los diálogos (ficha,
  cajón) van fuera de `<main>`, como hermanos, y con un diálogo abierto el
  resto queda `inert`.
- **`content-visibility: auto` esconde errores en las pruebas.** Lo que está
  fuera de pantalla no se pinta ni recibe toques, y `innerText` lo deja afuera.
  Para probar superposiciones hay que traer la sección a la vista.
- **`inert` le saca el foco a lo que queda adentro.** Si un diálogo es `lazy`,
  cuando se dibuja la página ya está inert y no se sabe quién lo abrió: el
  disparador se anota al tocar (ver `useDialogo` y `TiendaShell`).
- **El `::after` que agranda un área táctil se mide desde adentro del borde.**
  Una pastilla de 40 px con borde de 1 px necesita `inset: -3px`, no `-2px`.
- **`naturalWidth` con `srcset` viene dividido por la densidad**: el archivo de
  560 px puede decir 179. Para saber los píxeles reales, cargar el archivo sin
  `srcset`.
- **El clic de Playwright trae el elemento a la vista y deja el mouse
  encima.** Medir saltos de scroll con eso da falsos positivos (el código
  viejo "saltaba" 900 → 246 solo en el banco) y el `:hover` de la tarjeta
  movía 2 px. Para medir posición: `touchscreen.tap` o `el.click()` desde JS.
- **Con un diálogo abierto el body queda `position: fixed`** (corrido
  `-scrollY`, `useBloqueoScroll`). `scrollTo` no mueve nada mientras tanto: un
  chequeo que quiera mover la página de atrás tiene que correr `body.style.top`
  (ver `abrir_con_pie_detras` en el banco). Y `window.scrollY` lee 0.
- **`vite build` suelto borra `dist/catalogo/`.** `servir.mjs` contesta 404 en
  `/catalogo` y el banco o Lighthouse fallan sin explicación. Siempre
  `npm run build`, que corre el prerender.
- **Lighthouse en el contenedor tiene mucho ruido** (TBT de 125 a 690 ms con el
  mismo build). Para decidir entre dos variantes: correrlas intercaladas, una
  y una, y mirar la mediana del LCP. Así se vio que sacar la preflight de CORS
  (clave en la dirección) empeoraba la simulación 250 ms: no se hizo.
- **El estado de una entrada del historial sobrevive a recargar.** La hoja de
  tamaños se abre con una entrada propia; sin la marca `SESION` de
  `TiendaShell`, recargar la reabría sola.
- **Los imports nuevos de `lib/` llevan `.js`** (`./familias.js`): sin eso node
  no los resuelve y no se pueden probar sin Vite, como `busqueda.js`.
- **El código de proveedora no es el SKU de las tiendas.** bagues.com.ar y
  unlock.com.ar usan SKU como `BNUDLINE` o `ULSAUVAH`: buscar `10282038` ahí no
  encuentra nada. No escribir que "se puede buscar en la web de Bagués".
- **Safari calcula distinto que Chrome.** El botón del hero (inline-flex con
  anchos por aspect-ratio) se le salía a la derecha, y en la ficha (grilla con
  max-height y scroll) aplastaba la foto a 55 px. Chrome se veía bien. Por eso
  existe `scripts/qa/motores.py`: Safari, Chrome y Firefox antes de publicar.
- **`.tienda > header { position: relative }` le ganaba al sticky de la barra**:
  nunca había quedado fija. El encabezado de la tienda no lleva `position`
  salvo `sticky`.
- **La CSP bloquea en silencio un script en línea que cambió.** Si se toca un
  `<script>` de `index.html`, hay que poner su hash nuevo en `vercel.json`;
  `prerender.mjs` frena el build si falta (detalle en `docs/SEGURIDAD.md`).
- **HSTS y `upgrade-insecure-requests` rompen Safari en local** (http): pasa todo
  a https://localhost. `servir.mjs` no manda HSTS y la CSP no lleva upgrade.
- **Firefox de Playwright no conoce el certificado del proxy del contenedor**:
  la base no contesta y parece un error de CORS. `motores.py` le pasa
  `ignore_https_errors`; no es un problema de la tienda.
- **El cero de Melodrama viene cruzado** (Ø): nunca en números.
- **El conector de Supabase cancela en silencio una consulta con texto que
  parece un ataque** (por ejemplo una prueba de inyección con `drop table`
  adentro de un string): devuelve `cancelled`, sin error. Para probar
  inyección, usar comillas sueltas y símbolos, no comandos.
- **El teléfono de una clienta es la llave para no duplicarla.** Todo lo que
  guarda un teléfono pasa por `telefonoArgentino()` (o `telefono_ar()` en la
  base): `549` + 10 cifras. Un número guardado de otra forma crea otra clienta.
- **Una sombra desenfocada adentro del tamaño de su objeto queda con bordes
  rectos.** La sombra en la pared de las fotos se cortaba en el borde del
  recorte y detrás de los frascos finos quedaba un rectángulo, como un parche.
  `sombras_y_reflejo` ahora desenfoca con margen (3 sigmas).
- **La hoja de una familia vive en la dirección** (`/?familia=`), encima de la
  portada, con su capa a z 90/91: tapa la barra (30) para que tocar afuera no
  caiga en la marca; la ficha (100/101) va por encima. Con otra capa encima
  queda `inert` y no cierra con Escape (si no, un Escape cerraba dos).
- **El visor de Instagram mide 664 de alto.** El botón del hero tiene que
  terminar antes (E3-B1 664); por eso el precio del celular no baja más.
- **Lighthouse contra una vista previa de Vercel da peor que contra
  producción** con el mismo código (el documento llega ~100 ms más tarde y la
  simulación lo multiplica: 2,76 contra 2,35 s). Para decidir, comparar en
  local las dos versiones intercaladas (la otra en un `git worktree`, servida
  con `PORT=4174 node scripts/qa/servir.mjs`) o medir producción después de
  publicar.
- **Un `Suspense` con `fallback={null}` deja ver el pie.** Mientras baja el
  chunk de una página, la página mide solo lo que mide el pie y el navegador
  queda parado ahí. El catálogo se precarga, sube arriba antes de pintar y
  su espera es una página de papel de `100dvh`.
- **Una animación con `fill-mode: both` pisa el `:hover`.** El `transform`
  final queda aplicado por la animación y le gana a la regla normal: la
  entrada de las tarjetas va con `backwards`.
- **Animar `clip-path` o `inset` con el scroll tironea**: se repinta en cada
  cuadro. Lo que va atado al scroll anima solo `transform` u `opacity`.
- **`animation-timeline: view()` en un `::before` mide al seudoelemento** en
  Chrome (Safari, a su dueño). Para que un paño siga a su sección, la sección
  declara `view-timeline: --nombre` y el paño usa ese nombre.
- **`filter: drop-shadow` en imágenes que aparecen al bajar traba el scroll**
  en el celular: se rasteriza al entrar. Una elipse pintada hace lo mismo.
- **Una variable CSS no se anima** salvo que se registre con `@property`
  (así cambia suave el fondo de la barra).
- **`document.fonts.load` antes del `@font-face` contesta enseguida y vacío.**
  El build pega la hoja embebida después de los scripts del `<head>`: el
  script del hero pide las fuentes en el primer cuadro.
- **`servir.mjs` lee la CSP de `vercel.json` al arrancar.** Si cambiaste un
  script en línea y su hash, reiniciá el servidor local o el script no corre.
- **El conector de Supabase pide confirmación para lo destructivo** (`drop`,
  `delete`, `drop policy`) y si nadie confirma devuelve `cancelled`. Una
  migración que mezcla eso con lo demás se cancela entera: separarla, y lo que
  borra dejarlo en `supabase/manual/` para Sebas.
- **No se puede escribir en las variables de GitHub Actions desde acá** (el
  proxy lo bloquea): las carga Sebas en Settings > Secrets and variables.
- **`.tienda h1` le gana a una clase de módulo en el h1** (`.titulo`): el
  título del hero usa Boska recta por eso. Para cambiarle algo, la regla va
  con `:global(.tienda) .titulo`.
- **Lighthouse cuenta cada fuente embebida (`data:`) como un pedido.** Con
  cinco recortes embebidos el FCP observado mejoraba y el simulado empeoraba
  300 ms: solo va la recta del título.
- **La captura de Playwright espera a `document.fonts.ready`.** Con las
  fuentes frenadas, `screenshot()` saca la foto recién cuando llegan: para ver
  el primer cuadro, grabar con `Page.startScreencast` (CDP).
- **Medir fuentes en Linux engaña:** Chromium redondea el avance de cada letra
  de las fuentes del sistema con hinting. Para comparar anchos como en un
  teléfono, `--font-render-hinting=none`.

## 11. Antes de dar algo por hecho

```bash
npm run build   # tiene que terminar sin errores (incluye variantes y prerender)
npm run dev     # y mirarlo
node scripts/qa/servir.mjs &                                  # dist/ como Vercel
python3 scripts/qa/recorrido.py --url http://localhost:4173   # sin FALLA nuevos
node scripts/qa/busqueda.test.mjs                             # si se tocó el buscador
node scripts/qa/datos.test.mjs                                # si se tocó nombre o teléfono
python3 scripts/qa/motores.py                                 # Safari, Chrome y Firefox, 5 anchos
```

**El banco de pruebas es obligatorio antes de publicar** (cómo y qué mide, en
[`docs/QA.md`](docs/QA.md)): ningún chequeo que pasaba puede pasar a FALLA.
Después de publicar se corre contra producción, con `--lh 5` si el cambio
puede mover el rendimiento. Si producción queda peor, `git revert` y publicar.

Compilar no alcanza. Verificar en el navegador real, a **390 px** y a **1440 px**:

- Que las imágenes carguen (`naturalWidth > 0`), no solo que pidan 200.
- Contraste medido contra el peor fondo, no a ojo.
- Que no aparezca un guión largo en ningún texto visible:
  `grep -rnP "—|–" src/config src/components --include=*.js --include=*.jsx`
  (los comentarios no cuentan).
- Panel: se puede revisar el diseño sin sesión con `npm run dev` y `/panel?qa=1`
  (solo en desarrollo; los datos privados no se ven por RLS).
- Después de publicar, comprobar en `baguesfraganciaswolf.vercel.app` que el
  cambio está (que el archivo nuevo responda), no solo que el deploy dijo READY.

Commits en castellano, en `main`, con mensaje que diga el porqué.

## 12. Pendientes

- **Seis fotos de Unlock blandas** (aviso de resolución en
  `scripts/fotos/datos/avisos.json`): Polo Red y Phantom (3,4×), Carolina
  Herrera for Men, Y de YSL y Omnia Indian Garnet (2,6×), La Belle Paradise
  Garden (1,8×). No están en la tienda de Unlock y el PDF del ciclo no tiene
  nada más grande. Una foto propia de cada frasco, subida desde el panel, las
  resuelve.
- **Foto de Manhattan (Bagués, 212 VIP).** Está solo en el PDF general del
  ciclo. Sebas puede subirla desde el panel, o se agrega a `fuentes.json` con
  `archivo` y se corre `npm run fotos`.
- **Ajustes de Supabase que hace Sebas a mano** (Authentication): URL del sitio
  `https://baguesfraganciaswolf.vercel.app` con `/panel` en las redirecciones;
  "Allow new users to sign up" apagado; proveedor Email apagado; Captcha
  apagado (no protege nada acá y sin configurar rompe el ingreso). Todo hecho el
  2/10/2026. Si se cambia el dominio, la URL del sitio es lo primero: si apunta a
  un dominio que no existe, el ingreso con Google se rompe.
- **`Hawai Masculino`** quedó inactivo (era un producto cargado a mano, sin
  código; lo reemplaza Hawai Masc tipo Le Male Elixir). Se puede borrar.
- **El respaldo** `respaldo.products_20261001_pre_c10` se puede borrar cuando el
  ciclo esté confirmado.
- Llevar el vidrio a la ficha y al cajón del pedido (pendiente de diseño viejo).
- **De la etapa 1 de la auditoría** queda la página 404 (choca con la
  reescritura de Vercel). El salto al abrir la ficha se resolvió en la etapa 3A
  y el LCP de `/catalogo` bajó 150 ms (E3-A9); lo que sigue es la cadena HTML →
  JS → catálogo → foto. Pendiente medir en un Android real leer el catálogo sin
  preflight de CORS (en la simulación de Lighthouse salió peor).
- **Polo Red y Phantom Black sin familia ni notas**: no están en las tiendas de
  las proveedoras. Caen en "Otros"; se cargan desde el panel.
- **¿La caja trae el código impreso?** Si Sebas lo confirma, la línea de la
  ficha (`FICHA.verificar` en `contenido.js`) puede decirlo.
- **Etapa 3B:** hecha salvo B4 y B5, que absorbe el rediseño visual (rama
  `rediseno-visual`, a producción solo con OK de Sebas). Faltan de él las
  capturas de clientas (`src/data/opiniones.json`, ver `docs/EDITAR.md`), su
  foto y fotos propias de cajas. Registro en [`docs/QA.md`](docs/QA.md).
- **El respaldo** `respaldo.products_20261022_pre_b9` y
  `respaldo.settings_20261022_pre_b9` (etapa 3B) se pueden borrar más adelante.

## 13. Documentación del repo

| Archivo | Para qué |
| --- | --- |
| [`README.md`](README.md) | Presentación del proyecto, decisiones y errores encontrados |
| [`docs/CONTEXTO.md`](docs/CONTEXTO.md) | Por qué existe, decisiones, estado, rendimiento |
| [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) | Cómo está armado por dentro |
| [`docs/EDITAR.md`](docs/EDITAR.md) | Qué tocar para cambiar qué |
| [`docs/DISENO.md`](docs/DISENO.md) | Sistema visual de la tienda y del panel |
| [`docs/QA.md`](docs/QA.md) | Registro de errores y cómo correr el banco de pruebas |
| [`docs/KIT.md`](docs/KIT.md) | El esqueleto reutilizable en otro proyecto |
| [`docs/SEGURIDAD.md`](docs/SEGURIDAD.md) | Revisión de seguridad: permisos, puerta de pedidos, cabeceras y CSP, y lo que queda para autorizar |
| [`docs/PLAN-PORTADA-D.md`](docs/PLAN-PORTADA-D.md) | Plan del rediseño D: guion de color, letra, decisiones de Sebas y cambios con su porqué |
| [`docs/RECETA-VISUAL.md`](docs/RECETA-VISUAL.md) | De las referencias a los assets: ADN medido, letra, guion de color, pared, productos, vidrio y adorno, para calcar en otro proyecto |
| [`scripts/fotos/README.md`](scripts/fotos/README.md) | El pipeline de fotos |

Si cambiás algo de lo que describen, actualizalos en el mismo commit.
