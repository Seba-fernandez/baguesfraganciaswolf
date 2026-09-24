# Sistema visual — Bagues Grupo Wolf

Fuente de verdad del diseño de la **tienda pública**. Los tokens viven en
[`src/styles/tienda.css`](../src/styles/tienda.css); el material de vidrio en
[`src/lib/vidrioLiquido.js`](../src/lib/vidrioLiquido.js); los fondos los dibuja
[`scripts/fondo/generar-duna.mjs`](../scripts/fondo/generar-duna.mjs).

El panel de administración tiene su propio sistema, más sobrio, en
[`src/styles/global.css`](../src/styles/global.css). Lo de acá no lo toca.

---

## La marca

Un vendedor particular de perfumes en Córdoba que revende fragancias de la casa
Bagués. La web tiene que resolver una tensión: **el producto es aspiracional y
el precio es la ventaja**. Si se ve barata, nadie cree en el perfume; si se ve
inalcanzable, el precio deja de ser noticia.

| Eje | Decisión |
| --- | --- |
| Firma | **Grupo Wolf** arriba, grande, con espaciado de sello |
| Aval | **Casa Bagués · Córdoba** abajo, chico, en oro de arena |
| Tono | Rioplatense, de persona a persona. "Te lo confirmo por WhatsApp", no "gestione su orden" |
| Promesa | El mismo aroma que ya conocés, sin el sobreprecio de la vidriera |
| Lo que nunca se hace | Decir o insinuar que son originales. El aviso legal es parte del diseño, no letra chica escondida |

Los nombres de perfumes de diseñador se usan **solo como referencia olfativa**.
La aclaración de qué frasco de proveedor corresponde a cada tamaño vive dentro
de las opciones de la ficha, que es el único lugar donde sirve.

---

## Color — "Ámbar Noir"

Base espresso cálida, acento rosa-vino, oro de arena para los brillos. La idea
es el archetipo del aviso de perfume (tinta y oro cálido), no el verde botánico
ni el dorado clásico de perfumería.

| Token | Valor | Uso |
| --- | --- | --- |
| `--bg` | `#17110d` | Fondo base, espresso profundo |
| `--bg-2` | `#211812` | Superficie elevada |
| `--bg-3` | `#2b2018` | Superficie sobre superficie |
| `--ink` | `#f3ece1` | Texto principal (~16:1 sobre `--bg`) |
| `--ink-dim` | `#ddd0be` | Secundario |
| `--ink-faint` | `#bcad98` | Terciario: etiquetas, metadatos |
| `--amber` | `#e0708a` | **Acento único**, rosa-vino |
| `--amber-deep` | `#bd5670` | Presionado / borde |
| `--amber-soft` | `rgba(224,112,138,.16)` | Relleno tenue de estado activo |
| `--on-amber` | `#22110f` | Texto sobre el acento (oscuro, nunca blanco) |
| `--gold` | `#d6a862` | Oro de arena: brillos del fondo, filetes, el aval |
| `--tile` `--tile-2` `--tile-3` | `#ede2d2` `#e2d3bd` `#d7c4a8` | Porcelana cálida donde se apoyan los frascos |
| `--line` / `--line-bright` | hueso al 11% / 24% | Hairlines |

**Ojo con el nombre:** las variables se llaman `--amber*` por herencia de una
paleta ámbar anterior, pero el valor es rosa-vino. Se dejó el nombre para no
reescribir medio archivo; lo que manda es el valor.

**Reglas duras**

1. **Un solo acento.** Si aparece un segundo color de acento, la web deja de
   leerse como una sola cosa. El oro no es un acento de interfaz: vive en el
   fondo y en algún filete.
2. Sobre el acento va texto **oscuro** (`--on-amber`), nunca hueso. Ya pasó dos
   veces que un enlace con pinta de botón heredara el color claro y quedara en
   2:1, ilegible.
3. El contraste se mide contra el **peor fondo posible**, no contra el plano.
   Con la escena del hero, el punto más claro de la duna es el que manda.

---

## Tipografía

Dos familias, alojadas en el proyecto (`public/fonts`, subset latino, ~125 kB).
No se piden a Google: la web arranca sin una request que bloquea el render y no
filtra la visita a un tercero.

| Rol | Familia | Uso |
| --- | --- | --- |
| Display | **Cormorant** 400/500/600 + itálica | Títulos, nombres de perfume, citas. Es una didone de contraste altísimo: romántica, con cara de aviso de perfume |
| Cuerpo | **Figtree** 400/500/600 | Texto corrido, interfaz, datos |

Cormorant es de trazo fino: en título pide peso 600, si no se afina de más. Los
datos (precios, mililitros, códigos) van en Figtree con `tabular-nums` —clase
`.tnum`— para que las cifras no bailen al cambiar de página.

Titular del hero: `clamp(2.5rem, 5vw, 4.6rem)`, interlínea 0.98. En pantalla
ancha cada verso entra entero en su renglón (`white-space: nowrap`): sin
palabras huérfanas colgando.

---

## El vidrio

Es la pieza central del diseño y la que más trabajo llevó. El objetivo era
cristal de verdad, tipo "Liquid Glass" de iOS: que se vea el fondo a través, que
el canto **refracte**, que tenga filo especular y que una sombra lo despegue.
Un panel gris translúcido no alcanza.

El vidrio real no es una superficie translúcida: es una **lente**. En el canto
la superficie se curva y desvía la luz, así que el fondo se estira y se quiebra
justo ahí, mientras el centro queda limpio. Eso es lo que hace leer "cristal".

**Cómo está hecho** ([`vidrioLiquido.js`](../src/lib/vidrioLiquido.js)):

1. Por cada tamaño de elemento se dibuja en un canvas un **mapa de
   desplazamiento**: la distancia firmada al contorno redondeado da, en cada
   píxel, la normal del canto y cuánto se curva la lente ahí.
2. Ese mapa entra a un filtro SVG (`feImage` + `feDisplacementMap`) que desplaza
   el fondo, aplicado con `backdrop-filter`.
3. Encima, en CSS: filo especular (un `conic-gradient` recortado al contorno,
   encendido arriba a la izquierda, de donde viene la luz), reflejo de la cara
   superior, grosor sombreado abajo y caída.

Los elementos del mismo tamaño comparten filtro. Un `ResizeObserver` y un
`MutationObserver` mantienen el mapa al día cuando algo cambia de tamaño o
aparece después (paginación, cajón del pedido, ficha).

**Tres grosores, un material**

| Clase | Dónde | Desenfoque |
| --- | --- | --- |
| `.tglass-clear` / `.tbtn.clear` | Controles: flechas, paginación, volver arriba, carrito | Casi nada: se ve el fondo tal cual |
| `.tglass` | Placas con texto encima: barra de filtros, marcos | Fuerte, para que se lea |
| `.tglass-lite` | Tarjetas del catálogo | Liviano |
| `.tbtn` | Botón principal: el mismo cristal, teñido de rosa-vino | Mínimo |

**Dónde NO va la lente, y por qué.** Medido con un scroll instrumentado: con la
lente en las placas grandes y en las doce tarjetas, el scroll caía a 15-25
cuadros por segundo. La lente quedó solo en **controles** (área menor a 90.000
px²) y en **una sola pasada** de desplazamiento; la aberración cromática de tres
pasadas se veía linda y triplicaba el costo. Con eso el tiempo de cuadro quedó
igual que sin lente (~13 ms). En las placas y tarjetas el vidrio de CSS ya
alcanza, y en las tarjetas la foto tapa casi todo el canto.

**Dónde tampoco corre:** fuera de Chromium de escritorio (es el único motor que
acepta `url()` dentro de `backdrop-filter`), en celulares (desplazar el fondo en
cada cuadro traba) y con `prefers-reduced-transparency`. En todos esos casos
queda el vidrio de CSS, que se sostiene solo.

**Vidrio ahumado donde hace falta.** Sobre la arena clara del hero, un cristal
transparente deja el texto hueso en ~2,5:1: ilegible según WCAG. Los botones y
las barras de promo del hero llevan un tinte espresso del 36% que sube el
contraste a ~4,8:1 sin perder lente, filo ni reflejo. Es lo mismo que hace iOS
cuando el vidrio cae sobre contenido claro.

---

## Los fondos

Ninguno es una foto. Los dibuja un script determinista
([`generar-duna.mjs`](../scripts/fondo/generar-duna.mjs), `npm run fondo`), así
que se ajustan y se vuelven a generar sin depender de ningún banco de imágenes.

**La escena del hero** (`public/hero/duna.svg`, y `duna-movil.svg` cuadrada para
el celular): dunas de arena al atardecer. Lo que la saca de "ilustración
plana" son los filos: cada cresta lleva una línea de luz nítida, la cara de
sombra es un plano definido que baja en diagonal, y encima van decenas de
surcos finos —las ondulas que deja el viento—. El sol es un **disco nítido**, no
una mancha difusa: un disco se lee afiche, una mancha se lee plantilla.

**La textura de la página** (`public/fondo/surcos.svg`): líneas sinoidales muy
tenues en oro y vino que bajan por todo el largo. No son decoración: son lo que
el canto del vidrio **quiebra**. Una línea que se dobla al cruzar un borde es lo
que hace leer "lente"; sobre negro liso, cualquier vidrio es un panel gris.

**El grano de la escena va horneado en el WebP**, no en CSS. Iba en CSS —una
capa con `feTurbulence` mezclada en `overlay`— hasta que se midió: el blend
obliga a componer la capa aparte y a rasterizar el filtro antes de dibujar lo
que tiene debajo, y entre esta capa y la de la página sumaban **~900 ms de LCP**
en un teléfono de gama media.

Horneado cuesta 1,5 kB de archivo y cero milisegundos, pero la fuerza importa:
a 0,42 el WebP se va de 20 a 134 kB porque el ruido destruye la compresión; a
0,18 sube apenas. (La vieja advertencia de que el grano en imagen multiplica el
peso por cinco vale para un JPEG de foto, no para una escena de degradados.)

El grano de la **página** sigue en CSS, y solo de 768 px para arriba.

**El frasco del hero** está parado sobre el piso de la duna, con su sombra de
contacto y el sol de contraluz atrás. No hay caja ni azulejo: el frasco está
**en** la escena. La posición no es a ojo: el dibujo mide 1600×1000, el piso
está en `y = 840` y el frasco en `x = 74%`, así que el CSS lo ancla con unidades
de contenedor —`max(10cqw, 16cqh)` desde abajo— y queda exacto en cualquier
pantalla. Si se regenera la escena con otro piso, se tocan esos dos números.

---

## Las fotos de producto

Vienen de los catálogos públicos de las proveedoras y son de dos clases, que se
tratan distinto ([`clasificar-fondos.mjs`](../scripts/fotos/clasificar-fondos.mjs)
las separa mirando esquinas y bordes):

- **Recorte o blanco de estudio** → se apoyan sobre el azulejo de **porcelana
  cálida**, con aire alrededor (`object-fit: contain`). El tono del azulejo y el
  color al que el script normaliza el blanco son el mismo, así que no se ve
  recuadro.
- **Foto con fondo propio** (mármol, luces, escena) → ocupan el cuadro entero a
  sangre (`object-fit: cover`). Achicadas dentro del azulejo parecían una foto
  pegada encima de otra.

Cuando todavía no hay foto se muestra la inicial del aroma sobre un fondo cálido.
Una foto equivocada es peor que ninguna: sin foto no pasa nada, con la foto
cambiada la clienta pide un perfume que no es.

---

## Movimiento

```
--dur-fast: 160ms;  --dur: 300ms;  --dur-slow: 560ms;
--ease: cubic-bezier(0.22, 1, 0.36, 1);
```

- **Entrada del hero** coreografiada en CSS (`@keyframes` + `animation-delay`;
  antes lo hacía GSAP, que costaba 49 kB comprimidos en la portada): la corona,
  los versos del titular
  subiendo desde atrás de su renglón, la bajada, los botones, y el frasco con su
  sombra apareciendo desde abajo.
- **Parallax** de la escena solo en escritorio, con `animation-timeline` nativa:
  la arena baja más lento que el frasco. No ejecuta JavaScript en ningún cuadro.
- **Hover del vidrio:** el cristal se aclara, el filo se enciende y el reflejo se
  corre, como si la luz resbalara por la cara. **No crece**: un vidrio no se infla.
- **Reveals** al hacer scroll con `IntersectionObserver`, con un
  `MutationObserver` para el contenido que aparece después (ver el bug de los
  productos invisibles en el README).
- **Prohibido:** rebote, elástico, giros en loop, haces cruzados, glow de neón.
- `prefers-reduced-motion` apaga todo: las animaciones caen a 1 ms y nada queda
  en `opacity: 0` sin revelarse.

---

## Componentes

Todo interactivo tiene los cinco estados: normal, hover, foco, activo y
deshabilitado. Área de toque mínima **44×44 px**, agrandada con padding cuando
el ícono es chico.

- **Botón principal** — píldora de cristal rosa-vino, texto oscuro. Es el único
  acento sólido y tiene que leerse de lejos.
- **Botón claro** — la misma píldora en cristal transparente. Acción secundaria.
- **Tarjeta de aroma** — foto arriba a radio cero, cuerpo de vidrio: nombre en
  Cormorant, "versión inspirada", pastillas de tamaño y el pie con el precio y
  el `+` circular. Dos por fila desde el celular.
- **Ficha del aroma** — se abre encima: foto, pirámide olfativa, los tamaños de
  las dos líneas con su código y el aviso de encargo.
- **Cajón del pedido** — carrito y cierre en la misma hoja, nunca una hoja que
  abre otra hoja.
- **Barra de filtros** — placa de vidrio con buscador y pastillas. Las pastillas
  bajan de línea en vez de esconderse en una tira que se corta: un filtro que
  hay que descubrir arrastrando es un filtro que no se usa.
- **Radios:** cero en fotos y multimedia, píldora en botones y pastillas, 24-26
  px en placas.

---

## Direcciones descartadas

Se dejan anotadas para no volver a proponerlas:

- **Verde ácido + fucsia** y **"Vino & Pino"** — leían a plantilla.
- **Haces de luz cruzados** en el fondo — se leían como reja.
- **Frasco en 3D** con Three.js — bloqueaba la pantalla varios segundos y pesaba
  ~530 kB. Se fue, y con él la dependencia.
- **Gradientes blandos sin textura** — es el tell más rápido de "hecho por IA".
- **Fotos en blanco y negro** — apagan justo lo que un perfume tiene que
  transmitir: el color del frasco y del jugo.
