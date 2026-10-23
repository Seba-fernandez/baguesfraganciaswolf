# Plan: portada D ("Cada perfume, una ciudad")

*22/10/2026. Rama `rediseno-visual`. A `main` solo con OK de Sebas.*

Reemplaza en lo visual al borrador de la portada C (PR #1). Se basa en lo que
Sebas aprobó en la página de prueba: ADN de sus 3 referencias, letra, título,
guion de color en dos luces y fotos de producto en la pared vino. De la C se
quedan la imagen del hero, las herramientas (`scripts/rediseno/`,
`scripts/qa/atencion/`) y todo lo funcional.

## Decisiones de Sebas (22/10, después del plan)

- **Hero en escritorio:** el texto sigue a la izquierda con la imagen como
  está (no se re-hornea). En el celular, todo centrado.
- **"Lo que pagás / Lo que no pagás": se saca.** Las ciudades muestran solo
  el precio.
- **Fotos de la pared vino en el catálogo:** sí, después de mirar las dos
  hojas de contacto (se le mandaron el 22/10).

## Cambios sobre la marcha (con el porqué)

- **Las cifras van en Boska, no en Melodrama.** El cero de Melodrama viene
  cruzado en todas sus formas (lining y oldstyle): "$ 60.000" se leía como
  "$ 6Ø.ØØØ". Melodrama queda para palabras: título, ciudades, marca, familias.
  El "Desde $ X" del hero va en la itálica de Boska, que ya viaja en la
  primera carga.
- **Destacados sin el vidrio encima de las tarjetas.** Era lo que Sebas
  sintió "pegado"; el vidrio vive solo en el hero.
- **Cómo funciona sin los tres pasos numerados:** el chat ya los cuenta.
- **La cinta de nombres queda** como bisagra vino hondo entre el hero y el
  papel (es un link a cada ficha; la pidió la evaluación de captación).
- **La barra de arriba** es vino hondo sólida fuera del hero (en la portada,
  transparente con velo mientras flota sobre la escena).
- **La noche de toda la tienda** (ficha, cajón, hoja de tamaños) pasa del
  espresso al vino hondo. El acento de noche sigue siendo el rosa-vino de
  siempre: el rubí sobre vino hondo no llega a 3:1.
- **Clase `.dia`** (tienda.css): una sección de papel redefine tinta, acento y
  líneas para lo que tenga adentro, y apaga el vidrio (superficies sólidas).

## Segunda vuelta (23/10, lo que pidió Sebas al ver la vista previa)

- **Barra fija** al bajar, sin rectángulo: su fondo se funde 28 px hacia abajo y
  toma papel o vino según la sección (nunca había quedado fija: una regla
  general le ganaba al sticky).
- **Ficha de escritorio:** la foto llena toda la columna izquierda (alto × 3/4),
  sin aire alrededor; el texto se desplaza en su columna.
- **Regla de formas** para toda la tienda: lo que se toca es redondo, lo que se
  mira es recto. Tarjetas, barra de filtros, cajón, hoja de tamaños y filas de
  tamaño pasan a rectas. Botón principal plano (crema de noche, rubí de día).
- **Familias:** sombra casi imperceptible en los arcos. Se probó el ingrediente
  en la etiqueta del frasco: solo el floral contrastaba; queda el color liso
  (Sebas: "si no hace buen contraste, dejalo").
- **Destacados:** sombra más marcada, bordes rectos, fila hasta el borde
  derecho (entran cinco y asoma la sexta).
- **Las ciudades tienen un para qué:** enseñar el código de la caja ("Ginebra es
  Baccarat Rouge 540"), con las más conocidas (`CIUDADES_ELEGIDAS`).
- **Antes de pedir:** frases enteras y letra más grande (clientela grande). Sin
  flechas: no es una secuencia.
- **Testimonios** diseñado y oculto, entre destacados y cómo funciona.
- **Las 133 fotos en la pared vino** en toda la tienda.
- **Hero nítido:** AVIF, 1170 × 2532 en iPhone, 2880 desde 1601 px.
- **Safari:** botón del hero y foto de la ficha corregidos; prueba fija en tres
  navegadores (`scripts/qa/motores.py`).
- **Seguridad:** revisión completa en `docs/SEGURIDAD.md`; CSP y HSTS sumados.

## Tercera vuelta (23/10)

- **Rendimiento sin bajar calidad.** Una previa del hero de 2,8 kB
  (`hero_c_previa_195x422.webp`, `scripts/rediseno/previa_hero.py`) va dentro
  del CSS y se pinta al instante debajo de la escena nítida. Pesa más de 0,05
  bits por píxel, así Chrome la cuenta para el LCP: en red lenta, de 1,3 a
  0,68 s, con la misma imagen final. Más esfuerzo de AVIF ahorraba 3 % y bajar
  calidad perdía nitidez: descartado. Las fotos de ciudades y familias esperan
  al evento load (`useTrasCarga`).
- **Movimiento.** Lenis 1.3.26 (5,7 kB) suaviza la ruedita del mouse: solo
  escritorio con mouse, desde 900 px, después del load y sin "reducir
  movimiento"; se frena con un diálogo abierto (`lib/scrollSuave.js`). El
  hero tiene un parallax leve atado al scroll, en CSS nativo. GSAP no hizo
  falta.
- **Saltos a una sección** (`#como`) bien medidos: `irASeccion` dibuja las
  secciones con `content-visibility`, mide y corrige al llegar. 82 px debajo
  de la barra en Safari, Chrome y Firefox.
- **Favicon:** la B de Melodrama en crema sobre vino, como trazo en el SVG,
  más PNG de 32 y apple-touch-icon. **og.jpg:** el hero a 1200 × 630 con sello,
  título y bajada, sin botones ni precio (`scripts/rediseno/og.py`).
- **Nombre y WhatsApp con reglas** en la tienda, el panel y la base
  (`lib/datosCliente.js`, migración 0012; detalle en `docs/SEGURIDAD.md`).
- **Video antes y después** para LinkedIn: `scripts/video/` (README ahí).

## Cuarta vuelta (23/10, la crítica de UX y lo que decidió Sebas)

- **Sin datos que no le sirven a la clienta:** la ficha ya no muestra el
  código de la proveedora ni manda a unlock.com.ar o bagues.com.ar (era
  invitarla a comprar directo); el chat de ejemplo va sin códigos; el aviso
  corto del catálogo baja al final. El código sigue llegando en el WhatsApp.
- **Ficha como carta:** sube en 0,28 s con el fondo opaco (no negro), y nunca
  se abre vacía: arranca con la foto chica de la tarjeta y la grande se pide
  al tocar. Tamaño y precio arriba; Familia, Salida, Corazón y Fondo en
  líneas con rótulo en negrita, al estilo del elenco de Netflix.
- **Familias:** abren una hoja encima de la portada (`/?familia=`), con las
  tarjetas del catálogo. Tocar afuera o "atrás" la cierra y se queda en la
  sección. En el celular, puntitos de posición debajo de la fila.
- **Destacados:** sin "desde", flecha izquierda oculta al inicio y un + de
  vidrio líquido sobre la foto.
- **Tarjetas** con el mismo dato en todos lados: la familia olfativa.
- **Hero:** sin sello ni segundo "Cómo funciona"; el precio en la zona
  oscura; el vidrio rehorneado con más refracción y menos desenfoque, sin
  costura en escritorio y con el arco más grande en el celular.
- **Las ciudades:** el perfume pegado a su ciudad, el precio abajo y una
  flecha. **Arena** muy fina en todas las secciones de papel.
- **Antes de pedir:** una columna en el celular y "Pedí hasta el martes y te
  lo entrego desde el viernes".
- **Fotos:** las 133 recompuestas sin el rectángulo de sombra detrás.
- **"¿Son truchos?":** armada y oculta hasta que Sebas apruebe el texto.
- **Rendimiento:** un oyente de scroll y un IntersectionObserver para toda la
  tienda.

## Quinta vuelta (23/10, lo que vio Sebas en el video)

- **El pantallazo del catálogo:** al tocar "Catálogo", la portada se iba
  antes de que llegara el catálogo; la página medía lo que mide el pie y se
  veía el aviso legal un instante (segundos con red lenta). Ahora el chunk se
  pide en un rato libre después de cargar y apenas el dedo apoya en un link
  al catálogo (`components/tienda/precargaCatalogo.js`); la página nueva
  arranca arriba antes de pintar (`TiendaLayout`), y si aun así tarda se ve
  una página de papel del alto de la pantalla, no el pie. Probado con red
  rápida y con red lenta (400 ms, 50 kB/s): el pie no aparece nunca.
- **Entrada del catálogo:** las tarjetas suben de a una, 40 ms entre cada
  una, solo con opacidad y transform; las 12 de "Ver 12 más" arrancan su
  propia cuenta. La foto aparece suave cuando termina de bajar, sobre el vino
  de la pared. Con movimiento reducido, nada se mueve.
- **La banda que se abre:** "Los más pedidos" entra angosta, con un margen de
  papel y esquinas redondas, se abre hasta el borde al llegar al centro y se
  vuelve a cerrar al irse. Atado al scroll con CSS (`animation-timeline:
  view()`), sin JavaScript, sin enganche ni snap; se anima solo el fondo, el
  contenido queda quieto. Donde no existe (Firefox hoy) queda abierta, como
  antes.
- **Títulos:** "Los más pedidos" (antes "Los que siempre salen") y "¿Con cuál
  te identificás?" con "Elegí la familia que te gusta oler, para vos o para
  regalar."
- **Vidrio de iOS en los controles** (del video de Liquid Glass que mandó
  Sebas): flechas, volver arriba, carrito, paginador y el + de los
  destacados. Cuerpo claro y esmerilado, filo de luz, banda más oscura por
  dentro del borde y sombra suave abajo, que lo despegan del papel. El ícono
  cambia de color con la luz de abajo (crema sobre vino, tinta sobre papel;
  el volver arriba la mide en cada cuadro). Al tocar crece con rebote, se
  llena de blanco y el ícono se desenfoca. De paso: el volver arriba tenía
  el borde negro de botón del navegador, tapado por el vidrio casi
  transparente.

## Sexta vuelta (23/10, segundo video de Sebas y sus imágenes de la cortina)

- **La banda de "Los más pedidos" se estira de alto**, no de ancho: a todo
  el ancho siempre. Cuando la sección llega a la pantalla, su fondo entero
  (el mismo degradé, una sola pieza) se estira un 18 % más allá de sus
  bordes y tapa las franjas de papel de arriba y abajo; al irse vuelve. Una
  primera prueba con dos paños sueltos dejaba ver el corte (Sebas). El
  contenido no se mueve. Se anima solo `transform` atado al scroll: lo
  mueve el compositor y no tironea. La versión de ancho, con `clip-path`, se
  repintaba en cada cuadro: ese era el lag.
- **La barra cambia de luz en 0,45 s** (fondo y letras), no de golpe.
- **"¿Con cuál te identificás?" sin parón al bajar:** el frasco de cada
  ventana tenía un `filter: drop-shadow` que se rasterizaba justo al entrar
  la fila con su animación. Ahora la sombra es una elipse pintada.
- **El hero tiene parallax** (desde la primera vuelta del D): al bajar, la
  escena se queda un poco atrás. Se deja.
- **El inicio aparece entero y con su letra:** el título, la bajada y el
  botón esperan a las dos fuentes del título (como mucho 0,9 s) y entran
  juntos; antes se veía la letra de respaldo y después cambiaba. Las dos
  fuentes van precargadas para que la espera no cueste LCP (medido
  intercalado en local: igual que antes). El precio aparece suave al llegar.
- **"Desde $ X · Envíos a todo el país"**: sin la cantidad de aromas.
- **"Lo retirás o te lo envío"** en Antes de pedir (era "te lo llevo"; no
  había otro lugar con esa idea, tampoco en la base).
- **La marca de la barra sube al principio** estando en la portada.
- **Flechas de "Los más pedidos" en el celular:** la derecha siempre, la
  izquierda apenas se corre la fila; de a una tarjeta.

## Guion de la portada

| # | Sección | Luz | Qué cambia |
| --- | --- | --- | --- |
| 1 | Hero | noche | Título "Cada perfume, *una ciudad.*", precio y botón "Ver el catálogo" entre dos trazos de plumilla. Centrado en el celular, a la izquierda en escritorio |
| 2 | Las ciudades | día (papel) | Sección nueva: 4 cajas Bagués con el nombre de la ciudad en grande, el perfume y el precio en mono (`ciudadesDe` en `lib/producto.js`: no repite destacados y alterna ella, él, unisex). Reemplaza a "Nosotros" |
| 3 | ¿Qué te gusta oler? | día con 5 ventanas vino | Mismas 5 familias y mismos links al catálogo filtrado |
| 4 | Los que siempre salen | clímax: banda vino | Fotos de producto sobre la pared vino |
| 5 | Cómo funciona | papel | Solo el chat de WhatsApp |
| 6 | Antes de pedir | papel hondo | 4 cifras grandes con rótulo en mono |
| 7 | Pie | noche | Marca, contacto y aviso legal |

"Lo que me escriben" sigue oculta hasta que lleguen las capturas.

## Letra

Melodrama 600 (lo grande), Boska 400, 400 itálica y 500 (nombres y la itálica
del título), IBM Plex Mono 500 (datos), La Belle Aurore (rótulos de a uno).
Figtree queda para el texto corrido. Se sirven desde `public/fonts/`, recortadas
a latín, con `font-display: swap`. En la primera pantalla solo cuatro caras
(Melodrama, la itálica de Boska y Figtree 400 y 600, 50 kB); el resto llega
en `public/fuentes-diferidas.css`. Cormorant sale de la tienda.

## Etapas (un commit por etapa, push a la rama)

Hechas el 22/10: 1 (`d527a56`), 2 (`0110aa9`), 3 (`ebbe29c`), 4 y 5
(`5d50d3a`), 6 sin las fotos (`86dcc75`). Pendiente: las fotos de la pared
en el catálogo (espera el OK de las hojas) y la etapa 7.


1. Tokens y letras: paleta papel, vino, vino hondo, rubí; fuentes nuevas.
2. Hero centrado con el adorno.
3. Las ciudades (reemplaza a `Nosotros`).
4. Familias, destacados en banda vino.
5. Cómo funciona, antes de pedir, pie.
6. Catálogo: el grado (papel, tira vino, nombres en Boska, precios en mono) y
   las fotos de la pared vino, si Sebas aprueba las 133.
7. Control: banco 84 de 84, mapa de calor, guiones largos, 390 y 1440, y
   Lighthouse una sola vez al final (mediana de 5, intercalado con producción).

## Reglas que siguen valiendo

Aviso legal visible, nunca frascos con forma de diseñador en hero u og; precio
y botón en el primer pantallazo a 390x664; un solo acento; cero guiones largos;
PageSpeed mobile en ~94-96; el `codigo` no se toca.
