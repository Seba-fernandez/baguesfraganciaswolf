# Seguridad de la tienda

*Revisión del 23/10/2026, antes de publicar el rediseño D. La hizo Claude a
pedido de Sebas; él decide lo que queda marcado "para autorizar".*

## Resumen

La tienda no cobra ni guarda tarjetas: el pago se arregla por WhatsApp. Lo
que hay que cuidar es otra cosa: que nadie lea los pedidos y los teléfonos
de las clientas, que nadie cambie precios ni productos y que nadie llene el
panel de pedidos falsos. Lo primero y lo segundo están bien resueltos. Lo
tercero está acotado, con dos mejoras para autorizar.

| Tema | Estado |
| --- | --- |
| Datos privados (pedidos, clientas, teléfonos) | Bien. Solo los lee el admin |
| Cambiar productos, precios o ajustes | Bien. Solo el admin |
| Ingreso al panel | Bien. Solo Google, con el mail de Sebas |
| Fotos subidas | Bien. Solo el admin sube y borra |
| Claves en el repo (que es público) | Bien. Ninguna clave secreta, en ningún commit |
| Dependencias | Bien. `npm audit`: 0 vulnerabilidades |
| Cabeceras del sitio | **Mejorado hoy**: política de contenido (CSP) y HSTS |
| Pedidos falsos | Acotado. Las dos mejoras, **autorizadas y aplicadas el 23/10** |

## Lo que se revisó y cómo está

**1. Permisos de la base (RLS).** Todas las tablas tienen RLS. `customers`,
`orders` y `order_items` solo se leen y escriben si el token es de Sebas
(`es_admin()`). `products` y `promos` se leen públicos solo si están activos;
escribir, solo el admin. `settings` se lee público (WhatsApp, Instagram, textos:
datos que la web muestra igual) y solo el admin lo cambia.

**2. La única puerta de escritura: `crear_pedido_web()`.** Es `SECURITY
DEFINER` a propósito (el aviso del panel de Supabase sobre eso es esperado):
así la tienda puede crear un pedido sin poder leer ni tocar nada más. Ya
valida: nombre de hasta 120 caracteres, teléfono de 8 a 15 dígitos, de 1 a 40
ítems, cantidad de 1 a 20, **el precio lo busca la base** (no se puede mandar
un precio inventado), máximo 20 pedidos web por minuto y uno cada 15 segundos
por teléfono.

**3. Ingreso al panel.** Solo Google; el registro de usuarios nuevos y el
proveedor de mail y contraseña están apagados (ver `CLAUDE.md`, sección 12).
`es_admin()` compara el mail del token con `sebixtar@gmail.com`.

**4. Fotos (Storage).** Buckets `productos` y `promos`: lectura pública,
subir, cambiar y borrar solo el admin.

**5. Repo público.** Se buscó en toda la historia de git: no hay claves
secretas (`service_role`, `sb_secret`). La clave que usa la web (`anon`) es
pública por diseño; lo que la protege es el RLS. `.env` no se versiona.

**6. Código.** Sin `dangerouslySetInnerHTML` ni `eval`. El único `innerHTML`
(`lib/vidrioLiquido.js`) arma un filtro SVG con números calculados, sin texto
de nadie. React escapa todo lo que escribe una clienta (nombre, ítems) cuando
el panel lo muestra.

**7. Cabeceras (`vercel.json`).** Ya estaban: no se puede meter la tienda en un
iframe ajeno (`X-Frame-Options: DENY`), `nosniff`, `Referrer-Policy` y sin
permisos de cámara, micrófono, ubicación ni pago. **Sumado hoy:**

- **Content-Security-Policy.** El navegador solo carga scripts de la propia
  web y los dos scripts en línea de `index.html` (por su hash); solo se
  conecta con la propia web y con Supabase; no carga objetos, no se deja
  enmarcar y los formularios solo van a la propia web. Si alguien lograra
  meter un script, el navegador no lo corre.
- **Trampa evitada:** si se cambia un `<script>` de `index.html`, su hash
  cambia y el navegador lo bloquearía en silencio (por ejemplo, la vuelta del
  ingreso con Google). Por eso `scripts/prerender.mjs` frena el build y dice
  qué hash poner.
- **Strict-Transport-Security:** siempre https. `servir.mjs` no lo manda en
  local, porque sobre http Safari lo aplica igual y deja la página vacía.
- `upgrade-insecure-requests` se probó y se sacó: todo ya va por https y en
  local rompía Safari.

Probado con la política puesta: banco 84 de 84 y `motores.py` (Safari, Chrome y
Firefox, 5 anchos), sin un solo bloqueo en la consola.

## Autorizado y aplicado el 23/10 (migración `20261023_0011`)

A y B, con el OK de Sebas. Probado en una transacción que se deshace (cinco
casos) y, ya aplicado, desde afuera con la clave pública: un ítem sin
producto devuelve `item_invalido` sin escribir nada. C sigue opcional.

## Lo que se propuso

**A. Que un pedido no le cambie el nombre a una clienta.** Hoy, si alguien
pide con el teléfono de otra persona, el nombre de esa clienta en el panel pasa
a ser el que escribió. No expone datos, pero ensucia el panel y se presta a una
broma. Propuesta: si el teléfono ya existe, conservar el nombre guardado y
anotar el nuevo en el pedido.

**B. Que no entren ítems sin producto.** Hoy un ítem sin `product_id` entra con
el nombre que mande quien llama a la función (hasta 160 caracteres) y precio 0.
La tienda nunca manda eso; solo puede venir de alguien que llama a la base a
mano. Propuesta: rechazar ítems sin producto activo o con un tamaño que no
existe.

**C. (Opcional) El límite de 20 pedidos por minuto es para toda la web.**
Alguien insistente podría ocuparlo y una clienta real vería "no se pudo
enviar". La web ya le ofrece seguir por WhatsApp, así que la venta no se pierde.
Si llegara a pasar, se baja por teléfono o se suma un captcha invisible.

## Ajustes de Supabase que hace Sebas (fuera del código)

- **Protección de contraseñas filtradas:** el panel de Supabase avisa que está
  apagada. No aplica (no hay ingreso con contraseña), pero encenderla no cuesta
  nada y saca el aviso.
- **Límites de tamaño y tipo en los buckets de fotos** (hoy sin límite; solo el
  admin sube): 5 MB e imágenes (`image/webp`, `image/jpeg`, `image/png`).
- **Respaldos viejos** en el esquema `respaldo` (no expuesto por la API): se
  pueden borrar cuando el ciclo esté confirmado.

## Cómo repetir esta revisión

1. `get_advisors` de seguridad en Supabase y las políticas
   (`pg_policy`) de `public` y `storage.objects`.
2. `git log --all -p | grep -E "service_role|sb_secret"`: tiene que dar vacío.
3. `npm audit --omit=dev`.
4. `npm run build` (controla los hashes de la CSP), `node scripts/qa/servir.mjs`,
   el banco y `python3 scripts/qa/motores.py`, mirando que no haya bloqueos de
   CSP en la consola.
