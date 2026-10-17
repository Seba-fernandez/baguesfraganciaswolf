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
| FOTO-2 | visual | media | Filo blanco de 1 a 2 px y alfa sin borde suave en los recortes (Doha, Abu Dabi, 212 Heroes) | Mirar una caja al 300 % sobre el espresso | Hoja de contacto (`FOTO-2` en el banco dice NO APLICA, ver abajo) | filo blanco en 3 cajas, 1 Unlock | limpio en los 90 recortes | ver commit FOTO-2 |
| FOTO-3 | visual | media | Cinco recortes de Unlock traían una elipse gris horneada: sobre el espresso, un disco flotando encima de nuestra sombra. La sombra era una mancha y el reflejo, al 16 %, un espejo | Mirar One Million Lucky o Invictus Victory | Hoja de contacto | 5 podios, sombra de una capa | 0 podios, sombra en dos capas, reflejo 9 % | ver commit FOTO-3 |

**Por qué FOTO-2 no se mide en el banco.** Sobre la foto final, un filo blanco
y el canto real de un objeto (el borde dorado de una caja, la luz en el borde
de un vidrio) tienen el mismo perfil: una línea clara de 1 o 2 px entre el
fondo y el objeto. Un detector armado así, probado sobre las 133 fotos, marcaba
7 cajas ya limpias y seguía marcando Doha después de limpiarla. Un chequeo que
falla sin error no sirve. Se controla en la hoja de contacto y al 300 % en los
casos testigo; `componer.mjs` limpia el filo de todo recorte sin excepción.

### Lighthouse mobile en producción (cinco corridas, Lighthouse 13.5)

| Página | Antes | Mediana | Después | Mediana |
| --- | --- | --- | --- | --- |
| `/` | 96, 97, 97, 98, 97 | **97** | 99, 99, 98, 97, 99 | **99** |
| `/catalogo` | 76, 75, 76, 76, 76 (CLS 0,924) | **76** | 84, 86, 88, 88, 88 (CLS 0) | **88** |

Medido desde el mismo contenedor, con la red y la CPU simuladas de Lighthouse.
Puede diferir unos puntos de PageSpeed Insights.

---

## Pendientes

1. **La aclaración del pie dice "retiro los viernes".** Es
   `settings.aclaracion_pedido` en la base ("Venta particular · catálogo
   Bagués. Pedidos de fin de semana, retiro los viernes."), no está en el
   código, y en esta etapa la base era solo de lectura. Ya no contradice a
   otro texto, pero sí al plazo real (varía con el cierre del ciclo). **Lo
   cambia Sebas en un minuto:** panel, Ajustes, campo de la aclaración. El banco
   la marca como aviso en el detalle de `CONTENIDO-1`.
2. **Página 404.** Con la reescritura de Vercel, cualquier ruta inexistente
   devuelve 200 con la portada. Dar un 404 de verdad obliga a listar en
   `vercel.json` cada ruta válida, incluidas las del panel (`/panel/...`) y la
   vuelta del ingreso con Google: no se hizo para no arriesgar el panel.
3. **LCP de `/catalogo` (~3,9 s).** El CLS quedó en 0 y la nota subió de 76 a
   88, pero lo que define el LCP es la primera foto de la grilla, que hoy carga
   con `loading="lazy"`. Probar `eager` (y `fetchpriority`) en la primera fila,
   midiendo con la mediana de cinco.
4. **En el celular la página salta arriba al abrir la ficha** (medido en
   Chromium móvil: el `overflow: hidden` del body lleva el scroll a cero). Al
   cerrar, el foco vuelve a la tarjeta y el navegador la trae a la vista, así
   que no se pierde el lugar; no se tocó porque en iOS no pasa y cambiar el
   bloqueo del scroll toca el cajón y la ficha a la vez. Conviene confirmarlo
   en un Android real.
5. **Lo que va en la etapa siguiente** (no se empezó): hero nuevo, `og.jpg`,
   unificar las fotos del catálogo (FOTO-1 a FOTO-4), achicar el sello GRUPO
   WOLF, sacar las pastillas de la tarjeta, reordenar la ficha, filtros por
   familia, "si te gusta este", link por perfume (`?aroma=`), cambio del + y
   del cajón, capturas de clientas.

### Choques con lo de la etapa siguiente

- Las pastillas de talla de la tarjeta ahora tienen un área táctil de 44 px con
  `::after`. Si en la etapa siguiente salen de la tarjeta, el `::after` se va
  con ellas.
- Los destacados de la portada siguen con su `sizes` viejo
  (`46vw, 250px`) y el nombre en Cormorant 400; la tarjeta del catálogo usa
  600. Si se unifican, decidir un solo peso.
