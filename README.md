# Bagues Grupo Wolf

Tienda online y panel de gestión para mi venta de perfumes por WhatsApp, en
Córdoba, Argentina.

**En producción:** https://baguesfraganciaswolf.vercel.app

---

## En una frase

La clienta busca el perfume que ya conoce por su nombre, arma el pedido y lo
manda por WhatsApp con todo escrito. Yo lo gestiono desde un panel, y cada mes
cargo el catálogo nuevo subiendo los PDF de la proveedora.

No hay pasarela de pago y no la va a haber: la venta se cierra hablando, porque
ahí pido la seña y acuerdo la entrega. La web arma el pedido, no lo cobra.

## El problema

Revendo las fragancias de la casa Bagués. Vienen en dos líneas (Bagués, cajas de
50 ml con nombre de ciudad, y Unlock, frascos de 100 ml y minis) y el catálogo
cambia todos los meses: más de cien aromas, precios que se mueven, perfumes que
entran y salen.

Antes era mandar un PDF por chat, que la clienta preguntara precio por precio y
anotar los pedidos a mano. El criterio que manda sobre todo el proyecto es
simple: **el sistema tiene que sacarme trabajo, no agregarme.**

1. Si una función me obliga a entrar todos los días a mantenerla, no va.
2. Si algo se rompe, tengo que poder seguir vendiendo igual.
3. Cargar el ciclo nuevo tiene que llevar menos de media hora.

---

## Qué hace

**La tienda** (`/` y `/catalogo`)
- Cada perfume figura con su nombre oficial (Sauvage, La Bomba), que es como la
  gente lo busca. El pie aclara que son versiones inspiradas.
- Buscador tolerante ("savage", "good gril", "vainilla", "arizona" encuentran
  lo que tienen que encontrar) y filtros por a quién y por familia olfativa,
  varias a la vez, guardados en la dirección para compartir.
- Una ficha por aroma con su propio link, la pirámide de notas, los tamaños de
  las dos líneas con el ahorro y "si te gusta este, mirá también", con una flecha
  para volver al anterior.
- El pedido termina en un mensaje de WhatsApp listo para enviar, con el código
  de proveedora de cada renglón.

**El panel** (`/panel`, privado, solo con la cuenta de Google autorizada)
- Pedidos por estado, catálogo con edición rápida de precios y fotos, clientes y
  ajustes. Cada pestaña abre al instante.
- **Cargar un ciclo nuevo:** subo los PDF del Drive desde el celular, el panel
  los lee, compara por código contra la base y me muestra qué precios cambian,
  qué sale, qué vuelve y qué es nuevo. Recién con mi confirmación aplica, con
  copia de seguridad antes y todo o nada. Las cajas nuevas de Bagués se buscan
  en la web de la proveedora y la foto se arma sola sobre la pared de la tienda.
  Está contado en [`docs/CICLO.md`](docs/CICLO.md).

---

## Cómo está hecho

| Qué | Con qué |
| --- | --- |
| Interfaz | React 18, Vite 5, React Router 7 |
| Estilos | CSS Modules y variables CSS, sin Tailwind ni biblioteca de componentes |
| Movimiento | CSS nativo (`@keyframes`, `animation-timeline`) y Lenis para la ruedita en escritorio |
| Base de datos | PostgreSQL en Supabase, con políticas por fila (RLS) en todas las tablas |
| Ingreso al panel | Supabase Auth, solo con Google |
| Lectura de los PDF | pdf.js, en el navegador del panel |
| Funciones del servidor | Postgres (`crear_pedido_web`, `aplicar_ciclo`) y una Edge Function de Supabase |
| Portada | HTML pre-generado en cada publicación, con el precio ya escrito |
| Publicación | Vercel, automática desde `main` |
| Calidad | ESLint, pruebas con Node, banco de pruebas propio con Playwright, GitHub Actions |

Lo desarrollé acompañado por Claude Code: yo decido qué se hace, reviso todo en
mi celular y corrijo lo que no cierra; la IA escribe, mide y propone. Lo aclaro
porque hoy trabajar así es parte del oficio, y prefiero decirlo.

---

## Decisiones que vale la pena contar

### El catálogo se ordena por aroma, no por código de proveedora

El mismo perfume está en las dos líneas con nombres distintos: Arizona en Bagués
es Sauvage en Unlock. Si los muestro separados, la clienta ve dos cosas que
parecen distintas y son lo mismo en otro tamaño. Entonces la unidad es el aroma:
una ficha por perfume y los tamaños de las dos líneas adentro.

### El código de proveedora no se pierde nunca

Con ese código cargo la orden en el sistema de la proveedora. Viaja de la ficha
al pedido, a la base y al WhatsApp. Ningún cambio puede borrarlo: la carga del
ciclo compara por código, y lo que no viene en el catálogo nuevo se desactiva,
no se borra.

### Lo que cambia cada mes es un dato, no código

Los precios, el nombre del ciclo, la promoción y todos los textos visibles viven
en la base o en dos archivos de configuración. Si cada mes tuviera que tocar el
programa, sería justo el trabajo que quiero evitar.

### La seguridad va del lado del servidor

Los precios de un pedido se buscan en la base cuando entra, no se confía en lo
que manda el navegador. La carga del ciclo vuelve a validar todo en Postgres
antes de escribir: el navegador puede equivocarse, la base no.

### Borrar también es avanzar

Saqué un aviso automático de pedidos que me llegaba repetido (y a veces vacío),
un frasco en 3D que pesaba medio megabyte y trababa la pantalla, y un fondo
animado que hacía trabar el panel. El proyecto quedó mejor sin ellos.

---

## Cómo sé que funciona

- **94 chequeos automáticos** (`scripts/qa/recorrido.py`) recorren la tienda
  como una clienta: buscar, abrir fichas, armar un pedido, medir que el toque
  llegue al botón, contraste, accesibilidad, tamaños en tablet y escritorio. La
  base se simula: nada de eso escribe datos reales.
- **Safari, Chrome y Firefox en cinco anchos** (`scripts/qa/motores.py`) antes
  de publicar. Safari calcula distinto y ya me rompió dos pantallas que en
  Chrome se veían bien.
- **Pruebas de las reglas** (`npm test`): buscador, filtros, teléfono y nombre
  del pedido, armado de las páginas y lectura de los catálogos reales del ciclo
  10 (Unlock 66 de 66 tamaños, Bagués 82 de 82 precios).
- **En cada push** GitHub corre el revisor de código, las pruebas, la
  compilación y el banco.
- **Velocidad en el celular:** 97 en la portada y 90 en el catálogo (Lighthouse,
  mediana de cinco corridas contra producción, 27/10/2026).
- **Vigilancia:** cada dos días GitHub consulta la base para que Supabase no se
  pause, y cada lunes mide la velocidad. Si algo falla, abre un aviso que me
  llega por mail.

---

## Errores que encontré, y cómo

La parte que más me enseñó. Casi ninguno se veía mirando la pantalla.

- **El filtro que nadie vio.** En tablet y escritorio, el botón "Familia" del
  celular aparecía encima de los chips de familia y el buscador se estiraba. Una
  regla de estilos le ganaba a otra por estar más abajo en el archivo. Las
  pruebas miraban el celular y el escritorio por separado y nunca lo pararon: lo
  encontró una auditoría de medidas en nueve anchos. Ahora hay un chequeo que lo
  mide.
- **Durante días informé mal la velocidad.** Medía 86 contra un servidor de
  prueba que no comprimía los archivos; la tienda publicada daba 97. Una medición
  sirve para comparar versiones, no como resultado.
- **Un cambio de precio iba a borrar los códigos.** El editor del panel guardaba
  cada tamaño con tres datos y la base tenía seis. La primera vez que tocara un
  precio, los pedidos iban a quedar sin código. Se arregló antes de que pasara.
- **Un precio pegado mal en la portada.** Al escribir "$ 16.499" en el HTML, la
  secuencia `$&` se tomaba como un código especial del reemplazo de texto. Hoy
  cada reemplazo va con su prueba.
- **Fotos que respondían bien y no eran fotos.** El servidor contestaba con la
  página en vez de un error y las tarjetas quedaban vacías. Desde entonces se
  verifica que la imagen tenga ancho real, no que el servidor diga que sí.
- **Contraste que pasaba en el fondo liso y fallaba en la textura.** Se mide
  contra el peor fondo, no contra el cómodo.

---

## Lo que aprendí

- **Verificar antes de afirmar**, y medir donde falla, no donde es cómodo.
- **Lo que se siente lento no siempre es lento.** Una "pausa" en una sección era
  una animación que esperaba de más: medir antes de optimizar.
- **Una tanda de mediciones no alcanza para decidir.** Comparar versiones
  intercaladas y mirar la mediana.
- **El rendimiento es una decisión de diseño**, no un ajuste del final: compran
  desde un celular de gama media.
- **Un sistema que agrega trabajo está fallado**, por bien construido que esté.

---

## Estado

En producción con el ciclo 10 de 2026: 101 aromas, 148 tamaños y 100 aromas con
foto, todos en la misma escena.

En ramas, esperando mi revisión antes de publicar: el rediseño de la ficha y los
filtros (`fuentes-en-linea`), el orden del repo con el revisor y la vigilancia
(`orden`), y la carga del ciclo desde el panel con la auditoría de medidas
(`catalogo-panel`). Están encadenadas: `catalogo-panel` trae las otras dos.

Pendiente: la foto de Manhattan (no está en la web de la proveedora), fotos
propias de seis frascos de Unlock que hoy se ven blandas, y la primera carga real
del PDF de Bagués desde el panel.

---

## Cómo correrlo

```bash
npm install
npm run dev
```

Hacen falta dos variables en un archivo `.env` (las claves públicas de Supabase;
el repo es público y nunca lleva una clave secreta):

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

```bash
npm run build                                   # compila y pre-genera las páginas
npm run lint && npm test                        # revisor y pruebas
node scripts/qa/servir.mjs &                    # sirve dist/ como Vercel
python3 scripts/qa/recorrido.py --url http://localhost:4173
```

| Para saber más | |
| --- | --- |
| Por qué existe, decisiones y rendimiento | [`docs/CONTEXTO.md`](docs/CONTEXTO.md) |
| Cómo está armado por dentro | [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) |
| Qué tocar para cambiar qué | [`docs/EDITAR.md`](docs/EDITAR.md) |
| Sistema visual | [`docs/DISENO.md`](docs/DISENO.md) |
| Cargar un ciclo | [`docs/CICLO.md`](docs/CICLO.md) |
| Pruebas y registro de errores | [`docs/QA.md`](docs/QA.md) |
| Seguridad | [`docs/SEGURIDAD.md`](docs/SEGURIDAD.md) |
| Contexto para trabajar con Claude Code | [`CLAUDE.md`](CLAUDE.md) |

*Última actualización: 28 de octubre de 2026.*
