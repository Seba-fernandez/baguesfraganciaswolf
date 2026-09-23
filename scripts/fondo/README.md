# Los fondos de la tienda

Ninguno es una foto: los dibuja [`generar-duna.mjs`](generar-duna.mjs) pixel por
pixel, así que se ajustan y se vuelven a generar cuando haga falta, sin depender
de ningún banco de imágenes.

```
npm run fondo
```

Escribe tres archivos:

| Archivo | Qué es |
| --- | --- |
| `public/hero/duna.svg` | La escena del inicio: dunas al atardecer, apaisada, con el frasco a la derecha |
| `public/hero/duna-movil.svg` | La misma escena cuadrada y centrada, para el celular |
| `public/fondo/surcos.svg` | La textura de toda la página: líneas sinoidales finas |

Todo es determinista (semilla fija): correrlo dos veces da el mismo archivo.

## Qué hace que se vea arena y no un degradado

Los filos. Cada cresta lleva una línea de luz nítida; la cara de sombra es un
plano definido que baja en diagonal (la pendiente se suaviza con una gaussiana
ancha, si no la sombra cae en "colmillos" verticales); y encima van decenas de
surcos finos alternando oscuro y claro. El sol es un disco recortado, no una
mancha difusa: un disco se lee afiche, una mancha se lee plantilla.

El grano **no** va en el SVG: se agrega en CSS (`--grano` en
[`src/styles/tienda.css`](../../src/styles/tienda.css) y la capa de grano de
`Hero.module.css`).

## Cómo tocarlo

Arriba del archivo, en `escena({ W, H, foco })`:

- **`capas`**: una entrada por duna, de atrás hacia adelante. `base` es la altura
  media de la cresta (0 a 1 del alto), `luz` y `sombra` los colores, `surcos`
  cuántas ondulas lleva.
- **`foco`**: dónde se para el frasco (0 a 1 del ancho). El piso se aplana ahí y
  el sol se dibuja apenas corrido, para que quede de contraluz.
- **`azar(semilla)`**: cambia el dibujo entero sin tocar nada más.

**Si se cambia el piso o el foco hay que tocar el CSS.** El frasco del hero se
ancla con unidades de contenedor calculadas a partir de esos dos números (piso
en `y = 840` de 1000, foco en `x = 74%`); las cuentas están comentadas en
[`Hero.module.css`](../../src/components/tienda/Hero.module.css).

Las líneas de `surcos.svg` no son decoración: son lo que el canto del vidrio
refracta. Si se borran, el vidrio de la página pierde la mitad del efecto —está
explicado en [`docs/DISENO.md`](../../docs/DISENO.md).
