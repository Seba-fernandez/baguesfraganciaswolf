# MASTER · Sistema de diseño — Tienda "Ácido"

> Fuente de verdad visual de la **tienda pública** de Bagues Grupo Wolf.
> Dirección inspirada en la referencia de **Lunet Eyewear** (SlabPixel) que
> pasó el usuario: oscuro + verde ácido + display pesado + producto 3D +
> foto en B/N con pop de color + etiquetas técnicas entre corchetes.
> El **panel admin** conserva su sistema "glass" propio (`src/styles/global.css`).
> Tokens de la tienda en `src/styles/tienda.css`.

---

## Tesis visual

Fondo **carbón cálido** (no negro puro) con secciones que alternan de tono; **verde
ácido** como único protagonista en bloques planos full-bleed, precios, botones y el
wordmark gigante; **magenta** como segundo acento puntual (flecha circular, una card
destacada). Tipografía **display grotesca pesada** en mayúsculas y tracking
apretado, en contraste con **etiquetas mono entre corchetes** (`[detalle]`,
`11/1660`, `©2026`). Foto de producto/persona en **blanco y negro con el perfume
en color saturado** (pop). Momento **3D** del frasco con anillo de órbita y control
`360°`. Bordes discretos (8–14 px), botones en píldora o cuadrados; nada de
gradientes ni vidrio.

## Tesis de interacción

Transiciones **medias (220–380 ms)** con easing `cubic-bezier(0.22, 1, 0.36, 1)`;
**scroll-driven**: el frasco 3D rota con el scroll y con arrastre, el anillo de
órbita gira, la **banda verde** de la colección destacada entra con wipe
horizontal, los titulares gigantes tienen parallax leve, las cards revelan con
`clip-path` + `y`. Hover: la card se eleva 4 px y aparece la flecha `↗`; los
bloques verdes no se mueven (son ancla). **Prohibido:** rebote, elástico, giros
en loop salvo la rotación idle del frasco y del anillo. Todo colapsa a estático
con `prefers-reduced-motion` (el 3D → foto B/N con pop).

---

## Color

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#191a17` | Fondo base (carbón cálido, leve verde) |
| `--bg-2` | `#212220` | Sección alterna / cards |
| `--bg-3` | `#2b2c29` | Card elevada, hover, thumbs |
| `--ink` | `#f3f4ef` | Texto principal (16.8:1) |
| `--ink-dim` | `#a4a59d` | Secundario (7.2:1) |
| `--ink-faint` | `#6f7168` | Etiquetas, metadatos (4.5:1) |
| `--line` | `rgba(243,244,239,0.11)` | Hairlines |
| `--line-bright` | `rgba(243,244,239,0.22)` | Hairline hover |
| `--acid` | `#b7e04c` | **Protagonista**: bandas, precio, CTA fill, wordmark. Texto sobre acid = `--bg` (contraste 15:1). Desaturado a propósito (v4) respecto del verde neón original |
| `--acid-deep` | `#9bc93a` | Acid presionado / borde |
| `--rose` | `#f0355e` | 2º acento — **tomado del rosa real de la marca Bagués** (`bagues.com.ar`), no inventado. Flecha circular, 1 card destacada, el trazo hecho a mano del statement. Máx 1–2 apariciones por pantalla |
| `--ok` | `--acid` | Disponible |
| `--warn` | `#ffc861` | "Consultar precio" |
| `--off` | `rgba(243,244,239,0.28)` | Producto pausado |

**Regla:** el verde ácido aparece en **bloques sólidos planos**, nunca como
gradiente ni glow difuso. Una banda ácida grande por vista (la colección
destacada) + usos chicos (precio, botón). El magenta es un condimento, no un
segundo color base.

### Foto de producto (ajustado en la implementación real)

Se probó el tratamiento B/N + bloque de color sobre fotos reales y **no
funciona**: forzar `grayscale()` sobre una foto de celular apaga justamente lo
que un perfume tiene que transmitir (el color del frasco/jugo). Implementación
final (`ProductThumb.jsx`):
- **Con foto real:** se muestra tal cual, a color, sin filtros.
- **Sin foto todavía:** placeholder con fondo oscuro degradado + un bloque
  sólido `--acid`/`--rose` + ícono de frasco — para que la grilla nunca se vea
  rota mientras se van cargando las fotos reales desde el panel.
El "3D con acento de color" queda solo para el **frasco decorativo genérico del
hero** (`Bottle3D.jsx`), que no representa ningún producto puntual.

---

## Tipografía

| Rol | Familia (Google Fonts) | Fallback | Uso |
|---|---|---|---|
| Display | **Fraunces** (variable, `opsz` alto) | `'Iowan Old Style', Georgia, serif` | Peso 440/600. h1/h2/h3 (nombre de perfume, títulos de sección) en romana; **itálica** para el statement y el wordmark del footer. Es el cambio de v4: reemplaza a Bricolage/Anton — un serif con carácter da la calidez "soft premium" sin caer en el grotesco genérico. |
| UI / dato grande | **Bricolage Grotesque** | `'Arial Black', system-ui` | Peso 700. Rol reducido en v4: solo el monograma del logo y el precio del price card — ya no es la voz principal. |
| Cuerpo | **Onest** | `system-ui` | 400/500. Descripciones, specs. Reemplaza a Inter (desaconsejada por `taste-skill` para look "premium/creativo"). |
| Etiqueta / dato | **JetBrains Mono** | `'Space Mono', monospace` | 400/500. `11 / 1660`, `©2026`, precio con ml, familia olfativa, `360°`. `letter-spacing: 0.04em`. **v4: sin corchetes literales de adorno** — el mono es para datos reales, no para simular una etiqueta técnica en cada sección (ese era el vicio "eyebrow"). |

### Escala (fluida)

| Token | Valor | Uso |
|---|---|---|
| `--fs-statement` | `clamp(3rem, 12vw, 9rem)` | Anton — banda gigante / wordmark |
| `--fs-display` | `clamp(2rem, 5.5vw, 4rem)` | H1 hero / H2 sección (Bricolage 800) |
| `--fs-h3` | `clamp(1.25rem, 2.6vw, 1.9rem)` | Nombre de perfume en fila/card (Bricolage 700) |
| `--fs-body` | `1rem` | Cuerpo |
| `--fs-sm` | `0.875rem` | Descripción corta, specs |
| `--fs-label` | `0.72rem` | Mono labels, `[corchetes]`, counters |

Line-height: display `1.0`, statement `0.92`, cuerpo `1.55`.

---

## Espaciado

Base **4 px**. Escala `4 8 12 16 24 32 48 64 96 128 192` (`--sp-1`…`--sp-11`).
Ritmo entre secciones `clamp(72px, 10vw, 140px)`. Contenido `min(1240px, 92vw)`.
Las **bandas ácidas** rompen el margen: van full-bleed (`100vw`).

## Radios

| Token | Valor | Uso |
|---|---|---|
| `--r-none` | `0` | Fotos, bandas |
| `--r-card` | `12px` | Cards, thumbs, spec table |
| `--r-pill` | `999px` | Botones, stepper, chips |
| `--r-sq` | `10px` | Botón cuadrado de "sumar" en la grilla |

## Sombra

| Token | Valor |
|---|---|
| `--sh-card` | `0 20px 50px -24px rgba(0,0,0,0.65)` |
| `--sh-lift` | `0 32px 70px -28px rgba(0,0,0,0.8)` (hover) |
| Sin reflejos especulares ni `inset` highlights (esto no es "glass"). |

---

## Motion tokens

```
--dur-fast: 160ms;  --dur: 300ms;  --dur-slow: 560ms;
--ease: cubic-bezier(0.22, 1, 0.36, 1);
--stagger: 70ms;
```

Librerías: **GSAP + ScrollTrigger** (scroll-driven: 360° del frasco, wipe de la
banda ácida, parallax de titulares, reveals). **three.js** (frasco 3D con material
glossy sólido — verde ácido o el color real del jugo — y anillo de órbita; solo
hero + modal; fallback a foto B/N con bloque si `prefers-reduced-motion` o device
lento). `motion` (Framer) para micro-UI del carrito.

---

## Componentes (5 estados: default / hover / focus / active / disabled)

### Banda de colección destacada (firma)
Full-bleed `--acid`, texto `--bg`. Nombre de perfume en Bricolage 800, render 3D
o foto del frasco a la izquierda, descripción + precio a la derecha, `↗` arriba
a la derecha. **hover:** el `↗` se desplaza 4px; la banda no se mueve.

### Botón primario ("Hacer pedido", "Ver catálogo")
Píldora `--acid`, texto `--bg`, mono uppercase. Puede llevar a la derecha un
**círculo `--magenta`** con `↗` (como Lunet "Add to cart").
- **hover:** el círculo magenta rota el `↗` 45°→0 y la píldora hace `scale(1.015)`.
- **focus-visible:** anillo `--ink` 2px offset 3px.
- **active:** `scale(0.98)`, `--acid-deep`.
- **disabled:** `--off`, sin círculo.

### Botón fantasma
Sin fondo, borde `--line`, texto `--ink-dim`, mono. hover: borde `--line-bright`, texto `--ink`.

### Card de producto (grilla "otras")
`--bg-2`, `--r-card`, `--sh-card`. Foto arriba (`--r-none`) `aspect-ratio: 1/1`
sobre `--bg-3`, con tratamiento B/N + bloque de color detrás del frasco. Abajo:
nombre (Bricolage 700), fila mono `familia · género`, precio, y un **botón
cuadrado** `--r-sq` de color (acid o, en 1 card, magenta) con ícono `+`.
- **hover:** `translateY(-4px)`, `--sh-lift`, aparece `↗` arriba, la foto `scale(1.04)`.
- **pausada:** no se renderiza (query filtra `activo`).

### Fila de producto ("los que no fallan")
Grilla horizontal: nombre display · frasco (render/foto) · descripción · precio ·
`↗`. Hairline arriba y abajo. Una de las filas es la **banda ácida**.
- **hover:** fondo `--bg-2`, `↗` se desplaza, frasco `scale(1.03)`.

### Spec table (hero) — reemplaza/acompaña la pirámide olfativa
Tabla mono de 2 columnas sobre `--bg-2`, `--r-card`. Filas:
`Familia` · `Concentración` · `Duración` · `Salida` · `Corazón` · `Fondo` · `Tamaños`.
Etiqueta `--ink-faint` izquierda, valor `--ink` derecha, hairline entre filas.
Es la versión "ficha técnica" de la pirámide olfativa de `tienda-perfumes`.

### Contador de disponibilidad
Mono, `11 / 1660` con la 2ª parte en `--ink-faint` y `Disponible` en `--acid`
debajo. (En Bagues: "En catálogo de agosto" / "Fuera de catálogo").

### Stepper de cantidad
Píldora `--bg-2`, `−  3  +`, mono. Botones `--ink-dim` → `--ink` en hover.

### Selector de tamaño (ml)
Grupo de píldoras. activo: fondo `--acid`, texto `--bg`. inactivo: borde `--line`.

### Chip de filtro
Píldora mono uppercase. activo: fondo `--acid`, texto `--bg`. inactivo: borde `--line`, texto `--ink-faint`.

### Input (checkout)
`--bg-2`, `--r-pill`, texto `--ink`, placeholder `--ink-faint`. focus: borde `--acid`.

### Wordmark gigante (footer)
"grupo wolf" en **Anton** `--acid`, tamaño `--fs-statement`, sangra fuera del
borde inferior. Con `®` en círculo al lado. Ancla visual del cierre.

---

## Reglas de forma y uso

1. **Una banda ácida grande por vista.** El resto del ácido en dosis chicas.
2. **Magenta: 1–2 apariciones por pantalla** como máximo.
3. Foto siempre rectangular/cuadrada (`--r-none`). Interactivo píldora o cuadrado.
4. Nunca mezclar Bricolage con Anton en un mismo bloque de texto. Anton = 1 uso por página.
5. Mono **solo** para datos y `[etiquetas]`. Nunca para prosa.
6. El 3D es un acento: hero y modal. No hay 3D en grilla ni carrito.
7. Sin gradientes, sin glow, sin glass/blur en la tienda (eso es lenguaje del panel).
8. Contraste AA en todo par. Texto sobre `--acid` y sobre `--magenta` siempre `--bg` (oscuro), nunca blanco.
9. `prefers-reduced-motion`: 3D → foto B/N + bloque; scroll-driven → estado final; parallax/scale hover → off; reveals → visibles.

---

## Ajuste v3 — "soft premium futurista" (ref. Weast Coast Games)

El usuario pidió que la sensación sea más **soft premium**, no un neón duro, tomando
como referencia [weastcoast.games](https://weastcoast.games). De ahí se toman los
**patrones prácticos**, no la paleta (esa web es multicolor/juguetona, la nuestra
sigue oscura + ácido):

- **Esquinas mucho más redondeadas.** `--r-card` sube de 12px a **22px**, `--r-sq`
  a **16px**. Todo lo rectangular de la v2 (spec table, cards, price card, thumbs,
  stage) se redondea.
- **Wordmark del footer en trazo (outline), no relleno.** `grupo wolf®` pasa de
  bloque sólido ácido a **contorno fino** (`-webkit-text-stroke`). Es el cambio que
  más "premium" agrega: menos grito, más diseño.
- **Fondo con leve viñeta radial** arriba (`#26271f` → transparente) en vez de negro
  plano — le da profundidad sin salir del sistema oscuro.
- Patrones de weastcoast que la v2 **ya tenía** y se mantienen: grilla de producto
  con card redondeada + botón cuadrado de "+" de una sola acción, panel de color
  full-bleed por sección destacada, wordmark gigante de cierre, un CTA claro por
  bloque (nada de texto compitiendo).
- El acid sigue siendo el protagonista (según refs de Bagués/Unlock más abajo, es
  coherente con la identidad), pero se dosifica más: bloques, nunca fondo completo.

## Referencias reales de catálogo (Bagués / Unlock)

Se revisaron `bagues.com.ar/pages/fragancias` (línea propia Bagués: nombres
originales — "Brescia", "Rosario" — categorías Femeninos/Masculinos/Árabes, fondo
claro rosado) y `unlock.com.ar/collections/fragancias` (línea "inspirada en":
nombres de fragancias reconocidas **censurados con apóstrofes/asteriscos** —
`BL'CK OP'M`, `G'D G'RL`, `2'2 H'RO'S` — para no infringir marca; fondo oscuro,
foto de producto profesional).

**Conclusión de diseño:** el campo `nombre` de producto ya es texto libre — soporta
cualquiera de los dos estilos de nombre sin cambios. **No se reutilizan fotos ni
assets de esos sitios** (son de otra empresa); el panel usa las fotos que el
usuario suba de su propio catálogo, con el tratamiento B/N + bloque de color que
ya resuelve fotos simples sin sesión profesional.

## UX y ergonomía (auditoría — se aplica en la implementación real, Fase 2)

Reglas concretas, no solo estéticas, pedidas explícitamente por el usuario:

- **Un toque por acción posible.** "Agregar al pedido" desde la grilla del catálogo
  agrega **la presentación por defecto directo al carrito** con el botón `+`
  cuadrado — sin abrir modal. Si el usuario quiere elegir tamaño, toca la card
  (no el botón) y ahí sí se abre el detalle. Nunca doble confirmación para una
  sola intención.
- **Zona de pulgar en mobile.** CTA primario (carrito / hacer pedido) siempre
  alcanzable en el tercio inferior de la pantalla — igual que el panel ya hace
  con el FAB y el BottomNav.
- **Hit targets ≥ 44×44px** (ya reflejado en el preview: botón `+` de card a 46px,
  stepper, chips). Nunca un ícono clickeable menor a eso, aunque visualmente el
  ícono sea chico — el área de toque se agranda con padding, no se ve.
- **Mismo color = mismo significado siempre.** Ácido = disponible/acción positiva;
  magenta = un único acento de énfasis puntual (nunca un segundo "positivo" que
  compita); gris = deshabilitado. Nunca se reusa un color con otro significado
  en otra pantalla.
- **Sin modales anidados.** El carrito, el checkout y el detalle de producto son
  hojas (`sheet`) al mismo nivel, nunca una hoja abre otra hoja encima.
- **Responsive real, no solo reflow.** Mobile-first: la grilla pasa de 1 a 2 a 4
  columnas: el hero pasa de una columna (foto arriba, texto abajo) a dos; el
  tap-target del stepper y los chips no se achican en mobile, se mantiene 44px.
- **Auditoría formal:** al cerrar la implementación de cada página (Fase 2), se
  corre el checklist del sub-skill `design-audit` (motion, contraste, hit targets,
  responsive en 375/768/1024/1440) antes de darla por terminada.

## El problema del catálogo mensual (PDF grande, no re-cargar todo)

El usuario recibe un PDF de catálogo que cambia mes a mes y no quiere tener que
volver a cargar todo desde cero. Solución elegida (sin sobreingeniería):

1. **La mayoría de los meses, los productos NO cambian — solo precio y
   disponibilidad.** Por eso `ProductosScreen` va a tener, además de la edición
   uno-por-uno que ya existe, una **vista de tabla editable**: todas las filas del
   catálogo con precio y el toggle activo editables en línea, sin abrir el sheet
   de cada producto. Eso resuelve el 90% del trabajo mensual en minutos.
2. **Productos nuevos** (cambia el lineup): se siguen cargando con el editor
   completo (foto, notas, presentaciones) — eso sí es carga única por producto,
   no por mes.
3. **Fase futura opcional, si hace falta:** un importador que lea texto pegado del
   PDF (copiar/pegar lo que el usuario ya selecciona del catálogo) y lo matchee
   por nombre contra productos existentes, mostrando una previsualización antes de
   aplicar. Requiere `pdf.js` solo si se quiere leer el PDF directo en vez de
   pegar texto — se evalúa si la tabla editable no alcanza.

## Ajuste v4 — tipografía con carácter + mini investigación de mercado

El usuario marcó (con razón) dos vicios que se venían repitiendo: el **eyebrow**
mono-entre-corchetes arriba de cada sección (`[ frasco ]`, `[ catálogo... ]`) como
muletilla, y una paleta/tipografía "segura" (Bricolage + Anton + Inter) que no
terminaba de ser propia. Se instaló `taste-skill` (design-taste-frontend-v1,
206K instalaciones — el más usado del registro) y se hizo una mini investigación
de referentes reales de **perfumería de nicho** (no de otros rubros como antes):
`dsanddurga.com` (titulares condensados enormes, foto editorial, sin eyebrows,
mucho aire), `snif.co` (botón "quick add" siempre visible en la card, tono cálido
y directo), `boysmells.com` (un acento hecho a mano, no vectorial perfecto).

**Cambios concretos:**

- **Tipografía — display con carácter real, no "AI-safe":**
  - `--f-display`: **Fraunces** (serif variable, óptico "soft") para h1/h2/h3 y
    para el statement (en **itálica**). Le da la calidez "soft premium" que
    Bricolage/Anton no daban — y ningún competidor de Bagués/Unlock la usa.
  - `--f-ui`: Bricolage Grotesque queda relegado a UI chica (logo, precio del
    price card) — deja de ser la voz principal.
  - `--f-body`: **Onest** reemplaza a Inter (Inter está explícitamente
    desaconsejado por `taste-skill` para "premium/creativo").
  - `--f-mono`: JetBrains Mono se mantiene (dato técnico, no cliché).
- **Se eliminan los eyebrows decorativos** (`[ frasco ]`, `[ tu firma
  invisible ]`). El hero ahora tiene un indicador de estado con punto (`● En
  catálogo · agosto 2026`) en vez de corchetes; el statement no lleva ningún
  label arriba, el tipo solo.
- **Acento hecho a mano:** en el statement, la palabra clave va rodeada por un
  trazo SVG **imperfecto** a propósito (no un óvalo geométrico), citando el
  recurso de Boy Smells — usado una sola vez en todo el sitio.
- **Paleta con origen real, no inventada:** el acento secundario deja de ser un
  "magenta" genérico de Lunet y pasa a ser **`--rose: #f0355e`**, tomado del
  rosa real de la marca Bagués (`bagues.com.ar`). El verde ácido se desatura un
  poco (`#c9f24d` → `#b7e04c`) siguiendo la regla de `taste-skill` de no pasarse
  de saturación en el acento.
- **Patrón "quick add" (de Snif):** el botón `+` de la grilla queda siempre
  visible (no solo en hover), documentado ya en la regla de "un toque por
  acción" de la sección de UX.

## Estado

- [x] Tesis v1 "Cromo Líquido" — descartada tras la referencia de Lunet
- [x] Tesis v2 "Ácido" — 30/08/2026, según referencia de Lunet Eyewear
- [x] Ajuste v3 "soft premium" — 30/08/2026, según referencia de Weast Coast Games
- [x] Ajuste v4 — 30/08/2026, tipografía Fraunces/Onest + acento propio (rosa Bagués) + fin de los eyebrows, con mini investigación de mercado (D.S.&Durga, Snif, Boy Smells) y `taste-skill`
- [x] Reglas de UX/ergonomía y plan de catálogo mensual documentados
- [x] Validación final del usuario sobre el preview v4 — aprobada 31/08/2026
- [x] `src/styles/tienda.css` con los tokens
- [x] Implementación real: Hero (con frasco 3D genérico), FeaturedRows, ProductGrid
      + filtros, ProductModal (pirámide + tamaños + stepper), CartContext +
      CartSheet (carrito → checkout en el mismo sheet, sin anidar modales),
      Statement, footer con wordmark — todo probado de punta a punta contra la
      base real (Supabase) con capturas de pantalla
- [x] Vista de tabla editable en `ProductosScreen` (`ProductosTabla.jsx`) para
      la carga rápida mensual de precio/disponibilidad
- [x] Bugs reales encontrados y corregidos durante la implementación:
      `body{overflow:hidden}` heredado del panel rompía el scroll de la
      tienda (bloqueaba los reveals); `ProductModal` se renderizaba fuera de
      `.tienda` y perdía todos los tokens de color; el placeholder sin foto se
      grisaba a sí mismo por error
- [ ] `PromosScreen` en el panel (editar hero/promos) — pendiente, el Hero ya
      tiene buen copy por defecto sin esto
- [ ] Code-splitting fino del bundle de la tienda (three.js pesa ~530kb) —
      aceptable por ahora, ya está separado del bundle del panel
- [ ] Audit (design-audit) formal — se aplicaron las reglas base (reduced-motion,
      focus-visible, hit targets ≥44px, responsive) durante la construcción; falta
      la pasada final exhaustiva
