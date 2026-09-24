# Arquitectura

Cómo está armado el sistema por dentro: las dos zonas, la base, el único camino
de escritura y las convenciones. Para cambiar cosas del día a día está
[`EDITAR.md`](EDITAR.md); para el diseño, [`DISENO.md`](DISENO.md).

---

## Dos zonas, una base

Una sola aplicación React con dos zonas que comparten la misma base de datos:

| Zona | Dónde | Quién entra |
| --- | --- | --- |
| **Tienda** | `/` y `/catalogo` | Cualquiera. Sin cuenta, sin registro |
| **Panel** | `/panel` | Una sola cuenta de Google, la del dueño |

Se cargan por separado (`React.lazy`), así que quien entra a comprar no descarga
el código del panel.

La web de la proveedora —donde se cargan las órdenes— queda **afuera del
sistema**: no hay integración ni scraping. Esta app organiza el lado de acá.

---

## Las seis tablas

| Tabla | Qué guarda | Detalle que importa |
| --- | --- | --- |
| `products` | El catálogo, una fila por aroma | Los tamaños viven en `presentaciones` (JSON): mililitros, precio, código de proveedor, línea y grupo de promoción |
| `customers` | Clientes | Teléfono único y normalizado (`549351…`) |
| `orders` | Pedidos | Número correlativo, estado, pago, seña, canal (web o manual) y notas de la conversación |
| `order_items` | Renglones del pedido | Guarda `nombre_snapshot` y el precio del momento: si mañana cambia el precio, el pedido viejo no se reescribe |
| `promos` | Promos editables del inicio | |
| `settings` | Configuración, una sola fila | WhatsApp, Instagram, aclaraciones y el enlace al catálogo en PDF |

Todas con **políticas de fila (RLS)** activas. El resumen:

- `products`, `promos` y `settings`: **lectura pública**, escritura solo del admin.
- `customers`, `orders` y `order_items`: **nada público**. Solo el admin, que se
  resuelve con la función `es_admin()` contra el correo autorizado.

---

## El único camino de escritura

La tienda **no escribe en las tablas**. Tiene una sola puerta: la función
`crear_pedido_web()` en la base, que valida el nombre, normaliza el teléfono,
limita la cantidad de renglones y **busca los precios del lado del servidor**.

Eso es lo que hace que no importe lo que mande el navegador: si alguien edita un
precio desde las herramientas del navegador, la función usa igual el precio real
de la base. La seguridad no está en la pantalla.

### Del pedido al mensaje

```
tienda  →  crear_pedido_web()  →  orders + order_items  →  panel (Realtime)
                                          ↓
                          WhatsApp armado en el teléfono de la clienta
```

El mensaje sale del teléfono de ella, así que la conversación queda abierta del
lado del vendedor con su número y su hilo. **No hay aviso automático**: había
uno y se sacó a propósito (estaba duplicado y además se disparaba antes de que
se escribieran los renglones, así que podía llegar vacío y en cero). El panel ya
escucha la tabla por Realtime y muestra los pedidos sin abrir en el título de la
pestaña.

El **código de proveedor** viaja desde la ficha, entra al pedido, queda guardado
y sale escrito en el mensaje. Sin ese número la orden no se puede cargar en el
sistema de la proveedora: un pedido sin código es papel mojado.

### Las promociones son un dato

El 2x1 del ciclo está en la base, no escrito en el programa. La cuenta es por
grupos que no se mezclan:

```
subtotal = techo(unidades / 2) × precio del par
```

De ahí sale que **llevar tres cuesta lo mismo que llevar cuatro**: cuando el
pedido queda impar, el carrito lo dice y ofrece sumar uno sin pagar de más. La
cuenta vive en [`src/lib/promos.js`](../src/lib/promos.js) y se puede probar sin
abrir la web.

---

## Cómo está repartido el código

```
src/
  config/       textos y números editables (contenido.js, ajustes.js)
  components/
    tienda/     la web pública que ve la clienta
    panel/      las pantallas de gestión, con PanelApp.jsx como puerta
    layout/     la estructura del panel
    auth/       ingreso al panel
    ui/         piezas sueltas que se reusan
  hooks/        pedidos a la base y comportamientos de pantalla
  lib/          reglas de negocio y material visual, sin JSX
  data/         constantes y los índices de fotos que generan los scripts
  styles/       tienda.css (tienda) y global.css (panel)
  entry-server.jsx  solo para el build: dibuja la portada como HTML
scripts/
  fondo/        genera la escena del hero, la textura, y las rasteriza a WebP
  fotos/        el pipeline de imágenes, en cinco pasos
  prerender.mjs pega la portada dibujada y el CSS dentro de dist/index.html
supabase/
  migrations/   el esquema, las políticas y la función de pedido
public/         fotos, fuentes, escena del hero, íconos y los archivos de raíz
                (robots.txt, sitemap.xml, llms.txt, .well-known/)
```

### La frontera entre la tienda y el panel

Es la división que más pesa, y no es estética: **la tienda pública no carga
`@supabase/supabase-js`.** Lee las dos tablas que necesita con `fetch` contra
PostgREST (`lib/apiTienda.js`), y el cliente completo —auth, realtime, storage—
vive únicamente adentro de `components/panel/PanelApp.jsx`, que es un chunk que
la tienda nunca pide. Con él viajan los dos contextos y `global.css`.

Si alguna vez un componente de `tienda/` importa `lib/supabase`, ese ahorro se
pierde entero y en silencio. El porqué, con los números, está en
[`CONTEXTO.md`](CONTEXTO.md#rendimiento-la-deuda-que-se-pagó).

La división que importa: **`lib/` no sabe nada de pantallas y `components/` no
calcula reglas de negocio.** Si una cuenta da mal, el error está en `lib/`.

| Archivo | Qué resuelve |
| --- | --- |
| `lib/promos.js` | La cuenta del 2x1 por grupos |
| `lib/whatsapp.js` | El armado del mensaje con los códigos |
| `lib/producto.js` | Qué presentaciones se publican y cómo se titula un aroma |
| `lib/vidrioLiquido.js` | La lente del vidrio (ver [`DISENO.md`](DISENO.md)) |
| `lib/apiTienda.js` | La lectura del catálogo y el envío del pedido, sin supabase-js |
| `hooks/useDatosTienda.js` | Los datos de la tienda pública, en un pedido por tabla |
| `hooks/useReveal.js` | Las apariciones al hacer scroll |

---

## Convenciones

- **Todo en castellano**: tablas, columnas, variables, carpetas y mensajes de
  commit. Sin mezclar idiomas a mitad de camino.
- Componentes en `PascalCase.jsx`, con su `Componente.module.css` al lado.
- Ganchos en `useAlgo.js`, utilidades en minúscula.
- Las clases globales de la tienda arrancan con `t` (`.tglass`, `.tbtn`, `.tnum`)
  para que se distingan de las de módulo.
- Los textos visibles **no se escriben en los componentes**: van en
  `src/config/contenido.js`.

---

## Entorno y publicación

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Son las claves públicas, las mismas con las que la web lee el catálogo. **El
repositorio es público: no va ninguna clave secreta en ningún archivo.**

Vercel publica solo desde la rama principal. `vercel.json` tiene la reescritura
que hace falta para que una dirección interna como `/catalogo` o `/panel` no
devuelva error al entrar directo: la aplicación es una sola página y el recorrido
lo resuelve el navegador.

---

## Lo que no se toca sin autorización explícita

- La estructura de `products`, `orders`, `order_items`, `customers` y `settings`.
- La función `es_admin()` y las validaciones dentro de `crear_pedido_web()`.
- Las políticas de seguridad por fila.
- El aviso legal.
- Los códigos de proveedor.
