# Fotos de los frascos

Las dos proveedoras corren su tienda en Shopify, y Shopify publica el catálogo
entero en `/products.json` sin pedir permiso. De ahí salen las fotos: son las
del envase real, tomadas por la casa, en vez de fotos genéricas de internet que
no se corresponden con lo que se entrega.

El problema es que nuestro catálogo tiene los nombres censurados con asteriscos
(`L* B*MB*`) y las proveedoras usan otros nombres todavía: Bagués le pone nombre
propio a cada frasco, y Arizona es Sauvage. Así que hay que emparejar, y ahí es
donde se cometen errores.

## Los tres pasos

```
npm run fotos:catalogos    baja los dos catálogos y el nuestro
npm run fotos:emparejar    decide de dónde sale cada foto e imprime la lista
npm run fotos:traer        baja, comprime y regenera el índice de la web
npm run fotos              los tres, uno atrás del otro
```

**Conviene leer la lista que imprime el paso 2 antes de correr el 3.** El paso 2
no baja nada: solo decide y muestra. El 3 escribe en `public/`.

El paso 1 necesita `.env` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`,
que son las mismas claves públicas con las que la web lee el catálogo. No hace
falta ninguna credencial de administrador.

## Qué guarda cada uno

| Archivo | Qué es | Se versiona |
| --- | --- | --- |
| `datos/unlock.json`, `datos/bagues.json` | los catálogos crudos | no |
| `datos/mios.json` | nuestros aromas, de la base | no |
| `datos/emparejamiento.json` | qué foto le toca a cada aroma | no |
| `public/perfumes/*.webp` | las fotos de Unlock | sí |
| `public/perfumes/bagues/*.webp` | los frascos de 50 ml de Bagués | sí |
| `src/data/fotos.js` | el índice que consulta la web | sí, generado |

Lo de `datos/` no se versiona porque se vuelve a bajar en un minuto y queda
viejo enseguida.

## Por qué el emparejamiento es tan exigente

La primera versión comparaba las letras visibles del nombre censurado como
subsecuencia, aceptándolas en cualquier posición. Con eso, Le Male se llevaba la
foto de Le Beau: son de la misma familia y comparten casi todas las letras. Y
"New York" se llevaba la de "New York Sexy", porque coincidía el principio.

Ahora compara **posición a posición y exige el mismo largo**, y para los frascos
de Bagués saca solo los agregados genéricos (Eau de Parfum, los mililitros) y
después exige igualdad exacta. Con eso pasó de emparejar 59 a 52, y las 52 son
correctas.

Es a propósito que rechace de más. Una foto equivocada es peor que ninguna:
cuando no hay foto se muestra la inicial del aroma y no pasa nada, pero una foto
mal puesta hace que la clienta pida un perfume que no es.

## Sobre `--limpiar`

Por defecto el paso 3 no borra las fotos que quedaron de un pase anterior y no
se volvieron a emparejar. Las lista al final, y nada más.

Es que hay dos motivos posibles para que una foto quede huérfana, y son
opuestos: puede ser un emparejamiento viejo que estaba mal, o puede ser una foto
buena de un producto que la proveedora sacó de su web. El script no puede
distinguirlos, así que la decisión queda en manos de una persona:

```
npm run fotos:traer -- --limpiar
```

Eso las borra. Antes de correrlo, mirar la lista.

## Cambiar una sola foto

No es acá. Se sube a mano desde el panel, en la ficha del producto, y esa le
gana a todas las que baja este script. Está explicado en
[`docs/EDITAR.md`](../../docs/EDITAR.md).

## Lo que falta

Hay aromas sin foto en ninguno de los dos catálogos públicos, porque no están
publicados en ninguna de las dos webs. Para esos hacen falta los PDF del Drive.
Mientras no estén, se muestra la inicial del aroma y la web funciona igual.
