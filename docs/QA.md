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
| MEDIDAS-1 | conversión | alta | Desde 768 px el botón "Familia" del celular se veía encima de los chips de familia y el buscador se estiraba: a 1024 la familia quedaba en 4 renglones (`.chip` le ganaba a `.plegar` por orden) | Abrir `/catalogo` a 768, 1024 o 1440 px | `MEDIDAS-1 filtros` | FALLA (también en producción) | PASA (producción, 28/10) | `16fb1c6` |
| MEDIDAS-2 | visual | media | A 768 y 834 px "Amaderados" se metía en la ventana de "Ámbar y especiados" | Portada a 768 px, sección de familias | `MEDIDAS-2 portada` | FALLA | PASA (producción, 28/10) | `16fb1c6` |
| RENDIMIENTO | rendimiento | alta | Lighthouse mobile, mediana de 5 | `--lh 5` | `RENDIMIENTO /`, `RENDIMIENTO /catalogo` | `/` 97; `/catalogo` 76, CLS 0,924 | `/` 99; `/catalogo` 88, CLS 0 | varios |

El detalle de cada etapa y de cada vuelta del rediseño (qué se encontró, cómo
se midió y qué quedó) está en [`historial/QA-registro.md`](historial/QA-registro.md),
en orden de fecha.

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
