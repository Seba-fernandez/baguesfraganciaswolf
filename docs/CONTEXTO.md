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
las tablas. GSAP para la entrada y el parallax del inicio. Gráficos SVG
generados por scripts propios: ni una foto de banco, ni 3D. Publicación en
Vercel desde la rama principal.

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

Ese criterio se aplicó a la lente. **Al resto del proyecto todavía no** — ver
la sección de deuda, al final.

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

## Estado al 22 de septiembre de 2026

**Andando en producción:** catálogo del ciclo con más de cien aromas en página
propia, buscador y filtros, ficha por aroma, pedido con la cuenta del 2x1 y el
aviso de "te falta uno", mensaje de WhatsApp con el código de cada renglón,
panel privado completo, vista previa con imagen propia al pegar el enlace.

**Sin commitear** (rediseño completo del sistema visual): paleta Ámbar Noir,
hero editorial sobre la escena de dunas, el material de vidrio con lente real,
los fondos generados por script, y los documentos `DISENO.md`, `ARQUITECTURA.md`
y este. El diseño está terminado y se ve como se quería.

**Pendiente de producto:** 26 aromas sin foto (no están publicados en las webs
de las proveedoras; hacen falta los PDF). Llevar el vidrio a la ficha y al cajón
del pedido, que todavía son paneles opacos.

---

## La deuda: rendimiento

El diseño está donde tiene que estar. **El rendimiento no.** Esto está medido,
no estimado: los números salen de `npm run build` y de `gzip`/`stat` sobre los
archivos reales, el 22 de septiembre de 2026.

### Lo que pesa hoy la portada

En bytes comprimidos, que es lo que viaja:

| Recurso | Comprimido | Qué es |
| --- | --- | --- |
| `index-*.js` | **159,5 kB** | React + Router + **supabase-js** + contextos |
| `HomeScreen-*.js` | **49,3 kB** | **GSAP + ScrollTrigger** |
| `TiendaShell-*.js` + su CSS | 13,0 kB | La cáscara de la tienda |
| CSS de la portada | 7,0 kB | `index.css` + `HomeScreen.css` |
| Resto de chunks | ~8 kB | thumb, carrito, hooks, formato |
| **JavaScript y CSS** | **≈ 237 kB** | |
| `duna.svg` | **71,7 kB** | La escena del hero (210 kB en disco) |
| `surcos.svg` | **43,1 kB** | La textura de la página (125 kB en disco) |
| `frasco.webp` | **160,3 kB** | Ya comprimido, no baja más |
| Fuentes (4-5 de 7) | ~92 kB | Cormorant + Figtree, woff2 |
| **Total antes del primer perfume** | **≈ 600 kB** | |

El README declara un presupuesto de **150 kB hasta que se ve el primer
perfume**. Está **cuatro veces por encima**. Y Vite ya avisa: el chunk principal
mide 526 kB sin comprimir, arriba de su límite de 500 kB.

En `/catalogo` se suman hasta 12 fotos de ~110 kB cada una: **1,3 MB más**.

### Las causas, en orden de lo que más devuelve

1. **`supabase-js` entra en el chunk inicial.** `main.jsx` monta `AuthProvider`
   siempre, y ese importa `lib/supabase`. Una visitante anónima que entra a
   mirar perfumes se descarga el cliente completo de auth, realtime, storage y
   postgrest antes de que se dibuje nada. La tienda solo necesita **leer** dos
   tablas. Es el único item que puede sacar 40-50 kB de un saque.
2. **GSAP + ScrollTrigger importados estáticamente en el hero.** 49,3 kB
   comprimidos para una línea de tiempo de entrada y un parallax. Los dos se
   pueden hacer en CSS nativo; como mínimo el import tiene que ser dinámico
   adentro del efecto, para que no bloquee el chunk de la portada.
3. **La página no existe hasta que corre el JavaScript.** Es una SPA sin
   prerender: el hero no está en el HTML, se dibuja recién cuando bajaron y
   parsearon `index.js` + `TiendaShell` + `HomeScreen`. El README ya lo tiene
   anotado como pendiente y es lo que más cambia la sensación de velocidad.
4. **Las fuentes se descubren tarde.** Los `@font-face` están en `tienda.css`,
   que es el CSS del chunk de `TiendaShell`: recién se piden en la tercera tanda
   de red. `index.html` no precarga ninguna. Dos `<link rel="preload">` para
   Cormorant 600 y Figtree 400 adelantan el texto varios cientos de ms.
5. **Los SVG del fondo son enormes.** `duna.svg` son 210 kB de miles de nodos
   que el navegador tiene que parsear y rasterizar en el hilo principal, justo
   en el elemento más grande de la primera pantalla. `surcos.svg` son otros
   125 kB pintados a `100% max(100%, 3200px)` sobre una capa del alto de todo el
   documento: es una textura gigante en memoria, y encima es la capa que leen
   todos los `backdrop-filter`. Una escena de degradados sin fotos comprime muy
   bien en WebP; los surcos deberían ser un mosaico chico que se repite, no un
   dibujo único del alto de la página.
6. **Dos capas de grano a pantalla completa con `mix-blend-mode: overlay`**
   (`.tfondo::after` y `.escena::after`). El blend fuerza una capa de
   composición propia y complica el cacheo del fondo; combinado con los
   `backdrop-filter` de arriba, cada cuadro del scroll vuelve a leer el fondo.
   El grano puede ir horneado en la imagen.
7. **El mapa de la lente se calcula en el hilo principal.** `dibujarMapa()`
   recorre píxel por píxel hasta 90.000 píxeles por cada tamaño distinto y
   después llama a `toDataURL('image/png')`, que es un encode PNG **síncrono**.
   Con una decena de tamaños distintos son cientos de miles de iteraciones más
   una decena de encodes, todo durante el arranque. `toBlob` +
   `URL.createObjectURL` ya lo vuelve asíncrono; un worker con `OffscreenCanvas`
   lo saca del hilo principal.
8. **Las fotos van en una sola resolución.** 112 archivos, 6,0 MB, hasta 128 kB
   cada una, servidas igual a una tarjeta de 220 px en un celular. `sharp` ya es
   una dependencia del proyecto: generar dos o tres anchos y usar `srcset` corta
   la mitad de los bytes del catálogo.
9. **Dos `MutationObserver` con `subtree: true` sobre toda la tienda**
   ([`useReveal.js`](../src/hooks/useReveal.js) y
   [`vidrioLiquido.js`](../src/lib/vidrioLiquido.js)), y cada uno vuelve a
   correr un `querySelectorAll` sobre el subárbol completo en cada mutación.
10. **Restos.** `vite-plugin-pwa` está instalado y no está cableado en
    `vite.config.js`. `motion` (^12.43.0) se usa en un solo archivo del panel.
    No hay `manualChunks`. `.cintaPista` tiene `will-change: transform` con una
    animación infinita de 42 s que nunca deja descansar al compositor.

### Un detalle chico pero visible

`index.html` todavía declara `theme-color="#0f1512"` y pinta la barra de scroll
con ese mismo color: es el verde de la paleta **anterior**. La base actual es
`#17110d`. Se ve en la barra del navegador en el celular.

### El criterio para atacarlo

El mismo que se usó con la lente, aplicado al resto del proyecto: **medir, poner
un presupuesto, y que lo que no entre no entre.** El objetivo declarado son
150 kB hasta el primer perfume. Los puntos 1, 2 y 4 juntos son la mitad del
camino y no tocan una sola decisión de diseño.
