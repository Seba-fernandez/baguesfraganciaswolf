# Bagues Grupo Wolf

Tienda y panel de gestión para una reventa de perfumería en Córdoba, Argentina.
Reemplaza un circuito que antes vivía repartido entre Instagram, Drive y Linktree.

**En producción:** https://crm-de-alquileres-de-vajilla.vercel.app

> Este archivo es la memoria del proyecto. Lo que está escrito acá no se borra
> cuando algo cambia: se agrega abajo. La idea es poder leerlo de arriba hacia
> abajo y entender cómo fue creciendo y por qué se decidió cada cosa.

---

## Qué resuelve

Vendo perfumes por WhatsApp. El catálogo de mi proveedora cambia todos los
meses: dos listas nuevas, más de cien aromas, precios que se mueven y
promociones que duran un ciclo. Antes eso era mandar un PDF por chat, que la
clienta me preguntara precio por precio, y anotar los pedidos a mano.

El sistema tiene que sacarme trabajo, no agregarme. Ese fue el criterio con el
que se decidió todo:

1. Si una función me obliga a entrar todos los días a mantenerla, no va.
2. Si se rompe, tengo que poder seguir vendiendo igual.
3. Cargar el ciclo nuevo tiene que llevarme menos de media hora, o el proyecto
   se abandona solo en el mes tres.

No hay pasarela de pago y no la va a haber. El cierre es hablando por WhatsApp,
porque ahí es donde pido la seña y donde acuerdo la entrega. La web arma el
pedido, no lo cobra.

---

## Herramientas y lenguajes

Esto es la base fija del proyecto.

| Qué | Con qué |
|---|---|
| Lenguajes | JavaScript (ES2022), HTML, CSS, SQL |
| Interfaz | React 18 |
| Compilador y servidor de desarrollo | Vite 5 |
| Recorrido interno de páginas | React Router 7 |
| Estilos | CSS Modules y variables CSS. Sin Tailwind ni biblioteca de componentes |
| Base de datos | PostgreSQL, en Supabase |
| Ingreso al panel | Supabase Auth con cuenta de Google |
| Seguridad de datos | Políticas de fila (Row Level Security) en todas las tablas |
| Archivos | Supabase Storage |
| Tres dimensiones | Three.js |
| Movimiento | CSS nativo. GSAP disponible, casi sin usar |
| Publicación | Vercel, automática desde la rama principal |
| Versionado | Git y GitHub |

El desarrollo lo hice acompañado por Claude Code: dirigiendo las decisiones,
revisando lo que salía y corrigiendo lo que no cerraba. Lo aclaro porque hoy
trabajar así es parte del oficio, y prefiero decirlo antes que disimularlo.

---

## Cómo está armado

Una sola aplicación con dos zonas que comparten la misma base de datos:

- **La tienda**, en la raíz. Pública, sin cuenta ni registro. Catálogo,
  buscador, filtros, ficha de cada aroma y armado del pedido.
- **El panel**, en `/panel`. Privado: entra una sola cuenta de correo, la mía.
  Pedidos, catálogo y ajustes.

Las dos zonas se cargan por separado, así que quien entra a comprar no descarga
el código del panel.

### La base

Seis tablas: productos, pedidos, renglones de pedido, clientes, ajustes y
promociones. Todas con políticas de fila activas.

Lo que más me costó entender, y lo que más me sirvió después, es que la
seguridad no se pone en el navegador. Los precios no se toman de lo que manda
la página: cuando entra un pedido, una función del servidor busca el precio
real en la base. Si alguien edita el precio desde las herramientas del
navegador, no le sirve de nada.

### Cómo se guarda un pedido

La tienda no escribe en las tablas. Tiene un solo camino de entrada: una
función en la base que valida el nombre, normaliza el teléfono, limita la
cantidad de renglones y busca los precios del lado del servidor. Es el único
lugar por donde la web puede dejar algo escrito.

---

## Decisiones que vale la pena contar

### El catálogo se ordena por aroma, no por código de proveedora

Mi proveedora publica dos listas y muchos perfumes aparecen en las dos con
nombres distintos: el mismo aroma se llama Arizona en una y Sauvage en la otra.
Son más de treinta casos.

Si los muestro como productos separados, la clienta ve dos cosas que parecen no
tener relación y son lo mismo en otro tamaño. Entonces la unidad del catálogo
pasó a ser el aroma: una ficha por perfume, y los tamaños de las dos listas
quedan adentro como opciones. El nombre que le pone cada proveedora va en letra
chica dentro de la opción, que es el único lugar donde me sirve.

### El código de proveedora tiene que sobrevivir hasta el final

Cada tamaño tiene un código con el que cargo la orden en el sistema de mi
proveedora. Un pedido sin ese código no lo puedo cargar: es papel mojado.

Ese código viaja desde la ficha, entra al pedido, queda guardado en la base y
sale escrito en el mensaje de WhatsApp:

```
[10281126] L* B*MB* 50ml (Granada) x2
```

### Las promociones son un dato, no programación

El 2x1 del ciclo está guardado en la tabla de ajustes, no escrito adentro del
programa. Cuando cambia el ciclo, cambio el dato y la web se acomoda sola. Si
lo hubiera dejado escrito en el código, cada mes tendría que tocar el programa,
que es justo el trabajo que quiero evitar.

La cuenta es por grupos que no se mezclan entre sí. Para cada grupo:

```
subtotal = techo(unidades / 2) x precio del par
```

De ahí sale un detalle que mueve plata: **llevar tres cuesta lo mismo que
llevar cuatro**. Cuando el pedido queda impar, el carrito lo dice y ofrece
sumar uno más sin pagar nada extra.

### El aviso automático se borró a propósito

Tenía un aviso que me llegaba por WhatsApp cada vez que entraba un pedido. Lo
saqué por dos razones.

La primera es que estaba repetido: cuando la clienta confirma, el mensaje sale
de su teléfono, así que ya me llega en la conversación con ella y con el hilo
abierto. El del robot llegaba aparte y me obligaba a copiar el número a mano
para empezar a hablar. Me agregaba trabajo.

La segunda es que estaba mal hecho: se disparaba al crear el pedido, pero los
renglones y el total se escriben un instante después. El aviso podía salir con
el pedido vacío y en cero.

En su lugar no puse nada nuevo que mantener. El panel ya escuchaba la tabla en
vivo, así que ahora la cantidad de pedidos sin abrir aparece en el título de la
pestaña.

### Cuatro superficies con desenfoque, no ciento cuatro

El efecto de vidrio translúcido usa `backdrop-filter`, que es de lo más caro
que dibuja un navegador. Puesto en las cien tarjetas del catálogo, funde un
teléfono de gama media, que es justo donde me compran.

El desenfoque quedó solo en las superficies que flotan: el encabezado, la
ficha, el pedido y las promociones del inicio. Las tarjetas usan una versión
sin desenfoque que igual se ve translúcida, porque el fondo se ve a través.
Medido sobre la página publicada: cuatro elementos con desenfoque, no cien.

### El fondo animado no es una foto

Las líneas de luz que cruzan el fondo son gradientes animados, no una imagen
descargada. Una foto habría pesado cientos de kilobytes contra un presupuesto
de ciento cincuenta hasta que se ve el primer perfume, y habría traído zonas
claras impredecibles justo donde el texto tiene que leerse.

---

## Errores que encontré, y cómo los encontré

Esta es la parte que más me enseñó, así que la dejo escrita con nombre y
apellido.

### Un error que todavía no había pasado, pero iba a pasar

El editor del panel guardaba cada tamaño con tres datos: mililitros, precio y
si está disponible. El problema es que en la base cada tamaño tiene además el
código de proveedora, la línea y el grupo de promoción.

La primera vez que yo tocara un precio desde el panel, esos datos se borraban.
Y como el precio es justo lo que cambio todos los meses, iba a pasar seguro. El
resultado habrían sido pedidos de ese aroma sin código, imposibles de cargar.

Se arregló conservando los datos originales al guardar. Ahora además el código
se ve en el editor, para poder controlarlo de un vistazo.

### Productos que desaparecían y no volvían

Tocando los filtros del catálogo varias veces, algunos perfumes quedaban
invisibles para siempre.

La causa: la aparición gradual se enganchaba una sola vez, al cargar la página.
Cuando el filtro cambia se crean tarjetas nuevas que ese enganche ya no ve, y
quedaban con transparencia en cero para siempre. Se resolvió con un observador
que vigila el contenido nuevo mientras la página viva.

### Un botón ilegible por una regla de prioridad

Los botones que son enlaces quedaban con texto claro sobre fondo ámbar: dos a
uno de contraste, ilegible. Los que son botones comunes estaban bien, y por eso
mirando la pantalla no saltaba.

La causa es la prioridad de las reglas de estilo: la regla que pinta los
enlaces le ganaba a la del botón. Lo encontré midiendo el contraste sobre la
página publicada, no mirándola. Quedó en siete y medio a uno.

Lo mismo me volvió a pasar una hora después con otra regla que nunca se
aplicaba. La borré en vez de dejarla: una regla que miente sobre lo que hace es
peor que no tenerla.

### El texto más tenue se caía por debajo del mínimo

Cuando sumé el fondo con líneas de luz, calculé el contraste componiendo las
capas y el texto terciario daba tres con nueve a uno, debajo del mínimo
aceptable. Contra el fondo plano daba cinco con uno, por eso no se veía venir.

Recalculé los dos niveles de texto contra el peor fondo posible, no contra el
plano. Es la diferencia entre medir la parte cómoda y medir donde de verdad
falla.

### El panel daba error y no era el programa

Escribiendo la dirección del panel me aparecía un error. No era mi código:
faltaba un archivo de configuración. La página es una sola y el recorrido
interno lo resuelve el navegador, pero el servidor buscaba un archivo físico en
esa dirección, no lo encontraba y cortaba antes de que la aplicación arrancara.
Se resolvió con cuatro líneas.

### Un dato de prueba llegando a la tienda

Había un producto que se llamaba literalmente "456", visible para cualquiera
que entrara. Se limpió el dato y además quedó una defensa en el programa: un
producto con nombre puramente numérico no se muestra aunque exista.

---

## Lo que aprendí

- **Verificar antes de afirmar.** Casi todos los errores de arriba aparecieron
  midiendo sobre la página de verdad: contraste calculado sobre lo que dibuja
  el navegador, capturas a varios anchos de pantalla, consultas a la base real.
  Mirando la pantalla, ninguno saltaba.
- **Medir donde falla, no donde es cómodo.** El contraste contra el fondo plano
  daba bien; contra el peor fondo posible, no.
- **La seguridad va del lado del servidor.** Los precios se buscan en la base
  cuando entra el pedido. Lo que manda el navegador no se confía.
- **Lo que se configura no se programa.** Las promociones y los textos del
  ciclo son datos editables. Escritos adentro del código, cada mes sería
  trabajo de programación.
- **El rendimiento es una decisión de diseño, no un ajuste del final.** Dónde
  poner el desenfoque, o si el fondo es una foto o un gradiente, define si la
  página anda en un teléfono común.
- **Un sistema que agrega trabajo está fallado**, por bien construido que esté.
  Por eso saqué el aviso automático en vez de arreglarlo.
- **Borrar también es avanzar.** El aviso repetido, la regla de estilo que no
  hacía nada, y un intento de dibujar los frascos en tres dimensiones que
  bloqueaba la pantalla varios segundos: los tres se fueron y el proyecto quedó
  mejor.

---

## Estado

Andando en producción:

- Catálogo del ciclo con más de cien aromas y sus tamaños.
- Buscador por nombre o por el perfume en el que se inspira, y filtros por
  género y por promoción.
- Ficha por aroma con pirámide olfativa y los tamaños de las dos listas.
- Pedido con la cuenta del 2x1 y el aviso de "te falta uno".
- Mensaje de WhatsApp armado con el código de proveedora de cada renglón.
- Panel privado con pedidos, catálogo y ajustes.
- Vista previa con imagen propia cuando se pega el enlace en WhatsApp.

Pendiente:

- Las fotos de los frascos. Hoy cada aroma muestra su inicial. Es lo que más
  falta.
- Bajar el peso de la página de inicio.
- Generar el HTML de la tienda al momento de publicar, para que se lea sin
  esperar a que cargue el programa.

---

## Cómo correrlo

```bash
npm install
npm run dev
```

Hacen falta dos variables de entorno en un archivo `.env`:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

La dirección raíz es la tienda. El panel está en `/panel` y pide cuenta de
Google; solo entra el correo autorizado en la base.

---

*Última actualización: septiembre de 2026.*
