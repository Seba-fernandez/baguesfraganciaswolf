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
| `TARJETA` | la aclaración de "versión inspirada" |
| `FICHA` | la ventana que se abre al tocar un aroma |
| `COMO_FUNCIONA` | los tres pasos y la frase de cierre |
| `LEGAL` | el aviso corto del catálogo y los tres párrafos del pie |
| `PIE` | los títulos de las columnas de abajo |

Donde dice `{aromas}` se mete el número real cuando se muestra. Si se escribe
`{otracosa}` sin que exista ese dato, queda el `{hueco}` a la vista en la
pantalla: es a propósito, para que el error se note y no salga un "undefined".

**El aviso legal es lo único de ese archivo que conviene no tocar sin
pensarlo.** Está redactado para dejar en claro que la web no vende originales ni
representa a las marcas que nombra.

## Cambiar un número

En **`src/config/ajustes.js`**: cuántos aromas por página, cuántos destacados
entran, el tope de unidades por pedido, a qué altura aparece el botón de volver
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

Eso está en `src/components/tienda/ProductThumb.jsx`, en la función `fotoDe`.

## Rehacer TODAS las fotos

Cuando entra un ciclo con aromas nuevos. Son tres pasos y están documentados en
[`scripts/fotos/README.md`](../scripts/fotos/README.md). El resumen:

```
npm run fotos:catalogos    baja los catálogos de las dos proveedoras y el nuestro
npm run fotos:emparejar    decide de dónde sale cada foto e imprime la lista
npm run fotos:traer        baja, comprime y regenera el índice
```

**Conviene mirar la lista del segundo paso antes de correr el tercero.** Ahí ya
se vio un error: había fotos que se cruzaban entre perfumes de la misma familia.

`npm run fotos` corre los tres de una.

## Cambiar el orden de los bloques de la página

En **`src/components/tienda/HomeScreen.jsx`**. Es una lista de bloques en el
orden en que se ven: inicio, destacados, catálogo y cómo funciona. Mover un
bloque es mover una línea. La ficha del aroma es la última porque no es un
bloque de la página: se abre encima.

## Cambiar colores, tipografías o espacios

En **`src/styles/tienda.css`**, arriba de todo, están las variables. Ahí se
definen el fondo, los tonos de texto, el ámbar del acento, los redondeos y las
duraciones de las animaciones. Cambiar una variable cambia toda la web de una.

Dos cosas que ya costaron caro y conviene saber:

- **El acento es uno solo.** Si aparece un segundo color de acento, la web deja
  de leerse como una sola cosa.
- **Cuidado con la especificidad.** `.tienda a` le gana a `.tbtn`, así que un
  enlace con pinta de botón hereda el color del texto y queda ilegible. Ya pasó
  dos veces. Si un color no se aplica, es esto antes que cualquier otra cosa.

## Cambiar el fondo

Es una sola imagen, `public/fondo.jpg`. La clase que la pone es `.tfondo` en
`src/styles/tienda.css`. Si se cambia por otra imagen, hay que medirle el punto
más claro: si el fondo aclara demasiado, el texto gris deja de cumplir contraste
y hay que recalcular los tonos.

## Cambiar precios, códigos, promociones o el ciclo

Desde el panel, o en la base. **Nunca en el código.**

El **código de proveedor es sagrado**: sin ese número no se puede cargar la
orden en el sistema de la proveedora, y un pedido sin código es un pedido
inútil. Ya hubo un cambio que lo iba a borrar al editar un precio. Si algo lo
pone en riesgo, hay que frenar.

---

## Cómo está repartido el proyecto

```
src/
  config/       textos y números editables (contenido.js, ajustes.js)
  components/
    tienda/     la web pública que ve la clienta
    panel/      las pantallas de gestión
    layout/     la estructura del panel
    auth/       ingreso al panel
    ui/         piezas sueltas que se reusan
  hooks/        pedidos a la base y comportamientos de pantalla
  lib/          reglas del negocio, sin nada visual
  data/         constantes y el índice de fotos que genera el script
  styles/       las variables y el sistema visual de la tienda
scripts/fotos/  el pipeline de imágenes, en tres pasos
supabase/       las migraciones de la base
public/         fotos, fondo e íconos
```

Lo importante de esa división: **`lib/` no sabe nada de pantallas y
`components/` no calcula reglas de negocio.** Las promociones 2x1 se calculan en
`src/lib/promos.js` y se pueden probar sin abrir la web. El armado del mensaje
de WhatsApp está en `src/lib/whatsapp.js`. Si una cuenta da mal, el error está
en `lib/`, no en la pantalla.

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
