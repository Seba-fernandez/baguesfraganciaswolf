# Evaluación de captación y conversión: Bagués en producción

Medido el 22/10/2026 sobre https://baguesfraganciaswolf.vercel.app (portada y /catalogo),
a 390 x 844 (dpr 2) y 1440 x 900. Producción todavía es la versión **anterior a la
etapa 3B**: "Cómo funciona" con tres iconos y sin la tira del ciclo (eso está en la rama
`wip/etapa-3b`, no publicado). Modelo de saliencia: **DeepGaze IIE con los pesos oficiales**.

## Resumen en 10 líneas

1. Tu miedo se confirma a medias. El texto largo queda frío: "Nosotros" saca 4,4/10 a 390 y el cuerpo de sus 130 palabras queda azul. Lo único caliente es el título.
2. Desde "Nosotros" hasta el pie hay **3.100 px seguidos (3,7 pantallas del celular) sin una sola imagen**. Ahí la portada se apaga: con la caída por scroll de NN/g, ese tramo entero junta el 25 % de la atención.
3. El hero funciona como texto: titular 35,5 % y botón 15,5 % del primer pantallazo. Pero **el precio "Desde $ 16.499" se lleva solo el 2,3 %**: está, y casi no se ve.
4. Los frascos del hero son de diseñador (zapato de Good Girl, manzana de Nina, Invictus...). Se llevan el 19,5 % de la mirada y contradicen la regla de la marca.
5. En el primer pantallazo de la portada **no dice en ningún lado que son versiones inspiradas** (ni a 390x664, ni a 390x844, ni a 1440x900). Lo dice el catálogo y el pie.
6. A 390x664 (Instagram) la portada pasa: precio en y=525 y botón en y=559. **El catálogo no muestra ni un precio ni una foto**: el buscador y los filtros ocupan de y=321 a y=701.
7. Comprar Good Girl desde la portada lleva **9 toques** hasta el enlace de WhatsApp, y el mensaje llega con el código bien. "Algo dulce para regalar" lleva 10, y "regalo" no aparece en ninguna parte de la web.
8. A la persona que desconfía le faltan 7 de 12 señales de confianza: foto, reseñas, qué pasa si algo sale mal, antigüedad. "Antes de pedir" está a 3,8 pantallas.
9. Lo mejor de la web es la grilla del catálogo (8,7 a 9,4/10): ahí el pico cae en foto y precio. El problema es llegar.
10. Puntaje de consulta **55/100**. Abajo están los 12 no negociables para que el rediseño no repita esto.

---

## Parte 1. Mapa de calor

### Cómo se midió

- **Modelo:** DeepGaze IIE (Linardos, Kümmerer, Press y Bethge 2021, https://arxiv.org/abs/2105.12441), pesos oficiales v1.0.0, en CPU. El sesgo de centro oficial (`centerbias_mit1003.npy`) no se pudo bajar (GitHub raw contesta 403 en esta red): lo reemplacé por una gaussiana propia, un poco arriba del centro.
- **Por pantallas:** el modelo corre en ventanas del alto del visor (844 o 900 px) con paso de media pantalla. Así cada sección se mide como la ve quien llega a ella, no como una miniatura de toda la página. `calor_*_scroll.jpg` además pesa cuánta gente llega a cada altura (NN/g: 57 % del tiempo en la primera pantalla, 17 % en la segunda, 26 % en el resto).
- **Captura:** página precargada, scroll completo, `.treveal` forzados, `content-visibility: visible`, fuentes listas y todas las imágenes con `naturalWidth > 0` (cero rotas en las cuatro capturas).
- **Secciones:** salen del DOM (hijos de `<main>` y el pie). El catálogo, que es una sola sección de 3.143 px, se parte por sus hijos, y la grilla en tramos de una pantalla.

### Rúbrica de la sección (0 a 10)

| Criterio | Puntos | Medida |
| --- | --- | --- |
| Atención media | 2,5 | media de la sección / media de la página (r): 2,5 x min(1, r/1,5) |
| Pico | 1,5 | p99 de la sección / p99 de la página: 1,5 x min(1, q) |
| El pico vende | 2 | parte del 10 % más caliente que cae en foto de producto, precio o botón (f): 2 x min(1, f/0,5) |
| Densidad de texto | 1,5 | % del área con renglones: 1,5 si ≤ 12 %, 0 si ≥ 40 %, lineal en el medio |
| Contraste | 1 | p10 del contraste WCAG medido en píxeles de cada renglón: 1 si ≥ 4,5; 0,5 si ≥ 3 |
| Gancho visual | 1,5 | % del área con foto o fondo con imagen + colorido (Hasler-Süsstrunk) |

### Portada

Imágenes: `calor_390.jpg`, `calor_1440.jpg` (y sus `_scroll.jpg`), recortes en `secciones/390_*.jpg` y `secciones/1440_*.jpg`.

| Sección | 390 | 1440 | Atención con scroll (390) | Por qué |
| --- | --- | --- | --- | --- |
| Hero | **7,2** | **7,2** | 62 % | El titular y el botón calientan. A 390 el pico cae en el botón "Ver el catálogo" (bien), pero solo el 18 % del área caliente es producto, precio o botón. Los frascos son PNG de diseñador: 19,5 % de la mirada a 390. **El precio, 2,3 %**. A 1440 el texto se lleva el 77,6 % y el botón apenas el 6,1 %. La cinta de nombres queda en 0,3 %. |
| Los que siempre salen | 7,1 | **8,1** | 13 % | Fotos reales y precios: el mejor bloque de la portada. A 390 el pico cae en el título, no en las cajas (solo el 5 % del área caliente vende) porque el carrusel muestra 1,5 tarjetas y la flecha tapa la segunda. El eyebrow da 4,9:1 a 390 y **3,4:1 a 1440**. El primer destacado es el más caro ($ 39.699). |
| El mismo perfume, sin la vidriera cara (Nosotros) | **4,4** | 5,1 | 12 % | El más frío del celular. 130 palabras en 3 párrafos, **34 % del área es texto**, 0 % de imagen, 0 % del pico en algo que vende. Caliente solo el título. La firma "Sebastián" no tiene cara. |
| Cómo funciona | 6,6 | 6,2 | 7,7 % | Tres iconos centrados y un botón: el pico cae en "Escribime por WhatsApp" (bien). Sin imagen. En producción sigue la versión de los tres iconos. |
| Antes de pedir | **5,0** | 6,4 | **2,5 %** | Es lo que convence a quien duda (seña, envío, retiro), y está a 3,8 pantallas: le llega el 2,5 % de la atención. Cuatro bloques de texto parejos, 26 % del área, ningún número grande ni imagen. |
| Pie | 4,7 | **4,1** | 2,2 % | Frío como corresponde al aviso legal (122 palabras). No es un problema: el problema es que la confianza esté pegada a él. |

**Lectura de tu miedo.** El modelo no castiga el texto por ser texto: los títulos grandes calientan (Nosotros tiene el pico más alto de la página, 1,25 veces el p99). Lo que queda azul es el **cuerpo**. Tres párrafos de 41 a 45 palabras con el mismo peso, el mismo color y nada que los corte. Y como abajo de los destacados no hay imágenes, no queda nada que vuelva a enganchar.

### Catálogo

Imágenes: `calor_catalogo_390.jpg`, `calor_catalogo_1440.jpg`, recortes `secciones/catalogo_*`.

| Sección | 390 | 1440 | Por qué |
| --- | --- | --- | --- |
| Cabecera "El catálogo" + aviso | 5,3 | 5,8 | Texto puro (27 % del área a 390). El pico cae en el título. El aviso de "versiones inspiradas" está acá y es legible (8,5:1). |
| Buscador y filtros | 6,0 | 6,5 | El pico cae en la pastilla rosa "Todos", el único color fuerte, **y no en el buscador**. A 390 ocupa 380 px (45 % del visor). |
| Grilla (tramos) | **8,8 / 8,7 / 8,7** | **9,0 / 9,4** | Lo mejor de la web: el pico cae en la caja Bagués y en el precio (del 41 al 65 % del área caliente vende). Las cajas con nombre de ciudad (Hawai, Esparta, Amsterdam) atraen más que los frascos de vidrio transparente. |
| Ver 12 más / paginador | 8,1 | **3,8** | A 390 el botón concentra la mirada. A 1440 el paginador queda perdido: 0,3 veces la media. |
| Pie | 4,8 | 4,5 | Igual que en la portada. |

---

## Parte 2. Auditoría de consultas (0 a 100)

Fuentes usadas:
- NN/g, *Scrolling and Attention* (2018): 57 % del tiempo en la primera pantalla, 17 % en la segunda. https://www.nngroup.com/articles/scrolling-and-attention/
- NN/g, *How Long Do Users Stay on Web Pages*: "la propuesta de valor se tiene que entender en 10 segundos". https://nngroup.com/articles/how-long-do-users-stay-on-web-pages/
- CXL, *Improving Clarity*: test de 5 segundos con las 4 preguntas de Schottmuller (quién es, qué ofrece, si parece creíble, cuál es la acción). https://cxl.com/blog/improving-clarity/
- Baymard, *Perceived Security*: la confianza es una impresión a primera vista. El 19 % abandonó una compra por no confiar en el sitio, los sitios chicos necesitan más señales que las marcas grandes y los errores de diseño hacen pensar en estafa. https://baymard.com/research-articles/perceived-security-of-payment-form
- Baymard, *Product List Item Information*: precio, título, foto y variantes siempre visibles en la lista; el 50 % de los sitios falla en el equilibrio. https://baymard.com/research-articles/product-listing-information
- NN/g, *Trustworthy Design* (calidad de diseño, información por adelantado, contenido completo y al día, conexión con el resto de la web) y *F-Shaped Pattern* (se escanea, no se lee). https://nngroup.com/articles/trustworthy-design/ y https://nngroup.com/articles/f-shaped-pattern-reading-web-content/ . **Esas dos no las pude volver a leer en esta sesión** (el sitio cortó por límite de pedidos): las uso por lo que ya conozco de ellas.

| Eje | Puntaje | Cómo se puntuó y qué se midió |
| --- | --- | --- |
| **Test de 5 segundos** | **52** | Cuatro preguntas de 25 puntos, en el primer pantallazo a 390x664. Qué venden: perfumes, se entiende (25). A qué precio: "Desde $ 16.499" está, pero recibe el 2,3 % de la atención (13). Cómo se compra: "por WhatsApp" solo en la bajada, y el botón dice "Ver el catálogo" (14). Versiones inspiradas: no aparece, y los frascos de diseñador sugieren lo contrario (0). |
| **Toques hasta WhatsApp** | **60** | 100 con 5 toques o menos; 10 menos por cada toque extra. Good Girl desde la portada: 9 (catálogo, buscar, ficha, agregar, seguir, nombre, WhatsApp, enviar, abrir). Hay 3 que piden datos que WhatsApp ya tiene: se justifican porque guardan el pedido, pero son la mitad de la fricción. La consulta directa es 1 toque, pero el botón abre WhatsApp **sin mensaje armado** y está a 3,7 pantallas. |
| **Confianza** | **38** | 12 señales, con la cuarta de NN/g (contenido completo) y Baymard (sitio chico = más señales). Están: nombre de quien vende, Instagram, WhatsApp, seña del 50 %, aviso de versiones inspiradas (5/12). Faltan: foto de Sebas, reseñas o capturas de clientas, cantidad de ventas, qué pasa si algo sale mal, antigüedad, barrio o punto de retiro, fotos reales (no de estudio). Además, lo que hay está lejos: Nosotros a 1,7 pantallas y Antes de pedir a 3,8. |
| **Percepción de valor** | **50** | Hay un precio de entrada visible y la ficha dice "Ahorrás $ 13.500". Pero las tarjetas del catálogo y de destacados **no muestran el precio de lista tachado** (la base lo tiene). El primer destacado es el más caro ($ 39.699). En la ficha, la opción de 50 ml muestra primero el tachado ($ 29.999) y después el real: leyendo rápido, la de 25 ml ($ 23.249) parece más barata y cuesta más. No hay precio por ml. "Envío gratis desde $ 60.000" a 3,8 pantallas (en el cajón sí aparece). |
| **Encontrar su perfume** | **68** | Baymard: la tarjeta tiene precio, título, foto y tamaños (bien). El buscador encuentra "good girl" y distingue Very Good Girl. Las familias existen y "Dulces + Ella" deja 10. En contra: la portada no tiene buscador ni entrada por familia, y a 390 la primera tarjeta arranca en y=701 (y=722 con filtros). Para "regalar" no hay nada: ni filtro, ni palabra, ni "los más pedidos" en el catálogo. |
| **Legibilidad** | **72** | Contraste medido en píxeles: la mediana de cada sección da más de 8:1. Fallan el eyebrow "Selección del ciclo" (3,4:1 a 1440) y los bordes de la cinta del hero, que se desvanecen (1,5 a 2,4:1, en parte por el difuminado a propósito). En contra: Nosotros con párrafos de 45 palabras y el aviso legal de 122 palabras en letra chica. |
| **Fricción visual** | **45** | El hero son recortes PNG sobre un dibujo (lo que ya viste vos). Desde Nosotros hasta el pie, 3,7 pantallas sin imagen. Destacados y Nosotros, seguidos, con el mismo marco de vidrio redondeado. En el catálogo los filtros ocupan el 45 % del primer visor y la pastilla "Todos" le gana al buscador. |
| **Total** | **55** | Promedio simple de los siete ejes. |

---

## Los 3 recorridos (390 px, Playwright, producción)

Protecciones: `crear_pedido_web` interceptado con `page.route` y contestado con el pedido 9999 de mentira; cualquier otra escritura a Supabase cortada; `wa.me` e Instagram abortados; `window.open` reemplazado. Registro: solo 2 llamadas a `crear_pedido_web`, las dos simuladas. Ningún pedido real. Capturas en `recorridos/` y datos en `recorridos.json`. Escribir en un campo cuenta como 1 toque; el scroll no cuenta, pero se anota.

### a) "Busco Good Girl, el más barato": 9 toques

| # | Acción | Captura |
| --- | --- | --- |
| 0 | Llega a la portada: ve "Desde $ 16.499" y el botón | `a_01` |
| 1 | Ver el catálogo | `a_02` |
| 2 | Escribe "good girl": 2 aromas (Good Girl y Very Good Girl) | `a_03` |
| 3 | Abre la ficha de Good Girl | `a_05` |
| | El de 50 ml ($ 16.499, caja Charlotte) ya viene elegido | `a_06` |
| 4 | Agregar | `a_07` |
| 5 | Seguir por WhatsApp | `a_08` |
| 6-7 | Nombre y WhatsApp | |
| 8 | Enviar pedido por WhatsApp | `a_09` |
| 9 | Abrir WhatsApp: mensaje con `[10281065] Good Girl 50ml (Bagues, caja Charlotte)` y total $ 16.499 | |

Dónde duda:
- **Portada:** no hay buscador. Tiene que adivinar que es "Ver el catálogo".
- **Resultados (`a_03`):** después de escribir, en la pantalla no aparece ningún resultado. Hay 380 px de filtros entre el buscador y la primera tarjeta, así que no sabe si encontró algo hasta que baja.
- **Ficha (`a_05`):** el 25 ml de Unlock ($ 23.249) va primero. En el de 50 ml se lee primero el tachado ($ 29.999) y el precio real queda medio cortado por la barra de abajo. La que busca "el más barato" lo encuentra porque viene elegido, no porque se vea.
- **Datos (`a_08`):** el ejemplo "351 555 1234" en gris parece un dato ya cargado.

### b) "No sé qué quiero, algo dulce para regalar": 10 toques

| # | Acción | Captura |
| --- | --- | --- |
| 0 | Portada, baja a los destacados | `b_01`, `b_02` |
| 1 | Catálogo (cabecera) | `b_03` |
| 2 | Familia: Dulces y gourmand (15 aromas) | `b_04` |
| 3 | Para: Ella (10 aromas) | `b_05` |
| | Recorre los resultados (1,9 pantallas) | `b_06` |
| 4 | Abre Scandal Le Parfum Intense (el primero) | `b_07`, `b_08` |
| 5-10 | Agregar, seguir, datos, enviar, abrir WhatsApp | `b_09` a `b_11` |

Dónde duda:
- **Portada:** "regalo" no aparece en toda la web. Tampoco hay entrada por "lo que te gusta oler": las familias recién existen como filtro adentro del catálogo.
- **Catálogo (`b_05`):** con los dos filtros, la primera tarjeta arranca en y=722. Ve los filtros prendidos y casi nada de resultados.
- **Elección:** 10 opciones con nombre, notas y precio. Ninguna dice "el más pedido" ni "ideal para regalar", y no hay ninguna opinión. Elige el primero porque es el primero.
- **Ficha:** no dice si se puede mandar envuelto, con tarjeta o directo a otra dirección. Esa pregunta va a terminar en WhatsApp, pero la web no la invita.

### c) "Desconfío, nunca le compré a un particular": 1 toque y 4,4 pantallas de scroll

| Momento | Dónde está | Captura |
| --- | --- | --- |
| Portada | Ningún aviso de versiones inspiradas, ninguna cara | `c_01` |
| Nosotros | 1,7 pantallas. Tres párrafos y la firma "Sebastián, de Grupo Wolf", sin foto | `c_02` |
| Cómo funciona | 2,7 pantallas | `c_03` |
| Antes de pedir | 3,8 pantallas. Seña del 50 %, envío, retiro | `c_04` |
| Pie y aviso legal | 4,4 pantallas | `c_05`, `c_06` |
| Escribime por WhatsApp | 1 toque: `wa.me/5493512535467` **sin mensaje** | `c_07` |

Dónde duda:
- Hay 5 de 12 señales. Faltan foto de la persona, reseñas o capturas de clientas, cantidad de ventas, qué pasa si algo sale mal, desde cuándo vende, barrio o punto de retiro y fotos reales.
- Lo que la tranquilizaría (seña y no pagar nada en la web) está en la sección que, según el calor con scroll, recibe el 2,5 % de la atención.
- Para preguntar se tiene que animar a escribir desde cero.

---

## NO NEGOCIABLES del rediseño

Cada uno se puede medir con `heatmap.py`, `recorridos.py` o el banco del repo.

1. **Precio y botón enteros en 390x664** en la portada, como pide el brief (hoy pasa: precio en y=525, botón en y=559).
2. **En /catalogo a 390x664, al menos una tarjeta con foto y precio visibles** (hoy 0). Los filtros se pliegan en una fila o en un botón "Filtrar".
3. **"Versiones inspiradas" legible en el primer pantallazo de la portada a 390x664**, con 4,5:1 o más (hoy no está).
4. **Cero frascos con forma de diseñador en el hero y en og.jpg**: solo cajas y frascos Bagués (hoy hay 5 de diseñador).
5. **El precio del hero se lleva el 8 % o más de la atención** del primer pantallazo en DeepGaze (hoy 2,3 %), **y el botón el 15 % o más** a 390 y a 1440 (hoy 15,5 % y 6,1 %).
6. **Ninguna sección de la portada por debajo de 6/10** en `heatmap.py` a 390 (hoy 3 de 6: Nosotros 4,4, Antes de pedir 5,0 y el pie 4,7; el pie se acepta si lleva solo el aviso legal).
7. **Ningún tramo de más de 844 px sin imagen, foto o pieza visual** (hoy 3.100 px seguidos, de Nosotros al pie).
8. **Ningún párrafo de más de 45 palabras y ninguna sección con más del 20 % del área en texto** (Nosotros: 34 % y 130 palabras; Antes de pedir: 26 %).
9. **La confianza antes de y=1.688 a 390 (dos pantallas)**: la cara de Sebas, la seña del 50 % con "no pagás nada acá" y al menos una prueba real de una clienta (hoy no hay cara ni prueba, y la seña está a 3,8 pantallas).
10. **De la portada al enlace de WhatsApp en 8 toques o menos para 1 aroma**, sin perder el código en el mensaje (hoy 9). **El botón de consulta abre WhatsApp con mensaje armado** (hoy sin `text=`).
11. **El ahorro en la tarjeta**: precio de lista tachado en el catálogo y en los destacados cuando existe, y en la ficha el precio a pagar va antes y más grande que el tachado.
12. **Entrada por lo que te gusta oler y por regalo en la portada**: las 5 familias como acceso directo (al catálogo filtrado) antes de las 2 pantallas, y "para regalar" nombrado en algún lugar de la compra.

---

## Limitaciones (honestas)

- **DeepGaze predice mirada libre, no intención de compra.** La clienta del recorrido (a) va directo al buscador aunque el modelo diga que mira los frascos. El calor dice qué gana la pelea por la atención cuando nadie tiene apuro, no qué vende.
- Está **entrenado con fotos de escenas, no con páginas web**. Subestima texto chico y botones de bajo contraste, y sobrestima objetos aislados.
- **No ve movimiento**: la cinta animada, los reveals y la entrada del hero atraen más mirada de la que marca.
- El **sesgo de centro es mío** (gaussiana), no el oficial de MIT1003, que no se pudo bajar. Cambia los bordes, no el orden de las secciones.
- Los puntajes 0 a 10 dependen de pesos que elegí yo (la rúbrica de arriba). Sirven para **comparar antes y después con el mismo script**, no como número absoluto.
- El contraste medido en píxeles agarra los bordes difuminados a propósito (la cinta): ese 1,5:1 es en parte un artefacto.
- Los recorridos son tres perfiles guionados por mí, no personas reales. Para confirmar las dudas, conviene un test de 5 segundos con 5 personas de Instagram.
- Producción es anterior a la etapa 3B. "Cómo funciona" con el chat de WhatsApp y la tira del ciclo (rama `wip/etapa-3b`) no se midieron.
