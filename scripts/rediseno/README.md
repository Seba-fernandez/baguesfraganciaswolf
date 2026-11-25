# Imágenes del rediseño C ("A través del vidrio")

Acá vive lo necesario para volver a hornear las imágenes de la portada cuando
cambian las cajas del ciclo o llegan fotos propias de Sebas. Lo que se publica
está en `public/hero/c/`, `public/familias/` y `public/nosotros/`. Nada de esto
corre en el build de Vercel: las imágenes van commiteadas.

## Qué hay

| Archivo | Para qué |
| --- | --- |
| `hornear_hero.py` | Arma el hero: pared vino con halo, cajas Bagués reales detrás del vidrio acanalado y una ventana en arco con una caja nítida. Saca 1440x900, 2880x1800, 390x844, 780x1688 y 1170x2532 en WebP y AVIF, con las capas separadas |
| `ciclo.json` | Qué caja va en la ventana y cuáles detrás del vidrio (slugs de la base o rutas a PNG recortados) |
| `hornear_piezas.py` | Texturas y frascos de las familias, destacados nítidos y con vidrio, hero A (bodegón), `og.jpg` y maquetas |
| `hoja_contacto.py` | Una hoja con todo junto para revisar antes de publicar |
| `generadas/` | Las 9 imágenes generadas con IA (paredes, bodegón, texturas). Son la fuente: no se vuelven a generar (cada una costó una generación paga) |
| `referencias.md` | Las referencias de vidrio acanalado, bodegón y perfumería de nicho, con qué tomar de cada una |

## Volver a hornear el hero

```bash
pip install --break-system-packages numpy opencv-python-headless pillow
cd scripts/rediseno
# 1. Cambiar ciclo.json: "ventana" es la caja nítida, "cajas" las de atrás.
python3 hornear_hero.py ciclo.json --rapido   # prueba en 1x, menos de un minuto
python3 hornear_hero.py ciclo.json            # completo, unos 3 minutos
# 2. Mirar salida/hero_c/ y salida/hero_c/informe.json (pesos y contraste)
# 3. Copiar los WebP y AVIF a public/hero/c/ con el mismo nombre
```

- Las cajas se bajan solas de bagues.com.ar (URLs en `scripts/fotos/fuentes.json`) a
  `cache/cajas/`, que no se versiona.
- **Solo cajas Bagués.** Si un slug no tiene caja Bagués, el script rechaza el
  frasco Unlock: nunca un frasco con forma de diseñador en el hero.
- **Fotos propias de Sebas:** en `ciclo.json` se puede poner la ruta a un PNG ya
  recortado en vez de un slug. Con una luz lateral de ventana del lado
  izquierdo, fondo oscuro mate y la cámara a la altura de la caja, se integran
  mejor que los renders planos de la tienda.
- El informe mide el contraste de la tinta `#f3ece1` contra el píxel más claro de
  la zona del titular (tiene que dar 4,5:1 o más) y los pesos (1440 hasta 220 kB,
  780 hasta 140 kB).

## Zonas libres que respeta la imagen

- Celular 390x844: titular en y 96 a 260, ventana en y 290 a 540, precio y
  botón en y 580 a 660 (entra en el visor de Instagram, 390x664).
- Escritorio 1440x900: texto en x 96 a 620, ventana centrada en x 980.

Si cambian estas zonas, hay que tocar también `Hero.module.css`.

## Hero de Navidad (campaña de diciembre 2026)

`hornear_hero_navidad.py` parte de la pieza del dueño (`fuentes/navidad-c12.png`,
1774x887), le saca el texto quemado (BAGUÉS, bajada, "La Navidad se regala con
Bagués", banda roja con el precio) y la desarma en capas: `fondo` (cortina y
terciopelo vacíos, es el LCP), `luces`/`lucesb` (pino y luces de las esquinas),
`frascos` y `destello`. Las capas salen como diferencia contra la cortina vacía,
así el vidrio queda transparente de verdad. El titular, la placa del precio y el
botón son texto del DOM (`Hero.jsx`, `HeroNavidad.module.css`).

```bash
cd scripts/rediseno
python3 hornear_hero_navidad.py --rapido     # prueba (780 y 1440)
python3 hornear_hero_navidad.py --publicar   # hornea, copia a public/hero/navidad/ y
                                             # reescribe el bloque CAPAS de HeroNavidad.module.css
```

Color: la cortina verde de la pieza se lleva a vino hondo (la marca manda; verde
más rubí más oro juntos son tres acentos). El verde queda en el brillo de los
pliegues y en el pino.

Precios de la placa: `NAVIDAD_PRECIOS` en `src/config/ajustes.js` (no salen de la
base). Textos: `INICIO_NAVIDAD` en `contenido.js`.

### Apagarlo después de Navidad

En `src/config/ajustes.js`: `export const HERO_NAVIDAD = false;` y publicar.
Vuelve el hero de siempre ("Cada perfume, una ciudad."), con su imagen y su
precarga (`vite.config.js` solo cambia la precarga cuando está en true). Nada más
que tocar; las imágenes de Navidad quedan en `public/hero/navidad/` por si se
reusan. (`docs/EDITAR.md` no existe en este repo.)
