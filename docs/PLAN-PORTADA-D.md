# Plan: portada D ("Cada perfume, una ciudad")

*22/10/2026. Rama `rediseno-visual`. A `main` solo con OK de Sebas.*

Reemplaza en lo visual al borrador de la portada C (PR #1). Se basa en lo que
Sebas aprobó en la página de prueba: ADN de sus 3 referencias, letra, título,
guion de color en dos luces y fotos de producto en la pared vino. De la C se
quedan la imagen del hero, las herramientas (`scripts/rediseno/`,
`scripts/qa/atencion/`) y todo lo funcional.

## Decisiones de Sebas (22/10, después del plan)

- **Hero en escritorio:** el texto sigue a la izquierda con la imagen como
  está (no se re-hornea). En el celular, todo centrado.
- **"Lo que pagás / Lo que no pagás": se saca.** Las ciudades muestran solo
  el precio.
- **Fotos de la pared vino en el catálogo:** sí, después de mirar las dos
  hojas de contacto (se le mandaron el 22/10).

## Cambios sobre la marcha (con el porqué)

- **Las cifras van en Boska, no en Melodrama.** El cero de Melodrama viene
  cruzado en todas sus formas (lining y oldstyle): "$ 60.000" se leía como
  "$ 6Ø.ØØØ". Melodrama queda para palabras: título, ciudades, marca, familias.
  El "Desde $ X" del hero va en la itálica de Boska, que ya viaja en la
  primera carga.
- **Destacados sin el vidrio encima de las tarjetas.** Era lo que Sebas
  sintió "pegado"; el vidrio vive solo en el hero.
- **Cómo funciona sin los tres pasos numerados:** el chat ya los cuenta.
- **La cinta de nombres queda** como bisagra vino hondo entre el hero y el
  papel (es un link a cada ficha; la pidió la evaluación de captación).
- **La barra de arriba** es vino hondo sólida fuera del hero (en la portada,
  transparente con velo mientras flota sobre la escena).
- **La noche de toda la tienda** (ficha, cajón, hoja de tamaños) pasa del
  espresso al vino hondo. El acento de noche sigue siendo el rosa-vino de
  siempre: el rubí sobre vino hondo no llega a 3:1.
- **Clase `.dia`** (tienda.css): una sección de papel redefine tinta, acento y
  líneas para lo que tenga adentro, y apaga el vidrio (superficies sólidas).

## Guion de la portada

| # | Sección | Luz | Qué cambia |
| --- | --- | --- | --- |
| 1 | Hero | noche | Título "Cada perfume, *una ciudad.*", precio y botón "Ver el catálogo" entre dos trazos de plumilla. Centrado en el celular, a la izquierda en escritorio |
| 2 | Las ciudades | día (papel) | Sección nueva: 4 cajas Bagués con el nombre de la ciudad en grande, el perfume y el precio en mono (`ciudadesDe` en `lib/producto.js`: no repite destacados y alterna ella, él, unisex). Reemplaza a "Nosotros" |
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
a latín, con `font-display: swap`. En la primera pantalla solo cuatro caras
(Melodrama, la itálica de Boska y Figtree 400 y 600, 50 kB); el resto llega
en `public/fuentes-diferidas.css`. Cormorant sale de la tienda.

## Etapas (un commit por etapa, push a la rama)

Hechas el 22/10: 1 (`d527a56`), 2 (`0110aa9`), 3 (`ebbe29c`), 4 y 5
(`5d50d3a`), 6 sin las fotos (`86dcc75`). Pendiente: las fotos de la pared
en el catálogo (espera el OK de las hojas) y la etapa 7.


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
