# Bagues Grupo Wolf

Tienda y panel de gestión para una venta de perfumería en Córdoba, Argentina.
Reemplaza un circuito que vivía repartido entre Instagram, Drive, un catálogo en
PDF y campañas que cambian todos los meses.

**En producción:** https://baguesfraganciaswolf.vercel.app

| | |
| --- | --- |
| Contexto de trabajo para Claude Code (leer antes de tocar nada) | [`CLAUDE.md`](CLAUDE.md) |
| Qué es esto, por qué existe y en qué estado está | [`docs/CONTEXTO.md`](docs/CONTEXTO.md) |
| Sistema visual y kit de marca | [`docs/DISENO.md`](docs/DISENO.md) |
| El esqueleto reutilizable en otro proyecto | [`docs/KIT.md`](docs/KIT.md) |
| Cómo está armado por dentro | [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) |
| Qué tocar para cambiar qué | [`docs/EDITAR.md`](docs/EDITAR.md) |

---

## Qué resuelve

Vendo perfumes por WhatsApp. El catálogo de mi proveedora cambia todos los
meses: dos listas nuevas, más de cien aromas, precios que se mueven y
promociones que duran un ciclo. Antes eso era mandar un PDF por chat, que la
clienta preguntara precio por precio, y anotar los pedidos a mano.

El sistema tiene que sacarme trabajo, no agregarme. Ese fue el criterio con el
que se decidió todo:

1. Si una función me obliga a entrar todos los días a mantenerla, no va.
2. Si se rompe, tengo que poder seguir vendiendo igual.
3. Cargar el ciclo nuevo tiene que llevarme menos de media hora, o el proyecto
   se abandona solo en el mes tres.

No hay pasarela de pago y no la va a haber. El cierre es hablando por WhatsApp,
porque ahí pido la seña y acuerdo la entrega. La web arma el pedido, no lo cobra.

---

## Herramientas

| Qué | Con qué |
| --- | --- |
| Lenguajes | JavaScript (ES2022), HTML, CSS, SQL |
| Interfaz | React 18 |
| Compilador y servidor de desarrollo | Vite 5 |
| Recorrido interno de páginas | React Router 7 |
| Estilos | CSS Modules y variables CSS. Sin Tailwind ni biblioteca de componentes |
| Base de datos | PostgreSQL, en Supabase |
| Ingreso al panel | Supabase Auth con cuenta de Google |
| Seguridad de datos | Políticas de fila (RLS) en todas las tablas |
| Archivos | Supabase Storage |
| Movimiento | CSS nativo, sin librería: `@keyframes` para la entrada y `animation-timeline` para el parallax |
| Gráficos | SVG generado por scripts propios. Sin fotos de banco ni 3D |
| Publicación | Vercel, automática desde la rama principal |
| Versionado | Git y GitHub |

El desarrollo lo hice acompañado por Claude Code: dirigiendo las decisiones,
revisando lo que salía y corrigiendo lo que no cerraba. Lo aclaro porque hoy
trabajar así es parte del oficio, y prefiero decirlo antes que disimularlo.

---

## Qué hay en la web

**La tienda** (`/`) abre con una escena de dunas al atardecer, dibujada por un
script, con los frascos del ciclo parados sobre la arena y su sombra de contacto. Abajo, la
promoción del ciclo en barras de cristal, la cinta de nombres reconocibles, una
selección curada, quiénes somos y los tres pasos de cómo funciona. El catálogo
completo vive en su propia página (`/catalogo`) con buscador, filtros por género,
temporada, rebaja y promoción del ciclo, y paginado.

Cada aroma abre una ficha con la pirámide olfativa y los tamaños de las dos
líneas. Cada tamaño dice de qué línea es ("Unlock" o "Bagues, caja Arizona") y
muestra el precio de lista tachado. El pedido se arma en un cajón lateral,
calcula el 2x1 cuando el ciclo lo tiene y termina en un mensaje de WhatsApp
listo para enviar.

Los perfumes se muestran con su **nombre oficial**, que es como la gente los
busca. El pie aclara que son versiones inspiradas.

**El panel** (`/panel`) es privado: pedidos por estado, catálogo con edición
rápida de precio y disponibilidad para la carga mensual, clientes y ajustes.
Abre las pestañas al instante: apenas se confirma la sesión trae todo y lo deja
en memoria.

La dirección de arte, la paleta, el material de vidrio y los fondos generados
están explicados en [`docs/DISENO.md`](docs/DISENO.md).

---

## Decisiones que vale la pena contar

### El catálogo se ordena por aroma, no por código de proveedora

Mi proveedora publica dos listas y muchos perfumes aparecen en las dos con
nombres distintos: el mismo aroma se llama Arizona en una y Sauvage en la otra.
Son más de treinta casos.

Si los muestro como productos separados, la clienta ve dos cosas que parecen no
tener relación y son lo mismo en otro tamaño. Entonces la unidad del catálogo
pasó a ser el aroma: una ficha por perfume, y los tamaños de las dos listas
quedan adentro como opciones. De qué línea es cada tamaño, y el nombre de la
caja de Bagués, va en letra chica dentro de la opción, que es el único lugar
donde me sirve.

### El código de proveedora tiene que sobrevivir hasta el final

Cada tamaño tiene un código con el que cargo la orden en el sistema de mi
proveedora. Un pedido sin ese código no lo puedo cargar: es papel mojado.

Ese código viaja desde la ficha, entra al pedido, queda guardado en la base y
sale escrito en el mensaje de WhatsApp:

```
[10281126] La Bomba 50ml (Bagues, caja Granada) x2
[20282009] Invictus 100ml (Unlock) x1
```

### Lo que se configura no se programa

La promoción del ciclo (el 2x1, cuando hay) está guardada en la base, no escrita
adentro del programa.
Cuando cambia el ciclo, cambio el dato y la web se acomoda sola. Lo mismo con
los textos: cada frase visible está en `src/config/contenido.js` y los números
que uno alguna vez quiere mover, en `src/config/ajustes.js`. Los componentes no
tienen texto propio.

Si estuviera escrito en el código, cada mes tendría que tocar el programa, que es
justo el trabajo que quiero evitar.

### El aviso automático se borró a propósito

Tenía un aviso que me llegaba por WhatsApp cada vez que entraba un pedido. Lo
saqué por dos razones.

La primera es que estaba repetido: cuando la clienta confirma, el mensaje sale
de su teléfono, así que ya me llega en la conversación con ella y con el hilo
abierto. El del robot llegaba aparte y me obligaba a copiar el número a mano.
Me agregaba trabajo.

La segunda es que estaba mal hecho: se disparaba al crear el pedido, pero los
renglones y el total se escriben un instante después. El aviso podía salir con
el pedido vacío y en cero.

En su lugar no puse nada nuevo que mantener. El panel ya escuchaba la tabla en
vivo, así que la cantidad de pedidos sin abrir aparece en el título de la
pestaña.

### El vidrio es una lente, y la lente tiene presupuesto

El efecto de cristal no es un panel translúcido: el canto **refracta** el fondo,
con un mapa de desplazamiento calculado para el tamaño exacto de cada elemento.
Se ve en los botones, las barras de promoción y los controles.

Pero es caro. Medido con un scroll instrumentado, ponerlo también en las placas
grandes y en las doce tarjetas del catálogo tiraba el scroll a 15-25 cuadros por
segundo. Quedó solo en los controles y en una sola pasada de desplazamiento; en
las placas alcanza el vidrio de CSS. Con eso el tiempo de cuadro quedó igual que
sin el efecto.

Es el mismo criterio de siempre en este proyecto: el rendimiento es una decisión
de diseño, no un ajuste del final. Me compran desde un teléfono de gama media.

### Los fondos los dibuja un script

La escena del hero y la textura de la página son SVG generados
(`npm run fondo`), no fotos. Una foto habría pesado cientos de kilobytes contra
un presupuesto de 150 kB hasta que se ve el primer perfume, y habría traído
zonas claras impredecibles justo donde el texto tiene que leerse. Además, el
vidrio necesita algo con detalle detrás para leerse como vidrio: sobre negro
liso, cualquier cristal es un panel gris.

---

## Errores que encontré, y cómo los encontré

Esta es la parte que más me enseñó, así que la dejo escrita con nombre y
apellido.

### Un error que todavía no había pasado, pero iba a pasar

El editor del panel guardaba cada tamaño con tres datos: mililitros, precio y si
está disponible. En la base cada tamaño tiene además el código de proveedora, la
línea y el grupo de promoción.

La primera vez que yo tocara un precio desde el panel, esos datos se borraban. Y
como el precio es justo lo que cambio todos los meses, iba a pasar seguro. El
resultado habrían sido pedidos sin código, imposibles de cargar. Se arregló
conservando los datos originales al guardar, y ahora el código se ve en el
editor.

### Productos que desaparecían y no volvían

Tocando los filtros del catálogo varias veces, algunos perfumes quedaban
invisibles para siempre. La causa: la aparición gradual se enganchaba una sola
vez, al cargar la página. Cuando el filtro cambia se crean tarjetas nuevas que
ese enganche ya no ve, y quedaban con transparencia en cero. Se resolvió con un
observador que vigila el contenido nuevo mientras la página viva.

### Un botón ilegible por una regla de prioridad

Los botones que son enlaces quedaban con texto claro sobre el acento: dos a uno
de contraste. Los que son botones comunes estaban bien, y por eso mirando la
pantalla no saltaba. La causa es la prioridad de las reglas de estilo: la regla
que pinta los enlaces le ganaba a la del botón. Lo encontré midiendo el
contraste, no mirándolo.

Lo mismo volvió a pasar con el vidrio: la regla que lo posiciona le ganaba a la
del componente, y el botón de "volver arriba" —que tiene que quedar fijo en la
esquina— apareció pegado al borde izquierdo. Se arregló bajándole la prioridad a
la regla genérica con `:where()`, para que el componente siempre gane.

### El texto más tenue se caía por debajo del mínimo

Cuando sumé el fondo con textura, calculé el contraste componiendo las capas y
el texto terciario daba 3,9:1, debajo del mínimo. Contra el fondo plano daba
5,1:1, por eso no se veía venir. Lo mismo pasó con el cristal transparente sobre
la arena clara del hero: 2,5:1. Se resolvió ahumando ese vidrio hasta ~4,8:1.

Es la diferencia entre medir la parte cómoda y medir donde de verdad falla.

### El panel daba error y no era el programa

Escribiendo la dirección del panel me aparecía un error. No era mi código:
faltaba un archivo de configuración. La página es una sola y el recorrido
interno lo resuelve el navegador, pero el servidor buscaba un archivo físico en
esa dirección y cortaba antes de que la aplicación arrancara. Se resolvió con
cuatro líneas.

### El panel no dejaba entrar, y no era la contraseña

Al iniciar sesión con Google aparecía un error de "no existe". Eran dos cosas
juntas. Supabase seguía devolviendo a la dirección vieja del proyecto, que
después del cambio de nombre ya no existía. Y cuando sí volvía, traía el permiso
en otro formato (`#access_token` en vez de `?code=`), que la tienda no reconocía:
la sesión se perdía en la portada. Se resolvió redirigiendo el dominio viejo al
nuevo y atajando las tres formas de vuelta. De paso, el panel dejó de ofrecer
email y contraseña: la cuenta del panel es de Google y no tiene contraseña, así
que esa opción solo confundía y no existe ninguna clave que se pueda filtrar.

### Las fotos se fueron todas a la vez

Después de cambiar una foto, ninguna se veía. Las tarjetas piden versiones más
chicas de cada imagen para el celular, y al regenerar las fotos esas versiones
se borraron y no se volvieron a crear antes de publicar. El servidor contestaba
esas direcciones con la página en vez de un error, así que nada avisaba. Ahora
la publicación las genera siempre, y para verificar se mira si la imagen tiene
ancho real, no si el servidor dijo que sí.

### La barra del panel se iba al fondo

La barra de abajo del panel tenía que quedar fija, y aparecía al final de la
página. Otra vez prioridad de reglas: el estilo genérico de las cajas le ponía
posición relativa y le ganaba a la posición fija de la barra. Las cajas ya no
traen posición propia.

### Un dato de prueba llegando a la tienda

Había un producto que se llamaba literalmente "456", visible para cualquiera. Se
limpió el dato y además quedó una defensa en el programa: un producto con nombre
puramente numérico no se muestra aunque exista.

---

## Lo que aprendí

- **Verificar antes de afirmar.** Casi todos los errores de arriba aparecieron
  midiendo sobre la página de verdad: contraste calculado sobre lo que dibuja el
  navegador, capturas a seis anchos de pantalla, tiempos de cuadro durante un
  scroll real. Mirando la pantalla, ninguno saltaba.
- **Medir donde falla, no donde es cómodo.**
- **La seguridad va del lado del servidor.** Los precios se buscan en la base
  cuando entra el pedido. Lo que manda el navegador no se confía.
- **El rendimiento es una decisión de diseño**, no un ajuste del final.
- **Un sistema que agrega trabajo está fallado**, por bien construido que esté.
  Por eso saqué el aviso automático en vez de arreglarlo.
- **Borrar también es avanzar.** El aviso repetido, una regla de estilo que no
  hacía nada, y el frasco en tres dimensiones que bloqueaba la pantalla varios
  segundos y pesaba medio megabyte: los tres se fueron y el proyecto quedó mejor.
  Lo mismo con el fondo animado del panel: era lindo y lo hacía trabar.
- **Que el servidor diga que sí no prueba nada.** Una imagen que responde bien
  puede no ser una imagen. Se verifica lo que ve la persona.

---

## Estado

Andando en producción, con el **ciclo 10/26** cargado (vigente hasta el 16 de
octubre):

- 101 aromas activos y 148 tamaños: 82 cajas Bagués de 50 ml y 66 frascos
  Unlock entre minis y 100 ml. 33 aromas están en las dos líneas.
- Fotos en 100 de los 101 aromas, todas con el mismo tratamiento y llenando el
  cuadro, cada línea con su propio envase.
- Nombres oficiales en toda la web, y la línea aclarada en cada tamaño.
- Buscador por nombre y filtros por género, temporada y rebaja (y por promoción
  cuando el ciclo la trae).
- Ficha por aroma con pirámide olfativa y los tamaños de las dos listas.
- Pedido con la cuenta del 2x1 y el aviso de "te falta uno" (este ciclo no
  trae 2x1, así que no se muestra).
- Mensaje de WhatsApp con el código de proveedora y la línea de cada renglón.
- Panel privado con pedidos, catálogo con fotos, clientes y ajustes, que abre
  cada pestaña al instante.
- Vista previa con imagen propia cuando se pega el enlace en WhatsApp.

Pendiente:

- La foto de Manhattan (Bagués, tipo 212 VIP): no está publicada en la web de la
  proveedora. Mientras tanto se muestra la inicial del aroma.
- Llevar el vidrio a la ficha y al cajón del pedido, que todavía son paneles
  opacos.

Hechos en septiembre de 2026: bajar el peso de la portada y generar su HTML al
publicar. PageSpeed en celular pasó de 70 a 96, y los bytes hasta el primer
dibujado de ~600 a ~116 kB. Está contado en
[`docs/CONTEXTO.md`](docs/CONTEXTO.md#rendimiento-la-deuda-que-se-pagó), con las
mediciones y con las tres ideas que sonaban bien y midieron peor.

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

```bash
npm run fotos    # arma las fotos de los envases a partir de scripts/fotos/fuentes.json
npm run fondo    # redibuja la escena del hero y la textura de la página
```

Cada foto tiene su fuente anotada en `scripts/fotos/fuentes.json` (la tienda de
la proveedora o un recorte del PDF del ciclo), y antes de publicar se revisan
todas juntas con su nombre al lado. Está explicado en
[`scripts/fotos/README.md`](scripts/fotos/README.md). Cómo se carga un ciclo
nuevo, paso a paso, está en [`CLAUDE.md`](CLAUDE.md).

---

*Última actualización: 2 de octubre de 2026.*
