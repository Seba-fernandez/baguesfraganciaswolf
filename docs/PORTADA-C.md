# Portada C "A través del vidrio": especificación (22/10/2026)

Fuente de verdad para Figma y para el código (rama `rediseno-visual`). Las
herramientas para rehacer las imágenes están en `scripts/rediseno/` y el mapa de
calor en `scripts/qa/atencion/`. Figma: archivo `ZmALs7frFDKEO7QVFa3Vgu`, página
"Portada C v1" (celular nodo 23:42, escritorio 24:42); imágenes en "Imágenes v1".

**Cómo quedó en el código (difiere de la especificación de abajo):**
- "Lo que pagás" va segunda, pegada al hero, y no cuarta: así la confianza
  queda antes de las dos pantallas del celular (no negociable 9). Lleva una caja
  real en una ventana y la cuenta del ciclo (el precio más bajo contra su precio
  de lista, de `desdeYLista` en `lib/producto.js`).
- La bajada del hero quedó en una línea ("Versiones inspiradas, hechas por la
  casa Bagués."): en dos, la segunda pisaba el filo del vidrio a 390.
- "Antes de pedir" abre cada dato con una cifra grande: 50 %, $ 60.000, Córdoba
  y "Al cierre".
- En escritorio las familias van a la misma altura (el escalonado no se notaba).

Lectura de diseño: rediseño (overhaul visual, misma información y rutas) de una tienda
de perfumes que vende por WhatsApp, para clientas de Instagram en el celular, con un
lenguaje editorial oscuro de "objeto detrás de un material", apoyado en CSS nativo,
imágenes horneadas y Cormorant + Figtree (las de la marca). Diales: variancia 7,
movimiento 5, densidad 3. Tema único oscuro. Un acento: rosa-vino #e0708a (texto
encima #22110f). Oro #d6a862 solo en filetes y brillos. Pared vino #4a161f en el hero
y en una sola banda más (Antes de pedir); el resto espresso #17110d/#211812.
Radio: fotos 0, botones píldora, ventanas con arco (border-radius 999px 999px 0 0).

## Orden de la portada (mobile primero, 390)

1. **Hero C** (imagen horneada de fondo, sin WebGL). Texto:
   - sello chico "GRUPO WOLF · Casa Bagués" (la única etiqueta en mayúsculas espaciadas);
   - H1 Cormorant 600: "El perfume que ya conocés, al precio que todavía no." (la última
     parte en itálica);
   - bajada (<= 14 palabras): "Versiones inspiradas, hechas por la casa Bagués. Por WhatsApp,
     desde Córdoba." (cumple el no negociable 3: "versiones inspiradas" en el primer pantallazo);
   - precio grande "Desde $ 16.499" (Cormorant 2rem+, el número en tinta, no en gris) y
     botón "Ver el catálogo"; "Cómo funciona" como enlace de texto.
   - Zonas: celular titular y 96-260, ventana 290-540, precio + botón 580-660;
     escritorio texto en x 96-620.
   - Abajo, la cinta de nombres: cada nombre es un link a su ficha (?aroma=), se pausa con
     el puntero, quieta con reduced-motion (E3-B5).
2. **"¿Qué te gusta oler?"** Las 5 familias como ventanas con la silueta del frasco
   Bagués y la textura detrás del vidrio (salida/texturas/frasco_*.png). Cada una lleva a
   /catalogo?familia=<id>. Bajada: "Para vos o para regalar, empezá por lo que te gusta."
   Celular: fila deslizable con snap (es una vidriera, no un filtro); escritorio: 5
   ventanas con alturas escalonadas. (No negociable 12.)
3. **Destacados**: fila deslizable; la tarjeta del centro nítida y las de los costados
   "detrás del vidrio" (estrías CSS sobre la foto) que se aclaran al llegar al centro
   (animation-timeline: view(inline), fallback todo nítido). Tarjeta: foto, nombre, notas,
   precio a pagar grande y el de lista tachado chico al lado (no negociable 11).
4. **Lo que pagás / Lo que no pagás** (reemplaza Nosotros, E3-B4): dos columnas lado a lado
   también a 390, sin tildes verdes ni cruces. Pagás: el perfume, la seña del 50 % para
   reservarlo, el envío si es menos de $ 60.000. No pagás: la marca de diseñador, la
   publicidad, nada en esta web. Debajo una línea de Sebas en primera persona
   ("Soy Sebastián, vendo por encargo desde Córdoba.") y el lugar para su foto cuando la
   mande. <= 120 palabras en total. Debe quedar antes de y=1688 a 390 (no negociable 9).
5. **Lo que me escriben** (opiniones.json; oculta mientras esté vacía).
6. **Cómo funciona**: el chat de WhatsApp (ya existe, B3), sin cambios de contenido.
7. **Antes de pedir**, en la banda vino: cifras grandes en Cormorant 64 px: "50 %" (seña),
   "$ 60.000" (envío gratis desde), "Todo el país" (correo), "Córdoba" (retiro o envío).
8. Pie (sin cambios de contenido).

## Reglas
- Ningún tramo de más de 844 px sin imagen o pieza visual (no negociable 7).
- Ningún párrafo de más de 45 palabras; ninguna sección con más del 20 % de texto.
- Cero guiones largos, voseo, primera persona. Nunca insinuar originales; nada de frascos
  de diseñador ni logos ajenos.
- Movimiento: solo transform y opacity; prefers-reduced-motion respetado.
- PageSpeed mobile de la portada ~96: imagen del hero AVIF/WebP precargada.
