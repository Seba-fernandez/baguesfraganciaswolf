# CLAUDE.md

Contexto de trabajo para Claude Code en este repo. Se lee entero antes de tocar
nada. El porqué del proyecto está en [`docs/CONTEXTO.md`](docs/CONTEXTO.md); acá
está lo que hace falta para trabajar bien desde el primer cambio.

*Última actualización: 16 de octubre de 2026, después de la etapa 1 de la auditoría
(registro en [`docs/QA.md`](docs/QA.md)).*

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
Portada pre-generada como HTML en el build. Movimiento en CSS nativo.

```
src/
  config/         contenido.js (todo texto visible) y ajustes.js (números)
  components/
    tienda/       la web pública
    panel/        el panel; PanelApp.jsx es la puerta y monta todo lo suyo
    layout/       estructura del panel (barra de abajo, lateral, encabezado)
    auth/         ingreso al panel: solo Google, sin registro ni contraseña
    ui/           piezas sueltas del panel
  hooks/          datos (useProducts, useOrders...) y comportamiento (useReveal)
  lib/            reglas de negocio sin JSX
    apiTienda.js    lectura de la tienda con fetch, SIN supabase-js
    busqueda.js     el buscador del catálogo (tolerante; pruebas en scripts/qa)
    cachePanel.js   memoria compartida del panel
    fotos.js        qué foto le toca a cada aroma (tienda y panel)
    producto.js     presentaciones, título, línea de cada tamaño
    promos.js       el 2x1 por grupos
    whatsapp.js     el mensaje del pedido
    vidrioLiquido.js  la lente del vidrio de la tienda
  data/           constantes y fotos.js (índice generado)
  styles/         tienda.css (tienda) y global.css (panel)
scripts/
  fotos/          componer.mjs + fuentes.json: el pipeline de fotos
  fondo/          dibuja la escena del hero y la textura
  prerender.mjs   pega la portada en dist/index.html y la cáscara de /catalogo
                  en dist/catalogo/index.html
supabase/migrations/  esquema, RLS y la función de pedido
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
  proveedora. Viaja de la ficha al pedido, a la base y al WhatsApp. Ningún
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

Todas salen a **900 × 1200 (3:4), llenan el cuadro y viven en el mismo estudio
espresso**, en la tarjeta y en la ficha. Lo arma `scripts/fotos/componer.mjs` a
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
paleta Ámbar Noir (espresso `#17110d`, un solo acento rosa-vino `#e0708a`, oro de
arena solo para brillos), Cormorant para títulos y Figtree para texto, vidrio con
lente en los controles, radio cero en fotos y píldora en botones, un eyebrow cada
tres secciones como máximo, **cero guiones largos en textos visibles**, voseo
("el perfume que ya conocés").

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
- **La portada pre-generada se sirve en toda ruta** por la reescritura de
  Vercel, salvo `/catalogo`, que tiene su propia cáscara (`dist/catalogo/`,
  regla aparte en `vercel.json`, antes de la general). `main.jsx` solo hidrata
  en `/`; en `/catalogo` monta encima de la cáscara sin vaciarla (espera el
  chunk del catálogo, ver `precargarCatalogo` en `App.jsx`); en otra ruta vacía
  el `#root` y monta. `vite preview` no lee `vercel.json` y contesta
  `/catalogo` con la portada: para probar en local, `node scripts/qa/servir.mjs`.
- **Fotos sin variantes = tarjetas vacías.** Vercel contesta un archivo que no
  existe con el HTML (200, `text/html`): no hay 404 que avise. Para verificar,
  mirar `naturalWidth` de las imágenes, no el código de respuesta.
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
- **La dependencia `motion`** ya no se usa en ningún archivo: se puede sacar de
  `package.json`.
- **El respaldo** `respaldo.products_20261001_pre_c10` se puede borrar cuando el
  ciclo esté confirmado.
- Llevar el vidrio a la ficha y al cajón del pedido (pendiente de diseño viejo).
- **La aclaración del pie dice "retiro los viernes"** (`settings.aclaracion_pedido`).
  El plazo real varía con el cierre del ciclo: Sebas la cambia desde Ajustes.
- **De la etapa 1 de la auditoría** quedaron: página 404 (choca con la
  reescritura de Vercel), el LCP de `/catalogo` (primera fila de fotos en
  `lazy`) y el salto arriba al abrir la ficha en Chromium móvil. Detalle en
  [`docs/QA.md`](docs/QA.md#pendientes), junto con lo que va en la etapa 2.

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
| [`scripts/fotos/README.md`](scripts/fotos/README.md) | El pipeline de fotos |

Si cambiás algo de lo que describen, actualizalos en el mismo commit.
