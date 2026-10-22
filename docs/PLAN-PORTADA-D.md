# Plan: portada D ("Cada perfume, una ciudad")

*22/10/2026. Rama `rediseno-visual`. A `main` solo con OK de Sebas.*

Reemplaza en lo visual al borrador de la portada C (PR #1). Se basa en lo que
Sebas aprobó en la página de prueba: ADN de sus 3 referencias, letra, título,
guion de color en dos luces y fotos de producto en la pared vino. De la C se
quedan la imagen del hero, las herramientas (`scripts/rediseno/`,
`scripts/qa/atencion/`) y todo lo funcional.

## Guion de la portada

| # | Sección | Luz | Qué cambia |
| --- | --- | --- | --- |
| 1 | Hero | noche | Título "Cada perfume, *una ciudad.*" centrado, precio y botón "Ver el catálogo" centrado entre dos trazos de plumilla |
| 2 | Las ciudades | día (papel) | Sección nueva: 3 o 4 cajas con el nombre de la ciudad en grande, el perfume y el precio en mono. Absorbe "Lo que pagás" (precio de lista tachado al lado) |
| 3 | ¿Qué te gusta oler? | día con 5 ventanas vino | Mismas 5 familias y mismos links al catálogo filtrado |
| 4 | Los que siempre salen | clímax: banda vino | Fotos de producto sobre la pared vino |
| 5 | Cómo funciona | papel | Solo el chat de WhatsApp |
| 6 | Antes de pedir | papel hondo | 4 cifras grandes con rótulo en mono |
| 7 | Pie | noche | Marca, contacto y aviso legal |

"Lo que me escriben" sigue oculta hasta que lleguen las capturas.

## Letra

Melodrama 600 (lo grande), Boska 400, 400 itálica y 500 (nombres y la itálica
del título), IBM Plex Mono 500 (datos), La Belle Aurore (rótulos de a uno).
Figtree queda para el texto corrido. Se sirven desde `public/fonts/`, recortadas
a latín, con `font-display: swap` y precarga solo de la del título. Cormorant
sale de la tienda.

## Etapas (un commit por etapa, push a la rama)

1. Tokens y letras: paleta papel, vino, vino hondo, rubí; fuentes nuevas.
2. Hero centrado con el adorno.
3. Las ciudades (reemplaza a `Nosotros`).
4. Familias, destacados en banda vino.
5. Cómo funciona, antes de pedir, pie.
6. Catálogo: el grado (papel, tira vino, nombres en Boska, precios en mono) y
   las fotos de la pared vino, si Sebas aprueba las 133.
7. Control: banco 84 de 84, mapa de calor, guiones largos, 390 y 1440, y
   Lighthouse una sola vez al final (mediana de 5, intercalado con producción).

## Reglas que siguen valiendo

Aviso legal visible, nunca frascos con forma de diseñador en hero u og; precio
y botón en el primer pantallazo a 390x664; un solo acento; cero guiones largos;
PageSpeed mobile en ~94-96; el `codigo` no se toca.
