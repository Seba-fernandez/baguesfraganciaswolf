# Contexto del proyecto

Qué es esto, por qué existe, qué se decidió y en qué estado está. Es el
documento que hay que leer primero: los otros explican *cómo* está hecho, éste
explica *por qué*.

| | |
| --- | --- |
| Sistema visual y kit de marca | [`DISENO.md`](DISENO.md) |
| Cómo está armado por dentro | [`ARQUITECTURA.md`](ARQUITECTURA.md) |
| Qué tocar para cambiar qué | [`EDITAR.md`](EDITAR.md) |
| El esqueleto para reusar en otro proyecto | [`KIT.md`](KIT.md) |

---

## La idea

Sebastián vende perfumes en Córdoba. Revende fragancias de la casa **Bagués**,
que son versiones inspiradas de perfumes de diseñador: el mismo aroma que la
clienta ya conoce, sin el sobreprecio de la vidriera.

El circuito anterior vivía repartido entre Instagram, un catálogo en PDF por
Drive y conversaciones de WhatsApp. Cada mes la proveedora publica dos listas
nuevas —más de cien aromas, precios que se mueven, promociones que duran un
ciclo— y eso significaba mandar un PDF por chat, contestar precio por precio y
anotar los pedidos a mano.

## El objetivo

**Sacar trabajo, no agregarlo.** Ese fue el criterio con el que se decidió todo,
y de ahí salen tres reglas que se aplicaron sin excepción:

1. Si una función obliga a entrar todos los días a mantenerla, no va.
2. Si se rompe, tiene que poder seguir vendiéndose igual.
3. Cargar el ciclo nuevo tiene que llevar menos de media hora, o el proyecto se
   abandona solo en el mes tres.

De la regla 3 sale la decisión que gobierna el resto: **lo que cambia todos los
meses no vive en el código.** Precios, códigos de proveedora, promociones y qué
aroma está activo salen de la base y se editan desde el panel. Los textos fijos
viven en un solo archivo de configuración. Ningún componente tiene texto propio
escrito adentro.

**No hay pasarela de pago y no la va a haber.** El cierre es hablando por
WhatsApp, porque ahí se pide la seña y se acuerda la entrega. La web arma el
pedido, no lo cobra.

## La tensión de diseño

El producto es aspiracional y el precio es la ventaja. Si la web se ve barata,
nadie cree en el perfume; si se ve inalcanzable, el precio deja de ser noticia.
Todo el sistema visual está construido alrededor de resolver esa tensión: una
escena editorial de dunas al atardecer, cristal de verdad, tipografía de aviso
de perfume — y arriba de todo, precios en números grandes.

Lo que **nunca** se hace: decir o insinuar que son originales. El aviso legal es
parte del diseño, no letra chica escondida.

---

## Qué hay construido

### Dos zonas, una base

| Zona | Dónde | Quién entra |
| --- | --- | --- |
| **Tienda** | `/` y `/catalogo` | Cualquiera. Sin cuenta, sin registro |
| **Panel** | `/panel` | Una sola cuenta de Google, la del dueño |

La tienda abre con la escena de dunas, el frasco parado sobre la arena con su
sombra de contacto, la promoción del ciclo en barras de cristal, la cinta de
nombres reconocibles, una selección curada, quiénes somos y los tres pasos de
cómo funciona. El catálogo completo está en su propia página, con buscador,
filtros y paginado.

Cada aroma abre una ficha con la pirámide olfativa y los tamaños de las dos
líneas, cada uno con su código de proveedora. El pedido se arma en un cajón
lateral, calcula el 2x1 y termina en un mensaje de WhatsApp listo para enviar.

El panel es privado: pedidos por estado, catálogo con edición rápida de precio y
disponibilidad, clientes y ajustes.

### El stack

React 18 + Vite 5 + React Router 7. CSS Modules y variables CSS, sin Tailwind ni
biblioteca de componentes. PostgreSQL en Supabase con políticas de fila en todas
las tablas. Movimiento en CSS nativo, sin librería. Gráficos SVG generados por
scripts propios y rasterizados a WebP en el build: ni una foto de banco, ni 3D.
La portada se pre-genera como HTML al publicar. Vercel, desde la rama principal.

La tienda pública **no usa `@supabase/supabase-js`**: lee con `fetch` contra
PostgREST. El cliente completo vive solo en el panel. El porqué está en la
sección de rendimiento.

---

## Las decisiones que vale la pena recordar

### El catálogo se ordena por aroma, no por código de proveedora

La proveedora publica dos listas y muchos perfumes aparecen en las dos con
nombres distintos: el mismo aroma se llama Arizona en una y Sauvage en la otra.
Son más de treinta casos. La unidad del catálogo pasó a ser **el aroma**: una
ficha por perfume, y los tamaños de las dos listas quedan adentro como opciones.

### El código de proveedora sobrevive hasta el final

Cada tamaño tiene un código con el que se carga la orden en el sistema de la
proveedora. Un pedido sin ese código es papel mojado. Viaja desde la ficha,
entra al pedido, queda guardado en la base y sale escrito en el WhatsApp.

### La seguridad está del lado del servidor

La tienda no escribe en las tablas. Tiene una sola puerta: la función
`crear_pedido_web()` en la base, que valida, normaliza el teléfono y **busca los
precios del lado del servidor**. Si alguien edita un precio desde las
herramientas del navegador, la función usa igual el precio real.

### Se borró el aviso automático de pedidos

Estaba duplicado (el mensaje de la clienta ya llega con el hilo abierto) y
estaba mal hecho (se disparaba antes de que se escribieran los renglones, así
que podía llegar vacío y en cero). En su lugar no se puso nada nuevo que
mantener: el panel ya escucha la tabla por Realtime.

### Se borró el frasco en 3D

Three.js bloqueaba la pantalla varios segundos y pesaba ~530 kB. Se fue, y con
él la dependencia. **Borrar también es avanzar.**

### El rendimiento es una decisión de diseño

El efecto de cristal no es un panel translúcido: el canto refracta el fondo con
un mapa de desplazamiento calculado para el tamaño exacto de cada elemento. Pero
es caro. Medido con un scroll instrumentado, ponerlo también en las placas
grandes y en las doce tarjetas tiraba el scroll a 15-25 cuadros por segundo.
Quedó solo en los controles y en una sola pasada.

Ese criterio se aplicó primero a la lente y después, en septiembre de 2026, al
resto del proyecto: la sección de rendimiento del final es todo el trabajo de
llevar PageSpeed de 70 a 96, y está escrita con las mediciones al lado —
incluidas las tres cosas que se probaron y midieron **peor**.

---

## Errores encontrados, y cómo se encontraron

La parte que más enseñó. Ninguno de estos saltaba mirando la pantalla.

- **Datos que se iban a borrar.** El editor del panel guardaba cada tamaño con
  tres campos; en la base tiene seis. La primera vez que se tocara un precio
  —justo lo que cambia todos los meses— se perdían el código, la línea y el
  grupo de promoción. Se arregló conservando los datos originales al guardar.
- **Productos que desaparecían y no volvían.** La aparición gradual se
  enganchaba una sola vez al cargar. Al cambiar un filtro se crean tarjetas
  nuevas que ese enganche ya no ve, y quedaban en `opacity: 0` para siempre. Se
  resolvió con un `MutationObserver` que vigila el contenido nuevo.
- **Un botón ilegible por especificidad.** `.tienda a` (0,1,1) le gana a `.tbtn`
  (0,1,0): los botones que son enlaces quedaban con texto claro sobre el acento,
  2:1 de contraste. Se encontró **midiendo**, no mirando.
- **El vidrio pisando al componente.** La misma clase de error: la regla que
  posiciona el vidrio le ganaba a la del componente y "volver arriba" apareció
  pegado al borde izquierdo. Se bajó la prioridad de la regla genérica con
  `:where()`.
- **El texto tenue por debajo del mínimo.** Contra el fondo plano daba 5,1:1;
  componiendo las capas del fondo con textura daba 3,9:1. Lo mismo con el
  cristal transparente sobre la arena del hero: 2,5:1, resuelto ahumándolo hasta
  ~4,8:1. **Medir donde falla, no donde es cómodo.**
- **El panel daba error y no era el programa.** Faltaba la reescritura de
  `vercel.json`: el servidor buscaba un archivo físico en `/panel`. Cuatro
  líneas.
- **Un dato de prueba en producción.** Un producto llamado literalmente "456",
  visible para cualquiera. Se limpió el dato y quedó una defensa: un producto
  con nombre puramente numérico no se muestra aunque exista.

---

## Estado al 24 de septiembre de 2026

**Andando en producción:** catálogo del ciclo con más de cien aromas en página
propia, buscador y filtros, ficha por aroma, pedido con la cuenta del 2x1 y el
aviso de "te falta uno", mensaje de WhatsApp con el código de cada renglón,
panel privado completo, vista previa con imagen propia al pegar el enlace.

**Publicado el 22 de septiembre:** el rediseño completo del sistema visual
—paleta Ámbar Noir, hero editorial sobre la escena de dunas, el material de
vidrio con lente real, los fondos generados por script— más `DISENO.md`,
`ARQUITECTURA.md`, `KIT.md` y este documento.

**Publicado el 24 de septiembre:** el trabajo de rendimiento (ver la sección
siguiente) y el arreglo del carrusel de destacados, que en el celular se comía
el gesto de bajar: tenía `overflow-x: auto` sin declarar el eje vertical, y por
la regla del spec —si un eje deja de ser `visible`, el otro pasa a `auto`— la
pista quedaba scrolleable también en vertical y atrapaba el dedo.

**Pendiente de producto:** 26 aromas sin foto (no están publicados en las webs
de las proveedoras; hacen falta los PDF). Llevar el vidrio a la ficha y al cajón
del pedido, que todavía son paneles opacos.

---

## Rendimiento: la deuda que se pagó

Al 22 de septiembre de 2026 la portada pedía **≈600 kB comprimidos** antes de
mostrar el primer perfume, contra el presupuesto de 150 kB que declara el
README. PageSpeed en celular daba **70**.

Al 24 de septiembre está en **96** (mediana de seis corridas sobre el sitio
publicado; ninguna bajó de 95), con el resto de las categorías en 100 —salvo la
de agentes, que da 98—. Esto es lo que se hizo, en orden de lo que devolvió.

Conviene medir siempre así: una sola corrida de Lighthouse varía cuatro o cinco
puntos, y es facilísimo festejar una mejora que era ruido.

| | antes | después |
| --- | --- | --- |
| Rendimiento (celular) | 70 | **96** |
| FCP | 3,6 s | **1,7 s** |
| LCP | 5,2 s | **2,7 s** |
| Speed Index | 5,1 s | **1,8 s** |
| TBT / CLS | 0 / 0 | 0 / 0 |
| Bytes que frenan el primer dibujado | ≈600 kB | **≈116 kB** |
| Primera tanda de red completa | ≈600 kB | ≈217 kB |
| SEO | 92 | **100** |
| Navegación con agentes | 50 | **98** |

### 1. La base de datos salió del bundle público

`main.jsx` montaba el contexto de sesión siempre, y ese arrastra
`@supabase/supabase-js` entero: auth, realtime y storage. Una visitante anónima
lo descargaba antes de ver el primer perfume.

La tienda lee dos tablas y llama una función. Eso ahora es `fetch` pelado contra
PostgREST ([`src/lib/apiTienda.js`](../src/lib/apiTienda.js)). El panel entero
—contextos, sesión, `global.css` y su `@import` a Google Fonts— se mudó a
[`PanelApp.jsx`](../src/components/panel/PanelApp.jsx), un chunk que la tienda
nunca pide. **El bundle inicial pasó de 159,5 a 76,5 kB comprimidos.**

De paso desapareció una cascada de tres viajes de red: la portada encadenaba
`index.js` → `TiendaShell` → `HomeScreen`, cada `lazy` una espera en serie.

### 2. La portada se genera en el build

Era una SPA: el hero no existía hasta que el navegador bajaba, parseaba y
ejecutaba el JavaScript. Ahora se dibuja una vez durante el build
([`scripts/prerender.mjs`](../scripts/prerender.mjs)) y llega escrita en el HTML
con el CSS embebido, así que se pinta apenas llega. React hidrata encima, y esa
hidratación **espera al evento `load`**: dispara los pedidos a la base, que
competían por el ancho de banda justo con la imagen del LCP.

### 3. Se fue GSAP

49 kB comprimidos para una línea de tiempo de entrada y un parallax. La
coreografía es la misma, ahora en `@keyframes` con `animation-delay`; el
parallax es una scroll-driven animation nativa. Al ser declarativa, además,
corre sin esperar al JavaScript.

### 4. El grano dejó de costar 900 ms

Las dos capas de `feTurbulence` en `mix-blend-mode: overlay` a pantalla completa
eran lo más caro del arranque: el blend obliga a componer la capa aparte y a
rasterizar el filtro **antes** de poder dibujar lo que tiene debajo. El de la
escena va horneado en el WebP (+1,5 kB de archivo, cero milisegundos); el de la
página quedó solo en escritorio.

La fuerza importa: a 0,42 el archivo se iba de 20 a 134 kB, porque el ruido
destruye la compresión. A 0,18 cuesta 1,5 kB. Esa es la curva.

### 5. La animación del hero retrasaba su propia métrica

La escena entraba con un fade desde `opacity: 0`. Mientras esté en cero, el
navegador considera que no se dibujó nada grande: eran **704 ms** de "element
render delay" sobre un archivo que tardaba 82 ms en bajar. Ahora solo escala.

### 6. Las fuentes competían con el LCP

Con la portada pre-generada, el texto existe desde el primer milisegundo, así
que las siete caras salían juntas —125 kB a prioridad máxima— contra la imagen
del hero. Quedaron tres críticas (45 kB) y el resto en una hoja que se agrega
recién en `load`. Cormorant 400 se fue del camino crítico poniendo la marca y la
corona en 600, que es el peso que esta didone pide igual.

### 7. Imágenes

Los SVG del fondo se rasterizan a WebP: la escena de 210 a 43 kB, la del celular
de 131 a 22 kB. Los surcos siguen en SVG —en WebP **suben** a 323 kB, porque el
alfa no comprime líneas finas— y se piden solo en escritorio, que es donde corre
la lente que les da sentido.

Las fotos de producto tienen dos anchos más chicos: se servían a 800 px para
mostrarse a 190. Son 2,4 MB menos por página de catálogo.

En producción el LCP en pantalla chica resultó ser **el frasco**, no la escena:
pasó de 47 a 34 kB.

### 8. Lo que está fuera de pantalla no se dibuja

El HTML pre-generado trae la página entera, y el navegador calculaba estilo y
posición de todo antes del primer dibujado: 594 ms. Con `content-visibility:
auto` en las secciones de abajo son 361.

### Lo que se probó y midió PEOR

Queda anotado para no repetirlo. Está también en los comentarios del código:

- **Partir el CSS en crítico + diferido, con el resto en su propio archivo:**
  mediana 93 contra 96. El trabajo de estilo que venía a evitar ya lo evita
  `content-visibility`, así que solo quedaba el viaje de red extra.
- **Lo mismo con las dos mitades embebidas**, la segunda en un `<style
  media="print">` que se activa con un `rAF`: FCP de 1957 a 2107 ms.
- **La escena del hero como `<img>`** en vez de `background-image`, buscando que
  el navegador la priorice mejor: LCP de 2411 a 2557 ms.

### Lo que queda

- **El filo especular del vidrio cuesta entre uno y dos puntos.** Está medido:
  desactivando el `::before` con el `conic-gradient` enmascarado, la portada
  pasa de 96 a 97 y el FCP baja ~150 ms, porque `mask-composite` obliga a una
  pasada de rasterizado aparte por cada superficie. Son solo cuatro elementos en
  la primera pantalla. **No se tocó**: es la firma del material y lo que hace
  que el vidrio se lea como vidrio (ver [`DISENO.md`](DISENO.md)). Cambiarlo por
  sombras `inset` direccionales sería más barato y se vería distinto — es una
  decisión de diseño, no de rendimiento, y por eso queda anotada acá en vez de
  aplicada.
- El bundle inicial son 76,5 kB comprimidos y casi todo es React + React Router.
  Bajarlo de ahí implica cambiar de biblioteca, que no se hizo: el panel maneja
  pedidos y plata, y una incompatibilidad sutil ahí es peor que dos puntos.
- `/catalogo` no se pre-genera: su contenido sale de la base, así que el HTML
  pre-generado sería la cáscara vacía.
