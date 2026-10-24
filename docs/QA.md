# Registro de errores y banco de pruebas

Qué se encontró en la auditoría de octubre de 2026, cómo se reproduce, qué
chequeo automático lo cubre y en qué estado quedó en producción. Lo que no se
hizo, y por qué, está en [Pendientes](#pendientes).

La auditoría completa (con las ideas de diseño y fotos que van en otra etapa)
no está en el repo; los IDs de abajo son los de ese informe.

---

## Cómo correr el banco de pruebas

```bash
npm run build
node scripts/qa/servir.mjs &                                  # dist/ como lo sirve Vercel, puerto 4173
python3 scripts/qa/recorrido.py --url http://localhost:4173   # local
python3 scripts/qa/recorrido.py --url https://baguesfraganciaswolf.vercel.app --lh 5   # producción + Lighthouse
node scripts/qa/busqueda.test.mjs                             # el buscador, sin navegador
node scripts/qa/datos.test.mjs                                # nombre y WhatsApp del pedido, sin navegador
```

- Imprime una tabla y escribe `scripts/qa/resultado.json` (no se versiona).
  `--solo UX-1,UX-3` corre solo esos; `--lh 5` agrega Lighthouse mobile con la
  mediana de cinco corridas.
- **No confirma pedidos reales.** La llamada a `crear_pedido_web` se intercepta
  y se contesta con un pedido de mentira (#9999), y cualquier otra escritura
  contra la base se corta. Se puede correr contra producción.
- Necesita Playwright para Python con Chromium. Lighthouse se baja con `npx` y
  usa ese mismo Chromium.
- **`vite preview` no sirve para esto**: no lee `vercel.json` y contesta
  `/catalogo` con la portada. Por eso existe `servir.mjs`.
- `scripts/qa/linea-base.json` es la corrida contra producción antes de tocar
  nada (16 de octubre de 2026, commit `bd8b2cb`).

Tres cosas del banco que conviene saber antes de "arreglarlo":

1. **UX-1 deja el pie detrás de la ficha a propósito.** El pie tiene
   `content-visibility: auto`: si está fuera de pantalla no se pinta y el
   error desaparece. En Chromium móvil, además, la página salta arriba al abrir
   la ficha (iOS no). Sin forzar el pie a la vista, el chequeo pasaba con el
   error puesto.
2. **FOTO-5 mide los píxeles del archivo, no `naturalWidth`.** Con `srcset`,
   `naturalWidth` viene dividido por la densidad que eligió el navegador: el
   archivo de 560 px aparecía como de 179.
3. **UX-14 usa Chromium con `--font-render-hinting=none`.** En Linux, Chromium
   redondea el avance de cada letra de Liberation Sans (la Arial de Linux) a
   píxeles enteros, y eso solo corre 5 px un botón. iOS, Android y Mac no lo
   hacen. Con la opción, el chequeo mide lo que ve un teléfono.

---

## El registro

Categorías: **bloqueante** (impide comprar o agregar), **conversión** (no lo
impide pero pierde ventas), **confianza** (falta información para creer y
pagar), **accesibilidad**, **rendimiento**, **visual**, **contenido**.

Línea de base: producción el 16/10/2026 antes de tocar nada. Final:
producción después de publicar los bloques 3.1 y 3.2 (commit `0e6b566`).

| ID | Categoría | Sev. | Qué pasaba | Cómo se reproduce | Chequeo | Base | Final | Commit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UX-1 | bloqueante | alta | El pie de página tapaba "Agregar al pedido" de la ficha: el toque le llegaba a un enlace del pie | Buscar "sauvage", bajar hasta el resultado, abrir la ficha, bajar hasta el botón y tocarlo | `UX-1 390`, `UX-1 1440` | FALLA (toca el pie) | PASA | `ab933c6` |
| UX-7 | bloqueante | alta | Si el navegador bloqueaba `window.open` (Safari, Instagram), la pantalla final no tenía cómo abrir WhatsApp | Confirmar un pedido con datos lentos en Safari | `UX-7 enlace`, `UX-7 textos` | FALLA | PASA | `828b4aa` |
| UX-2 | conversión | alta | `/catalogo` en frío mostraba la portada y el pie con el aviso legal antes del catálogo; CLS 0,92; canonical a `/` | Abrir el link del catálogo en una pestaña nueva del celular | `UX-2 CLS`, `UX-2 primer`, `UX-2 canonical` | FALLA (CLS 0,832) | PASA (CLS 0,000) | `13e6774` |
| UX-3 | conversión | alta | El buscador daba 0 con "savage", "good gril", "amaderado", "vainilla", "hombre", "mujer", "arizona" | Buscar esos términos en `/catalogo` | `UX-3` y `busqueda.test.mjs` | FALLA (7 de 11 en 0) | PASA (11 de 11) | `7847761` |
| UX-4 | conversión | alta | Sin resultados, el único botón borraba la búsqueda: no había salida a WhatsApp | Buscar algo que no existe | `UX-4` | FALLA | PASA | `7847761` |
| CONFIANZA-1 (UX-9) | confianza | alta | No decía cómo se paga, la seña, el envío ni cuándo llega | Recorrer la portada y el cajón buscando esos datos | `CONFIANZA-1 portada`, `CONFIANZA-1 cajon` | FALLA | PASA | `b7dd547` |
| UX-15 | accesibilidad | media | El foco se escapaba de la ficha y del cajón, no volvía al cerrar, contorno de 1 px o ninguno, áreas táctiles de 32 a 42 px | Abrir la ficha con Enter y apretar Tab; medir los +/-, cerrar y pastillas | `UX-15 foco`, `UX-15 contorno`, `UX-15 tactil` | FALLA | PASA | `ab933c6` |
| FOTO-5 | visual | alta | La ficha bajaba la foto de 560 px y la mostraba estirada; el `srcset` decía 800w para archivos de 900 | Abrir una ficha a 390 px con densidad 3 | `FOTO-5 ficha`, `FOTO-5 cargan` | FALLA (1,55x) / PASA | PASA (2,49x) / PASA | `9f87c3a` |
| UX-10 | visual | media | El nombre de la tarjeta salía en Figtree y no en Cormorant (especificidad) | Mirar el catálogo al lado de los destacados | `UX-10` | FALLA | PASA | `8e85136` |
| UX-14 | visual | baja | Los botones del hero cambiaban 25 px de ancho al llegar Figtree; la flecha "→" salía de una fuente del sistema | Cargar la portada con la red lenta | `UX-14` | FALLA (25,7 px) | PASA (1,1 px) | `8b1229f` |
| UX-17 | contenido | baja | El HTML decía "104 aromas" y al hidratar pasaba a 100 | Mirar el hero antes y después de que cargue | `UX-17` | FALLA | PASA | `59d717b` |
| CONTENIDO-1 (UX-16) | contenido | media | "Retiro los viernes" contra "llega los viernes"; "escribinos", "nosotros" y "un asesor" en la interfaz | Leer portada, ficha, catálogo y cajón | `CONTENIDO-1` | FALLA | PASA (ver pendiente 1) | `b7dd547`, `6d4ec93` |
| PANEL-1 | contenido | baja | El pie público enlazaba al panel | Mirar el pie | `PANEL-1` | FALLA | PASA | `0e6b566` |
| REG-1 | bloqueante | alta | Regresión: el código de proveedor en el WhatsApp, la suma del cajón y la escena del hero | Pedido de dos aromas con la base simulada | `REG-1 codigo`, `REG-1 suma`, `REG-1 portada` | PASA | PASA | ninguno |
| RENDIMIENTO | rendimiento | alta | Lighthouse mobile, mediana de 5 | `--lh 5` | `RENDIMIENTO /`, `RENDIMIENTO /catalogo` | `/` 97; `/catalogo` 76, CLS 0,924 | `/` 99; `/catalogo` 88, CLS 0 | varios |

### Etapa 2: fotos de producto (17 de octubre de 2026)

Base: producción el 17/10/2026 antes de tocar las fotos (commit `503578d`).
Las hojas de contacto de antes y de después, y los antes y después, están en la
carpeta de la auditoría (fuera del repo).

| ID | Categoría | Sev. | Qué pasaba | Cómo se reproduce | Chequeo | Base | Final | Commit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FOTO-1 | visual | alta | Las cajas en el estudio espresso y 43 escenas de Unlock en azul eléctrico, celeste, gris y rojo: la grilla parecía un marketplace de dos proveedores | Abrir `/catalogo` y mirar las páginas 1 y 2 | `FOTO-1` (esquinas de arriba de las 24 fotos en el rango espresso) | FALLA (20/24) | PASA (24/24) | `3c747fc` |
| FOTO-4 | visual | alta | Fotos agrandadas hasta 3,4 veces (Polo Red, Phantom) sin que nadie se entere | Mirar Polo Red en la ficha | Aviso en `componer.mjs`, `datos/avisos.json` y marco rojo en la hoja de contacto | sin aviso | 6 fotos con aviso; sin fuente mejor (ver pendientes) | `FOTO-4` |
| FOTO-2 | visual | media | Filo blanco de 1 a 2 px y alfa sin borde suave en los recortes (Doha, Abu Dabi, 212 Heroes) | Mirar una caja al 300 % sobre el espresso | Hoja de contacto (`FOTO-2` en el banco dice NO APLICA, ver abajo) | filo blanco en 3 cajas, 1 Unlock | limpio en los 90 recortes | `0ff3c75` |
| FOTO-3 | visual | media | Cinco recortes de Unlock traían una elipse gris horneada: sobre el espresso, un disco flotando encima de nuestra sombra. La sombra era una mancha y el reflejo, al 16 %, un espejo | Mirar One Million Lucky o Invictus Victory | Hoja de contacto | 5 podios, sombra de una capa | 0 podios, sombra en dos capas, reflejo 9 % | `6809048` |

**Por qué FOTO-2 no se mide en el banco.** Sobre la foto final, un filo blanco
y el canto real de un objeto (el borde dorado de una caja, la luz en el borde
de un vidrio) tienen el mismo perfil: una línea clara de 1 o 2 px entre el
fondo y el objeto. Un detector armado así, probado sobre las 133 fotos, marcaba
7 cajas ya limpias y seguía marcando Doha después de limpiarla. Un chequeo que
falla sin error no sirve. Se controla en la hoja de contacto y al 300 % en los
casos testigo; `componer.mjs` limpia el filo de todo recorte sin excepción.

**Cómo mide FOTO-1.** Baja la foto de cada una de las 24 tarjetas de las páginas
1 y 2 (escritorio) y promedia dos cuadrados del 6 % del ancho en las esquinas de
arriba. Pasa si cae en el estudio: luma hasta 72, rojo ≥ verde ≥ azul (cálido)
y rojo menos azul hasta 48 (poco saturado). Calibrado sobre las 133 fotos:
antes quedaban afuera las 34 escenas de fondo frío o claro y ninguna caja;
después, ninguna. Necesita Pillow (`pip install pillow`). Una foto subida a
mano desde el panel puede hacerlo fallar: es a propósito, para que se vea.

### Etapa 3A: ficha, tarjeta, filtros y link por perfume (17 de octubre de 2026)

Base: producción antes de tocar nada (commit `6c77483`), en
`scripts/qa/linea-base-etapa3.json`. Los chequeos `E3-*` se escribieron antes de
construir y fallaban ahí a propósito. Final: producción después del último
bloque (commit `af8fc8c`). Capturas en la carpeta de la auditoría
(`etapa3a/`, fuera del repo).

| ID | Categoría | Sev. | Qué pasaba | Chequeo | Base | Final | Commit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| E3-A1 (UX-8) | conversión | alta | Abrir la ficha no cambiaba la dirección: "atrás" sacaba de la tienda y no había link por perfume | `E3-A1 atras`, `link`, `portada`, `copiar`, `inexistente` | FALLA ×4 (inexistente PASA) | PASA ×5 | `390a90f` |
| E3-A2 (IDEA-11, UX-6) | conversión | alta | En el celular el precio estaba a 1042 px y el botón a 1260 px; pirámide en párrafo; "Versión inspirada" en el acento | `E3-A2 primer`, `orden`, `notas`, `frase`, `aviso`, `barra` | FALLA ×6 | PASA ×6 | `b10f987` |
| E3-A3 (IDEA-7, IDEA-8) | confianza | alta | Tachado sin explicar; el código de proveedora no se veía | `E3-A3 codigo`, `ahorro`, `verificar` | FALLA ×3 | PASA ×3 | `8ca2cae` |
| E3-A4 (IDEA-3) | visual | alta | "VERSIÓN INSPIRADA" 12 veces por página y pastillas de tamaño apretadas en el celular | `E3-A4 tarjeta`, `hoja`, `destacados` (más `aviso`, `tactil`, `directo`, `altura` de guarda) | FALLA ×3 | PASA ×7 | `7d663e3` |
| E3-A5 (UX-11, IDEA-12) | conversión | alta | Cada `+` abría el cajón, que tapa el 85 % de la pantalla | `E3-A5 cajon`, `tilde`, `ver`, `movimiento` | FALLA ×4 | PASA ×4 | `46ce65d` |
| E3-A6 (IDEA-6, UX-12) | conversión | alta | Filtros mezclados; "Rebajados" dejaba 98 de 100; la familia no aparecía | `E3-A6 familias`, `para`, `rebajados`, `pastillas`, `url` | FALLA ×5 | PASA ×5 | `09bbf1e` |
| E3-A7 (IDEA-5) | conversión | media | La ficha terminaba sin sugerir otro aroma | `E3-A7 parecidos`, `cambia` | FALLA ×2 | PASA ×2 | `9babef9`, `af8fc8c` |
| E3-A8 (UX-13) | conversión | media | Nueve páginas de 12 en el celular | `E3-A8 ver mas` (`escritorio` de guarda) | FALLA | PASA | `0f28f0d` |
| E3-A9 | rendimiento / visual | media | Primera fila del catálogo en `lazy` (LCP); la página saltaba al abrir y cerrar la ficha | `E3-A9 lcp`, `scroll` | FALLA ×2 (900 → 246 px) | PASA ×2 (900 → 900 px) | `1d68f0f` |
| RENDIMIENTO | rendimiento | alta | Lighthouse mobile en producción, mediana de 5 (contra `linea-base-etapa3.json`) | `RENDIMIENTO /`, `/catalogo` | `/` 92, `/catalogo` 81 (LCP 3935 ms) | `/` 91, `/catalogo` 80 (LCP 3783 ms), CLS 0, los dos PASA | todos |

**Lighthouse mobile en producción, etapa 3A** (cinco corridas, mismo
contenedor, con la máquina quieta):

| Página | Antes (`6c77483`) | Mediana | LCP | Después (`af8fc8c`) | Mediana | LCP |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | 92, 92, 90, 80, 92 | **92** | 2645 ms | 81, 92, 98, 84, 91 | **91** | 2896 ms |
| `/catalogo` | 79, 81, 82, 82, 78 | **81** | 3935 ms | 81, 79, 74, 80, 84 | **80** | 3783 ms |

Un punto abajo en las dos es ruido (en `/` las corridas van de 81 a 98). Lo
real: el LCP de `/catalogo` bajó 150 ms; el bundle principal creció 2,6 kB
comprimidos (73,4 a 76,1 kB: la barra de agregado y las reglas nuevas de
`lib/producto.js`), y la portada no cambió de otra forma. La primera corrida
de la línea de base coincidió con `npm ci` y dio 74 en `/`: se repitió.

**Cómo se midió el LCP.** En el contenedor, Lighthouse varía mucho entre
corridas (TBT de 125 a 690 ms con el mismo build). Cada cambio de E3-A9 se midió
por separado, con las variantes intercaladas (una y una) y la mediana del LCP:
sin prioridad en la primera fila 4955 ms, sin precargar las dependencias del
catálogo 5057, con las dos 4850, y leyendo el catálogo sin preflight de CORS
4598 contra 4850 a favor de la preflight. Esa última se descartó por la regla
(quedarse con lo que mejora la medición), aunque en un teléfono real ahorre un
viaje de red: queda anotada para medir en un Android.

**Un falso positivo del banco que conviene conocer.** El salto 900 → 246 px de
la línea de base no lo ve una clienta: lo producía el clic de mouse de
Playwright (trae el elemento a la vista y deja el hover puesto) más el cierre
con Escape. Con toques reales el código viejo tampoco saltaba en Chromium
emulado. El arreglo igual vale: el bloqueo con `position: fixed` conserva la
posición en todos los motores y frena el scroll de fondo en iOS, donde
`overflow: hidden` no alcanza. El chequeo ahora toca con el dedo.

### Etapa 3B: portada, ciclo, chat, ficha y datos (17 al 22 de octubre de 2026)

Base: producción antes de la etapa (`scripts/qa/linea-base-etapa3b.json`). Los
chequeos `E3-B*` se escribieron antes de construir. **B4 (Nosotros en dos
columnas) y B5 (cinta de nombres con links) no se hicieron:** los absorbe el
rediseño visual de la portada (rama `rediseno-visual`); sus chequeos siguen en
FALLA a propósito hasta que entre esa portada.

| ID | Categoría | Qué pasaba | Chequeo | Base | Final | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| E3-B1 (UX-5, IDEA-1) | conversión | El primer pantallazo del celular no tenía precio ni un solo botón claro | `E3-B1 664`, `844`, `banda`, `datos`, `sello` | FALLA ×5 | PASA ×5 | `9f5345d` |
| E3-B2 (IDEA-2) | conversión | No se sabía hasta cuándo se pedía en el ciclo | `E3-B2 tira`, `urgente` | FALLA ×2 | PASA ×2 | `14da399` |
| E3-B3 (IDEA-10) | confianza | "Cómo funciona" eran tres íconos; ahora es la conversación real de WhatsApp | `E3-B3 chat`, `pasos` | FALLA ×2 | PASA ×2 | `ec1760b` |
| E3-B6 | confianza | Sección "Lo que me escriben" lista para las capturas de clientas; sin capturas no aparece | `E3-B6 vacia` | PASA | PASA | ver abajo |
| E3-B7 | visual / conversión | En el celular la foto de la ficha tenía bandas de otro color a los costados, y al bajar al último tamaño la barra fija le tapaba el "Ahorrás" | `E3-B7 bandas`, `ahorro` | FALLA ×2 | PASA ×2 (diferencia 2,7 de 4) | ver abajo |
| E3-B8 | visual / rendimiento | Cuatro etiquetas en mayúsculas espaciadas en la portada; `motion` instalada sin uso | `E3-B8 mayusculas`, `motion` | FALLA ×2 | PASA ×2 | ver abajo |
| E3-B9 | contenido / conversión | El pie decía "retiro los viernes"; siete aromas sin familia ni notas | `E3-B9 pie`, `familias` | FALLA ×2 | PASA ×2 | base de datos |

**E3-B7, cómo quedó:** cada costado muestra el 3 % del borde de la misma foto
estirado a su ancho (`background-size: 3300% 100%`). Como el alto es el de la
foto, cada altura del relleno es la misma altura del estudio. Un relleno con la
foto entera estirada y desenfocada se probó primero y falló: el frasco o la caja
asomaban en la banda (diferencia 206). La barra fija ya no tapa: la hoja tiene
`scroll-padding-bottom` del alto de la barra.

**E3-B9, cambios en la base (22/10/2026), con respaldo** en
`respaldo.products_20261022_pre_b9` y `respaldo.settings_20261022_pre_b9`:

- `settings.aclaracion_pedido`: antes "Venta particular · catálogo Bagués.
  Pedidos de fin de semana, retiro los viernes."; ahora "Venta particular ·
  catálogo Bagués. El plazo depende del cierre del ciclo: te lo confirmo por
  WhatsApp."
- Familia y notas solo de las fichas públicas de las proveedoras
  (`products.json`, leído el 22/10/2026). Los valores anteriores eran todos
  vacíos.

| Aroma | Fuente | Familia | Salida / corazón / fondo |
| --- | --- | --- | --- |
| Bad Boy | bagues.com.ar, Detroit (etiqueta oriental-ambarada) | Oriental ambarada | Pomelo, pimienta blanca / Vetiver, salvia esclarea / Haba tonka, cacao |
| One Million | unlock.com.ar, One Million Mini | Amaderada | Toronja, menta, mandarina roja / Rosa, canela, notas especiadas / Cuero, notas amaderadas, pachulí hindú |
| Polo Blue | unlock.com.ar, Polo Blue Mini | Fougère aromática | Melón, pepino, bergamota / Nota acuática, salvia, geranio, verbena, albahaca / Pachulí, almizcle |
| Creed Aventus | unlock.com.ar, Creed Aventus Mini | Chipre | Bergamota, grosella negra, manzana, limón / Piña, pachulí, jazmín / Abedul, almizcle, musgo de roble, ambroxan, cedro |
| Phantom | bagues.com.ar, Singapour (sin familia publicada) | sin cargar | Lavanda, limón de Amalfi / Manzana, notas terrosas, humo, pachulí / Vainilla, vetiver |

Bad Boy cae en "Dulces" del filtro (cacao y tonka). **Polo Red y Phantom Black
quedan sin datos:** no figuran hoy en ninguna de las dos tiendas. El banco
ahora espera 4 con familia y 5 con notas.

**Lighthouse (local, intercalado con `main`, cinco corridas):** `/` 88 contra 89
(sin cambio); `/catalogo` 81 contra 77 con dos agentes usando la CPU en paralelo
(ruido; LCP +150 ms). Se mide de nuevo en producción después de publicar.

### Cuarta vuelta: la crítica de UX (23 de octubre de 2026)

Lo que pidió Sebas después de la crítica de UX y UI (detalle en
`docs/PLAN-PORTADA-D.md`, "Cuarta vuelta"). Banco local: **84 de 84 que
aplican**; `motores.py`: **sin fallas**; hoja de familias probada aparte en
Safari y Firefox (abre, tarjetas, tocar afuera cierra y queda en el mismo
lugar).

| Error o pedido | Causa | Arreglo |
| --- | --- | --- |
| Rectángulo detrás de los frascos finos (L'Eau d'Issey, el primero del catálogo) | la sombra en la pared se desenfocaba adentro del tamaño del recorte y se cortaba en su borde | desenfoque con margen; las 133 recompuestas |
| La ficha aparecía con el fondo y la foto después | la foto grande recién se pedía al abrir | foto chica de la tarjeta debajo y la grande pedida al tocar |
| Pantallazo del pie al tocar una familia | era un cambio de página | hoja encima de la portada (`/?familia=`) |
| Tocar afuera de esa hoja caía en la marca y llevaba al inicio | la barra no quedaba tapada | capa a z 90 sobre la barra (30) |
| Franja gris debajo de la barra en el catálogo | el papel se fundía adentro de la propia barra, sobre el fondo oscuro del body | se funde solo en los 28 px de abajo |
| La barra se transparentaba sobre la cinta de nombres | la cinta está dentro del hero y tomaba la luz "hero" | la cinta cuenta como noche |
| Al bajar el precio del hero, el botón quedaba fuera del visor de Instagram (697 > 664) | lo marcó `E3-B1 664` | la escena sube 20 px y el bloque se aprieta: botón en 654 |

Chequeos que cambian por decisión de Sebas: `E3-A3 codigo` (la ficha ya no
muestra el código), `E3-A3 verificar` (sin links a las proveedoras),
`E3-B3 chat` (chat sin códigos), `E3-B1 844` (sin segundo "Cómo funciona"),
`E3-B1 sello` (sin sello), `CONFIANZA-1 portada` (textos nuevos de Antes de
pedir).

**Lighthouse y las vistas previas de Vercel: trampa.** Contra producción, la
vista previa nueva dio 95 contra 97 (LCP 2,76 contra 2,35 s). No es el
código: en local, las dos versiones intercaladas cinco veces dieron LCP 3.266
contra 3.203 ms (ruido). Las vistas previas responden el documento ~100 ms
más tarde y la simulación de Lighthouse lo multiplica. Comparar siempre en
local (la otra versión en un `git worktree`, servida con
`PORT=4174 node scripts/qa/servir.mjs`) o contra producción después de
publicar.

### Nombre y WhatsApp del pedido (23 de octubre de 2026)

Pedido de Sebas: controlar los datos en todo lugar donde se escriben, sin ser
rígido con la forma. Banco local: **84 de 84 que aplican (86 chequeos, 2 sin
aplicar)**, con dos nuevos.

| Antes | Ahora | Dónde |
| --- | --- | --- |
| Nombre: cualquier texto de 1 a 120 caracteres | 2 a 60 (80 en la base), solo letras, espacios, apóstrofo, guion y punto | `lib/datosCliente.js`, `crear_pedido_web()` |
| WhatsApp: 8 a 15 cifras cualesquiera; "555 1234" entraba y el chat no abría | 18 formas de escribir un celular entran y quedan `549` + 10 cifras; sin característica avisa "Sumale la característica" | igual, más `telefono_ar()` en la base |
| Un solo aviso abajo del formulario | Un aviso debajo de cada campo, `aria-invalid` y el foco en el que hay que corregir | `CartSheet.jsx` |
| El panel guardaba el teléfono como viniera: la misma clienta podía quedar dos veces | Pedido manual con la misma regla que la web | `useOrders.js` |
| El WhatsApp de Ajustes se guardaba aunque estuviera mal (todos los pedidos irían a otro número) | Se guarda solo si es válido, ya normalizado | `AjustesScreen.jsx` |
| Buscadores y notas sin tope | 60 caracteres los buscadores, 2.000 las notas | tienda y panel |

Chequeos nuevos: `DATOS-1 avisos` ("A" y "555 1234" no se envían, los dos campos
avisan, el foco va al nombre) y `DATOS-1 normaliza` ("+54 9 0351 15 555-1234"
sale como `5493515551234`). Pruebas sin navegador: `datos.test.mjs` (56
casos). La base se probó con los mismos casos en una transacción que se
deshace y, ya aplicada, desde afuera con la clave pública.

### Séptima vuelta (23 de octubre de 2026, noche)

- **La letra del título cambiaba a la vista** porque usaba Boska recta y esa
  fuente llegaba después del evento `load`. Embebida recortada: con las
  fuentes frenadas 3 s, la primera línea sale igual píxel a píxel. Con
  conexiones de más de 0,9 s, la segunda línea y la marca todavía pueden
  cambiar al final de la espera.
- **Lighthouse intercalado (5 y 5):** publicada 86 / FCP 2,77 s; cinco letras
  embebidas 83 / 3,12 s; solo la recta 86 / 2,76 s. Lantern cuenta cada
  `data:` de fuente como un pedido: el FCP observado mejoraba, el simulado no.
- **UX-14** medía el botón con `getBoundingClientRect`, que incluye la escala
  de la entrada nueva: pasa a `offsetWidth`.
- Banco 88/88 en local; motores sin fallas.

### Calidad (23 de octubre de 2026, tarde)

- **Chequeos nuevos del banco (88 en total):** `A11Y-1` corre axe-core
  (WCAG 2.1 A y AA) en portada, catálogo, ficha y 404 y falla con algo serio o
  crítico; la primera corrida encontró las filas de Las ciudades con una
  etiqueta distinta del texto visible (`label-content-name-mismatch`) y se
  sacó la etiqueta. `404-1` comprueba que una dirección que no existe y una
  foto que falta den 404 y que `/`, `/catalogo` y `/panel` den 200.
- **Pruebas automáticas** en `.github/workflows/pruebas.yml`: en cada push,
  pruebas sin navegador y el build; en PR y en `main`, el banco entero
  (necesita las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` del
  repo; sin ellas se saltea).
- **Registro de errores** probado interceptando el envío: dos errores iguales
  mandan uno solo, un número de teléfono en el mensaje sale tapado, las
  promesas rotas también se anotan. La función de la base recorta a 500
  caracteres, no deja leer la tabla con la clave pública ni llamar a la poda.
- Producción después de publicar la sexta vuelta (`f646a5a`): banco 87/87,
  Lighthouse mobile portada 96 (LCP 2,47 s), catálogo 91.

### Rediseño D, sexta vuelta (23 de octubre de 2026)

- **La marca de la barra no subía** al tocarla con la portada bajada: el link
  iba a la misma página. Ahora sube.
- **El título del inicio cambiaba de letra a la vista** (fuente de respaldo y
  después Melodrama y Boska). Ahora la entrada espera a esas dos fuentes.
  Costo medido con Lighthouse intercalado en local (5 + 5 corridas): sin
  precarga, +140 ms de LCP; con las dos fuentes precargadas, igual que antes.
- **Lag de la banda:** la primera versión animaba `clip-path` (se repinta en
  cada cuadro). Ahora el fondo entero se estira con `transform: scaleY`.
- **Parón al llegar a las familias:** `filter: drop-shadow` en los cinco
  frascos, rasterizado al entrar la fila (con su animación de aparición).
  Medido con la CPU frenada 4x: el hilo principal no tenía cuadros largos
  ahí, así que el costo era de rasterizado. Se cambió por una elipse.
- **La barra saltaba de color:** `--fondo-barra` registrado con `@property`
  como `<color>` para que la transición lo interpole.
- **`view()` en un `::before` mide al seudoelemento, no a la sección**, en
  Chrome (Safari mide a la sección): los paños nunca salían. Se usa una
  línea de tiempo con nombre en la sección (`view-timeline: --banda`).
- **UX-17 y E3-B1 datos** pasan a mirar el precio "Desde" (ya no hay número
  de aromas).
- **Control antes de publicar (23/10, tarde):** banco local 86/86; contra la
  vista previa publicada, 84/86 con E3-B2 tira y urgente en FALLA una sola
  vez: el chequeo leía la tira de la portada antes de que llegara `settings`
  (repetido dos veces: pasa). Ahora espera a la tira. Consola sin errores en
  Chrome y Safari; en Firefox solo avisos de las fuentes (cajas de glifos) y
  de las precargas con `media` que no aplican. En la vista previa Vercel
  inyecta su barra de comentarios (`vercel.live`), que la CSP bloquea: pasa
  solo en vistas previas. `datos.test` (todo bien), `busqueda.test` (23),
  `ciclo.test` (9), `motores.py` sin fallas. Asesor de Supabase: lo conocido
  (`crear_pedido_web` pública a propósito, respaldos sin política).
- Banco local **86 chequeos, 0 fallan**; `motores.py` sin fallas.

### Rediseño D, quinta vuelta (23 de octubre de 2026)

- **Pantallazo al entrar al catálogo** (visto por Sebas en el celular):
  durante la carga del chunk la página medía 1122 px y el pie con el aviso
  tapaba la pantalla. Causa: `Suspense fallback={null}` y el scroll a cero
  recién al montar el catálogo. Arreglo: precarga en rato libre y al apoyar
  el dedo, scroll arriba antes de pintar, y una cáscara de papel de
  `100dvh` como espera. Prueba (Playwright, 390 px, tocando el botón del
  hero): con red rápida y con red lenta, tocando enseguida o esperando, el
  pie no aparece en ningún cuadro.
- **El volver arriba no se veía sobre papel:** vidrio con 5 % de tinte e
  ícono hueso sobre papel claro. Ahora el vidrio toma la luz de lo que tiene
  abajo (`data-luz`, medido con `elementsFromPoint` en el mismo cuadro de
  scroll y otra vez en `scrollend`). Apareció además un borde de 2 px negro
  (`outset`, el de fábrica del `<button>`) que nadie había sacado.
- Banco local **86 chequeos, 0 fallan**; `motores.py` sin fallas en Safari,
  Chrome y Firefox a 5 anchos.

### Rediseño D, segunda vuelta (23 de octubre de 2026)

Lo que vio Sebas en la vista previa y en el iPhone de su novia, y lo que salió
al probar en los tres navegadores. Banco local: **84 de 84**.
`scripts/qa/motores.py` (nuevo): **90 de 90** (Safari, Chrome y Firefox; 375,
390, 768, 1024 y 1440; portada, ciudades, catálogo, ficha, hoja y carrito).

| Error | Dónde | Causa | Arreglo |
| --- | --- | --- | --- |
| Botón del hero corrido a la derecha | Safari | inline-flex con el ancho del trazo puesto por aspect-ratio: la caja medía 228 px y el botón se salía | grilla con anchos explícitos |
| Foto de la ficha aplastada a 55 px | Safari, celular | grilla con max-height y scroll, foto con overflow hidden | alto mínimo explícito |
| La barra nunca quedaba fija | todos | `.tienda > header { position: relative }` le ganaba al sticky | sticky en esa misma regla |
| Hero borroso | iPhone 3x, monitores > 1440 | se servía la de 780 px y la de 1440 estirada | AVIF, 1170 × 2532 en 3x, 2880 desde 1601 px |
| Costura al costado de la foto de la ficha | celular | la franja estiraba el borde de la foto | pared vacía espejada |
| CLS 0,013 en la vista previa | celular | cajas del hero centradas que cambiaban de ancho al llegar la letra y el precio | a todo el ancho, precio con lugar reservado: 0,009 |

Chequeos que cambian por decisión de Sebas (dicen el porqué en el código):
`FOTO-1` mide la pared vino (las 133 adentro); `E3-B4 texto` cuenta palabras de
los párrafos y no de las filas de datos (las ciudades suman "es Baccarat Rouge
540"); `E3-B7 bandas` compara 4 px de cada lado de la unión con tolerancia 8
(la sombra de contacto del producto llega al borde; revisado a 2x, sin
costura).

**Lighthouse mobile, red real, intercalado, cinco corridas** (vista previa
`ab4d11e` contra producción): 97 contra 98; LCP 2.591 contra 2.125 ms; CLS
0,003 contra 0. Primero dio 2.681: las fotos de Las ciudades y de las familias
(lazy, pero dentro del margen de Chrome) salían antes del LCP con 120 kB;
`useTrasCarga` las manda después del evento load. Lo que queda es el hero
mismo: una foto de 50 kB (AVIF de 780 px; Lighthouse emula densidad 1,75)
contra las dos imágenes chicas del hero viejo de producción. Para bajar de
2,5 s: una versión del hero para pantallas de menos de 2x, o un AVIF más
comprimido. Queda para decidir con Sebas: es la imagen que pidió más nítida.

**Seguridad** (`docs/SEGURIDAD.md`): CSP y HSTS sumados, `prerender.mjs`
controla los hashes de los scripts en línea. Con la política puesta, banco 84
de 84, motores 90 de 90 y ningún bloqueo en la consola de los tres navegadores.

### Rediseño visual D (rama `rediseno-visual`, 22 de octubre de 2026)

Sin publicar: va a `main` solo con el OK de Sebas. Plan, decisiones y porqués en
[`PLAN-PORTADA-D.md`](PLAN-PORTADA-D.md). Banco local sobre la rama: **84 de
84**. Ocho chequeos se reescribieron porque Sebas cambió lo que miden (no para
que pasen): cada uno dice en el código qué decisión lo cambió.

| Chequeo | Antes medía | Ahora mide | Por qué |
| --- | --- | --- | --- |
| E3-B1 844 | botón a todo el ancho (340 px o más) | botón de 200x48 o más, centrado entre dos trazos | el botón entre trazos de plumilla, aprobado en la prueba |
| E3-B2 urgente | la cifra en rosa-vino | rosa-vino o rubí | sobre papel el acento es el rubí |
| E3-B3 pasos | tres pasos en una lista | sin pasos: solo el chat | "el chat real y nada más" |
| E3-B4 columnas y texto | Lo que pagás / Lo que no pagás | Las ciudades: 4 cajas activas que no repiten destacados, abren la ficha, Melodrama sin desbordar | Sebas sacó la sección del ahorro |
| UX-10, E3-A4 tarjeta y destacados | nombre en Cormorant | nombre en Boska 600 | la letra nueva |

Además: el centro del botón medía `-0.0` y `abs(-0.0 or 99)` daba 99; se
corrigió el chequeo. El mapa de calor no reconocía las cajas de Las ciudades
como foto de producto (su selector era de las secciones viejas); se sumó
`[data-qa=ciudades] img`.

**Mapa de calor por sección**, portada (DeepGaze IIE, misma rúbrica):

| Sección | C a 390 | D a 390 | D a 1440 |
| --- | --- | --- | --- |
| Hero | 7,9 | 8,1 | 7,8 |
| Lo que pagás → Las ciudades | 6,1 | 6,4 | 6,0 |
| ¿Qué te gusta oler? | 6,5 | 6,6 | 6,7 |
| Destacados | 7,1 | 7,8 | 7,8 |
| Cómo funciona | 6,0 | 6,0 | 6,3 |
| Antes de pedir | 6,0 | 5,1 | 5,0 |
| Pie (aviso legal) | 4,5 | 4,9 | 4,9 |

**Lighthouse mobile, red real, intercalado una y una, cinco corridas** (vista
previa `09eb4dc`): producción 97 (LCP 2.209 ms, CLS 0) contra rediseño D 97
(LCP 2.314 ms, CLS 0,013). El CLS venía del hero del celular centrado: las
cajas se ajustaban al contenido y al llegar la letra o el precio cambiaban de
ancho. Ahora van a todo el ancho y el precio reserva su lugar con un texto
invisible del mismo largo: 0,009 en local con red lenta (bueno es menos de
0,1). Lo que queda es el cambio de letra del título; precargar Melodrama y la
itálica de Boska lo sacaría, a cambio de competir con la imagen del LCP: a
probar intercalado antes de pasar a `main`.

Las ciudades arrancó en 5,0: las cajas de 64 px eran el 7 % de la sección. A
92 px (140 en escritorio) sube a 6,4. **Antes de pedir bajó** al pasar de la
banda vino al papel hondo que pide el guion: es texto y cifras sin foto. La
salida natural es la foto de Sebas con producto cuando llegue.

### Rediseño visual C (rama `rediseno-visual`, 22 de octubre de 2026)

Sin publicar: va a `main` solo con el OK de Sebas. Especificación y decisiones en
[`PORTADA-C.md`](PORTADA-C.md). Banco local sobre la rama: **84 de 84**. B4
(Lo que pagás en dos columnas) y B5 (cinta con links) pasan con el rediseño.
`REG-1 portada` y `E3-B1 banda` se reescribieron para medir el hero nuevo: la
imagen horneada carga de verdad (ancho real, no el código 200), el titular
termina antes de la ventana (y <= 290) y el botón antes de 664.

**Mapa de calor por sección** (`scripts/qa/atencion/heatmap.py`, DeepGaze IIE,
rúbrica de 0 a 10 en su README), portada a 390:

| Sección | Producción | Rediseño |
| --- | --- | --- |
| Hero | 7,2 | 7,9 |
| Nosotros / Lo que pagás | 4,4 | 6,1 |
| ¿Qué te gusta oler? | no existía | 6,5 |
| Destacados | 7,1 | 7,1 |
| Cómo funciona | 6,6 | 6,0 |
| Antes de pedir | 5,0 | 6,0 |
| Pie (aviso legal) | 4,7 | 4,5 |

A 1440: hero 6,8, Lo que pagás 6,1, familias 8,2, destacados 8,3, cómo
funciona 5,4, antes de pedir 6,9. Cómo funciona no cambió de contenido: baja por
quedar más abajo en la página.

**Lighthouse mobile, red real, intercalado una y una, cinco corridas:**
producción 94 (LCP 2.262 ms) contra vista previa del rediseño 93 (LCP 2.273 ms),
CLS 0 en las dos. Empate dentro del ruido.

### Lighthouse mobile en producción (cinco corridas, Lighthouse 13.5)

| Página | Antes | Mediana | Después | Mediana |
| --- | --- | --- | --- | --- |
| `/` | 96, 97, 97, 98, 97 | **97** | 99, 99, 98, 97, 99 | **99** |
| `/catalogo` | 76, 75, 76, 76, 76 (CLS 0,924) | **76** | 84, 86, 88, 88, 88 (CLS 0) | **88** |

Medido desde el mismo contenedor, con la red y la CPU simuladas de Lighthouse.
Puede diferir unos puntos de PageSpeed Insights.

---

## Pendientes

1. **La aclaración del pie.** Hecho en la etapa 3B (E3-B9): ya no dice
   "retiro los viernes". Sebas la puede cambiar desde Ajustes.
2. **Página 404.** Con la reescritura de Vercel, cualquier ruta inexistente
   devuelve 200 con la portada. Dar un 404 de verdad obliga a listar en
   `vercel.json` cada ruta válida, incluidas las del panel (`/panel/...`) y la
   vuelta del ingreso con Google: no se hizo para no arriesgar el panel.
3. **LCP de `/catalogo`.** Hecho en la etapa 3A (E3-A9): primera fila sin
   `lazy`, la primera foto con `fetchpriority="high"` y la cáscara precarga los
   chunks del catálogo. Lo que sigue definiendo el LCP es la cadena HTML → JS →
   catálogo de la base → foto: la foto no se puede precargar desde el HTML
   porque el orden lo decide Sebas en el panel. Queda por medir en un Android
   real leer el catálogo sin preflight de CORS (ver la sección de la etapa 3A).
4. **El salto al abrir la ficha.** Hecho en la etapa 3A (E3-A9): bloqueo con
   `position: fixed`. Conviene igual mirarlo una vez en un Android y un iPhone
   reales.
5. **Etapa 3B:** hecha salvo B4 y B5, que pasan al rediseño visual. Faltan
   de Sebas las capturas de clientas (van en `src/data/opiniones.json`), su
   foto y las fotos propias de cajas para el hero y `og.jpg`.

6. **Fotos blandas (FOTO-4).** Seis fotos de Unlock quedan agrandadas más de
   1,8×: Polo Red y Phantom (3,4×), Carolina Herrera for Men, Y de YSL y Omnia
   Indian Garnet (2,6×), La Belle Paradise Garden (1,8×). No están en
   `unlock.com.ar` y el PDF del ciclo está bajado a 100 ppi (ya se usa su imagen
   embebida en tamaño original). Se resuelven con una foto propia subida desde
   el panel.
7. **Fotos para mirar con criterio de dueño.** Nina (Nina Ricci) y Pure XS
   conservan, junto a la base, la luz de color que el vidrio proyecta en el piso
   de la foto original: es real, pero puede leerse como una mancha. Olympéa y
   Lady Million quedaron como escena espresso (no se pueden parar solas en el
   estudio) y se ven más grandes que el resto: la fuente es de 800 px y no da
   para alejarse más.

8. **Polo Red y Phantom Black sin familia ni notas** (los otros cinco se
   cargaron en la etapa 3B; Phantom tiene notas pero no familia publicada).
   Caen en "Otros" del filtro de familia. Se cargan desde el panel.
9. **El código de proveedora no se puede buscar en bagues.com.ar ni en
   unlock.com.ar** (no es su SKU). La ficha dice para qué sirve el código y
   enlaza a la tienda de la marca; si la caja trae el número impreso, se puede
   sumar en `FICHA.verificar`.
10. **Dos intermitencias del banco en producción** justo después de un deploy:
    `E3-A1 portada` (la portada hidrata después de `load` y del pedido a la
    base; con el CDN en frío pasó los 20 s, ahora espera 30) y `FOTO-1` (no
    llegaron las tarjetas en 25 s una vez). Las dos pasaron tres de tres al
    repetirlas.
11. **View Transitions de la tarjeta a la ficha:** probado el planteo y
    descartado (la ficha es `lazy` y React dibuja asincrónico: la foto nueva
    podía no estar al sacar la captura).

### Choques con la etapa 3B

- **Destacados de la portada:** ya usan Cormorant 600 y `sizes` con el ancho
  real (232/248 px). Si 3B los cambia por la tarjeta del catálogo, el `+` de la
  tarjeta abre la hoja de tamaños y eso funciona también en la portada (la hoja
  vive en `TiendaShell`).
- **La cinta de nombres de la portada como links a cada ficha** (IDEA-6) ya
  tiene el mecanismo: `abrir(producto)` del contexto pone `?aroma=`.
- **La barra de agregado** se apoya abajo a 12 px del borde (z-index 90). Si 3B
  suma una barra fija abajo en la portada, tienen que turnarse.
- **El sello GRUPO WOLF y el hero** no se tocaron.
