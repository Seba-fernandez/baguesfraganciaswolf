# KIT — el esqueleto reutilizable

Este documento es el **system design** del sistema visual: qué capas lo forman,
qué hace cada pieza, y **qué se toca para llevarlo a otro negocio**.

La promesa: arrancar un proyecto nuevo cambiando solo cuatro cosas —**paleta,
tipografías, fondo y contenido**— y acomodando bloques. Nada más. Si en el
camino aparece la necesidad de tocar la mecánica del vidrio o del layout, es que
algo del kit está mal repartido y hay que arreglarlo acá, no en el proyecto
nuevo.

- Para entender **por qué** el diseño es así: [`DISENO.md`](DISENO.md).
- Para saber **dónde** está cada archivo: [`ARQUITECTURA.md`](ARQUITECTURA.md).
- Para el contexto del negocio: [`CONTEXTO.md`](CONTEXTO.md).

---

## Índice

1. [Las cinco capas](#1-las-cinco-capas)
2. [Capa 1 — Tokens](#2-capa-1--tokens-el-contrato)
3. [Capa 2 — El material: el vidrio](#3-capa-2--el-material-el-vidrio)
4. [Capa 3 — Primitivas](#4-capa-3--primitivas)
5. [Capa 4 — Bloques](#5-capa-4--bloques)
6. [Capa 5 — Contenido](#6-capa-5--contenido)
7. [El fondo generado](#7-el-fondo-generado)
8. [Movimiento](#8-movimiento)
9. [Reglas duras del sistema](#9-reglas-duras-del-sistema)
10. [Cómo llevarlo a otro proyecto](#10-cómo-llevarlo-a-otro-proyecto)
11. [Presupuesto de rendimiento](#11-presupuesto-de-rendimiento)
12. [Qué NO copiar](#12-qué-no-copiar)

---

## 1. Las cinco capas

El sistema está pensado en capas, y cada una solo puede depender de las de
abajo. Esa es la razón por la que se puede recolorear entero sin tocar un
componente.

```
5. CONTENIDO    src/config/contenido.js · ajustes.js   ← negocio, textos, números
4. BLOQUES      src/components/tienda/*.jsx + .module.css  ← hero, grilla, ficha…
3. PRIMITIVAS   .tbtn · .tglass-* · .tnum · .tlabel · .tw  ← botón, placa, dato
2. MATERIAL     --v-* + src/lib/vidrioLiquido.js        ← el vidrio, la lente
1. TOKENS       :root de src/styles/tienda.css          ← color, tipo, ritmo
```

**Regla de oro:** un bloque nunca escribe un color literal. Si en un
`.module.css` aparece un `#hex` que no sea una sombra o un velo específico de esa
escena, es un token que falta.

| Capa | Se cambia al reusar | Esfuerzo |
| --- | --- | --- |
| 1 Tokens | **Siempre** | 15 min |
| 2 Material | Casi nunca | — |
| 3 Primitivas | Casi nunca | — |
| 4 Bloques | Se eligen cuáles van y en qué orden | 1 tarde |
| 5 Contenido | **Siempre**, entero | 1 hora |

---

## 2. Capa 1 — Tokens (el contrato)

Todo vive en el selector `.tienda` de
[`src/styles/tienda.css`](../src/styles/tienda.css). No en `:root`: así la zona
pública tiene su sistema y el panel admin conserva el suyo
(`src/styles/global.css`) sin pisarse.

### Color

| Token | Rol | Cómo elegirlo en un proyecto nuevo |
| --- | --- | --- |
| `--bg` | Fondo base | El color de la marca en su versión más profunda |
| `--bg-2` | Superficie elevada | `--bg` +6 % de luz |
| `--bg-3` | Superficie sobre superficie | `--bg` +12 % de luz |
| `--ink` | Texto principal | Nunca blanco puro: un hueso teñido del matiz de `--bg`. Mínimo 12:1 |
| `--ink-dim` | Secundario | 7:1 |
| `--ink-faint` | Terciario: etiquetas, metadatos | **4,5:1 medido contra el punto más claro del fondo**, no contra el plano |
| `--amber` | **Acento único** | El color que la marca usa para decir "acá" |
| `--amber-deep` | Presionado / borde | `--amber` −15 % de luz |
| `--amber-soft` | Relleno de estado activo | `--amber` al 16 % de opacidad |
| `--on-amber` | Texto sobre el acento | Oscuro. **Nunca claro** |
| `--gold` | Brillo secundario | Solo para fondo y filetes: **no es un acento de UI** |
| `--tile` `--tile-2` `--tile-3` | Superficie donde se apoyan las fotos | Tiene que ser **el mismo tono** al que el script normaliza el fondo de las fotos |
| `--line` / `--line-bright` | Hairlines | `--ink` al 11 % / 24 % |
| `--danger` | Error | Un rojo que conviva con el acento |

> **Trampa heredada:** las variables se llaman `--amber*` por una paleta ámbar
> anterior, pero el valor actual es rosa-vino. En un proyecto nuevo, renombrarlas
> a `--acento*` de entrada. Manda el valor, no el nombre — pero el nombre miente.

### Tipografía

```css
--f-display: 'Cormorant', 'Iowan Old Style', ui-serif, Georgia, serif;
--f-body:    'Figtree', system-ui, -apple-system, sans-serif;
--f-quote:   'Cormorant', Georgia, serif;
```

Dos familias y nada más. **Alojadas en el proyecto** (`public/fonts`, subset
latino, ~125 kB en 7 archivos), no pedidas a Google: la web arranca sin una
request bloqueante y no filtra la visita a un tercero.

El par tiene una lógica que conviene conservar al cambiarlo: **una display de
contraste alto** (didone, serif editorial) para títulos y nombres, y **una sans
neutra de buena legibilidad** para todo lo demás. Si la display es de trazo fino
—como Cormorant— los títulos piden peso 600, no 400.

### Forma, ritmo y movimiento

```css
--r-media: 0;        /* radio cero en fotos y multimedia */
--r-pill: 999px;     /* botones y pastillas */
--r-surface: 2px;    /* placas (el radio real lo pone el bloque: 18-26px) */

--wrap: min(1280px, 92vw);   /* el ancho de toda la página */
--bar-h: 74px;               /* alto del encabezado: el hero sube por detrás */
--grano: 0.16;               /* intensidad del grano de película */

--dur-fast: 160ms;  --dur: 300ms;  --dur-slow: 560ms;
--ease: cubic-bezier(0.22, 1, 0.36, 1);

--sh-card: 0 18px 44px -22px rgba(0,0,0,.72);
--sh-lift: 0 30px 66px -26px rgba(0,0,0,.85);
```

---

## 3. Capa 2 — El material: el vidrio

Es la pieza central y la que más trabajo llevó. **Un solo material en cuatro
grosores.** Documentado acá con el detalle suficiente para reconstruirlo.

### Qué tipo de vidrio es

No es glassmorphism de plantilla (un `rgba` gris con `blur`). Es **"liquid
glass" tipo iOS**: el vidrio real no es una superficie translúcida, es una
**lente**. En el canto la superficie se curva y desvía la luz, así que el fondo
se estira y se quiebra justo ahí, mientras el centro queda limpio. Eso es lo que
hace leer "cristal" y no "plástico esmerilado".

De ahí salen dos consecuencias de diseño que no son negociables:

1. **Tiene que haber algo con detalle detrás.** Sobre negro liso, cualquier
   vidrio es un panel gris. Por eso el fondo de la página lleva líneas finas
   (`surcos.svg`): una línea que se **dobla** al cruzar un borde es la prueba de
   que hay una lente.
2. **El canto hace el trabajo, no el relleno.** El tinte es casi invisible
   (`--v-tinte: rgba(255,244,230,.05)`). Lo que lee vidrio es el filo especular,
   la refracción y la sombra.

### Las cuatro clases

| Clase | Dónde va | `backdrop-filter` | Tinte |
| --- | --- | --- | --- |
| `.tglass-clear` | Controles: flechas, paginación, volver arriba, carrito | `blur(1.5px) saturate(1.8) brightness(1.1)` | `--v-tinte` (5 %) |
| `.tbtn` | Botón principal | `blur(4px) saturate(1.6)` | Acento al 90 % |
| `.tbtn.clear` / `.tbtn.ghost` | Botón secundario | igual que `clear` | `--v-tinte` |
| `.tglass` | Placas con texto encima: barra de filtros, marcos | `blur(18px) saturate(1.7) brightness(.96)` | `--v-tinte-frost` (38 %) |
| `.tglass-lite` | Tarjetas del catálogo | `blur(10px) saturate(1.5)` | 30 % |

La **saturación** es lo que separa vidrio de plástico: el vidrio concentra el
color de lo que tiene detrás. Nunca ponerla en 1.

### Anatomía de una superficie

Cinco cosas apiladas, cada una con un trabajo:

```
┌─ ::before  filo especular   conic-gradient recortado al contorno con mask xor
│            No es un borde parejo: se enciende arriba a la izquierda (de donde
│            viene la luz) y rebota abajo a la derecha. Los costados, apagados.
├─ ::after   reflejo de cara  radial-gradient, media luna de luz arriba
├─ background tinte + velo    un gradiente de luz que baja desde arriba
├─ backdrop-filter            var(--lente,) + blur + saturate + brightness
└─ box-shadow --v-sombra      seis sombras (ver abajo)
```

Las seis sombras de `--v-sombra`, en orden:

1. `inset 0 1px .5px rgba(255,255,255,.55)` — la línea de luz nítida del canto de arriba
2. `inset 0 -1px .5px rgba(255,255,255,.14)` — el rebote tenue del canto de abajo
3. `inset 0 0 16px -4px rgba(255,246,232,.16)` — la luz que junta el canto al curvarse
4. `inset 0 -14px 22px -18px rgba(20,8,4,.55)` — **el grosor**: la cara interna se oscurece hacia abajo
5. `0 2px 3px -1px rgba(10,5,3,.45)` — la sombra de contacto, corta y oscura
6. `0 22px 44px -22px rgba(10,5,3,.75)` — la caída larga que lo despega del fondo

Sacar cualquiera de estas seis y el vidrio se aplana. La 4 es la que más
sorprende: es la que da **espesor**.

### La lente (el JS)

[`src/lib/vidrioLiquido.js`](../src/lib/vidrioLiquido.js), 185 líneas. Cómo
funciona:

1. Por cada tamaño de elemento (ancho × alto × radio) se dibuja en un canvas un
   **mapa de desplazamiento**: la distancia firmada al contorno redondeado da,
   en cada píxel, la normal del canto y cuánto se curva la lente ahí. El perfil
   es tipo squircle: `m = t² · (1.6 − 0.6t)`, máximo en el filo y apagándose
   hacia adentro.
2. Ese mapa entra a un filtro SVG (`feImage` + `feDisplacementMap`) que desplaza
   el fondo.
3. El elemento lo consume con `backdrop-filter: var(--lente,) blur(...)`.

La coma en `var(--lente,)` no es un error de tipeo: es el valor por defecto
vacío. Donde no hay lente, la declaración sigue siendo válida.

Un `ResizeObserver` y un `MutationObserver` mantienen el mapa al día cuando algo
cambia de tamaño o aparece después. Los elementos del mismo tamaño comparten
filtro.

### Dónde la lente NO corre, y por qué

Esto es presupuesto, no capricho:

- **Solo en controles** (`SELECTOR = '.tglass-clear, .tbtn'`) y solo si el área
  es menor a `AREA_MAXIMA = 90000 px²`. Con la lente en las placas grandes y en
  las doce tarjetas, el scroll medido caía a **15-25 fps**. Restringida, el
  tiempo de cuadro queda igual que sin lente (~13 ms).
- **Una sola pasada** de desplazamiento. La aberración cromática de tres pasadas
  (una por canal) se veía linda y triplicaba el costo.
- **Solo Chromium de escritorio**: es el único motor que acepta `url()` dentro
  de `backdrop-filter`.
- **Nunca en celular**: desplazar el fondo en cada cuadro traba.
- **Nunca con `prefers-reduced-transparency`.**

En todos esos casos queda el vidrio de CSS, que se sostiene solo.

### Vidrio ahumado sobre fondo claro

Sobre la arena clara del hero, un cristal transparente deja el texto hueso en
~2,5:1: ilegible. Los botones y las barras del hero llevan un tinte del 36 %
(`rgba(38,18,10,.36)`) que sube el contraste a ~4,8:1 **sin perder lente, filo ni
reflejo**. Es lo mismo que hace iOS cuando el vidrio cae sobre contenido claro.

**Al reusar:** si el fondo de la escena es claro, este ahumado es obligatorio, y
su color es `--bg` con opacidad, no un gris.

### Las dos trampas de especificidad (ya pagadas)

Están resueltas en el CSS y hay que entender por qué antes de tocarlo:

```css
/* 1. Posición con :where() → especificidad CERO.
      Las capas del vidrio necesitan un padre posicionado, pero si el
      componente lo pone fixed o absolute (volver arriba, flechas), tiene
      que ganar el componente. */
:where(.tglass-clear, .tbtn, .tglass, .tglass-lite) { position: relative; isolation: isolate; }

/* 2. Color calificado con .tienda.
      `.tienda a` (0,1,1) le gana a `.tbtn` (0,1,0): un botón que es <a>
      heredaba color claro sobre el acento y quedaba en 2:1. */
.tienda .tbtn { color: var(--on-amber); }
.tienda .tbtn.ghost, .tienda .tbtn.clear { color: var(--ink); }
```

### Las dos salidas de emergencia

```css
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) { … }
@media (prefers-reduced-transparency: reduce) { … }
```

Las dos caen a superficies sólidas. **Se pierde el efecto, nunca la lectura.**

---

## 4. Capa 3 — Primitivas

Clases globales de la tienda. Todas arrancan con `t` para distinguirse de las de
módulo. Viven en [`tienda.css`](../src/styles/tienda.css) y son las mismas en
cualquier proyecto.

| Clase | Qué es |
| --- | --- |
| `.tw` | El contenedor de ancho: `width: var(--wrap); margin-inline: auto` |
| `.tbtn` | Botón principal: píldora de cristal teñido, texto oscuro, `min-height: 48px` |
| `.tbtn.clear` | Botón secundario: la misma píldora en cristal transparente |
| `.tbtn.wide` | El botón ocupa todo el ancho |
| `.tglass` `.tglass-lite` `.tglass-clear` | Las superficies (ver capa 2) |
| `.tnum` | Datos: `tabular-nums` para que las cifras no bailen al paginar |
| `.tlabel` | Eyebrow: 0.72rem, `letter-spacing: .18em`, mayúsculas, `--ink-faint` |
| `.tquote` | Cita: la itálica de la display |
| `.treveal` / `.trevealed` | Aparición al hacer scroll (ver capa 4) |
| `.tscroll-x` | Contenedor con scroll horizontal y barra oculta |
| `.tfondo` | La capa de fondo de toda la página |

Y tres bloques de comportamiento que no son clases pero forman parte del kit:

- **Barra de desplazamiento propia**, declarada en los dos dialectos
  (`scrollbar-color` y `::-webkit-scrollbar`). Ojo: la del documento hay que
  declararla en `index.html`, porque cuando el CSS de la tienda carga el
  navegador ya resolvió la del scroll principal.
- **View Transitions** para el morph tarjeta → ficha: 380 ms con el `--ease` del
  sistema.
- **`prefers-reduced-motion`** apaga todo: las transiciones caen a 1 ms y nada
  queda en `opacity: 0` sin revelarse.

### Estados

Todo lo interactivo tiene los cinco: normal, hover, foco, activo, deshabilitado.

- **Foco:** `outline: 2px solid var(--ink); outline-offset: 3px`. Siempre
  `:focus-visible`, nunca `:focus`.
- **Activo:** `transform: scale(.985)`. Nada más.
- **Deshabilitado:** `opacity: .42; cursor: not-allowed`.
- **Hover del vidrio:** el cristal se aclara, el filo se enciende (`::before`
  opacity 0.85 → 1) y el reflejo se corre (`::after` `translateX(8%)`), como si
  la luz resbalara por la cara. **No crece: un vidrio no se infla.**
- Área de toque mínima **44×44 px**, agrandada con padding cuando el ícono es
  chico.

---

## 5. Capa 4 — Bloques

Cada bloque es `Componente.jsx` + `Componente.module.css` al lado. Ninguno tiene
texto propio ni color literal. Este es el inventario de lo que hay para elegir:

| Bloque | Archivo | Qué es | ¿Genérico? |
| --- | --- | --- | --- |
| **Cáscara** | [`TiendaLayout.jsx`](../src/components/tienda/TiendaLayout.jsx) | Encabezado + `.tfondo` + main + pie + legal. Monta la lente | ✅ tal cual |
| **Datos** | [`TiendaShell.jsx`](../src/components/tienda/TiendaShell.jsx) | Carga productos y ajustes una vez y los reparte por `Outlet` | ✅ el patrón |
| **Hero** | [`Hero.jsx`](../src/components/tienda/Hero.jsx) | Escena a sangre + producto parado en ella + corona + título + CTA + promos + cinta | ✅ la estructura |
| **Destacados** | [`Destacados.jsx`](../src/components/tienda/Destacados.jsx) | Carrusel horizontal dentro de un marco `.tglass`, con flechas que vuelven al inicio al llegar al tope | ✅ tal cual |
| **Nosotros** | [`Nosotros.jsx`](../src/components/tienda/Nosotros.jsx) | Texto editorial + firma | ✅ tal cual |
| **Cómo funciona** | [`ComoFunciona.jsx`](../src/components/tienda/ComoFunciona.jsx) | Tres pasos numerados + cita + CTA | ✅ tal cual |
| **Grilla** | [`ProductGrid.jsx`](../src/components/tienda/ProductGrid.jsx) | Buscador + pastillas de filtro + grilla + paginado + vacío | ✅ la mecánica |
| **Tarjeta** | [`ProductCard.jsx`](../src/components/tienda/ProductCard.jsx) | Foto a radio cero + cuerpo de vidrio + precio + `+` circular | ✅ tal cual |
| **Miniatura** | [`ProductThumb.jsx`](../src/components/tienda/ProductThumb.jsx) | Resuelve qué foto va y cómo se encuadra. Placeholder con inicial | ⚠️ la lógica de dos líneas es del negocio |
| **Ficha** | [`ProductModal.jsx`](../src/components/tienda/ProductModal.jsx) | Hoja que se abre encima, con Escape y scroll bloqueado | ✅ tal cual |
| **Cajón** | [`CartSheet.jsx`](../src/components/tienda/CartSheet.jsx) | Carrito y cierre en **la misma hoja**, nunca una hoja que abre otra | ✅ tal cual |
| **Volver arriba** | [`VolverArriba.jsx`](../src/components/tienda/VolverArriba.jsx) | Aparece a los 900 px, se esconde si hay hoja abierta, scroll `passive` | ✅ tal cual |

### Los tres patrones que hacen que los bloques funcionen

**1. El hero se ancla a la escena con unidades de contenedor, sin JS.**

`duna.svg` mide 1600×1000, se pinta con `cover` anclado abajo al centro, el piso
está en `y = 840` y el foco en `x = 74%`. De ahí sale, medido en la caja con
`container-type: size`:

```css
bottom: calc(max(10cqw, 16cqh) - 6px);              /* el piso */
left:   calc(50cqw + max(24cqw, 38.4cqh));          /* el foco */
```

Si se regenera la escena con otro piso o otro foco, **se tocan esos dos
números** y nada más. No hay JavaScript midiendo nada.

**2. Los reveals sobreviven al contenido dinámico.**

[`useReveal.js`](../src/hooks/useReveal.js): un `IntersectionObserver` agrega
`.trevealed`, y un `MutationObserver` engancha lo que aparece después. Sin el
segundo, cambiar un filtro deja las tarjetas nuevas en `opacity: 0` **para
siempre** — es un bug real que ya pasó en este proyecto.

**3. Las pastillas de filtro bajan de línea, no se esconden.**

Un filtro que hay que descubrir arrastrando una tira que se corta es un filtro
que no se usa.

---

## 6. Capa 5 — Contenido

Dos archivos, cero texto en los componentes.

**[`src/config/contenido.js`](../src/config/contenido.js)** — todas las frases,
agrupadas por dónde aparecen: `MARCA`, `CABECERA`, `INICIO`, `DESTACADOS`,
`NOSOTROS`, `CATALOGO`, `TARJETA`, `FICHA`, `COMO_FUNCIONA`, `LEGAL`, `PIE`.

Trae `conDatos(texto, datos)` para interpolar: `'{n} aromas en el ciclo'`. Si
falta una clave **deja el `{hueco}` a la vista** en vez de escribir "undefined".
Es a propósito: el error se nota y no le llega a la clienta.

**[`src/config/ajustes.js`](../src/config/ajustes.js)** — los números que alguna
vez se van a querer mover: cuántos ítems por página, cuántos destacados, el tope
por pedido, a qué altura aparece "volver arriba", la proporción de las fotos y en
qué carpeta viven.

**Lo que cambia solo no va acá.** Precios, stock, promociones y teléfono viven en
la base de datos, no en el código. Esa es la regla que hace que cargar un ciclo
nuevo lleve media hora y no una tarde.

---

## 7. El fondo generado

Ninguna imagen del sistema es una foto de banco. Las dibuja un script
determinista (semilla fija: correrlo dos veces da el mismo archivo):
[`scripts/fondo/generar-duna.mjs`](../scripts/fondo/generar-duna.mjs), con
`npm run fondo`.

| Salida | Qué es |
| --- | --- |
| `public/hero/duna.svg` | La escena del hero, apaisada (1600×1000) |
| `public/hero/duna-movil.svg` | La misma escena, cuadrada y centrada |
| `public/fondo/surcos.svg` | La textura de toda la página: líneas sinoidales finas |

**Qué lo saca de "ilustración plana":** los filos. Cada cresta lleva una línea de
luz nítida, la cara de sombra es un plano definido, y encima van decenas de
surcos finos. El sol es un **disco nítido**, no una mancha difusa: un disco se lee
afiche, una mancha se lee plantilla.

**El grano va horneado en la imagen, no en CSS.** En CSS es una capa a pantalla
completa con `feTurbulence` en `mix-blend-mode: overlay`, y ahí está la trampa:
el blend obliga al navegador a componer esa capa aparte y a rasterizar el filtro
**antes** de poder dibujar lo que tiene debajo. Medido, dos capas así sumaban
**~900 ms de LCP** en un teléfono de gama media.

Horneado cuesta cero milisegundos, pero la fuerza importa y la curva no es
lineal: en una escena de degradados, a 0,42 de intensidad el WebP se va de 20 a
134 kB porque el ruido destruye la compresión, y a 0,18 sube 1,5 kB. Medir esa
curva antes de elegir. (La advertencia clásica de que el grano en imagen
multiplica el peso por cinco vale para un JPEG de foto, no para esto.)

**Para reusar:** la escena se define en `capas[]`, cada una con `base` (altura
media de la cresta), `ondas` (amplitud, largo, fase), `luz`, `sombra` y `surcos`.
Cambiar la paleta del fondo es cambiar los hex de `luz` y `sombra` en cuatro
capas. La forma —montañas, olas, dunas, cintas— sale de las `ondas`.

---

## 8. Movimiento

```css
--dur-fast: 160ms;  --dur: 300ms;  --dur-slow: 560ms;
--ease: cubic-bezier(0.22, 1, 0.36, 1);
```

- **Entrada del hero**, coreografiada: la corona, los versos del titular subiendo
  desde atrás de su renglón (cada uno en un `.lineaWrap` con `overflow: hidden`),
  la bajada, los botones, y el producto con su sombra apareciendo desde abajo.
- **Parallax** de la escena, **solo en escritorio**: el fondo baja más lento.
- **Reveals** al hacer scroll, con delay escalonado por índice.
- **Cinta** de nombres en bucle infinito, duplicada para que no tenga costura, y
  pausada al pasar el mouse.

**Prohibido:** rebote, elástico, giros en loop, haces cruzados, glow de neón.

> **Sin librería de animación.** Esto lo hacía GSAP + ScrollTrigger y costaba
> **49 kB comprimidos** en la portada; la coreografía completa entró en
> `@keyframes` + `animation-delay`, y el parallax en `animation-timeline`
> nativa. En un proyecto nuevo, arrancar así.
>
> **Y cuidado con animar el elemento del LCP.** La escena del hero entraba con un
> fade desde `opacity: 0`: mientras esté en cero, el navegador considera que no
> se dibujó nada grande, así que eran **704 ms** de retraso puro sobre la
> métrica, sobre un archivo que tardaba 82 ms en bajar. Animar escala o posición
> no tiene ese costo; animar opacidad sí.

---

## 9. Reglas duras del sistema

Las que no se negocian, porque romper cualquiera desarma el conjunto:

1. **Un solo acento.** Si aparece un segundo color de acento, la web deja de
   leerse como una sola cosa. El oro no es un acento de interfaz: vive en el
   fondo y en algún filete.
2. **Sobre el acento va texto oscuro.** Nunca claro. Ya pasó dos veces que un
   enlace con pinta de botón heredara el color claro y quedara en 2:1.
3. **El contraste se mide contra el peor fondo posible**, componiendo todas las
   capas, no contra el plano. Con textura y escena, el punto más claro es el que
   manda.
4. **Radio cero en fotos y multimedia.** Píldora en botones y pastillas. 18-26 px
   en placas. Sin excepciones.
5. **Máximo un eyebrow cada tres secciones.**
6. **El vidrio necesita algo con detalle detrás.** Sin eso, es un panel gris.
7. **Ningún componente tiene texto ni color escrito adentro.**
8. **Toda animación respeta `prefers-reduced-motion`**, y ningún elemento queda
   en `opacity: 0` cuando está apagada.
9. **Todo en castellano**: tablas, columnas, variables, carpetas y commits. Sin
   mezclar idiomas a mitad de camino.
10. **El rendimiento es una decisión de diseño**, no un ajuste del final.

---

## 10. Cómo llevarlo a otro proyecto

Orden recomendado. Cada paso se puede terminar y mirar antes del siguiente.

### Paso 0 — Copiar el esqueleto

```
src/styles/tienda.css          el sistema entero
src/lib/vidrioLiquido.js       la lente
src/hooks/useReveal.js         los reveals
src/config/contenido.js        vaciado y reescrito
src/config/ajustes.js          vaciado y reescrito
src/components/tienda/*        los bloques que sirvan
scripts/fondo/generar-duna.mjs el generador de fondo
public/fonts/                  reemplazar por las nuevas
```

### Paso 1 — La paleta (15 min)

Tocar **solo el bloque de tokens de color** en `tienda.css`. Elegir `--bg` y
derivar `--bg-2` y `--bg-3`; elegir el acento y derivar `deep` y `soft`; elegir
`--on-amber` oscuro; teñir `--ink*` con el matiz de `--bg`.

**Verificar antes de seguir:** `--ink-faint` contra el fondo con textura tiene que
dar ≥ 4,5:1. Si se hace a ojo, falla — ya falló acá (3,9:1 cuando contra el plano
daba 5,1:1).

Y cambiar `theme-color` en `index.html`, que es lo que pinta la barra del
navegador en el celular. *(En este repo quedó desactualizado: dice `#0f1512`, de
la paleta anterior.)*

### Paso 2 — Las tipografías (20 min)

Elegir el par display + cuerpo, generar el subset latino en woff2, dejarlos en
`public/fonts` y cambiar los `@font-face` y los tres `--f-*`.

Ajustar el peso de los títulos según el trazo de la display. Y **precargar** las
dos caras críticas desde `index.html` — no confiar en que el CSS las descubra.

### Paso 3 — El fondo (1 hora)

En `generar-duna.mjs`: cambiar los hex de `luz` y `sombra` de las cuatro capas, y
las `ondas` si se quiere otra forma. Correr `npm run fondo`.

Si el hero lleva un producto parado en la escena, recalcular los dos números de
anclaje del paso 1 de la sección [Bloques](#5-capa-4--bloques).

### Paso 4 — El contenido (1 hora)

Reescribir `contenido.js` entero: es la voz del negocio nuevo. Ajustar los
números de `ajustes.js`.

### Paso 5 — Elegir y ordenar los bloques (1 tarde)

Componer la portada con los bloques del inventario. Borrar los que no van (no
comentarlos: borrarlos). El orden se cambia en `HomeScreen.jsx` y es el único
lugar donde se toca.

### Paso 6 — La revisión que no se saltea

- Contraste de `--ink-faint` y de cualquier texto sobre vidrio claro, **medido**.
- Los cinco estados de todo lo interactivo.
- Con `prefers-reduced-motion` puesto: nada invisible.
- Con `prefers-reduced-transparency` puesto: todo legible.
- En Firefox y en Safari, donde la lente no corre.
- A 360 px de ancho.
- El presupuesto de peso (abajo).

---

## 11. Presupuesto de rendimiento

Esto es parte del kit, no un apéndice. Este proyecto **arrancó sin cumplirlo**
(~600 kB contra un objetivo de 150) y le costó una tanda entera de trabajo
llegar: PageSpeed en celular de 70 a 96. El proyecto nuevo arranca cumpliéndolo.

| Presupuesto | Tope |
| --- | --- |
| Bytes hasta el primer dibujado, comprimidos | **150 kB** |
| JS de la primera pantalla | 80 kB (React + router ya son ~63) |
| Imagen del hero | 40 kB |
| Caras tipográficas en la primera pantalla | **3**, ~45 kB |
| Textura de fondo | 20 kB, **en mosaico que se repite** |
| Superficies con `backdrop-filter` visibles a la vez | ≤ 15 |
| Elementos con lente | solo controles, área < 90.000 px² |

### Las doce reglas, todas salidas de una medición

1. **La portada se pre-renderiza.** Una SPA no muestra nada hasta que parsea
   todo el JavaScript. Con el HTML ya dibujado y el CSS embebido, el navegador
   pinta apenas recibe el documento.
2. **El cliente de base de datos no va en el chunk inicial.** Una visitante
   anónima no necesita auth, realtime ni storage para leer un catálogo. Leer con
   `fetch` contra la API REST y dejar el cliente completo en la zona privada.
3. **La hidratación espera al evento `load`.** Dispara los pedidos de datos, y
   esos compiten por el ancho de banda justo con la imagen del LCP.
4. **Ninguna librería de animación en la portada.** CSS nativo alcanza para
   entrada, parallax y reveals.
5. **No animar la opacidad del elemento del LCP.** Cuesta exactamente lo que
   dura el fade.
6. **Contar las caras tipográficas, no los kilobytes.** Con la portada
   pre-generada el texto existe desde el primer milisegundo, así que **todas**
   las fuentes que aparezcan en el HTML salen juntas a prioridad máxima contra
   la imagen del hero. Tres caras arriba, el resto en una hoja que se agrega en
   `load`. Si una cara se usa en un solo lugar de la primera pantalla, cambiar
   ese lugar de peso sale más barato que traerla.
7. **El grano va horneado en la imagen**, y con la curva medida (ver *Los fondos
   generados*). Dos capas con `mix-blend-mode` a pantalla completa son ~900 ms.
8. **`content-visibility: auto` en todo lo que está debajo del pliegue**, con su
   `contain-intrinsic-size`. El HTML pre-generado trae la página entera y el
   navegador calculaba estilo y posición de todo antes del primer dibujado.
9. **Las imágenes en varios anchos, con el descriptor honesto.** Y ojo: con
   `srcset`/`sizes` el navegador multiplica por la densidad de pantalla, así que
   en un teléfono de gama media termina eligiendo el archivo grande igual. Donde
   la decisión tiene que ser exacta, `<picture>` con `media`.
10. **Medir el elemento del LCP en producción, no en local.** Acá era la escena
    del hero en local y **el frasco** en producción. Se optimiza el que es.
11. **El mapa de la lente se calcula fuera del hilo principal** (`toBlob` +
    `createObjectURL`, o un worker con `OffscreenCanvas`). Nunca `toDataURL`,
    que es un encode PNG síncrono.
12. **Medir cinco corridas y mirar la mediana.** Una sola corrida de Lighthouse
    varía 4-5 puntos, y es fácil "mejorar" algo que en realidad era ruido.

### Lo que suena bien y midió peor

Tres cosas que parecían obvias y no lo eran. Verificar antes de darlas por
buenas en el proyecto siguiente:

| Idea | Resultado |
| --- | --- |
| Partir el CSS en crítico + diferido, el resto en su archivo | mediana 93 contra 96: el viaje de red extra cuesta más de lo que ahorra cuando ya hay `content-visibility` |
| Lo mismo con las dos mitades embebidas, la segunda en `<style media="print">` | FCP de 1957 a 2107 ms |
| La escena del hero como `<img>` en vez de `background-image` | LCP de 2411 a 2557 ms |

## 12. Qué NO copiar

Cosas de este repo que son de **este negocio** y no del kit:

- El **aviso legal** de `LEGAL` — está redactado para un caso muy puntual
  (versiones inspiradas, marcas citadas como referencia olfativa). Escribir el
  del negocio nuevo desde cero, con asesoramiento.
- La lógica de **dos líneas de proveedora** en `ProductThumb` y `producto.js`.
- El **2x1 por grupos** de `lib/promos.js`, y el armado del mensaje de
  `lib/whatsapp.js`.
- El **esquema de base** y `crear_pedido_web()` — el patrón sí (una sola puerta
  de escritura, precios del lado del servidor); las columnas no.
- Los nombres `--amber*` para un acento que ya no es ámbar. Renombrar a
  `--acento*`.
- El `theme-color` de `index.html`, que quedó de una paleta anterior.

### Direcciones que ya se descartaron

Anotadas para no volver a proponerlas en el proyecto siguiente:

- **Verde ácido + fucsia** y **"Vino & Pino"** — leían a plantilla.
- **Haces de luz cruzados** en el fondo — se leían como reja.
- **Producto en 3D** con Three.js — bloqueaba la pantalla varios segundos y
  pesaba ~530 kB.
- **Gradientes blandos sin textura** — es el tell más rápido de "hecho por IA".
- **Fotos en blanco y negro** — apagan justo lo que el producto tiene que
  transmitir.
