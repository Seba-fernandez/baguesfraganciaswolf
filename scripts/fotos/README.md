# Fotos de los frascos

Cada aroma tiene hasta dos fotos: la del frasco de Unlock y la de la caja con
frasco de Bagués de 50 ml. La tarjeta muestra la de la línea del tamaño elegido,
porque son envases distintos y mostrar uno por otro confunde.

## Un solo tratamiento para todas

Todas salen a **900 × 1200 (3:4)**, el mismo cuadro de la tarjeta y de la ficha,
y **llenan el cuadro entero**. Antes convivían tres tratamientos en la misma
grilla (recorte sobre porcelana con aire, escena a sangre, y algunas cajas con un
fondo beige propio que dejaba un recuadro visible) y se leía desprolijo.

| La fuente es… | Qué hace `componer.mjs` |
| --- | --- |
| **Recorte** (fondo transparente): todas las de Bagués, algunas de Unlock y las del PDF | Recorta al contenido, lo apoya en un estudio espresso con halo de luz cálida, sombra de contacto y un reflejo tenue. Siempre al mismo tamaño relativo, así la grilla tiene ritmo |
| **Escena** (foto con fondo propio): la mayoría de Unlock | La recorta a 3:4 centrada en el frasco |

El tipo lo detecta solo (más de 6 % del cuadro transparente es recorte). Se
puede forzar con `"tipo"`.

## De dónde sale cada una: `fuentes.json`

Es la única lista, y se lee a ojo. Una entrada por aroma y por línea:

```json
"unlock-sauvage-hom": {
  "unlock": { "url": "https://cdn.shopify.com/…", "origen": "unlock.com.ar S*UV*GE" },
  "bagues": { "url": "https://cdn.shopify.com/…", "origen": "bagues.com.ar Arizona Eau de Parfum" }
}
```

- `url`: foto publicada en la tienda de la proveedora. Las dos corren Shopify y
  publican el catálogo en `/products.json` (`npm run fotos:catalogos` lo baja a
  `datos/` para buscar).
- `archivo`: foto guardada en `fuentes/`, para las que no están en ninguna
  tienda y salieron del PDF del ciclo.
- Ajustes opcionales: `foco` (`{ "x": 0.5, "y": 0.6 }`, dónde está el frasco en
  una escena), `zoom` (acercarse cuando el frasco quedó chico en la escena) y
  `ampliacionMax` (dejar agrandar más una fuente chica; por defecto 2,6×).

**Los frascos de Bagués se emparejan por el nombre de la caja** (Arizona,
Granada), que es único y figura en la presentación como `nombre_proveedor`. Ojo
con los que tienen versión femenina y masculina con el mismo nombre (New York,
Amsterdam, Hawai): la tienda los distingue en el título y hay que elegir el que
corresponde.

## Comandos

```
npm run fotos:componer            arma las que faltan o cambiaron
npm run fotos:componer -- --todo  rehace todas
npm run fotos:variantes           los anchos chicos (360w, 560w) para celular
npm run fotos                     los dos anteriores
```

`componer` también regenera `src/data/fotos.js`, el índice que consulta la web
para no pedir fotos que no existen.

## Antes de publicar

Mirar todas juntas con su nombre al lado. Una foto equivocada es peor que
ninguna: sin foto se muestra la inicial del aroma y no pasa nada; con la foto
cambiada la clienta pide un perfume que no es.

## Cambiar una sola foto

No hace falta correr nada: se sube a mano desde el panel, en la ficha del
producto, y esa le gana a todas las de este pipeline. Está explicado en
[`docs/EDITAR.md`](../../docs/EDITAR.md).

## Lo que falta (ciclo 10/26)

- **Manhattan** (Bagués, tipo 212 VIP): no está en la tienda de Bagués; solo en
  el PDF del catálogo general, que pesa demasiado para bajarlo por el conector.
  Hasta que se agregue, la ficha muestra la inicial.
