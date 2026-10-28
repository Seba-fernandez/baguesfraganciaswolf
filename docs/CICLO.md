# Cargar un ciclo desde el panel

*28 de octubre de 2026. Reemplaza la carga a mano con SQL de la sección 7 del
CLAUDE.md; esa queda como plan B.*

## Qué hace Sebas

1. Baja del Drive los dos catálogos del ciclo (`Catálogo_Unlock_CXX.pdf` y el
   general de Bagués). Desde el celular o la compu, da igual.
2. Panel > Catálogo > **Cargar ciclo nuevo desde los PDF**.
3. Elige uno o los dos PDF. La pantalla reconoce sola cuál es cuál (por los
   códigos: `1028…` Bagués, `2028…` Unlock) y **solo toca la línea del PDF que
   se subió**.
4. Revisa la propuesta: precios que cambian, tamaños que salen (se desactivan,
   no se borran), tamaños que vuelven, códigos nuevos, cajas con otro nombre y
   cajas cuyo Type no coincide con el perfume de la tienda.
5. Decide cada código nuevo: sumarlo a un perfume, crear uno nuevo (con nombre,
   para quién, familia y notas) o dejarlo afuera.
6. Toca **Aplicar cambios** y después **Confirmar**.
7. Mira "Fotos que faltan": las cajas de Bagués se buscan en bagues.com.ar y se
   arman solas sobre la pared vino; lo de Unlock necesita una foto suya.
8. Publica de nuevo (o le pide a Claude que publique): el precio "Desde" del
   hero se escribe en el build.

## Cómo está armado

| Pieza | Dónde | Qué hace |
| --- | --- | --- |
| Lectura del PDF | `src/lib/ciclo/pdf.js` | pdf.js en el navegador: cada texto con su página y su lugar (x, y) |
| Unlock | `src/lib/ciclo/leerUnlock.js` | Código `2028…`, ml y los dos precios más cercanos (el menor es el del ciclo, el mayor el de lista). Los minis toman el precio de "FRAGANCIAS MINI" |
| Bagués | `src/lib/ciclo/leerBagues.js` | `Caja Type Perfume by Bagués 1028XXXX`, el precio del bloque (`$lista $precio`), el género del encabezado y la ficha de los lanzamientos |
| Propuesta | `src/lib/ciclo/comparar.js` | Compara **por código** contra la base y arma las operaciones, alertas y bloqueos |
| Decisiones | `src/lib/ciclo/panel.js` | Línea de cada PDF, qué hacer con cada código nuevo, fotos que faltan, lugar de la caja en la foto |
| Foto | `src/lib/ciclo/fotoPared.js` | La caja sobre `public/fondo/pared-vacia-900.webp`, con sombra, reflejo y contacto (canvas) |
| Base y función | `src/lib/ciclo/servidor.js` | Lee los PDF, llama a la función `tiendas` y a `aplicar_ciclo()` |
| Pantalla | `src/components/panel/ciclo/` | `CicloScreen`, `Propuesta`, `FotosFaltantes` |
| Escritura | `supabase/migrations/20261028_0015_ciclo_desde_el_panel.sql` | `aplicar_ciclo()` y la tabla `ciclo_cargas` |
| Tiendas | `supabase/functions/tiendas/index.ts` | Busca en bagues.com.ar y unlock.com.ar y baja sus fotos (el navegador no puede) |

## Las defensas

Del lado del navegador (`comparar.js`):

- **PDF vacío o de la otra línea:** frena y no se puede forzar.
- **Más de un tercio de la línea saldría del ciclo:** frena. Se puede pasar
  tildando "Revisé el PDF…" (un ciclo que de verdad saca muchos perfumes).
- **Lo leído que no tiene sentido** (sin precio, lista menor que el precio,
  precio fuera de rango, código raro) se descarta, se avisa y **no desactiva
  nada**: un perfume mal leído no puede apagar uno bueno.
- **Saltos de precio raros** (menos de la mitad o casi el doble) se marcan en
  rojo.
- **Unlock tapa letras con estrellas** (`INVAATUS VACTARY`): un código nuevo de
  Unlock nunca se adivina, hay que elegir.
- Los ml de Unlock que no coinciden con la base se avisan y no se cambian solos.

Del lado de la base (`aplicar_ciclo()`, que vuelve a validar todo):

- Solo la cuenta de Sebas (`es_admin()`).
- Copia del catálogo entero en `respaldo.copias` antes de tocar nada.
- Todo o nada: si una operación no pasa, no se aplica ninguna.
- Código con forma `^(1028|2028)\d{4}$` y que exista una sola vez; precio entre
  $ 1.000 y $ 500.000; lista mayor o igual al precio; caja y Type solo en Bagués.
- Nunca borra un código ni un perfume: desactiva. Un perfume sin ningún tamaño
  activo se pausa; uno que recupera un tamaño vuelve.
- Cada carga queda en `ciclo_cargas`: qué se leyó, qué se propuso, qué se aplicó.

## Pruebas

- `node scripts/qa/catalogo.test.mjs` (también en `npm test` y en cada push):
  20 pruebas con los catálogos reales del ciclo 10. Leer el ciclo 10 tiene que
  dar exactamente lo que ya está cargado: Unlock 66 de 66 tamaños, Bagués 82 de
  82 precios. Más los escenarios: precio que cambia, perfume que sale y que
  vuelve, códigos nuevos, bloqueos, descartados y saltos raros.
- `supabase/pruebas/aplicar_ciclo.sql`: la función en un bloque que termina con
  error a propósito (se deshace todo): el caso que tiene que andar y los siete
  que tiene que frenar.
- La pantalla se probó de punta a punta en Chromium a 390, 768 y 1440 px con el
  PDF real de Unlock y la base simulada (sin tocar la real): propuesta, código
  nuevo que traba el botón, bloqueo que se fuerza, lo que recibe la base y la
  foto armada (900 × 1200, casi igual a la del pipeline de Python).

## Lo que no está probado (y cómo se cubre)

- **El PDF de Bagués entero con pdf.js.** Pesa 29 MB y el conector de Drive baja
  hasta 10 MB: el lector se probó con el texto real del PDF por página (lo que
  devuelve Drive), no con el orden en que lo entrega pdf.js. Si el orden cambia,
  lo más probable es que algún nombre de caja salga mezclado (queda vacío, con
  aviso, y no cambia nada) o que un precio no se encuentre (se descarta). La
  primera carga real de Bagués conviene mirarla con calma; `ciclo_cargas` guarda
  lo leído para corregir el lector si hace falta.
- **Safari y la foto:** el canvas usa `shadowBlur` (no `ctx.filter`, que Safari
  no tiene) y exporta en jpeg si el navegador no sabe hacer webp.

## Si algo sale mal

- La copia de antes de aplicar está en `respaldo.copias` (tabla
  `products (antes de cargar un ciclo)`, con la fecha). Se restaura con SQL.
- Plan B: la carga a mano de la sección 7 del CLAUDE.md.
