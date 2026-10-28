# Rediseño D: las vueltas con Sebas

Cada vuelta es una tanda de pedidos de Sebas al ver la vista previa en su
celular, con el porqué de cada cambio. Pasó acá desde `docs/PLAN-PORTADA-D.md`
el 27/10/2026; el plan quedó con las decisiones, el guion y las reglas.

---

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

## Séptima vuelta (23/10, noche): la letra del título y la entrada de a uno

- **Por qué cambiaba la letra del título:** "Cada perfume," usa Boska recta
  (la regla `.tienda h1` le ganaba a `.titulo` y así quedó aprobado), y esa
  letra llegaba última, en `fuentes-diferidas.css`, después de cargar la
  página. La espera de fuentes del hero aguardaba a Melodrama y a la itálica,
  no a esta. Ahora la recta va recortada a los caracteres del título y viaja
  dentro del HTML (1,6 kB, `scripts/prerender.mjs`); la regla del título
  la nombra a propósito.
- **Se probó embeber las cinco letras del primer pantallazo** (marca, título,
  itálica, Figtree 400 y 600): todo salía perfecto, pero Lighthouse bajaba 3
  puntos porque cuenta cada letra embebida como un pedido más. Con solo la
  recta empata con lo publicado (86 contra 86, intercalado 5 y 5).
- **Entrada de a uno:** el título sube desde abajo, después la bajada, el
  precio y la línea de envío; el botón aparece desde su centro y los trazos
  se dibujan desde el botón hacia afuera. Todo con opacidad, `scale` y un
  recorte corto en los trazos.
- **"Desde" ya no se corre al llegar el precio:** el lugar reservado medía
  40 px de más.

## Octava vuelta (23/10, noche): el precio a tiempo y Destacados sin pausa

- **El precio aparecía después** de toda la entrada del hero: sale de la base
  y la base contesta un segundo más tarde (el viaje hasta la base, no el
  momento de pedirlo: adelantar el pedido ganó 48 ms). Ahora el build lo
  pide una vez y lo deja escrito en el HTML (`data-precio`, en
  `scripts/prerender.mjs`); entra con su línea, antes del botón. Si Sebas
  cambia precios sin publicar, React lo corrige cuando llega la base, y un
  deploy lo deja al día.
- **Destacados tenía una pausa:** la banda llegaba y las tarjetas esperaban a
  estar casi enteras en pantalla para hacer un fundido de medio segundo. Ahora
  suben atadas al mismo scroll que la banda (`--banda`, solo opacidad y
  transform): están cuando la banda llega. La traza con CPU frenada no
  mostraba cuadros perdidos; la pausa era de coreografía, no de rendimiento.

## Novena vuelta (23/10, noche): varias familias y la arena pareja

- **Varias familias a la vez.** En el catálogo, tocar una familia la suma o la
  saca (`?familia=florales,amaderados`; los links de una sola siguen
  andando). En el celular, el botón plegado dice "Familia · 2".
- **La hoja de "¿Con cuál te identificás?"** lleva arriba de las tarjetas las
  cinco familias: tocar otra la suma, tocar una marcada la saca y la última
  no se puede sacar. Con más de una, el título dice "2 familias" y la bajada
  las nombra. Van debajo de la cabecera fija para que en el celular se vayan
  al bajar.
- **La regla vive en `lib/filtros.js`** (`leerFamilias`, `escribirFamilias`,
  `alternarFamilia`) con sus pruebas en `scripts/qa/filtros.test.mjs`.
- **"En mi celu no se ve el granulado".** El grano de película de toda la
  página es solo de escritorio desde el 2/10 (costaba casi un segundo de
  carga en el celular), pero en la práctica las secciones lo tapan. Lo que se
  ve es la arena del papel, y esa la dibujaba cada navegador a su manera:
  Safari con la mitad de grano que Chrome. Ahora es una baldosa ya dibujada
  (`scripts/fondo/arena.mjs`, 12 kB) que se ve igual en todos y se pide
  después de la foto del hero.

## Décima vuelta (24/10, madrugada): destacados parejos y la ficha que deja volver

- **Destacados en escritorio, con corte parejo.** La fila vive dentro de la
  columna de la página y se corta a la misma distancia de los dos bordes
  (antes llegaba al borde derecho de la pantalla). Entran tarjetas enteras:
  tres hasta 1000 px, cuatro hasta 1240 y cinco arriba. Las flechas, simétricas,
  pasan de a una tanda. El celular no cambia.
- **Volver al perfume de antes.** Desde un "Si te gusta este" aparece arriba a
  la izquierda de la foto "‹ Kenzo Homme": vuelve de a uno (hasta cinco), con
  el tamaño que se tenía elegido. La cadena vive en el estado del historial
  (`rastro`); "atrás" sigue cerrando la ficha entera.
- **"Compartir" en la esquina derecha de la foto** (antes "Copiar link" a la
  izquierda). En el teléfono abre su menú de compartir; donde no hay, copia el
  link. En el celular va a la izquierda de la ✕, que también está arriba a la
  derecha.
- **"Ver más".** La familia queda a la vista y, a su lado, "Ver más" abre la
  salida, el corazón, el fondo y la descripción. Los parecidos suben ~240 px:
  a 1440×900 con dos tamaños entran enteros arriba de la barra de agregar (en
  escritorio la razón va en un renglón y la columna tiene un poco menos de
  aire entre bloques).

