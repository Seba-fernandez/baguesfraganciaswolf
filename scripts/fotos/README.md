# Fotos de los frascos

Cada aroma tiene hasta dos fotos: la del frasco de Unlock y la de la caja con
frasco de Bagués de 50 ml. La tarjeta muestra la de la línea del tamaño elegido,
porque son envases distintos y mostrar uno por otro confunde.

## Un solo estudio para todas

Todas salen a **900 × 1200 (3:4)**, el mismo cuadro de la tarjeta y de la ficha,
**llenan el cuadro entero** y viven en **el mismo cuarto espresso**: pared que
baja de `#2a1f17` a `#1d1510`, halo de luz cálida, piso con su filo de luz. El
frasco o la caja ocupan ~70 % del alto y apoyan en la misma línea de piso.

Hasta octubre de 2026 las cajas estaban en el estudio y las 43 escenas de Unlock
quedaban como venían (azul eléctrico, celeste, gris, rojo): la grilla parecía
un marketplace de dos proveedores, no una casa (FOTO-1). Ahora cada fuente
entra por uno de cuatro **tratamientos** (campo `"tratamiento"` de
`fuentes.json`):

| Tratamiento | Para qué fuente | Qué hace `componer.mjs` |
| --- | --- | --- |
| `recorte` (no hace falta escribirlo: se detecta si más del 6 % de la foto es transparente) | PNG con fondo transparente: todas las cajas de Bagués, algunos frascos de Unlock, los del PDF | Limpia el filo, saca el podio si `"podio": true`, lo apoya en el estudio con sombra y reflejo |
| `estudio` | Escena con frasco **opaco o de color** (Kenzo Homme, Sauvage, Good Girl) | Recorta el frasco con su máscara y sigue igual que un recorte |
| `espresso` | **Vidrio transparente sobre fondo claro** (Scandal pour Homme, Creed Aventus), o un frasco que no se puede parar solo (Olympéa acostado en yeso, Lady Million con el haz de luz encima) | Deja el frasco intacto y lleva solo el fondo a una rampa espresso, según su luz. Recortar ese vidrio arrastra el fondo viejo adentro del frasco |
| `escena` | Casos puntuales | La foto tal cual, recortada a 3:4 (`foco`, `zoom`). Hoy ninguna lo usa |

Si no se escribe nada y la foto tiene fondo propio, queda como `escena`: una
foto nueva de Unlock siempre lleva `"tratamiento"`.

### Cómo elegir el tratamiento

Mirando la foto, no a ciegas:

1. ¿El frasco es opaco o de color? → `estudio`.
2. ¿Es vidrio transparente y el fondo es claro? → `espresso`.
3. Si `estudio` deja un borde raro (vidrio que muestra el fondo viejo, una
   punta que se funde con una luz), probar `espresso`.

### `corte`: reflejos de piso

Muchas escenas de Unlock traen el frasco reflejado en un piso de vidrio, y la
máscara se lo lleva como si fuera parte del frasco (queda un frasco doble).
`"corte": 0.8` borra de la máscara todo lo que está debajo del 80 % del alto de
la foto **fuente**. Para encontrar el número, se mira dónde termina la base del
frasco en la foto original. Hoy lo llevan Acqua di Giò, Armani My Way y Sì, Very
Good Girl, J'adore, Kenzo Amour y Flower, Nina, Pure XS, Scandal pour Homme,
Scandal Le Parfum Intense y Creed Aventus.

### Las máscaras: `datos/mascaras/`

La máscara del frasco la calcula **una sola vez** `mascaras.py` con
[rembg](https://github.com/danielgatis/rembg) (modelo `isnet-general-use`) y
queda guardada como PNG en `scripts/fotos/datos/mascaras/`, **que se versiona**.
`indice.json` anota con qué fuente (sha1) se calculó cada una: si la fuente
cambia, se rehace sola.

- `componer.mjs` no necesita Python mientras la máscara esté guardada. Si falta,
  llama solo a `mascaras.py`.
- **El build de Vercel no toca nada de esto**: solo corre `variantes.mjs`. Las
  fotos compuestas van commiteadas, como siempre.
- Instalar rembg en tu compu (una vez; baja ~180 MB del modelo la primera vez):

  ```
  pip install --break-system-packages rembg onnxruntime
  ```

- Para rehacer una máscara a mano: `npm run fotos:mascaras -- unlock-kenzo-homme`.

### El filo de los recortes (FOTO-2)

Muchos PNG de las proveedoras traen en el contorno 1 o 2 px del blanco del fondo
donde se recortaron, y algunos (Doha, Abu Dabi) un alfa binario, sin borde
suave. Sobre el espresso eso se ve como un filo blanco y escalonado: la firma de
un recorte hecho a las apuradas. Antes de apoyar cualquier recorte,
`limpiarFilo` (en [`pixeles.mjs`](pixeles.mjs), JavaScript sin dependencias):

1. reemplaza el color de los 2 px del borde por el de unos px más adentro;
2. come 1 px del alfa;
3. suaviza el alfa (gaussiano de 0,7 px), así deja de escalonar.

Corre solo, en todos los recortes. No hay nada que configurar.

### Podio, sombra y reflejo (FOTO-3)

Algunos frascos de Unlock vienen con una elipse gris horneada debajo (un podio o
la sombra de su propio estudio). Sobre el espresso queda un disco flotando
encima de nuestra sombra: dos pisos. Con `"podio": true` en la entrada,
`sacarPodio` vuelve transparente todo lo que no es opaco del todo en el 16 %
inferior del objeto (el frasco es opaco; el podio no). Hoy lo llevan One Million
Lucky, Invictus Victory, Carolina Herrera for Women, L'Eau d'Issey y Toy 2.

Todos los recortes apoyan en la misma línea de piso con una sombra en dos capas
(un contacto fino y oscuro y una penumbra ancha y floja) y un reflejo al 9 %
(antes 16 %, se leía como un espejo).

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
- `tratamiento`: `recorte`, `estudio`, `espresso` o `escena` (arriba).
- Ajustes opcionales: `corte` (borrar el reflejo de piso, en proporción del alto
  de la fuente), `podio` (sacar la elipse de piso que trae horneada un recorte),
  `ampliacionMax` (cuánto se puede agrandar; por defecto 2,6×; bajarlo achica un
  frasco ancho que llena el cuadro), y para `escena`, `foco`
  (`{ "x": 0.5, "y": 0.6 }`) y `zoom`.

**Los frascos de Bagués se emparejan por el nombre de la caja** (Arizona,
Granada), que es único y figura en la presentación como `nombre_proveedor`. Ojo
con los que tienen versión femenina y masculina con el mismo nombre (New York,
Amsterdam, Hawai): la tienda los distingue en el título y hay que elegir el que
corresponde.

## Comandos

```
npm run fotos:componer            arma las que faltan o cambiaron
npm run fotos:componer -- --todo  rehace todas (2 minutos)
npm run fotos:variantes           los anchos chicos (360w, 560w) para celular; también corre solo en cada build
npm run fotos                     los dos anteriores
npm run fotos:contacto            la hoja de contacto, en scripts/fotos/datos/contacto/
npm run fotos:mascaras            calcula las máscaras que faltan (lo llama componer solo)
```

`componer` también regenera `src/data/fotos.js`, el índice que consulta la web
para no pedir fotos que no existen.

## Antes de publicar: la hoja de contacto

`npm run fotos:contacto` arma todas las fotos juntas, cada una con su nombre de
archivo, el nombre del perfume **como está en la base** y la caja o los
tamaños, y el tratamiento. Se mira entera. Una foto equivocada es peor que
ninguna: sin foto se muestra la inicial del aroma y no pasa nada; con la foto
cambiada la clienta pide un perfume que no es.

## Una foto nueva en un ciclo nuevo (Unlock)

1. Buscar la foto en `datos/unlock.json` (`npm run fotos:catalogos`) y agregar
   la entrada con `url` y `"tratamiento": "estudio"` (o `espresso` si es vidrio
   claro sobre fondo claro).
2. `npm run fotos:componer`. La primera vez calcula la máscara (unos segundos).
3. `npm run fotos:contacto` y mirarla. Si quedó un reflejo abajo, agregar
   `corte`; si el vidrio se ve sucio, pasar a `espresso`. Volver al paso 2.
4. Commitear la foto, sus variantes y la máscara nueva.

Son unos minutos por foto. Una caja de Bagués no necesita nada de esto: es un
recorte y entra sola.

## Cambiar una sola foto

No hace falta correr nada: se sube a mano desde el panel, en la ficha del
producto, y esa le gana a todas las de este pipeline. Está explicado en
[`docs/EDITAR.md`](../../docs/EDITAR.md).

## Lo que falta (ciclo 10/26)

- **Manhattan** (Bagués, tipo 212 VIP): no está en la tienda de Bagués; solo en
  el PDF del catálogo general, que pesa demasiado para bajarlo por el conector.
  Hasta que se agregue, la ficha muestra la inicial.
