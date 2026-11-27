# CLAUDE.md

Contexto de trabajo para Claude Code en este repo. Se lee entero antes de tocar
nada.

Este archivo es **público** (el repo lo es). Lo que no puede serlo vive en
`CLAUDE.local.md`, que no se versiona: identificadores de Supabase y Vercel,
la revisión de seguridad y las notas internas.

Detalle de animaciones, LCP y peso: @docs/ANIMACION-Y-VELOCIDAD.md

---

## 1. Quién y para qué

Sebastián (Sebas) vende perfumes por WhatsApp en Córdoba. Revende las fragancias
de la casa **Bagués**, en dos líneas: **Bagués** (cajas de 50 ml con nombre de
ciudad, Arizona, Granada) y **Unlock** (frascos de 100 ml y minis de 20 a 30 ml).
Son versiones inspiradas de perfumes de diseñador.

La app es la tienda pública más el panel privado con el que gestiona los pedidos.
La venta se cierra por WhatsApp: **no hay pasarela de pago y no la va a haber.**

El criterio que manda sobre todo: **sacar trabajo, no agregarlo.** Si una función
obliga a mantenerla todos los días, no va. Cargar un ciclo nuevo tiene que llevar
menos de media hora.

## 2. Cómo trabajar con él

- **Castellano rioplatense con voseo**, directo, con títulos y párrafos cortos.
- **Antes de tocar código, devolvé el plan.** Lo usa como control de calidad.
- **No le pases código para pegar.** Hacé el cambio, verificalo y publicalo.
- **No dejes problemas a medias** ni entregues "una primera versión" sin probar.
- **No actúes sobre su computadora** salvo que lo pida él.
- Trabaja mucho desde el **celular**: todo se revisa primero a 390 px de ancho.
- Si la salida suena genérica, la va a rechazar: aplicá el sistema de diseño de
  este repo, no un estilo por defecto.
- Cuando algo no se pudo hacer, decilo claro y explicá qué falta.

## 3. Dónde vive cada cosa

| Qué | Dónde |
| --- | --- |
| Tienda | https://baguesfraganciaswolf.vercel.app |
| Panel | https://baguesfraganciaswolf.vercel.app/panel |
| Repo | `github.com/Seba-fernandez/baguesfraganciaswolf` |
| Vercel | publica solo desde `main`; cada rama tiene su vista previa |
| Tiendas de las proveedoras | `unlock.com.ar` y `bagues.com.ar`, las dos Shopify con `/products.json` público |

Variables de entorno (`.env`, no se versiona): `VITE_SUPABASE_URL` y
`VITE_SUPABASE_ANON_KEY`. Son las claves públicas. **El repo es público: nunca
una clave secreta en un archivo.**

## 4. Stack y mapa del código

React 18, Vite 5, React Router 7. CSS Modules y variables CSS, sin Tailwind ni
biblioteca de componentes. PostgreSQL en Supabase con RLS en todas las tablas.
Portada pre-generada como HTML en el build. Movimiento en CSS nativo, salvo
Lenis (5,7 kB) para la ruedita en escritorio y el resorte de `motion`
(2 kB gzip, diferido, solo escritorio) para el vidrio flotante.

```
src/
  config/         contenido.js (todo texto visible) y ajustes.js (números)
  components/
    tienda/       la web pública
                  Iconos.jsx: íconos propios (trazo 1,5 sobre grilla de 24)
    panel/        el panel; PanelApp.jsx es la puerta
    layout/       estructura del panel
    auth/         ingreso al panel: solo Google
    ui/           piezas sueltas del panel
  hooks/          datos (useProducts, useOrders) y comportamiento (useReveal,
                  useDialogo, useBloqueoScroll, useMedia)
  lib/            reglas de negocio sin JSX
    apiTienda.js    lectura de la tienda con fetch, SIN supabase-js
    busqueda.js     el buscador del catálogo
    alScroll.js     un solo oyente de scroll, una pasada por cuadro
    flotante.js     imán y flotar del vidrio (solo escritorio): inclina, sube y mueve el brillo
    mayorista.js    tope y aviso por cantidad del pedido
    recuperar.js    rescate cuando un chunk viejo ya no existe
    promos.js       el 2x1 por grupos
    producto.js     presentaciones, título, pirámide, ahorro
    whatsapp.js     el mensaje del pedido
    ciclo/          cargar un ciclo desde los PDF
  data/           constantes y fotos.js (índice generado)
  styles/         tienda.css (tienda) y global.css (panel)
scripts/
  fotos/          componer.mjs + fuentes.json: el pipeline de fotos
  rediseno/       hero horneado (hornear_hero.py, hornear_hero_navidad.py)
  prerender.mjs   pega la portada en dist/index.html
supabase/migrations/  esquema, RLS, aplicar_ciclo
```

**Dos fronteras que no se cruzan:**

1. **La tienda no importa `lib/supabase`.** Lee con `fetch` contra PostgREST.
   Si un componente de `tienda/` lo importa, se pierden ~80 kB en silencio.
2. **`lib/` no sabe de pantallas y `components/` no calcula reglas.** Si una
   cuenta da mal, el error está en `lib/`.

## 5. El modelo de datos

**La unidad del catálogo es el aroma, no el código de proveedora.** Muchos
perfumes están en las dos líneas con nombres distintos (Arizona en Bagués es
Sauvage en Unlock): una fila por aroma y los tamaños de las dos líneas adentro.

Tabla `products`, columnas que importan: `slug`, `nombre` (el nombre oficial),
`inspirado_en` (lo que muestra la web), `imagen_url`, `destacado`, `orden`,
`activo`, y `presentaciones` (JSON con los tamaños).

Cada presentación:

```json
{ "ml": 50, "linea": "bagues", "codigo": "10282038",
  "precio": 30999, "precio_anterior": null,
  "nombre_proveedor": "Arizona", "grupo_promo": "disenador", "activo": true }
```

- **`codigo` es sagrado.** Es con lo que Sebas carga la orden en el sistema de la
  proveedora. Ningún cambio puede borrarlo; si algo lo pone en riesgo, se frena.
- `linea`: `bagues` o `unlock`. Códigos Bagués empiezan con `1028`, Unlock con `2028`.
- `precio_anterior`: el precio de lista, que la web muestra tachado.
- Un tamaño que salió del ciclo se pone `activo: false`, no se borra.

`settings` (una sola fila): WhatsApp, Instagram, textos del pedido,
`promos_ciclo`, `ciclo_nombre` y `ciclo_hasta`.

**Escritura desde la tienda:** una sola puerta, `crear_pedido_web()`, que busca
los precios del lado del servidor.

## 6. Lo que no se toca sin autorización explícita

- La estructura de `products`, `orders`, `order_items`, `customers`, `settings`.
- `es_admin()`, las políticas RLS y las validaciones de `crear_pedido_web()`.
- Los códigos de proveedor.
- El aviso legal (`LEGAL` en `contenido.js`).
- Borrar filas de la base: preferí desactivar.
- Lo visual va a `main` solo con "publicá" de Sebas.

## 7. Cargar un ciclo nuevo

Se hace desde el panel: Catálogo > "Cargar ciclo nuevo". Lee los dos catálogos,
compara por código, muestra la propuesta y aplica con `aplicar_ciclo()`
(respaldo, todo o nada, nunca borra). Desde el 25/11/2026 también detecta las
promos 2x1 del catálogo y las propone, y **un precio que no se puede leer frena
la carga** en vez de conservar el viejo en silencio.

## 8. Fotos

Todas salen a **900 × 1200 (3:4), llenan el cuadro y viven en la misma pared
vino del hero**. Las arma `scripts/fotos/componer.mjs` desde `fuentes.json`.
Cada entrada tiene un `"tratamiento"`: `recorte`, `estudio` o `espresso`.
Las máscaras se calculan una vez con rembg y quedan versionadas. **El build de
Vercel no usa Python.** `npm run build` corre `variantes.mjs` primero: genera
los anchos `-360w` y `-560w` que piden las tarjetas.

**Antes de publicar, `npm run fotos:contacto`** y mirar la hoja entera. Una foto
equivocada es peor que ninguna.

## 9. Diseño

Paleta Ámbar Noir, con la noche en vino hondo `#240604`, pared `#4b1217`, un
solo acento rubí `#9e2335` y papel `#f6ece8`. Letras: Melodrama 600 para
palabras grandes, Boska para nombres, cifras e itálicas (**el cero de Melodrama
viene cruzado: nunca en números**), IBM Plex Mono para datos.

**Regla de formas:** lo que se toca es redondo (botones, chips, stepper); lo que
se mira es recto (fotos, tarjetas, ficha, cajón).

Cero guiones largos en textos visibles, voseo y primera persona.

**Panel:** es una herramienta de trabajo, no una vidriera. Superficies sólidas,
sin píldoras, fondo quieto.

## 10. Trampas ya pagadas

Cada una costó un error real. Antes de "arreglar" algo parecido, leer esto.

- **Especificidad que pisa posiciones.** `.tienda a` le gana a `.tbtn`. En el
  panel, `.glass` traía `position: relative` y le ganaba al `fixed` de la barra.
  Las superficies del panel **no llevan `position`**.
- **El panel entra solo con Google.** No hay registro ni contraseña.
- **El ingreso con Google vuelve con `#access_token`**, no solo con `?code=`.
- **La portada pre-generada se sirve en `/` y en `/panel`**; `/catalogo` tiene su
  propia cáscara. **Una ruta nueva tiene que sumarse a `rewrites` de
  `vercel.json` o da 404.**
- **Fotos sin variantes = tarjetas vacías.** Para verificar, mirar `naturalWidth`.
- **`100vh` en el celular incluye la barra del navegador.** Usar `dvh`, salvo en
  secciones atadas al scroll, donde va `svh` (con `dvh` la sección cambia de alto
  y hace saltar el scroll).
- **sharp aplica `extract` antes que `flip`** aunque se encadene al revés.
- **Una corrida de Lighthouse varía 4 o 5 puntos:** mirar la mediana de cinco.
- **El pie se pintaba encima de la ficha.** Los diálogos van fuera de `<main>`,
  como hermanos, y con un diálogo abierto el resto queda `inert`.
- **`content-visibility: auto` esconde errores en las pruebas.**
- **`content-visibility: auto` también recorta lo que sobresale de la sección** (los paños del telón de Destacados). La regla de `tienda.css` lleva dos `:not(#id)`: la que lo apaga tiene que empatarlos o pierde.
- **`inert` le saca el foco a lo que queda adentro.**
- **El `::after` que agranda un área táctil se mide desde adentro del borde.**
- **`naturalWidth` con `srcset` viene dividido por la densidad.**
- **El clic de Playwright trae el elemento a la vista y deja el mouse encima.**
  Para medir posición: `touchscreen.tap` o `el.click()` desde JS.
- **Con un diálogo abierto el body queda `position: fixed`** y `window.scrollY`
  lee 0.
- **`vite build` suelto borra `dist/catalogo/`.** Siempre `npm run build`.
- **El estado de una entrada del historial sobrevive a recargar.**
- **Los imports nuevos de `lib/` llevan `.js`** (`./familias.js`).
- **El código de proveedora no es el SKU de las tiendas.** Buscar `10282038` en
  bagues.com.ar no encuentra nada.
- **Safari calcula distinto que Chrome.** Por eso existe `scripts/qa/motores.py`.
- **La CSP bloquea en silencio un script en línea que cambió.** Si se toca un
  `<script>` de `index.html`, su hash nuevo va en **las tres entradas** de
  `vercel.json`; el build frena si falta.
- **HSTS y `upgrade-insecure-requests` rompen Safari en local.**
- **El cero de Melodrama viene cruzado** (Ø): nunca en números.
- **El teléfono de una clienta es la llave para no duplicarla.** Todo pasa por
  `telefonoArgentino()`: `549` + 10 cifras.
- **Una sombra desenfocada adentro del tamaño de su objeto queda con bordes
  rectos.** Desenfocar con margen (3 sigmas).
- **Animar `clip-path` o `inset` con el scroll tironea.** Lo que va atado al
  scroll anima solo `transform` u `opacity`.
- **`filter: drop-shadow` en imágenes que aparecen al bajar traba el scroll.**
- **Una variable CSS no se anima** salvo que se registre con `@property`.
- **Una animación con `fill-mode: both` pisa el `:hover`.** Va `backwards`.
- **El elemento más grande que se pinta no puede arrancar en `opacity: 0`**: el
  navegador cuenta el LCP recién cuando termina de aparecer. Medido: 1700 ms
  contra 452 ms.
- **Un HTML cacheado que apunta a chunks viejos deja la página en blanco.** El
  HTML va con `must-revalidate` y `/assets/*` con `immutable`.
- **`replace` con un texto que trae `$&` lo toma como patrón.**
- **pdf.js rechaza un `Buffer` de Node**: copiar con `new Uint8Array(datos)`.
- **`ctx.filter` del canvas no anda en Safari.**
- **Un servidor en segundo plano lanzado en el mismo comando que un `pkill` se
  mata a sí mismo.** Y `servir.mjs` guarda en memoria lo comprimido: después de
  un build, reiniciarlo.
- **Las tareas programadas de GitHub solo corren desde `main`.**
- **En Windows (`core.autocrlf=true`) el build falla en local**: con CRLF los
  hashes de los scripts de `index.html` no coinciden con la CSP y algún test
  que busca `\n` falla. Para verificar, una copia en LF (`git worktree add` con
  `core.autocrlf=false` y los cambios pasados por `tr -d '\r'`). Y antes de
  commitear, cada archivo tocado en LF: si entra con CRLF, el diff lo muestra
  reescrito entero.
- **La base guarda como 1 cualquier línea de pedido con más de 20 unidades**
  (`crear_pedido_web`, sin avisar): por eso `CANTIDAD_MAXIMA` es 20 y el aviso
  de compra por mayor sale desde `MAYORISTA_DESDE` (`lib/mayorista.js`).

## 11. Antes de dar algo por hecho

```bash
npm run build   # tiene que terminar sin errores
npm run dev     # y mirarlo
node scripts/qa/servir.mjs &                                  # dist/ como Vercel
python3 scripts/qa/recorrido.py --url http://localhost:4173   # sin FALLA nuevos
npm run lint && npm test
python3 scripts/qa/motores.py                                 # Safari, Chrome y Firefox
```

Compilar no alcanza. Verificar en el navegador real, a **390 px** y a **1440 px**:
que las imágenes carguen (`naturalWidth > 0`), el contraste medido contra el peor
fondo, y que no aparezca un guión largo en ningún texto visible:

```bash
grep -rnP "—|–" src/config src/components --include=*.js --include=*.jsx
```

Commits en castellano, en `main`, con mensaje que diga el porqué.
