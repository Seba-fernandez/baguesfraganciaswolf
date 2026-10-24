# Qué tocar para cambiar qué

Guía corta para no tener que leer el código entero cada vez que hay que cambiar
algo. Está ordenada por lo que uno quiere hacer, no por cómo está armado el
proyecto adentro.

La regla de fondo es una: **lo que cambia todos los meses no vive en el código.**
Los precios, los códigos de proveedor, el ciclo, las promociones y qué aroma
está activo salen de la base y se editan desde el panel. Tocar el código para
eso es equivocarse de lugar.

---

## Cambiar un texto de la web

Todo el texto visible de la tienda está en **`src/config/contenido.js`**. Los
componentes no tienen texto escrito adentro: leen de ahí.

Están agrupados por dónde aparecen:

| Bloque | Qué contiene |
| --- | --- |
| `MARCA` | nombre y ciudad |
| `CABECERA` | los enlaces de arriba |
| `INICIO` | el título grande, la bajada y los dos botones |
| `DESTACADOS` | la fila de los que más salen |
| `CATALOGO` | título, buscador, filtros y el mensaje de cuando no hay resultados |
| `TARJETA` | el pie de la tarjeta ("3 tamaños · desde") y el nombre del `+` para el lector de pantalla |
| `PARECIDOS` | "Si te gusta este, mirá también" en la ficha y cómo se dice la razón |
| `HOJA_TAMANOS` | la hoja chica que abre el `+` cuando el aroma tiene más de un tamaño |
| `FICHA` | la ventana que se abre al tocar un aroma: "Para él/ella", tamaño, código, "Ahorrás", la línea de la proveedora, "Compartir", "Volver a…", "Ver más" y el botón de agregar |
| `COMO_FUNCIONA` | los tres pasos y la frase de cierre |
| `ANTES_DE_PEDIR` | el bloque de la portada con el pago, la seña, el envío, Córdoba y cuándo llega |
| `PEDIDO` | los textos del cajón: botones, campos, la línea de la seña, la barra de envío gratis y la pantalla final |
| `AVISO_AGREGADO` | la barra que sube al agregar desde el segundo aroma ("Ver pedido (2)") |
| `LEGAL` | el aviso corto del catálogo y los tres párrafos del pie |
| `PIE` | los títulos de las columnas de abajo |

Donde dice `{aromas}` se mete el número real cuando se muestra. Si se escribe
`{otracosa}` sin que exista ese dato, queda el `{hueco}` a la vista en la
pantalla: es a propósito, para que el error se note y no salga un "undefined".

## Cambiar cómo se paga, la seña o el envío

Los textos están en `ANTES_DE_PEDIR` (portada) y `PEDIDO` (cajón) de
`contenido.js`; el monto del envío gratis, en `ENVIO_GRATIS_DESDE` de
`ajustes.js`, y los dos lugares lo toman de ahí. Si cambia la seña o los medios
de pago, hay que cambiar las dos frases (`ANTES_DE_PEDIR` y `PEDIDO.sena`). La
aclaración chica del pie ("Venta particular...") no está en el código: es
`aclaracion_pedido` en Ajustes del panel.

**El aviso legal es lo único de ese archivo que conviene no tocar sin
pensarlo.** Está redactado para dejar en claro que la web no vende originales ni
representa a las marcas que nombra.

## Cambiar las familias del filtro

Las cinco familias del catálogo (Frescos y cítricos, Florales, Dulces y
gourmand, Amaderados, Ámbar y especiados) salen de `familia_olfativa`, que en la
base es texto libre. La regla que reparte cada aroma, con los nombres de las
familias, está en **`src/lib/familias.js`**: una tabla de palabras ("fougère" va
a frescos, "chipre" a amaderados) y la regla de las notas golosas para Dulces.
Un aroma sin familia cargada cae en "Otros" y no aparece en ningún filtro de
familia: se arregla cargándole la familia desde el panel. Los rótulos "Para",
"Familia" y las pastillas Él, Ella, Todos y Minis están en `CATALOGO.filtros`.

## Cambiar un número

En **`src/config/ajustes.js`**: cuántos aromas por página (también cuántos
agrega "Ver más" en el celular), cuántos destacados
entran, desde cuánto el envío es gratis (`ENVIO_GRATIS_DESDE`, en pesos: lo usan
el bloque "Antes de pedir" y la barra del cajón), el tope de unidades por pedido, a qué altura aparece el botón de volver
arriba, la proporción del recuadro de las fotos y en qué carpeta viven.

## Cambiar UNA foto

No hace falta correr ningún script y no hace falta abrir el código.

1. Entrar al panel, en Productos.
2. Abrir el aroma y usar el cargador de imagen de la ficha.

Esa foto le gana a todas las demás. El orden de preferencia que usa la web es:

1. La foto subida a mano desde el panel.
2. El frasco de la línea que está elegida (Bagués o Unlock son dos envases
   distintos del mismo aroma).
3. Cualquiera de las dos que exista.
4. La inicial del aroma sobre un fondo de color, si todavía no hay foto.

Eso está en `src/lib/fotos.js`, en la función `fotoDe`. La usan la tienda y la
lista del catálogo del panel, así las dos muestran el mismo frasco.

## Sumar capturas de clientas ("Lo que me escriben")

La sección aparece sola en la portada cuando hay al menos una captura; sin
capturas no se ve nada (ni el título).

1. Pedirle permiso a la clienta y tapar su número y su foto de perfil.
2. Exportar la captura a WebP de 720 px de ancho y guardarla en
   `public/opiniones/` (por ejemplo `public/opiniones/martina-good-girl.webp`).
3. Sumarla a `src/data/opiniones.json`:

```json
[
  { "imagen": "/opiniones/martina-good-girl.webp", "ancho": 720, "alto": 1280,
    "alt": "Mensaje de una clienta: me encantó, dura todo el día",
    "aroma": "Good Girl" }
]
```

`alt` transcribe el mensaje para quien usa lector de pantalla; `aroma` es
opcional. Los textos de la sección están en `OPINIONES` de
`src/config/contenido.js`.

## Prender la sección "¿Son truchos?"

Está armada y oculta (Bagués contra un perfume de vidriera, por cómo se usa).
Para prenderla, `MOSTRAR_DUDA = true` en `src/config/ajustes.js`. Los textos
(título, bajada, los dos lados, cierre y botón) están en `DUDA`, en
`src/config/contenido.js`. Regla: comparar por uso y precio, nunca decir que
"duran igual" ni nombrar marcas.

## Agregar o cambiar fotos del pipeline

Cada foto tiene su fuente anotada en **`scripts/fotos/fuentes.json`**: una
entrada por aroma y por línea, con la dirección en la tienda de la proveedora o
un archivo guardado en `scripts/fotos/fuentes/` (los recortes del PDF del
ciclo). Se agrega o cambia la entrada y se corre:

```
npm run fotos:componer            arma las que faltan o cambiaron
npm run fotos:componer -- --todo  rehace todas
npm run fotos                     componer + los anchos chicos para celular
```

Todas salen a 3:4 llenando el cuadro. Desde el rediseño D (23/10/2026) viven
en la **pared vino** del hero: después de componer, se sacan los recortes y se
pasan a la pared (ver "Las fotos en la pared vino" abajo). Una foto
de Unlock con fondo propio lleva `"tratamiento": "estudio"` (o `"espresso"` si
es vidrio transparente sobre fondo claro). **Antes de publicar, correr
`npm run fotos:contacto` y mirar la hoja entera**, que pone al lado de cada
foto el nombre y la caja de la base: ya pasó que se cruzaran fotos entre perfumes de
la misma familia, y las cajas de Bagués de New York, Amsterdam y Hawai tienen
versión femenina y masculina con el mismo nombre. El detalle está en
[`scripts/fotos/README.md`](../scripts/fotos/README.md).

Los anchos chicos (`-360w`, `-560w`) los genera el build solo. **No borrarlos a
mano**: sin ellos las tarjetas quedan vacías y el servidor no avisa.

### Las fotos en la pared vino

```
node scripts/fotos/componer.mjs --todo --recortes /tmp/recortes   # [--solo slug1,slug2]
python3 scripts/rediseno/pared_productos.py /tmp/recortes /tmp/pared
cp /tmp/pared/unlock/*.webp public/perfumes/
cp /tmp/pared/bagues/*.webp public/perfumes/bagues/
node scripts/fotos/variantes.mjs        # rehace los -360w y -560w de las nuevas
```

Mismos nombres de archivo: la tienda las toma sola. El banco (`FOTO-1`) mide
que el fondo de cada foto sea la pared vino. La pared vacía que va a los
costados de la ficha en el celular sale de
`python3 scripts/rediseno/pared_productos.py --vacia public/fondo` (y se achica a
`pared-vacia-360.webp`).

## Cargar un ciclo nuevo

Precios, códigos, tamaños que entran y salen: van a la base, comparando **por
código** contra el PDF del ciclo, nunca por nombre. El paso a paso, como se cargó
el ciclo 10/26, está en la sección 7 de [`CLAUDE.md`](../CLAUDE.md).

## Cambiar el orden de los bloques de la página

En **`src/components/tienda/HomeScreen.jsx`**. Es una lista de bloques en el
orden en que se ven: inicio, las ciudades, ¿qué te gusta oler?, destacados, lo
que me escriben (oculto sin capturas), cómo funciona y antes de pedir.

**Las cajas de "Las ciudades"** se eligen en `CIUDADES_ELEGIDAS`
(`src/config/ajustes.js`): las más conocidas, en orden. Si una sale del ciclo o
se marca destacada, se completa sola con otra. Mover un
bloque es mover una línea. El catálogo completo no está ahí: vive en su propia
página (`CatalogoScreen.jsx`), y la ficha del aroma tampoco, porque se abre
encima de lo que haya.

## Cambiar colores, tipografías o espacios

En **`src/styles/tienda.css`**, arriba de todo, están las variables: la noche
(vino hondo), el día (papel), el acento (rosa-vino de noche, rubí de día), las
letras (Melodrama, Boska, Plex Mono, La Belle Aurore, Figtree), los redondeos y
las duraciones. Una sección de papel lleva la clase `dia`. Regla de formas: lo
que se toca es redondo, lo que se mira es recto. Cambiar una variable cambia toda la web de una. El
sistema completo está explicado en [`DISENO.md`](DISENO.md).

Tres cosas que ya costaron caro y conviene saber:

- **El acento es uno solo.** Si aparece un segundo color de acento, la web deja
  de leerse como una sola cosa. Las variables se llaman `--amber*` por herencia,
  pero el valor es rosa-vino.
- **Cuidado con la especificidad.** `.tienda a` le gana a `.tbtn`, así que un
  enlace con pinta de botón hereda el color del texto y queda ilegible. Ya pasó
  dos veces. Si un color no se aplica, es esto antes que cualquier otra cosa.
- **Las reglas genéricas del vidrio van con `:where()`** para que no le ganen al
  componente. Sin eso, `position: relative` del vidrio pisaba el `position:
  fixed` del botón de volver arriba y lo mandaba al borde de la pantalla. En el
  panel pasó lo mismo con la barra de abajo: por eso `.glass` y `.glass-strong`
  de `global.css` no llevan `position`.

**El panel** tiene su propio sistema en **`src/styles/global.css`**: los
radios son `--r-xs` (4), `--r-sm` (6, botones e inputs), `--r-md` (8, tarjetas)
y `--r-lg` (10, hojas). Cambiar uno cambia todo el panel.

## Cambiar el fondo

No es una foto: son SVG que dibuja un script. La escena del inicio está en
`public/hero/`, la textura de la página en `public/fondo/`, y las genera
`npm run fondo`. Qué se puede tocar está en
[`scripts/fondo/README.md`](../scripts/fondo/README.md).

Si se cambia por algo más claro, hay que medirle el punto más claro: si el fondo
aclara, el texto tenue deja de cumplir contraste y hay que recalcular los tonos
o ahumar el vidrio que quede encima.

## Cambiar precios, códigos, promociones o el ciclo

Desde el panel, o en la base. **Nunca en el código.**

El **código de proveedor es sagrado**: sin ese número no se puede cargar la
orden en el sistema de la proveedora, y un pedido sin código es un pedido
inútil. Ya hubo un cambio que lo iba a borrar al editar un precio. Si algo lo
pone en riesgo, hay que frenar.

---

## Dónde está cada cosa

El mapa de carpetas, el modelo de datos y las convenciones están en
[`ARQUITECTURA.md`](ARQUITECTURA.md). Lo único que hace falta saber para tocar
cosas del día a día: **`lib/` no sabe nada de pantallas y `components/` no
calcula reglas de negocio.** Si una cuenta da mal (el 2x1, el mensaje de
WhatsApp), el error está en `src/lib/`, no en la pantalla.

## Antes de dar algo por hecho

```
npm run build    tiene que terminar sin errores
npm run dev      y mirarlo en el navegador
```

Compilar no alcanza: un texto puede quedar tapado, o un color ilegible, y el
compilador no lo ve. Hay que abrirlo.

## Lo que no se toca sin autorización explícita

- La estructura de las tablas `products`, `orders`, `order_items`, `customers` y
  `settings`.
- La función `es_admin()` y las validaciones dentro de `crear_pedido_web`.
- Las políticas de seguridad por fila.
- El aviso legal.
- Los códigos de proveedor.

Y una que vale para todo el repositorio: **es público.** No se escribe ninguna
clave secreta en ningún archivo que se sube.
